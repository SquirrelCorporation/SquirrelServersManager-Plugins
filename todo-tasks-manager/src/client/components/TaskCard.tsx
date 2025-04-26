import React from "react";
import { Card, Tag, Tooltip, Button, Space } from "antd"; // Use Antd Card
import {
  DeleteOutlined,
  HolderOutlined,
  ClockCircleOutlined,
  PartitionOutlined, // Icon for subtasks
  InboxOutlined, // Import archive icon
} from "@ant-design/icons";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Task } from "../types"; // Import Task type

// Import the helper function (adjust path if necessary)
// Assuming isOverdue is exported from the main component or a utils file
// For now, let's redefine it here for simplicity, but ideally import it.
const isOverdue = (task: Task): boolean => {
  if (!task.dueDate || task.status === "done") {
    // Also check if done
    return false;
  }
  try {
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    dueDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
  } catch (e) {
    console.error("Error parsing dueDate:", e);
    return false;
  }
};

interface TaskCardProps {
  task: Task;
  onDelete?: (taskId: string) => void;
  onEdit?: (task: Task) => void; // Add onEdit prop
  onArchive?: (taskId: string, isArchived: boolean) => Promise<void>; // Add onArchive prop
  isDeleting?: boolean; // Added
  isArchiving?: boolean; // Added
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onDelete,
  onEdit,
  onArchive,
  isDeleting, // Added
  isArchiving, // Added
}) => {
  const {
    attributes,
    listeners, // Drag handle listeners
    setNodeRef,
    transform,
    transition,
    isDragging, // Still needed to hide the original element
  } = useSortable({ id: task._id });

  // Apply transform/transition for sorting animation
  // Hide the original element when dragging, DragOverlay will show the copy
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1, // Hide original when dragging
    marginBottom: 8,
    // Remove cursor, background, border, shadow changes related to isDragging
    // cursor: "grab", // Not strictly needed on the original
    // backgroundColor: isDragging ? "#fafafa" : "white",
    // border: isDragging ? "1px dashed #1890ff" : undefined,
    // boxShadow: isDragging ? "0 2px 8px rgba(0, 0, 0, 0.1)" : undefined,
  };

  const overdue = isOverdue(task);
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const subtaskCount = task.subtasks?.length || 0;
  // Calculate subtask completion (optional, for progress)
  // const completedSubtasks = task.subtasks?.filter(st => st.completed).length || 0;

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click/drag
    onDelete?.(task._id);
  };

  // Separate onClick handler for the card itself
  const handleCardClick = () => {
    onEdit?.(task); // Trigger the onEdit callback with the task
  };

  const handleArchiveClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    onArchive?.(task._id, !!task.isArchived); // Pass ID and current status
  };

  const dragHandleListeners = listeners;

  // Render the card content (can be extracted to a separate component if needed)
  // This is what DragOverlay will also render
  const cardContent = (
    <Card
      size="small"
      styles={{
        body: {
          padding: "12px 16px",
          backgroundColor: "#2d3748", // Dark card background
          borderRadius: "6px",
        },
        header: {
          backgroundColor: "#2d3748", // Dark card background
          color: "#e2e8f0", // Light text
          borderBottom: "1px solid #4a5568",
          padding: "12px 16px",
        },
      }}
      hoverable
      onClick={handleCardClick}
      style={{
        cursor: "pointer",
        backgroundColor: "#2d3748", // Dark card background
        border: "1px solid #4a5568", // Darker border
      }}
      title={
        <span
          style={{
            color: overdue ? "#fc8181" : "#e2e8f0", // Red for overdue, light for normal
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          {task.title}
          {overdue && (
            <Tooltip
              title={`Overdue (Due: ${new Date(
                task.dueDate!
              ).toLocaleDateString()})`}
            >
              <ClockCircleOutlined style={{ color: "#fc8181" }} />
            </Tooltip>
          )}
        </span>
      }
      extra={
        <Space size="small">
          <Tooltip title="Drag to Reorder">
            <Button
              type="text"
              size="small"
              icon={<HolderOutlined style={{ color: "#a0aec0" }} />}
              {...dragHandleListeners}
              style={{ cursor: "grab", touchAction: "none" }}
              onClick={(e) => e.stopPropagation()}
            />
          </Tooltip>
          <Tooltip title="Archive Task">
            <Button
              type="text"
              size="small"
              icon={<InboxOutlined style={{ color: "#a0aec0" }} />}
              onClick={handleArchiveClick}
              loading={isArchiving}
              disabled={isDeleting || isArchiving}
              data-testid="task-card-archive-button"
            />
          </Tooltip>
          <Tooltip title="Delete Task">
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined style={{ color: "#fc8181" }} />}
              onClick={handleDeleteClick}
              loading={isDeleting}
              disabled={isDeleting || isArchiving}
              data-testid="task-card-delete-button"
            />
          </Tooltip>
        </Space>
      }
    >
      {/* Card Body Content */}
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        {/* Display Tags */}
        {task.tags && task.tags.length > 0 && (
          <div>
            <Space size={[4, 8]} wrap>
              {task.tags.map((tag: string) => (
                <Tag key={tag} color="blue" style={{ borderRadius: "4px" }}>
                  {tag}
                </Tag>
              ))}
            </Space>
          </div>
        )}

        {/* Display Subtask Indicator */}
        {hasSubtasks && (
          <Tooltip title={`${subtaskCount} subtask(s)`}>
            <Space size={4}>
              <PartitionOutlined style={{ color: "#a0aec0" }} />
              <span style={{ fontSize: "12px", color: "#a0aec0" }}>
                {subtaskCount}
              </span>
            </Space>
          </Tooltip>
        )}
      </Space>
    </Card>
  );

  return (
    // The sortable node container
    <div
      ref={setNodeRef}
      style={style}
      {...attributes} /* Pass attributes but not listeners */
    >
      {cardContent}
    </div>
  );
};

export default TaskCard;
