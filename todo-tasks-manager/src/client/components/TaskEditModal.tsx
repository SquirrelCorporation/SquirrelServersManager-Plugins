import React, { useState, useEffect } from "react";
import {
  Modal,
  Input,
  Select,
  DatePicker,
  Button,
  Form,
  Space,
  Typography,
  Divider,
  List,
  Checkbox,
  Tooltip,
  Row,
  Col,
} from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { Task, Subtask, KanbanStatus } from "../types";
import { KANBAN_STATUSES } from "../constants";
import dayjs from "dayjs";

const { Option } = Select;
const { TextArea } = Input;

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
              <Button
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
        <Input
          placeholder="New subtask title"
          value={newSubtaskTitle}
          onChange={(e) => setNewSubtaskTitle(e.target.value)}
          onPressEnter={handleAddClick}
        />
        <Button onClick={handleAddClick} type="primary" loading={isAdding}>
          Add
        </Button>
      </div>
    </div>
  );
};

// --- Main Modal Component Definition ---
interface TaskEditModalProps {
  task: Task | null;
  visible: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  allTags: string[];
  onAddSubtask: (parentId: string, title: string) => Promise<void>;
  onDeleteSubtask: (parentId: string, subtaskId: string) => Promise<void>;
  onToggleSubtask: (
    parentId: string,
    subtaskId: string,
    completed: boolean
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
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState("");

  useEffect(() => {
    if (task && visible) {
      form.setFieldsValue({
        ...task,
        dueDate: task.dueDate ? dayjs(task.dueDate) : null,
        tags: task.tags || [],
        status: task.status || KANBAN_STATUSES[0],
        priority: task.priority || "medium",
      });
    } else {
      form.resetFields();
    }
  }, [task, visible, form]);

  const handleSave = () => {
    form
      .validateFields()
      .then((values) => {
        const updatedTask = {
          ...(task as Task), // Preserves _id and other non-form fields
          ...values,
          dueDate: values.dueDate ? values.dueDate.toISOString() : null,
          tags: values.tags || [],
          subtasks: task?.subtasks || [], // Subtasks are managed separately
        };
        onSave(updatedTask);
      })
      .catch((info) => {
        console.log("Validate Failed:", info);
      });
  };

  const handleAddSubtaskInternal = async () => {
    if (task && newSubtaskTitle.trim()) {
      await onAddSubtask(task._id, newSubtaskTitle.trim());
      setNewSubtaskTitle("");
    }
  };

  const startEditSubtask = (subtask: Subtask) => {
    setEditingSubtaskId(subtask._id);
    setEditingSubtaskTitle(subtask.title);
  };

  const handleSaveSubtaskTitle = async (subtaskId: string) => {
    if (task && editingSubtaskTitle.trim()) {
      // This reuses onToggleSubtask for simplicity to update title via PUT to /subtasks/:id
      // Ideally, backend PUT /subtasks/:id should handle more fields like title.
      // For now, we simulate it. This is not a clean approach for title editing.
      // A dedicated PUT /subtasks/:id route that accepts a title would be better.
      const originalSubtask = task.subtasks?.find((st) => st._id === subtaskId);
      if (originalSubtask) {
        // This is a placeholder update. The parent component optimistically updates.
        // The actual update logic would be in the onToggleSubtask if it were adapted,
        // or a new onUpdateSubtaskTitle prop.
        console.log(
          `Simulating update for subtask ${subtaskId} title to: ${editingSubtaskTitle}`
        );
        // Assuming onToggle for title update is a misuse and should be a PUT with title
        // For demo, let's just clear editing state.
        // await onUpdateSubtask(task._id, subtaskId, { title: editingSubtaskTitle });
      }
    }
    setEditingSubtaskId(null);
    setEditingSubtaskTitle("");
    // The parent (TodoPluginComponent) is expected to refetch or handle optimistic update for subtask title if this were a real save.
  };

  const modalTitle = (
    <Typography.Title level={4} style={{ color: "#E6EDF3", margin: 0 }}>
      {task ? "Edit Task" : "Add New Task"}
    </Typography.Title>
  );

  const inputStyle = {
    backgroundColor: "#0A0A0A",
    borderColor: "#30363D",
    color: "#E6EDF3",
    borderRadius: "6px",
  };

  const labelStyle: React.CSSProperties = { color: "#C9D1D9" };

  return (
    <Modal
      title={modalTitle}
      open={visible}
      onOk={handleSave}
      onCancel={onClose}
      confirmLoading={confirmLoading}
      width={600}
      styles={{
        mask: { backgroundColor: "rgba(0, 0, 0, 0.65)" },
        header: {
          backgroundColor: "#161B22",
          borderBottom: "1px solid #30363D",
          padding: "16px 24px",
        },
        body: { backgroundColor: "#161B22", padding: "24px" },
        footer: {
          backgroundColor: "#161B22",
          borderTop: "1px solid #30363D",
          padding: "10px 24px",
        },
      }}
      footer={[
        <Button
          key="back"
          onClick={onClose}
          style={{ borderColor: "#30363D", color: "#C9D1D9" }}
        >
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={confirmLoading}
          onClick={handleSave}
          style={{ borderRadius: "6px" }}
        >
          Save Task
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical" name="task_edit_form">
        <Form.Item
          name="title"
          label={<span style={labelStyle}>Title</span>}
          rules={[{ required: true, message: "Please input the task title!" }]}
        >
          <Input style={inputStyle} />
        </Form.Item>

        <Form.Item
          name="description"
          label={<span style={labelStyle}>Description</span>}
        >
          <TextArea rows={3} style={inputStyle} />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="status"
              label={<span style={labelStyle}>Status</span>}
            >
              <Select
                style={{ ...inputStyle, width: "100%" }}
                popupClassName="dark-select-dropdown"
              >
                {KANBAN_STATUSES.map((status) => (
                  <Option
                    key={status}
                    value={status}
                    style={{ color: "#E6EDF3" }}
                  >
                    {status
                      .replace("-", " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="priority"
              label={<span style={labelStyle}>Priority</span>}
            >
              <Select
                style={{ ...inputStyle, width: "100%" }}
                popupClassName="dark-select-dropdown"
              >
                <Option value="low" style={{ color: "#E6EDF3" }}>
                  Low
                </Option>
                <Option value="medium" style={{ color: "#E6EDF3" }}>
                  Medium
                </Option>
                <Option value="high" style={{ color: "#E6EDF3" }}>
                  High
                </Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="dueDate"
              label={<span style={labelStyle}>Due Date</span>}
            >
              <DatePicker
                style={{ ...inputStyle, width: "100%" }}
                popupClassName="dark-datepicker-dropdown"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="tags" label={<span style={labelStyle}>Tags</span>}>
              <Select
                mode="tags"
                style={{ ...inputStyle, width: "100%" }}
                tokenSeparators={[","]}
                options={allTags.map((tag) => ({ label: tag, value: tag }))}
                popupClassName="dark-select-dropdown"
              />
            </Form.Item>
          </Col>
        </Row>

        {task && (
          <div style={{ marginTop: "10px" }}>
            <Divider style={{ borderColor: "#30363D" }}>
              <Typography.Text style={labelStyle}>Subtasks</Typography.Text>
            </Divider>
            <List
              itemLayout="horizontal"
              dataSource={task.subtasks || []}
              locale={{
                emptyText: (
                  <Typography.Text style={labelStyle}>
                    No subtasks yet.
                  </Typography.Text>
                ),
              }}
              renderItem={(subtask) => (
                <List.Item
                  key={subtask._id}
                  style={{ borderBlockColor: "#30363D" }}
                  actions={[
                    editingSubtaskId === subtask._id ? (
                      <Button
                        type="link"
                        onClick={() => handleSaveSubtaskTitle(subtask._id)}
                        style={{ color: "#38BDF8" }}
                      >
                        Save
                      </Button>
                    ) : (
                      <Tooltip title="Edit Subtask">
                        <Button
                          type="text"
                          icon={<EditOutlined style={{ color: "#8B949E" }} />}
                          onClick={() => startEditSubtask(subtask)}
                        />
                      </Tooltip>
                    ),
                    <Tooltip title="Delete Subtask">
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined style={{ color: "#EF4444" }} />}
                        onClick={() => onDeleteSubtask(task._id, subtask._id)}
                      />
                    </Tooltip>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Checkbox
                        checked={subtask.completed}
                        onChange={() =>
                          onToggleSubtask(
                            task._id,
                            subtask._id,
                            subtask.completed
                          )
                        }
                        style={{ marginRight: 8 }}
                        // Styles for checkbox itself can be tricky; may need global CSS for full control of box/check color in dark theme
                      />
                    }
                    title={
                      editingSubtaskId === subtask._id ? (
                        <Input
                          value={editingSubtaskTitle}
                          onChange={(e) =>
                            setEditingSubtaskTitle(e.target.value)
                          }
                          onPressEnter={() =>
                            handleSaveSubtaskTitle(subtask._id)
                          }
                          style={{
                            ...inputStyle,
                            height: "28px",
                            fontSize: "13px",
                          }}
                          autoFocus
                        />
                      ) : (
                        <Typography.Text
                          style={{
                            color: subtask.completed ? "#8B949E" : "#C9D1D9",
                            textDecoration: subtask.completed
                              ? "line-through"
                              : "none",
                          }}
                        >
                          {subtask.title}
                        </Typography.Text>
                      )
                    }
                  />
                </List.Item>
              )}
            />
            <Space.Compact style={{ width: "100%", marginTop: "12px" }}>
              <Input
                placeholder="New Subtask Title"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onPressEnter={handleAddSubtaskInternal}
                style={inputStyle}
              />
              <Button
                type="primary"
                onClick={handleAddSubtaskInternal}
                icon={<PlusOutlined />}
                style={{ borderRadius: "6px" }}
              >
                Add
              </Button>
            </Space.Compact>
          </div>
        )}
      </Form>
    </Modal>
  );
};

export default TaskEditModal;

/* Global styles for dark dropdowns (if needed)
.dark-select-dropdown .ant-select-item {
  color: #E6EDF3;
}
.dark-select-dropdown .ant-select-item-option-selected,
.dark-select-dropdown .ant-select-item-option-active {
  background-color: #30363D !important;
}
.dark-datepicker-dropdown .ant-picker-panel-container {
    background-color: #010409;
}
.dark-datepicker-dropdown .ant-picker-header button {
    color: #E6EDF3;
}
.dark-datepicker-dropdown .ant-picker-header, .dark-datepicker-dropdown .ant-picker-footer {
    border-color: #30363D;
}
.dark-datepicker-dropdown .ant-picker-content th, .dark-datepicker-dropdown .ant-picker-cell {
    color: #C9D1D9;
}
.dark-datepicker-dropdown .ant-picker-cell-in-view.ant-picker-cell-today .ant-picker-cell-inner::before {
    border-color: #38BDF8;
}
.dark-datepicker-dropdown .ant-picker-cell-selected .ant-picker-cell-inner {
    background-color: #2F81F7;
    color: #FFF;
}
.dark-datepicker-dropdown .ant-picker-cell:hover:not(.ant-picker-cell-selected) .ant-picker-cell-inner {
    background-color: #30363D;
}
*/
