import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Button,
  Input,
  Spin,
  message,
  Tooltip,
  Select,
  Tag,
  Space,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import KanbanColumn from "./components/KanbanColumn";
import TaskCard from "./components/TaskCard";
import TaskEditModal from "./components/TaskEditModal";
import { Task, KanbanStatus, Subtask } from "./types";
import { KANBAN_STATUSES } from "./constants";

// Define the base URL for this specific plugin's backend API endpoints.
const API_BASE_URL = "/api/plugins/todo-tasks-manager";

// Define the structure for tasks grouped by status
type TasksByStatus = {
  [key in KanbanStatus]?: Task[];
};

// Type for loading states related to specific tasks
type TaskLoadingStates = { [taskId: string]: boolean };

/**
 * The main React functional component for the Todo List plugin UI.
 * Refactored for Kanban view.
 */
const TodoPluginComponent: React.FC = () => {
  // --- State Management ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskText, setNewTaskText] = useState("");
  const [allTags, setAllTags] = useState<string[]>([]);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isSavingTask, setIsSavingTask] = useState(false);
  // New loading states
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [deletingTaskIds, setDeletingTaskIds] = useState<TaskLoadingStates>({});
  const [archivingTaskIds, setArchivingTaskIds] = useState<TaskLoadingStates>(
    {}
  );

  // --- dnd-kit Sensors ---
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // --- API Interaction Functions ---

  const handleResponse = async (response: Response) => {
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(
        `API Error (${response.status}): ${errorData || response.statusText}`
      );
    }
    if (
      response.status === 204 ||
      response.headers.get("content-length") === "0"
    ) {
      return { success: true, data: null };
    }
    const result = await response.json();
    if (!result.success) {
      throw new Error(
        `API Operation Failed: ${result.message || "No error message provided"}`
      );
    }
    return result;
  };

  const loadTasks = useCallback(
    async (currentFilterTags?: string[], includeArchived = false) => {
      const tagsToFilter = currentFilterTags ?? filterTags;
      setLoading(true);
      try {
        let url = `${API_BASE_URL}/`;
        const queryParams = new URLSearchParams();
        if (tagsToFilter.length > 0) {
          queryParams.append("tags", tagsToFilter.join(","));
        }
        if (includeArchived) {
          queryParams.append("includeArchived", "true");
        }
        const queryString = queryParams.toString();
        if (queryString) {
          url += `?${queryString}`;
        }

        console.log("[TodoPluginComponent] Loading tasks from:", url);
        const response = await fetch(url);
        const result = await handleResponse(response);
        console.log("[TodoPluginComponent] Loaded tasks response:", result);

        if (result.success && Array.isArray(result.data)) {
          const fetchedTasks: Task[] = result.data;
          console.log(
            "[TodoPluginComponent] Setting tasks state with fetched tasks:",
            fetchedTasks.map((t) => ({
              id: t._id,
              title: t.title,
              status: t.status,
            }))
          );
          setTasks(fetchedTasks);
        } else {
          console.warn(
            "[TodoPluginComponent] Invalid tasks data received:",
            result
          );
          setTasks([]);
        }
      } catch (error: any) {
        console.error("[TodoPluginComponent] Load tasks error:", error);
        message.error(`Failed to load tasks: ${error.message}`);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    },
    [filterTags]
  );

  const loadAllTags = useCallback(async () => {
    setLoadingTags(true);
    try {
      const response = await fetch(`${API_BASE_URL}/tags`);
      const result = await handleResponse(response);
      setAllTags((result.data || []).sort());
    } catch (error: any) {
      console.error("Fetch tags error:", error);
      message.error(`Failed to load tags: ${error.message}`);
      setAllTags([]);
    } finally {
      setLoadingTags(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
    loadAllTags();
  }, [loadTasks, loadAllTags]);

  const handleFilterChange = (selectedTags: string[]) => {
    setFilterTags(selectedTags);
    loadTasks(selectedTags);
  };

  const handleAddTask = async () => {
    if (!newTaskText.trim()) return;
    const defaultStatus = KANBAN_STATUSES[0];
    setIsAddingTask(true);

    try {
      console.log(
        "[TodoPluginComponent] Adding new task with title:",
        newTaskText,
        "and status:",
        defaultStatus
      );

      const response = await fetch(`${API_BASE_URL}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskText,
          status: defaultStatus,
          tags: [],
        }),
      });

      const result = await handleResponse(response);
      console.log("[TodoPluginComponent] Server response:", result);

      if (result.success && result.data) {
        const taskStatus = KANBAN_STATUSES.includes(result.data.status as any)
          ? result.data.status
          : defaultStatus;

        const newTask: Task = {
          _id: result.data._id,
          title: result.data.title || newTaskText,
          status: taskStatus,
          description: result.data.description || "",
          order: result.data.order || 0,
          tags: result.data.tags || [],
          subtasks: result.data.subtasks || [],
          isArchived: result.data.isArchived || false,
          dueDate: result.data.dueDate || null,
          createdAt: result.data.createdAt || new Date().toISOString(),
          updatedAt: result.data.updatedAt || new Date().toISOString(),
        };

        console.log("[TodoPluginComponent] Created task object:", newTask);

        setTasks((prevTasks) => {
          const updatedTasks = [...prevTasks, newTask];
          console.log(
            "[TodoPluginComponent] Updating tasks state. Previous count:",
            prevTasks.length,
            "New count:",
            updatedTasks.length,
            "New tasks:",
            updatedTasks.map((t) => ({
              id: t._id,
              title: t.title,
              status: t.status,
            }))
          );
          return updatedTasks;
        });

        setNewTaskText("");
        message.success(`Task "${newTask.title}" added to ${newTask.status}`);
      } else {
        throw new Error("Failed to create task: No data returned from server");
      }
    } catch (error: any) {
      console.error("[TodoPluginComponent] Add task error:", error);
      message.error(`Failed to add task: ${error.message}`);
    } finally {
      setIsAddingTask(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const originalTasks = tasks;
    setDeletingTaskIds((prev) => ({ ...prev, [taskId]: true })); // Start deleting loader
    setTasks((prevTasks) => prevTasks.filter((task) => task._id !== taskId));
    if (editingTask?._id === taskId) {
      handleCloseEditModal();
    }
    try {
      const response = await fetch(`${API_BASE_URL}/${taskId}`, {
        method: "DELETE",
      });
      await handleResponse(response);
      message.success("Task deleted");
    } catch (error: any) {
      console.error("Delete task error:", error);
      message.error(`Failed to delete task: ${error.message}`);
      setTasks(originalTasks); // Revert optimistic update on error
    } finally {
      setDeletingTaskIds((prev) => {
        const newState = { ...prev };
        delete newState[taskId]; // Stop deleting loader
        return newState;
      });
    }
  };

  // --- Edit Modal Handlers ---
  const showEditModal = (task: Task) => {
    setEditingTask(task);
    setIsEditModalVisible(true);
    console.log("Editing task:", task);
  };

  const handleCloseEditModal = () => {
    setIsEditModalVisible(false);
    setEditingTask(null);
  };

  const handleSaveTask = async (updatedTask: Task) => {
    if (!editingTask) return;
    console.log("Saving task:", updatedTask);
    setIsSavingTask(true);
    try {
      const response = await fetch(`${API_BASE_URL}/${editingTask._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: updatedTask.title,
          description: updatedTask.description,
          status: updatedTask.status,
          tags: updatedTask.tags,
          dueDate: updatedTask.dueDate,
        }),
      });
      const result = await handleResponse(response);

      if (result.success) {
        setTasks((prevTasks) =>
          prevTasks.map((task) =>
            task._id === updatedTask._id
              ? { ...(result.data || updatedTask), subtasks: task.subtasks }
              : task
          )
        );
        message.success("Task updated successfully");
        handleCloseEditModal();
        loadAllTags();
      } else {
        message.error("Failed to update task. Please try again.");
      }
    } catch (error: any) {
      console.error("Save task error:", error);
      message.error(`Failed to save task: ${error.message}`);
    } finally {
      setIsSavingTask(false);
    }
  };

  // --- Subtask Handlers (to be passed to Modal) ---
  const handleAddSubtask = async (parentId: string, subtaskTitle: string) => {
    if (!subtaskTitle.trim()) return;
    console.log(`Adding subtask "${subtaskTitle}" to parent ${parentId}`);
    try {
      const response = await fetch(`${API_BASE_URL}/${parentId}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: subtaskTitle }),
      });
      const result = await handleResponse(response);
      if (result.data) {
        setTasks((prevTasks) =>
          prevTasks.map((task) => {
            if (task._id === parentId) {
              return {
                ...task,
                subtasks: [...(task.subtasks || []), result.data],
              };
            }
            return task;
          })
        );
        setEditingTask((prev) =>
          prev
            ? { ...prev, subtasks: [...(prev.subtasks || []), result.data] }
            : null
        );
        message.success("Subtask added");
      } else {
        message.warning("Subtask added, but no data returned from API.");
      }
    } catch (error: any) {
      console.error("Add subtask error:", error);
      message.error(`Failed to add subtask: ${error.message}`);
    }
  };

  const handleDeleteSubtask = async (parentId: string, subtaskId: string) => {
    console.log(`Deleting subtask ${subtaskId} from parent ${parentId}`);
    const originalTasks = tasks;
    setTasks((prevTasks) =>
      prevTasks.map((task) => {
        if (task._id === parentId) {
          return {
            ...task,
            subtasks: (task.subtasks || []).filter(
              (st) => st._id !== subtaskId
            ),
          };
        }
        return task;
      })
    );
    setEditingTask((prev) =>
      prev
        ? {
            ...prev,
            subtasks: (prev.subtasks || []).filter(
              (st) => st._id !== subtaskId
            ),
          }
        : null
    );

    try {
      const response = await fetch(`${API_BASE_URL}/${subtaskId}`, {
        method: "DELETE",
      });
      await handleResponse(response);
      message.success("Subtask deleted");
    } catch (error: any) {
      console.error("Delete subtask error:", error);
      message.error(`Failed to delete subtask: ${error.message}`);
      setTasks(originalTasks);
      setEditingTask((prev) => {
        const parentTask = originalTasks.find((t) => t._id === parentId);
        return prev ? { ...prev, subtasks: parentTask?.subtasks || [] } : null;
      });
    }
  };

  const handleToggleSubtask = async (
    parentId: string,
    subtaskId: string,
    currentCompleted: boolean
  ) => {
    const newCompletedStatus = !currentCompleted;
    console.log(`Toggling subtask ${subtaskId} to ${newCompletedStatus}`);
    const originalTasks = tasks;
    setTasks((prevTasks) =>
      prevTasks.map((task) => {
        if (task._id === parentId) {
          return {
            ...task,
            subtasks: (task.subtasks || []).map((st) =>
              st._id === subtaskId
                ? { ...st, completed: newCompletedStatus }
                : st
            ),
          };
        }
        return task;
      })
    );
    setEditingTask((prev) =>
      prev
        ? {
            ...prev,
            subtasks: (prev.subtasks || []).map((st) =>
              st._id === subtaskId
                ? { ...st, completed: newCompletedStatus }
                : st
            ),
          }
        : null
    );

    try {
      const response = await fetch(`${API_BASE_URL}/${subtaskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: newCompletedStatus }),
      });
      const result = await handleResponse(response);
      const updatedSubtask = result.data;

      if (updatedSubtask) {
        setTasks((prevTasks) =>
          prevTasks.map((task) => {
            if (task._id === parentId) {
              return {
                ...task,
                subtasks: (task.subtasks || []).map((st) =>
                  st._id === subtaskId ? updatedSubtask : st
                ),
              };
            }
            return task;
          })
        );
        setEditingTask((prev) =>
          prev
            ? {
                ...prev,
                subtasks: (prev.subtasks || []).map((st) =>
                  st._id === subtaskId ? updatedSubtask : st
                ),
              }
            : null
        );
        message.success(
          `Subtask marked as ${newCompletedStatus ? "complete" : "incomplete"}`
        );
      } else {
        message.warning(
          "Subtask status updated, but no data returned from API. Reverting optimistic update slightly."
        );
        setTasks(originalTasks);
        setEditingTask((prev) => {
          const parentTask = originalTasks.find((t) => t._id === parentId);
          return prev
            ? { ...prev, subtasks: parentTask?.subtasks || [] }
            : null;
        });
      }
    } catch (error: any) {
      console.error("Toggle subtask error:", error);
      message.error(`Failed to toggle subtask: ${error.message}`);
      setTasks(originalTasks);
      setEditingTask((prev) => {
        const parentTask = originalTasks.find((t) => t._id === parentId);
        return prev ? { ...prev, subtasks: parentTask?.subtasks || [] } : null;
      });
    }
  };

  // --- Archive Handler ---
  const handleArchiveTask = async (taskId: string, isArchived: boolean) => {
    const newArchivedStatus = !isArchived;
    console.log(
      `Setting task ${taskId} archived status to ${newArchivedStatus}`
    );

    const originalTasks = tasks;
    setArchivingTaskIds((prev) => ({ ...prev, [taskId]: true })); // Start archiving loader

    // Optimistically remove from view (assuming loadTasks fetches non-archived)
    setTasks((prevTasks) => prevTasks.filter((task) => task._id !== taskId));
    if (editingTask?._id === taskId) {
      handleCloseEditModal(); // Close modal if archived task is open
    }

    try {
      // Assume PATCH /tasks/:id endpoint updates the isArchived field
      const response = await fetch(`${API_BASE_URL}/${taskId}`, {
        method: "PATCH", // Or PUT
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: newArchivedStatus }),
      });
      await handleResponse(response);
      message.success(`Task ${newArchivedStatus ? "archived" : "unarchived"}`);
      // Task is already removed optimistically if archiving.
      // If unarchiving, we might need a way to show archived tasks or reload.
    } catch (error: any) {
      console.error("Archive task error:", error);
      message.error(`Failed to archive task: ${error.message}`);
      // Revert optimistic update on error
      setTasks(originalTasks);
    } finally {
      setArchivingTaskIds((prev) => {
        const newState = { ...prev };
        delete newState[taskId]; // Stop archiving loader
        return newState;
      });
    }
  };

  // --- Derived State ---
  const tasksByStatus: TasksByStatus = useMemo(() => {
    const defaultStatus = KANBAN_STATUSES[0]; // "pending"
    console.log(
      "[TodoPluginComponent] Calculating tasksByStatus. Current tasks:",
      tasks.map((t) => ({ id: t._id, title: t.title, status: t.status }))
    );

    const grouped: TasksByStatus = {};
    KANBAN_STATUSES.forEach((status) => {
      grouped[status] = [];
    });

    tasks.forEach((task) => {
      let effectiveStatus: KanbanStatus = task.status as KanbanStatus;
      let statusIsValid = KANBAN_STATUSES.includes(effectiveStatus);

      // Check if the status is explicitly the invalid 'Todo' string coming from the backend
      // or if it's not in the KANBAN_STATUSES list.
      const isInvalidTodoString = (task.status as string) === "Todo";
      if (!statusIsValid || isInvalidTodoString) {
        if (isInvalidTodoString || !statusIsValid) {
          // Log warning if it was 'Todo' or just invalid
          console.warn(
            `[TodoPluginComponent] Task ${task._id} has invalid status: '${task.status}'. Mapping to '${defaultStatus}'.`
          );
        }
        effectiveStatus = defaultStatus; // Map to default
        statusIsValid = true; // It's valid now because we mapped it
      }

      // Group tasks, ensuring they are not archived and the status is now considered valid
      if (!task.isArchived && statusIsValid) {
        grouped[effectiveStatus]!.push(task);
        // Optional: log addition
        // console.log(
        //   `[TodoPluginComponent] Added task "${task.title}" to ${effectiveStatus} column`
        // );
      }
    });

    // Sort tasks within each column by order
    for (const status in grouped) {
      grouped[status as KanbanStatus]?.sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0)
      );
    }

    // Log the final grouped tasks
    Object.entries(grouped).forEach(([status, statusTasks]) => {
      console.log(
        `[TodoPluginComponent] ${status} column has ${statusTasks.length} tasks:`,
        statusTasks.map((t) => t.title)
      );
    });

    return grouped;
  }, [tasks]);

  // --- Drag-and-Drop Handling ---

  /**
   * Handles the start of a drag operation.
   * Finds the task being dragged and stores it in state.
   */
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t._id === active.id);
    if (task) {
      setActiveTask(task);
      console.log("Drag Start:", task.title);
    }
  };

  /**
   * Handles dragging over a different column or task.
   * Updates the overColumnStatus state for visual feedback.
   */
  const handleDragOver = (event: DragOverEvent) => {
    console.log("[handleDragOver] Event:", event);
  };

  /**
   * Handles the end of a drag operation.
   * Clears the active task state and performs optimistic updates + API calls.
   */
  const handleDragEnd = async (event: DragEndEvent) => {
    console.log("[handleDragEnd] Event:", event);
    setActiveTask(null);
    const { active, over } = event;

    if (!over) {
      console.log("[handleDragEnd] Dropped outside a droppable area");
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    console.log(`[handleDragEnd] Active ID = ${activeId}, Over ID = ${overId}`);

    if (activeId === overId) {
      console.log("[handleDragEnd] Dragged onto self, no action.");
      return; // No action needed if dropped on itself
    }

    const originalTasks = tasks;
    console.log(
      "[handleDragEnd] Original Tasks:",
      originalTasks.map((t) => ({
        id: t._id,
        title: t.title,
        status: t.status,
        order: t.order,
      }))
    );
    const draggedTaskIndex = originalTasks.findIndex(
      (task) => task._id === activeId
    );
    if (draggedTaskIndex === -1) {
      console.error(
        "[handleDragEnd] Dragged task not found in original state!"
      );
      return;
    }
    const draggedTask = originalTasks[draggedTaskIndex];
    console.log("[handleDragEnd] Dragged Task:", {
      id: draggedTask._id,
      title: draggedTask.title,
      status: draggedTask.status,
      order: draggedTask.order,
    });

    const sourceStatus = draggedTask.status;

    let targetStatus: KanbanStatus;
    let overTaskIndex = -1;
    const overIsColumn = KANBAN_STATUSES.includes(overId as KanbanStatus);
    if (overIsColumn) {
      targetStatus = overId as KanbanStatus;
      console.log(
        `[handleDragEnd] Dropped directly onto column: ${targetStatus}`
      );
    } else {
      overTaskIndex = originalTasks.findIndex((task) => task._id === overId);
      if (overTaskIndex === -1) {
        console.error(
          `[handleDragEnd] Task dropped over unknown element ID: ${overId}`
        );
        return;
      }
      targetStatus = originalTasks[overTaskIndex].status;
      console.log(
        `[handleDragEnd] Dropped onto task: ${overId} in status: ${targetStatus}`
      );
    }

    console.log(
      `[handleDragEnd] Source Status: ${sourceStatus}, Target Status: ${targetStatus}`
    );

    // --- Reordering within the same column ---
    if (sourceStatus === targetStatus) {
      console.log("[handleDragEnd] Reordering within column:", sourceStatus);

      // If dropped on the column header itself when reordering, do nothing
      if (overIsColumn) {
        console.log(
          "[handleDragEnd] Dropped on column header during reorder, no action."
        );
        return;
      }

      const columnTasks = originalTasks
        .filter((task) => task.status === sourceStatus)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      const oldIndexInColumn = columnTasks.findIndex(
        (task) => task._id === activeId
      );
      const newIndexInColumn = columnTasks.findIndex(
        (task) => task._id === overId
      );

      if (oldIndexInColumn === -1 || newIndexInColumn === -1) {
        console.error(
          "[handleDragEnd] Cannot find task indices for reordering within column"
        );
        return;
      }

      console.log(
        `[handleDragEnd] Reordering: Old Index=${oldIndexInColumn}, New Index=${newIndexInColumn}`
      );

      const reorderedColumnTasks = arrayMove(
        columnTasks,
        oldIndexInColumn,
        newIndexInColumn
      ).map((task, index) => ({ ...task, order: index }));

      console.log(
        "[handleDragEnd] Reordered column tasks:",
        reorderedColumnTasks.map((t) => ({ id: t._id, order: t.order }))
      );

      // Optimistic UI Update
      setTasks((prevTasks) => {
        const otherTasks = prevTasks.filter(
          (task) => task.status !== sourceStatus
        );
        const updatedTasks = [...otherTasks, ...reorderedColumnTasks];
        console.log(
          "[handleDragEnd] State after reorder:",
          updatedTasks.map((t) => ({
            id: t._id,
            title: t.title,
            status: t.status,
            order: t.order,
          }))
        );
        return updatedTasks;
      });

      // API Call
      const updates = reorderedColumnTasks.map((task) => ({
        _id: task._id,
        order: task.order,
      }));

      try {
        console.log(
          "[handleDragEnd] Calling /reorder API for status:",
          sourceStatus,
          "Updates:",
          updates
        );
        const response = await fetch(`${API_BASE_URL}/reorder`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: sourceStatus, updates }),
        });
        await handleResponse(response);
        message.success(`Task order updated in ${sourceStatus}`);
      } catch (error: any) {
        console.error("[handleDragEnd] Reorder API error:", error);
        message.error(`Failed to update task order: ${error.message}`);
        console.log("[handleDragEnd] Reverting state due to API error.");
        setTasks(originalTasks); // Revert on error
      }
      // --- Moving to a different column ---
    } else {
      console.log(
        `[handleDragEnd] Moving task ${activeId} from ${sourceStatus} to ${targetStatus}`
      );

      // Optimistic UI Update
      let finalTasksState: Task[] = [];
      setTasks((prevTasks) => {
        // 1. Create the updated task with the new status
        const updatedTask = { ...draggedTask, status: targetStatus };

        // 2. Remove the task from its original position
        const tasksWithoutDragged = prevTasks.filter(
          (task) => task._id !== activeId
        );

        // 3. Get tasks currently in the target column (excluding the one just moved)
        const currentTargetColumnTasks = tasksWithoutDragged
          .filter((task) => task.status === targetStatus)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        // 4. Determine the insertion index in the target column
        let insertionIndex = currentTargetColumnTasks.length; // Default to end
        if (!overIsColumn) {
          // Dropped onto a specific task in the target column
          const overTaskCurrentIndex = currentTargetColumnTasks.findIndex(
            (task) => task._id === overId
          );
          if (overTaskCurrentIndex !== -1) {
            insertionIndex = overTaskCurrentIndex;
          }
        }
        console.log(
          `[handleDragEnd] Calculated insertion index in target column: ${insertionIndex}`
        );

        // 5. Insert the updated task into the target column at the calculated index
        const newTargetColumnTasksWithMoved = [...currentTargetColumnTasks];
        newTargetColumnTasksWithMoved.splice(insertionIndex, 0, updatedTask);

        // 6. Re-assign order for the target column
        const finalTargetColumnTasks = newTargetColumnTasksWithMoved.map(
          (task, index) => ({
            ...task,
            order: index,
          })
        );
        console.log(
          "[handleDragEnd] Target column after move:",
          finalTargetColumnTasks.map((t) => ({ id: t._id, order: t.order }))
        );

        // 7. Re-assign order for the source column (tasks left behind)
        const finalSourceColumnTasks = tasksWithoutDragged
          .filter((task) => task.status === sourceStatus)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((task, index) => ({ ...task, order: index }));
        console.log(
          "[handleDragEnd] Source column after move:",
          finalSourceColumnTasks.map((t) => ({ id: t._id, order: t.order }))
        );

        // 8. Get all other tasks that weren't in source or target
        const otherStatusTasks = tasksWithoutDragged.filter(
          (task) => task.status !== sourceStatus && task.status !== targetStatus
        );

        // 9. Combine all tasks for the final state
        finalTasksState = [
          ...otherStatusTasks,
          ...finalSourceColumnTasks,
          ...finalTargetColumnTasks,
        ];
        console.log(
          "[handleDragEnd] State after move:",
          finalTasksState.map((t) => ({
            id: t._id,
            title: t.title,
            status: t.status,
            order: t.order,
          }))
        );
        return finalTasksState;
      });

      // API Calls
      try {
        // 1. Update the task's status and its initial order in the new column
        const finalDroppedTask = finalTasksState.find(
          (t) => t._id === activeId
        );
        const newOrder = finalDroppedTask ? finalDroppedTask.order : 0;
        console.log(
          `[handleDragEnd] Calling PUT /tasks/${activeId} API. New Status: ${targetStatus}, New Order: ${newOrder}`
        );
        const statusUpdateResponse = await fetch(
          `${API_BASE_URL}/${activeId}`,
          {
            method: "PUT", // Use PUT or PATCH as appropriate for your API
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: targetStatus, order: newOrder }),
          }
        );
        await handleResponse(statusUpdateResponse);
        message.success(`Task moved to ${targetStatus}`);

        // 2. Reorder tasks in the target column (API)
        const targetOrderUpdates = finalTasksState
          .filter((t) => t.status === targetStatus)
          .map((task) => ({ _id: task._id, order: task.order }));
        if (targetOrderUpdates.length > 0) {
          console.log(
            "[handleDragEnd] Calling /reorder API for target status:",
            targetStatus,
            "Updates:",
            targetOrderUpdates
          );
          const reorderTargetResponse = await fetch(`${API_BASE_URL}/reorder`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: targetStatus,
              updates: targetOrderUpdates,
            }),
          });
          await handleResponse(reorderTargetResponse);
          // message.success(`Order updated in ${targetStatus}`); // Maybe too verbose
        }

        // 3. Reorder tasks in the source column (API)
        const sourceOrderUpdates = finalTasksState
          .filter((t) => t.status === sourceStatus)
          .map((task, index) => ({ _id: task._id, order: task.order })); // Use final state order
        if (sourceOrderUpdates.length > 0) {
          console.log(
            "[handleDragEnd] Calling /reorder API for source status:",
            sourceStatus,
            "Updates:",
            sourceOrderUpdates
          );
          const reorderSourceResponse = await fetch(`${API_BASE_URL}/reorder`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: sourceStatus,
              updates: sourceOrderUpdates,
            }),
          });
          await handleResponse(reorderSourceResponse);
          // message.success(`Order updated in ${sourceStatus}`); // Maybe too verbose
        }
      } catch (error: any) {
        console.error("[handleDragEnd] Move task API error:", error);
        message.error(`Failed to move task: ${error.message}`);
        console.log("[handleDragEnd] Reverting state due to API error.");
        setTasks(originalTasks); // Revert on error
      }
    }
  };

  // --- Styles ---
  const boardContainerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "row", // Ensure row direction by default
    gap: "16px",
    overflowX: "auto", // Allow horizontal scrolling if needed
    padding: "10px 4px", // Add a little horizontal padding
    minHeight: "60vh", // Example height
    alignItems: "flex-start", // Align columns at the top
  };

  // Check screen size for responsiveness
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Apply conditional styles for responsiveness
  // Use the base style and override for small screens
  const responsiveBoardStyle: React.CSSProperties = {
    ...boardContainerStyle,
    ...(isSmallScreen && {
      flexDirection: "column",
      overflowX: "hidden",
      alignItems: "stretch",
      gap: "24px", // Increase gap when stacked
    }),
  };

  // --- JSX Rendering ---

  return (
    <div
      style={{
        padding: "20px",
        margin: "0",
        backgroundColor: "#171717", // Dark background
        minHeight: "100vh",
        color: "#e2e8f0", // Light text
      }}
    >
      <h2
        style={{
          marginBottom: "24px",
          color: "#e2e8f0",
          fontSize: "24px",
          fontWeight: "600",
        }}
      >
        Squirrel Board
      </h2>

      <Space.Compact style={{ marginBottom: 20, width: "100%" }}>
        <Input
          placeholder="New Task Title"
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
          onPressEnter={() => handleAddTask()}
          disabled={isAddingTask}
          style={{
            backgroundColor: "#2d3748",
            borderColor: "#4a5568",
            color: "#e2e8f0",
          }}
        />
        <Button
          type="primary"
          onClick={() => handleAddTask()}
          loading={isAddingTask}
        >
          Add Task
        </Button>
      </Space.Compact>

      <div style={{ marginBottom: 20 }}>
        <label style={{ marginRight: 8, color: "#e2e8f0" }}>
          Filter by Tags:
        </label>
        <Select
          mode="multiple"
          allowClear
          style={{ width: "calc(100% - 120px)" }}
          placeholder="Select tags to filter"
          onChange={handleFilterChange}
          value={filterTags}
          loading={loadingTags}
          options={allTags.map((tag) => ({ label: tag, value: tag }))}
          maxTagCount="responsive"
        />
      </div>

      {loading ? (
        <Spin size="large" style={{ display: "block", margin: "50px auto" }} />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div
            style={{
              ...responsiveBoardStyle,
              backgroundColor: "#171717", // Dark background for board
            }}
          >
            {KANBAN_STATUSES.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                title={status
                  .replace("-", " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase())}
                tasks={tasksByStatus[status] || []}
                onDeleteTask={handleDeleteTask}
                onEditTask={showEditModal}
                onArchiveTask={handleArchiveTask}
                deletingTaskIds={deletingTaskIds}
                archivingTaskIds={archivingTaskIds}
                isStacked={isSmallScreen}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeTask ? (
              <div
                style={{
                  boxShadow: "0 8px 16px rgba(0, 0, 0, 0.4)",
                  transform: "rotate(3deg)",
                  cursor: "grabbing",
                }}
              >
                <TaskCard task={activeTask} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <TaskEditModal
        task={editingTask}
        visible={isEditModalVisible}
        onClose={handleCloseEditModal}
        onSave={handleSaveTask}
        allTags={allTags}
        onAddSubtask={handleAddSubtask}
        onDeleteSubtask={handleDeleteSubtask}
        onToggleSubtask={handleToggleSubtask}
        confirmLoading={isSavingTask}
      />
    </div>
  );
};

export default TodoPluginComponent;

function arrayMove<T>(array: T[], from: number, to: number): T[] {
  const newArray = array.slice();
  newArray.splice(
    to < 0 ? newArray.length + to : to,
    0,
    newArray.splice(from, 1)[0]
  );
  return newArray;
}
