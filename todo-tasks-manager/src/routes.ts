import { Request, Response } from "express";
import { Model } from "mongoose";
import { RouteDefinition, PluginLogger } from "./plugin-types";
import { ITodo, KANBAN_STATUSES } from "./models/todo";
import mongoose from "mongoose";
// Function to create routes with the Todo model and logger
export function createRoutes(
  TodoModel: Model<ITodo>,
  logger: PluginLogger
): RouteDefinition[] {
  // Helper to sanitize tags: trim whitespace, remove empty strings, ensure uniqueness
  const sanitizeTags = (tags?: any): string[] => {
    if (!Array.isArray(tags)) {
      return [];
    }
    return [
      ...new Set(
        tags.map((tag) => String(tag).trim()).filter((tag) => tag !== "")
      ),
    ];
  };

  // Define the routes for the Todo API
  const routes: RouteDefinition[] = [
    // GET / - Fetch top-level todos, sorted by order, including subtasks
    {
      path: "/",
      method: "get",
      handler: async (req: Request, res: Response) => {
        try {
          const filter: any = { parentId: null }; // Filter for top-level tasks
          const tagsQuery = req.query.tags as string;
          const includeArchived = req.query.includeArchived === "true";

          if (!includeArchived) {
            filter.isArchived = { $ne: true }; // Exclude archived by default
          }

          if (tagsQuery) {
            const tagsToFilter = tagsQuery
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean);
            if (tagsToFilter.length > 0) {
              filter.tags = { $in: tagsToFilter };
              logger.info(
                `Filtering todos by tags: ${tagsToFilter.join(", ")}`
              );
            } else {
              logger.info("Fetching todos (no tag filter specified)");
            }
          } else {
            logger.info("Fetching todos (no tag filter specified)");
          }

          // 1. Fetch top-level todos matching the filter
          const topLevelTodosRaw = await TodoModel.find(filter)
            .sort({ order: 1, createdAt: -1 })
            .lean() // Use .lean() for performance when modifying results
            .exec();

          logger.info(
            `Found ${topLevelTodosRaw.length} top-level todos matching filter. Fetching subtasks...`
          );

          // 2. Fetch subtasks for each top-level todo
          const todosWithSubtasks = await Promise.all(
            topLevelTodosRaw.map(async (todo) => {
              const subtasks = await TodoModel.find({ parentId: todo._id })
                .sort({ order: 1, createdAt: 1 })
                .lean() // Use .lean() here too
                .exec();
              // Return the todo with its fetched subtasks
              return { ...todo, subtasks: subtasks || [] }; // Ensure subtasks is always an array
            })
          );

          logger.info(
            `Finished fetching subtasks. Returning ${todosWithSubtasks.length} todos.`
          );
          res.json({
            success: true,
            data: todosWithSubtasks,
          });
        } catch (error: any) {
          logger.error(`Failed to fetch todos with subtasks: ${error.message}`);
          res.status(500).json({
            success: false,
            message: "Failed to fetch todos",
            error: error.message,
          });
        }
      },
      description:
        "Get all top-level todos (optionally filtered by tags, including archived status), including their subtasks, sorted by order.",
    },
    // GET /:parentId/subtasks - Fetch subtasks, sorted by order
    {
      path: "/:parentId/subtasks",
      method: "get",
      handler: async (req: Request, res: Response) => {
        try {
          const parentId = req.params.parentId;
          logger.info(`Fetching subtasks for parent ID: ${parentId}`);

          // Validate parentId format (optional but recommended)
          if (!mongoose.Types.ObjectId.isValid(parentId)) {
            logger.warn(`Invalid parent ID format: ${parentId}`);
            return res
              .status(400)
              .json({ success: false, message: "Invalid parent ID format" });
          }

          const subtasks = await TodoModel.find({ parentId: parentId })
            .sort({ order: 1, createdAt: 1 }) // Sort primarily by order, then by creation date
            .exec();
          logger.info(
            `Found ${subtasks.length} subtasks for parent ${parentId}`
          );
          res.json({
            success: true,
            data: subtasks,
          });
        } catch (error: any) {
          logger.error(
            `Failed to fetch subtasks for parent ${req.params.parentId}: ${error.message}`
          );
          res.status(500).json({
            success: false,
            message: "Failed to fetch subtasks",
            error: error.message,
          });
        }
      },
      description:
        "Get all subtasks for a specific parent todo, sorted by order",
    },
    // GET /tags - Fetch all unique tags used in tasks
    {
      path: "/tags",
      method: "get",
      handler: async (req: Request, res: Response) => {
        try {
          logger.info("Fetching all unique tags");
          // Use distinct to get unique, non-null tag values from the collection
          const uniqueTags = await TodoModel.distinct("tags").exec();
          logger.info(`Found ${uniqueTags.length} unique tags`);
          res.json({
            success: true,
            data: uniqueTags.filter((tag) => tag != null), // Ensure null/undefined are filtered out
          });
        } catch (error: any) {
          logger.error(`Failed to fetch unique tags: ${error.message}`);
          res.status(500).json({
            success: false,
            message: "Failed to fetch unique tags",
            error: error.message,
          });
        }
      },
      description: "Get a list of all unique tags used across all tasks",
    },
    {
      path: "/:id",
      method: "get",
      handler: async (req: Request, res: Response) => {
        try {
          const id = req.params.id;
          logger.info(`Fetching todo with ID: ${id}`);

          const todo = await TodoModel.findOne({ _id: id }).exec();

          if (!todo) {
            logger.warn(`Todo with ID ${id} not found`);
            return res.status(404).json({
              success: false,
              message: "Todo not found",
            });
          }

          logger.info(`Found todo: ${todo.title}`);
          res.json({
            success: true,
            data: todo,
          });
        } catch (error: any) {
          logger.error(`Failed to fetch todo: ${error.message}`);
          res.status(500).json({
            success: false,
            message: "Failed to fetch todo",
            error: error.message,
          });
        }
      },
      description: "Get a specific todo by ID",
    },
    // POST / - Create a top-level todo, including status
    {
      path: "/",
      method: "post",
      handler: async (req: Request, res: Response) => {
        try {
          const { status, ...restOfBody } = req.body;
          // Validate status if provided, default to the first status in the list
          const defaultStatus = KANBAN_STATUSES[0]; // e.g., "pending"
          const finalStatus =
            status && KANBAN_STATUSES.includes(status) ? status : defaultStatus; // Default to first valid status

          const sanitizedTags = sanitizeTags(restOfBody.tags);
          // Assign order based on current count in that status column (simple strategy)
          const currentMaxOrder = await TodoModel.countDocuments({
            parentId: null,
            status: finalStatus,
          });

          const todoData = {
            ...restOfBody,
            parentId: null,
            tags: sanitizedTags,
            status: finalStatus,
            order: currentMaxOrder, // Assign order
          };
          logger.info(
            `Creating new top-level todo: ${JSON.stringify(todoData)}`
          );
          const todo = new TodoModel(todoData);
          await todo.save();
          logger.info(`Top-level todo created with ID: ${todo._id}`);
          res.status(201).json({
            success: true,
            data: todo,
            message: "Todo created successfully",
          });
        } catch (error: any) {
          logger.error(`Failed to create top-level todo: ${error.message}`);
          if (error.name === "ValidationError") {
            res.status(400).json({
              success: false,
              message: "Validation failed",
              error: error.message,
            });
          } else {
            res.status(500).json({
              success: false,
              message: "Failed to create todo",
              error: error.message,
            });
          }
        }
      },
      description:
        "Create a new top-level todo, optionally including tags and status",
    },
    // POST /:parentId/subtasks - Create a subtask, including status
    {
      path: "/:parentId/subtasks",
      method: "post",
      handler: async (req: Request, res: Response) => {
        try {
          const parentId = req.params.parentId;
          const { status, ...restOfBody } = req.body;
          // Validate status if provided, default to the first status in the list
          const defaultStatus = KANBAN_STATUSES[0]; // e.g., "pending"
          const finalStatus =
            status && KANBAN_STATUSES.includes(status) ? status : defaultStatus; // Default to first valid status

          logger.info(
            `Attempting to create subtask for parent ID: ${parentId} with status ${finalStatus}`
          );

          // Validate parentId format and check if parent exists
          if (!mongoose.Types.ObjectId.isValid(parentId)) {
            logger.warn(`Invalid parent ID format: ${parentId}`);
            return res
              .status(400)
              .json({ success: false, message: "Invalid parent ID format" });
          }
          const parentTodo = await TodoModel.findById(parentId).exec();
          if (!parentTodo) {
            logger.warn(`Parent todo with ID ${parentId} not found`);
            return res
              .status(404)
              .json({ success: false, message: "Parent todo not found" });
          }

          const sanitizedTags = sanitizeTags(restOfBody.tags);
          // Assign order based on current count of subtasks for this parent
          const currentMaxOrder = await TodoModel.countDocuments({
            parentId: parentId,
          });

          const subtaskData = {
            ...restOfBody,
            parentId: parentId,
            tags: sanitizedTags,
            status: finalStatus,
            order: currentMaxOrder, // Assign order
          };
          logger.info(
            `Creating new subtask with data: ${JSON.stringify(subtaskData)}`
          );
          const subtask = new TodoModel(subtaskData);
          await subtask.save();
          logger.info(
            `Subtask created with ID: ${subtask._id} for parent ${parentId}`
          );
          res.status(201).json({
            success: true,
            data: subtask,
            message: "Subtask created successfully",
          });
        } catch (error: any) {
          logger.error(
            `Failed to create subtask for parent ${req.params.parentId}: ${error.message}`
          );
          if (error.name === "ValidationError") {
            res.status(400).json({
              success: false,
              message: "Validation failed",
              error: error.message,
            });
          } else {
            res.status(500).json({
              success: false,
              message: "Failed to create subtask",
              error: error.message,
            });
          }
        }
      },
      description: "Create a new subtask, optionally including tags and status",
    },
    // PUT /:id - Update a todo, including status
    {
      path: "/:id",
      method: "put",
      handler: async (req: Request, res: Response) => {
        try {
          const id = req.params.id;
          const { status, tags, ...restOfUpdate } = req.body;
          logger.info(`Updating todo with ID: ${id}`);

          const todo = await TodoModel.findOne({ _id: id }).exec();

          if (!todo) {
            logger.warn(`Todo with ID ${id} not found for update`);
            return res
              .status(404)
              .json({ success: false, message: "Todo not found" });
          }

          const updateData: any = { ...restOfUpdate };

          // Validate and add status if present
          if (status !== undefined) {
            if (!KANBAN_STATUSES.includes(status)) {
              return res
                .status(400)
                .json({ success: false, message: `Invalid status: ${status}` });
            }
            updateData.status = status;
            // TODO: Consider resetting/recalculating order when status changes
          }

          // Sanitize and add tags if present
          if (tags !== undefined) {
            updateData.tags = sanitizeTags(tags);
          }

          // Update the todo
          Object.assign(todo, updateData);
          todo.updatedAt = new Date();
          await todo.save();

          logger.info(`Todo updated: ${todo.title}`);
          res.json({
            success: true,
            data: todo,
            message: "Todo updated successfully",
          });
        } catch (error: any) {
          logger.error(`Failed to update todo: ${error.message}`);
          if (error.name === "ValidationError") {
            res.status(400).json({
              success: false,
              message: "Validation failed",
              error: error.message,
            });
          } else {
            res.status(500).json({
              success: false,
              message: "Failed to update todo",
              error: error.message,
            });
          }
        }
      },
      description: "Update a todo by ID, including its status, tags, etc.",
    },
    // DELETE /:id - Delete a todo and its subtasks
    {
      path: "/:id",
      method: "delete",
      handler: async (req: Request, res: Response) => {
        try {
          const id = req.params.id;
          logger.info(
            `Attempting to delete todo with ID: ${id} and its subtasks`
          );

          const todo = await TodoModel.findById(id).exec();

          if (!todo) {
            logger.warn(`Todo with ID ${id} not found for deletion`);
            return res.status(404).json({
              success: false,
              message: "Todo not found",
            });
          }

          // Find and delete subtasks
          const subtaskDeletionResult = await TodoModel.deleteMany({
            parentId: id,
          }).exec();
          logger.info(
            `Deleted ${subtaskDeletionResult.deletedCount} subtasks for parent ID ${id}`
          );

          // Delete the parent todo itself
          await TodoModel.deleteOne({ _id: id }).exec();

          logger.info(`Successfully deleted todo ${id} and its subtasks.`);
          res.json({
            success: true,
            message: `Todo and its ${subtaskDeletionResult.deletedCount} subtasks deleted successfully`,
          });
        } catch (error: any) {
          logger.error(
            `Failed to delete todo ${req.params.id} or its subtasks: ${error.message}`
          );
          res.status(500).json({
            success: false,
            message: "Failed to delete todo and/or its subtasks",
            error: error.message,
          });
        }
      },
      description: "Delete a todo and all its subtasks by ID",
    },
    // PATCH /reorder - Bulk update task order within a specific status
    {
      path: "/reorder",
      method: "patch",
      handler: async (req: Request, res: Response) => {
        // Expecting: { status: string, updates: [{ _id: string, order: number }] }
        const { status, updates } = req.body;

        // Validate status
        if (!status || !KANBAN_STATUSES.includes(status)) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid or missing 'status' in request body. Must be one of: " +
              KANBAN_STATUSES.join(", "),
          });
        }

        if (!Array.isArray(updates) || updates.length === 0) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid request body: Expected an array of updates `[{ _id: string, order: number }]`",
          });
        }

        try {
          logger.info(
            `Starting bulk reorder for status '${status}' for ${updates.length} items.`
          );
          const bulkOps = updates.map((update) => {
            if (!update._id || typeof update.order !== "number") {
              throw new Error(
                "Invalid update item format. Each item must have _id (string) and order (number)."
              );
            }
            return {
              updateOne: {
                // Ensure we only update items belonging to the specified status
                filter: { _id: update._id, status: status },
                update: {
                  $set: { order: update.order, updatedAt: new Date() },
                },
              },
            };
          });

          const result = await TodoModel.bulkWrite(bulkOps);

          logger.info(
            `Bulk reorder for status '${status}' completed. Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`
          );
          res.json({
            success: true,
            message: `Successfully reordered tasks within status '${status}'. Modified count: ${result.modifiedCount}`,
            data: {
              matchedCount: result.matchedCount,
              modifiedCount: result.modifiedCount,
            },
          });
        } catch (error: any) {
          logger.error(
            `Bulk reorder for status '${status}' failed: ${error.message}`
          );
          res.status(500).json({
            success: false,
            message: "Failed to reorder tasks",
            error: error.message,
          });
        }
      },
      description:
        "Bulk update order of tasks within a specific status. Expects body: { status: string, updates: [{ _id: string, order: number }] }",
    },
  ];

  // Filter out null/undefined routes (e.g., if toggle was conditionally removed)
  return routes.filter((route) => route != null) as RouteDefinition[];
}
