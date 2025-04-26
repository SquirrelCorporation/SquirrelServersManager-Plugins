import mongoose, { Document, Schema, Connection, Model } from "mongoose";

// Consistent statuses used by frontend and now backend
export const KANBAN_STATUSES = [
  "pending",
  "in-progress",
  "review",
  "done",
] as const;

type KanbanStatus = (typeof KANBAN_STATUSES)[number]; // Create a type from the array

// Define the Todo interface
export interface ITodo extends Document<string> {
  title: string;
  description?: string;
  status: KanbanStatus;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  parentId?: string | null;
  tags?: string[];
  order?: number;
}

// Define the Todo schema
const todoSchema = new Schema<ITodo>({
  _id: {
    type: String,
    default: () => new mongoose.Types.ObjectId().toString(),
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: KANBAN_STATUSES, // Use the updated statuses for validation
    required: true,
    default: KANBAN_STATUSES[0], // Default to the first status ("pending")
    index: true,
  },
  dueDate: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  parentId: {
    type: String,
    ref: "Todo",
    index: true,
    default: null,
    validate: {
      validator: function (this: ITodo, value: string | null): boolean {
        return value !== this._id;
      },
      message: "Task cannot be a subtask of itself.",
    },
  },
  tags: {
    type: [String],
    index: true,
    default: [],
  },
  order: {
    type: Number,
    index: true,
    default: 0,
  },
});

// Pre-save hook to update the updatedAt field
todoSchema.pre(
  "save",
  function (next: mongoose.CallbackWithoutResultAndOptionalError) {
    this.updatedAt = new Date();
    next();
  }
);

// Create a model factory function that takes a connection
export function createTodoModel(connection: Connection): Model<ITodo> {
  return connection.model<ITodo>("Todo", todoSchema);
}
