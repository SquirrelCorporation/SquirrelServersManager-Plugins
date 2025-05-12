import React from "react";
import { Card, Tag, Tooltip, Button, Space, Typography, Progress } from "antd";
import {
  DeleteOutlined,
  HolderOutlined,
  ClockCircleOutlined,
  UnorderedListOutlined,
  InboxOutlined,
  EditOutlined,
  ArrowUpOutlined,
  ArrowRightOutlined,
  ArrowDownOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Task, Subtask } from "../types";

const isOverdue = (task: Task): boolean => {
  if (!task.dueDate || task.status === "done") {
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
  onEdit?: (task: Task) => void;
  onArchive?: (taskId: string, isArchived: boolean) => Promise<void>;
  isDeleting?: boolean;
  isArchiving?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onDelete,
  onEdit,
  onArchive,
  isDeleting,
  isArchiving,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id, data: { type: "task", task } });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    marginBottom: "12px",
    borderRadius: "8px",
    backgroundColor: "#161B22",
    boxShadow: isDragging
      ? "0 8px 16px rgba(0,0,0,0.3)"
      : "0 4px 8px rgba(0,0,0,0.2)",
    cursor: "grab",
    border: "1px solid #30363D",
    padding: "12px",
  };

  const overdue = isOverdue(task);
  const subtaskCount = task.subtasks?.length || 0;

  const handleCardClick = () => {
    onEdit?.(task);
  };

  const getPriorityProps = () => {
    switch (task.priority) {
      case "high":
        return { icon: <ArrowUpOutlined />, color: "#F59E0B", label: "High" };
      case "medium":
        return {
          icon: <ArrowRightOutlined />,
          color: "#38BDF8",
          label: "Medium",
        };
      case "low":
        return { icon: <ArrowDownOutlined />, color: "#34D399", label: "Low" };
      default:
        return { icon: null, color: "#8B949E", label: "" };
    }
  };
  const priorityProps = getPriorityProps();

  const showCoverImagePlaceholder = true;
  const coverImagePlaceholderStyle: React.CSSProperties = {
    height: "140px",
    backgroundColor: "#30363D",
    borderRadius: "4px 4px 0 0",
    marginBottom: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#6E7681",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleCardClick}
    >
      {showCoverImagePlaceholder && (
        <div style={coverImagePlaceholderStyle}>Cover Image Area</div>
      )}

      <div
        style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}
      >
        <Typography.Text
          style={{
            color: overdue ? "#EF4444" : "#E6EDF3",
            fontSize: "15px",
            fontWeight: 400,
            lineHeight: "1.4",
            flexGrow: 1,
          }}
        >
          {task.title}
        </Typography.Text>
        {priorityProps.icon && (
          <Tooltip title={`${priorityProps.label} Priority`}>
            <span
              style={{
                color: priorityProps.color,
                fontSize: "18px",
                marginLeft: "8px",
              }}
            >
              {priorityProps.icon}
            </span>
          </Tooltip>
        )}
      </div>

      {task.description && (
        <Typography.Paragraph
          ellipsis={{ rows: 2, expandable: false }}
          style={{ color: "#8B949E", fontSize: "13px", marginBottom: "10px" }}
        >
          {task.description}
        </Typography.Paragraph>
      )}

      {task.tags && task.tags.length > 0 && (
        <div style={{ marginBottom: "10px" }}>
          <Space size={[4, 4]} wrap>
            {task.tags.map((tag: string) => (
              <Tag
                key={tag}
                style={{
                  backgroundColor: "#30363D",
                  color: "#E6EDF3",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "11px",
                  padding: "1px 6px",
                }}
              >
                {tag}
              </Tag>
            ))}
          </Space>
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "12px",
          paddingTop: "8px",
          borderTop: `1px solid #30363D`,
        }}
      >
        <Space size="middle">
          {subtaskCount > 0 && (
            <Tooltip
              title={`${subtaskCount} ${
                subtaskCount === 1 ? "subtask" : "subtasks"
              }`}
            >
              <Space align="center" size={4}>
                <UnorderedListOutlined
                  style={{ color: "#8B949E", fontSize: "14px" }}
                />
                <Typography.Text style={{ color: "#8B949E", fontSize: "12px" }}>
                  {subtaskCount}
                </Typography.Text>
              </Space>
            </Tooltip>
          )}
        </Space>

        <div></div>
      </div>
    </div>
  );
};

export default TaskCard;
