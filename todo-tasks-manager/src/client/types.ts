import { KANBAN_STATUSES } from "./constants";

// Define the possible statuses using the constant
export type KanbanStatus = (typeof KANBAN_STATUSES)[number];

export interface Subtask {
  _id: string;
  title: string;
  completed: boolean;
  order: number;
}

export interface Task {
  _id: string;
  title: string;
  description?: string; // Keep optional for now
  tags?: string[];
  dueDate?: string | null; // Allow null or string
  order: number; // Order within its status column
  status: KanbanStatus; // Use the defined type
  subtasks?: Subtask[];
  isArchived?: boolean; // Add isArchived field
  createdAt?: string; // Optional, added by server
  updatedAt?: string; // Optional, added by server
}
