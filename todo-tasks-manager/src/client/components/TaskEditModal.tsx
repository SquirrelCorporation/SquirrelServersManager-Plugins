import React from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  List,
  Checkbox,
  Divider,
  Input as AntInput,
  Button as AntButton,
} from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { Task, KanbanStatus, Subtask } from "../types";
import { KANBAN_STATUSES } from "../constants";
import dayjs from "dayjs";

// Helper to safely parse date string into dayjs object
const parseDate = (
  dateString: string | null | undefined
): dayjs.Dayjs | null => {
  if (!dateString) return null;
  const date = dayjs(dateString);
  return date.isValid() ? date : null;
};

// --- Subtasks Section Component Definition ---
interface SubtasksSectionProps {
  parentId: string;
  subtasks: Subtask[];
  onAdd: (parentId: string, subtaskTitle: string) => Promise<void>;
  onDelete: (parentId: string, subtaskId: string) => Promise<void>;
  onToggle: (
    parentId: string,
    subtaskId: string,
    currentCompleted: boolean
  ) => Promise<void>;
}

// Define SubtasksSection BEFORE TaskEditModal
const SubtasksSection: React.FC<SubtasksSectionProps> = ({
  parentId,
  subtasks,
  onAdd,
  onDelete,
  onToggle,
}) => {
  const [newSubtaskTitle, setNewSubtaskTitle] = React.useState("");
  const [isAdding, setIsAdding] = React.useState(false);

  const handleAddClick = async () => {
    if (!newSubtaskTitle.trim()) return;
    setIsAdding(true);
    try {
      await onAdd(parentId, newSubtaskTitle);
      setNewSubtaskTitle("");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div style={{ marginTop: "20px" }}>
      <Divider>Subtasks</Divider>
      <List
        size="small"
        dataSource={subtasks.sort((a, b) => a.order - b.order)}
        renderItem={(subtask) => (
          <List.Item
            key={subtask._id}
            actions={[
              <AntButton
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => onDelete(parentId, subtask._id)}
                title="Delete subtask"
              />,
            ]}
          >
            <Checkbox
              checked={subtask.completed}
              onChange={() =>
                onToggle(parentId, subtask._id, subtask.completed)
              }
              style={{ marginRight: "8px" }}
            />
            <span
              style={{
                flexGrow: 1,
                textDecoration: subtask.completed ? "line-through" : "none",
              }}
            >
              {subtask.title}
            </span>
          </List.Item>
        )}
        locale={{ emptyText: "No subtasks yet" }}
        style={{ maxHeight: "200px", overflowY: "auto", marginBottom: "10px" }}
      />
      <div style={{ display: "flex", gap: "8px" }}>
        <AntInput
          placeholder="New subtask title"
          value={newSubtaskTitle}
          onChange={(e) => setNewSubtaskTitle(e.target.value)}
          onPressEnter={handleAddClick}
        />
        <AntButton onClick={handleAddClick} type="primary" loading={isAdding}>
          Add
        </AntButton>
      </div>
    </div>
  );
};

// --- Main Modal Component Definition ---
interface TaskEditModalProps {
  task: Task | null;
  visible: boolean;
  onClose: () => void;
  onSave: (updatedTask: Task) => void;
  allTags: string[];
  onAddSubtask: (parentId: string, subtaskTitle: string) => Promise<void>;
  onDeleteSubtask: (parentId: string, subtaskId: string) => Promise<void>;
  onToggleSubtask: (
    parentId: string,
    subtaskId: string,
    currentCompleted: boolean
  ) => Promise<void>;
  confirmLoading?: boolean;
}

const TaskEditModal: React.FC<TaskEditModalProps> = ({
  task,
  visible,
  onClose,
  onSave,
  allTags,
  onAddSubtask,
  onDeleteSubtask,
  onToggleSubtask,
  confirmLoading,
}) => {
  const [form] = Form.useForm();

  React.useEffect(() => {
    if (visible && task) {
      form.setFieldsValue({
        title: task.title,
        status: task.status,
        tags: task.tags || [],
        description: task.description || "",
        dueDate: parseDate(task.dueDate),
      });
    } else if (!visible) {
      form.resetFields();
    }
  }, [task, visible, form]);

  const handleOk = () => {
    form
      .validateFields()
      .then((values) => {
        if (task) {
          const dueDateValue = values.dueDate
            ? (values.dueDate as dayjs.Dayjs).toISOString()
            : null;

          const updatedTask: Task = {
            ...task,
            subtasks: task.subtasks, // Preserve subtasks, handled separately
            title: values.title,
            status: values.status,
            tags: values.tags || [],
            description: values.description || "",
            dueDate: dueDateValue,
          };
          onSave(updatedTask);
        }
      })
      .catch((info) => {
        console.log("Validate Failed:", info);
      });
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Modal
      title={task ? "Edit Task" : "Add Task"}
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="Save"
      cancelText="Cancel"
      width={600}
      styles={{ body: { maxHeight: "70vh", overflowY: "auto" } }}
      confirmLoading={confirmLoading}
    >
      <Form form={form} layout="vertical" name="taskEditForm">
        <Form.Item
          name="title"
          label="Title"
          rules={[{ required: true, message: "Please input the task title!" }]}
        >
          <Input />
        </Form.Item>

        <Form.Item name="description" label="Description">
          <Input.TextArea rows={3} placeholder="Add task details" />
        </Form.Item>

        <Form.Item name="status" label="Status" rules={[{ required: true }]}>
          <Select placeholder="Select status">
            {KANBAN_STATUSES.map((status) => (
              <Select.Option key={status} value={status}>
                {status
                  .replace("-", " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase())}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="dueDate" label="Due Date">
          <DatePicker style={{ width: "100%" }} placeholder="Select due date" />
        </Form.Item>

        <Form.Item name="tags" label="Tags">
          <Select
            mode="tags"
            style={{ width: "100%" }}
            placeholder="Add or select tags"
            options={allTags.map((tag) => ({ label: tag, value: tag }))}
          />
        </Form.Item>

        {/* Subtasks Section */}
        {task && (
          <SubtasksSection
            parentId={task._id}
            subtasks={task.subtasks || []}
            onAdd={onAddSubtask}
            onDelete={onDeleteSubtask}
            onToggle={onToggleSubtask}
          />
        )}
      </Form>
    </Modal>
  );
};

export default TaskEditModal;
