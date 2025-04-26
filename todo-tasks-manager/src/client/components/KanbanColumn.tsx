import React from "react";
import { Task, KanbanStatus } from "../types";
import TaskCard from "./TaskCard";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";

// Type for loading states passed from parent
type TaskLoadingStates = { [taskId: string]: boolean };

interface KanbanColumnProps {
  title: string;
  status: KanbanStatus;
  tasks: Task[];
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onArchiveTask: (taskId: string, isArchived: boolean) => Promise<void>;
  deletingTaskIds: TaskLoadingStates;
  archivingTaskIds: TaskLoadingStates;
  isStacked?: boolean;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  title,
  status,
  tasks,
  onDeleteTask,
  onEditTask,
  onArchiveTask,
  deletingTaskIds,
  archivingTaskIds,
  isStacked,
}) => {
  const taskIds = tasks.map((task) => task._id);

  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  const columnStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#1f1f1f", // Dark background
    borderRadius: "8px",
    padding: "12px",
    margin: "0",
    width: isStacked ? "100%" : "280px",
    flexShrink: 0,
    height: "fit-content",
    maxHeight: isStacked ? "none" : "calc(80vh - 60px)",
    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
    transition:
      "background-color 0.2s ease, width 0.2s ease, border-color 0.2s ease",
    border: isOver ? "1px solid #4299e1" : "1px solid #333",
  };

  const overStyle: React.CSSProperties = {
    backgroundColor: isOver ? "#2d3748" : "#1f1f1f",
  };

  const headerStyle: React.CSSProperties = {
    padding: "8px 12px",
    marginBottom: "12px",
    fontSize: "16px",
    fontWeight: 600,
    color: "#e2e8f0", // Light text for dark background
    textAlign: "center",
    borderBottom: "1px solid #333",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  };

  const tasksContainerStyle: React.CSSProperties = {
    flexGrow: 1,
    overflowY: "auto",
    padding: "0 4px",
    minHeight: "50px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  };

  const emptyColumnStyle: React.CSSProperties = {
    padding: "16px",
    color: "#718096", // Muted text color
    textAlign: "center",
    border: "2px dashed #2d3748",
    borderRadius: "6px",
    margin: "8px 0",
  };

  return (
    <div ref={setNodeRef} style={{ ...columnStyle, ...overStyle }}>
      <div style={headerStyle}>
        <span>{title}</span>
        <span style={{ color: "#718096", fontSize: "14px" }}>
          {tasks.length}
        </span>
      </div>
      <div style={tasksContainerStyle}>
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task._id}
              task={task}
              onDelete={onDeleteTask}
              onEdit={onEditTask}
              onArchive={onArchiveTask}
              isDeleting={!!deletingTaskIds[task._id]}
              isArchiving={!!archivingTaskIds[task._id]}
            />
          ))}
          {tasks.length === 0 && (
            <div style={emptyColumnStyle}>Drop tasks here</div>
          )}
        </SortableContext>
      </div>
    </div>
  );
};

export default KanbanColumn;
