import React from "react";
import { Typography, Space, Button, Dropdown, MenuProps } from "antd";
import { PlusOutlined, MoreOutlined } from "@ant-design/icons";
import { useSortable, SortableContext } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import TaskCard from "./TaskCard";
import { Task, KanbanStatus } from "../types";

interface KanbanColumnProps {
  status: KanbanStatus;
  title: string;
  tasks: Task[];
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onArchiveTask: (taskId: string, isArchived: boolean) => Promise<void>;
  deletingTaskIds: { [taskId: string]: boolean };
  archivingTaskIds: { [taskId: string]: boolean };
  isStacked: boolean; // For responsive styling
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  status,
  title,
  tasks,
  onDeleteTask,
  onEditTask,
  onArchiveTask,
  deletingTaskIds,
  archivingTaskIds,
  isStacked,
}) => {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: status,
    data: { type: "column", status }, // Add status to data for onDragOver logic
  });

  const columnStyle: React.CSSProperties = {
    backgroundColor: "#161B22",
    borderRadius: "8px",
    padding: "0px", // Padding will be on header and content area
    margin: isStacked ? "0" : "0 0px", // No horizontal margin, gap is handled by parent
    width: isStacked ? "100%" : "340px", // Increased width
    minWidth: isStacked ? "100%" : "320px", // Increased minWidth
    // height: "fit-content", // Let content define height
    display: "flex",
    flexDirection: "column",
    boxShadow: isDragging
      ? "0 8px 24px rgba(0,0,0,0.3)"
      : "0 4px 12px rgba(0,0,0,0.2)",
    transition: "box-shadow 0.2s ease-in-out",
    opacity: isDragging ? 0.8 : 1,
    transform: CSS.Translate.toString(transform),
    // transition, // Managed by dnd-kit if needed for sorting animations directly
  };

  const columnHeaderStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    borderBottom: "1px solid #30363D",
    // No separate background, inherits from columnStyle
  };

  const tasksContainerStyle: React.CSSProperties = {
    padding: "16px",
    flexGrow: 1,
    overflowY: "auto",
    minHeight: "100px", // Ensure a minimum droppable area
    maxHeight: "calc(100vh - 280px)", // Example max height, adjust as needed
  };

  const menuItems: MenuProps["items"] = [
    {
      key: "add-task",
      label: "Add task to this column",
      icon: <PlusOutlined />,
    },
    { key: "clear-column", label: "Clear all tasks in column", danger: true },
    // Add more column actions here
  ];

  const handleMenuClick: MenuProps["onClick"] = (e) => {
    // message.info(`Clicked on item ${e.key}`);
    if (e.key === "add-task") {
      // TODO: Implement logic to open a quick add task modal/form for this column status
      console.log(`Placeholder: Add task to ${status}`);
    }
    if (e.key === "clear-column") {
      // TODO: Implement logic to clear tasks (with confirmation)
      console.log(`Placeholder: Clear tasks from ${status}`);
    }
  };

  return (
    <div ref={setNodeRef} style={columnStyle} {...attributes}>
      <div style={columnHeaderStyle} {...listeners}>
        {" "}
        {/* Spread listeners for dragging the whole column */}
        <Space align="center">
          <Typography.Text
            style={{
              color: "#8B949E", // Adjusted text color for better contrast on light badge
              fontSize: "12px",
              backgroundColor: "#30363D", // Slightly darker badge background than before
              borderRadius: "50%", // Make it circular
              padding: "0px 6px", // Adjust padding for a small circle
              minWidth: "20px", // Ensure a minimum width for circular shape
              height: "20px", // Ensure a minimum height for circular shape
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "500",
              lineHeight: "20px", // Match height for vertical centering
            }}
          >
            {tasks.length}
          </Typography.Text>
          <Typography.Title
            level={5}
            style={{
              color: "#E6EDF3",
              margin: 0,
              fontSize: "15px",
              fontWeight: 500,
            }}
          >
            {title}
          </Typography.Title>
        </Space>
        <Space>
          <Button
            type="text"
            shape="circle"
            icon={<PlusOutlined style={{ color: "#8B949E" }} />}
            onClick={() => console.log("Quick add for column")}
          />
          <Dropdown
            menu={{ items: menuItems, onClick: handleMenuClick }}
            trigger={["click"]}
          >
            <Button
              type="text"
              shape="circle"
              icon={<MoreOutlined style={{ color: "#8B949E" }} />}
            />
          </Dropdown>
        </Space>
      </div>

      <SortableContext items={tasks.map((task) => task._id)}>
        <div style={tasksContainerStyle}>
          {tasks.length === 0 && (
            <Typography.Text
              style={{
                color: "#4A5568", // Made text much dimmer for empty column placeholder
                textAlign: "center",
                display: "block",
                padding: "20px 0", // Give it some space but keep it subtle
                fontSize: "13px",
              }}
            >
              Drop tasks here
            </Typography.Text>
          )}
          {tasks.map((task, index) => (
            <TaskCard
              key={task._id}
              task={task}
              onDelete={onDeleteTask}
              onEdit={onEditTask}
              onArchive={onArchiveTask}
              isDeleting={deletingTaskIds[task._id]}
              isArchiving={archivingTaskIds[task._id]}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
};

export default KanbanColumn;
