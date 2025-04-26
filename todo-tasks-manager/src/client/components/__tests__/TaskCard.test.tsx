import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import TaskCard from "../TaskCard";
import { Task, KanbanStatus, Subtask } from "../../types";
import { KANBAN_STATUSES } from "../../constants";

// Mock the useSortable hook from dnd-kit as it requires DndContext
jest.mock("@dnd-kit/sortable", () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

// Mock the dnd-kit utilities CSS object
jest.mock("@dnd-kit/utilities", () => ({
  CSS: {
    Transform: {
      toString: (transform: any) => transform,
    },
  },
}));

// Sample task data for tests
const baseMockTask: Task = {
  _id: "task-1",
  title: "Test Task Title",
  status: KANBAN_STATUSES[0],
  order: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  tags: [],
  subtasks: [],
  isArchived: false,
  description: "",
  dueDate: null,
};

// Helper to create a date string for yesterday
const getYesterdayDateString = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString();
};

describe("TaskCard Component", () => {
  it("renders task title correctly", () => {
    render(<TaskCard task={baseMockTask} />);
    expect(screen.getByText(/Test Task Title/i)).toBeInTheDocument();
  });

  it("shows overdue icon when task is overdue and not done", () => {
    const overdueTask = {
      ...baseMockTask,
      _id: "task-overdue",
      dueDate: getYesterdayDateString(),
      status: KANBAN_STATUSES[0], // Ensure status is not 'done'
    };
    render(<TaskCard task={overdueTask} />);
    // Ant Design icons often render as <span role="img" aria-label="icon-name">...
    // We can find it by its aria-label (which Antd usually sets)
    // Or more reliably, check for the class name antd adds or a test-id if we add one
    const icon = screen.getByRole("img", { name: /clock-circle/i });
    expect(icon).toBeInTheDocument();
    // Check for red color (might be brittle, depends on implementation)
    expect(icon).toHaveStyle("color: #fc8181");
    // Also check the title text color
    expect(screen.getByText(/Test Task Title/i)).toHaveStyle("color: #fc8181");
  });

  it("does NOT show overdue icon when task is done", () => {
    const doneTask = {
      ...baseMockTask,
      _id: "task-done",
      dueDate: getYesterdayDateString(),
      status:
        KANBAN_STATUSES.find((s) => s === "done") ||
        KANBAN_STATUSES[KANBAN_STATUSES.length - 1], // Find 'done' status
    };
    render(<TaskCard task={doneTask} />);
    const icon = screen.queryByRole("img", { name: /clock-circle/i });
    expect(icon).not.toBeInTheDocument();
  });

  it("does NOT show overdue icon when task has no due date", () => {
    const noDueDateTask = {
      ...baseMockTask,
      _id: "task-no-due-date",
      dueDate: null,
    };
    render(<TaskCard task={noDueDateTask} />);
    const icon = screen.queryByRole("img", { name: /clock-circle/i });
    expect(icon).not.toBeInTheDocument();
  });

  it("displays tags correctly", () => {
    const taskWithTags = {
      ...baseMockTask,
      _id: "task-tags",
      tags: ["frontend", "bug"],
    };
    render(<TaskCard task={taskWithTags} />);

    // Check if tags are rendered
    expect(screen.getByText("frontend")).toBeInTheDocument();
    expect(screen.getByText("bug")).toBeInTheDocument();

    // Optionally, check the Tag component itself if more specific checks are needed
    const tags = screen.getAllByText(/frontend|bug/i);
    expect(tags).toHaveLength(2);
    // Example: Check parent element structure if needed
    // expect(tags[0].closest('.ant-tag')).toBeInTheDocument();
  });

  it("does not render tag section if no tags", () => {
    const taskWithoutTags = { ...baseMockTask, _id: "task-no-tags", tags: [] };
    render(<TaskCard task={taskWithoutTags} />);
    // A simple way is to check if a common tag text is absent
    // Or check if the container for tags doesn't exist, but that's more brittle
    expect(screen.queryByText("frontend")).not.toBeInTheDocument();
    expect(screen.queryByText("bug")).not.toBeInTheDocument();
  });

  it("displays subtask indicator correctly", () => {
    const subtask: Subtask = {
      _id: "sub1",
      title: "Subtask 1",
      completed: false,
      order: 0,
    };
    const taskWithSubtasks = {
      ...baseMockTask,
      _id: "task-subtasks",
      subtasks: [subtask],
    };
    render(<TaskCard task={taskWithSubtasks} />);
    // Check for the icon
    const icon = screen.getByRole("img", { name: /partition/i });
    expect(icon).toBeInTheDocument();
    // Check for the count (rendered as text)
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("does not display subtask indicator if no subtasks", () => {
    const taskWithoutSubtasks = {
      ...baseMockTask,
      _id: "task-no-subtasks",
      subtasks: [],
    };
    render(<TaskCard task={taskWithoutSubtasks} />);
    const icon = screen.queryByRole("img", { name: /partition/i });
    expect(icon).not.toBeInTheDocument();
  });

  // Button click tests
  const setupUser = () => userEvent.setup(); // Setup userEvent for async clicks

  it("calls onEdit when the card body is clicked", async () => {
    const user = setupUser();
    const handleEdit = jest.fn();
    render(<TaskCard task={baseMockTask} onEdit={handleEdit} />);
    await user.click(
      screen.getByText(/Test Task Title/i).closest(".ant-card") ||
        screen.getByText(/Test Task Title/i)
    ); // Click card
    expect(handleEdit).toHaveBeenCalledTimes(1);
    expect(handleEdit).toHaveBeenCalledWith(baseMockTask);
  });

  it("calls onDelete when the delete button is clicked", async () => {
    const user = setupUser();
    const handleDelete = jest.fn();
    render(<TaskCard task={baseMockTask} onDelete={handleDelete} />);

    // Find the button containing the delete icon
    const deleteIcon = screen.getByRole("img", { name: /delete/i });
    const deleteButton = deleteIcon.closest("button");
    expect(deleteButton).toBeInTheDocument(); // Ensure button found

    if (deleteButton) {
      await user.click(deleteButton);
      expect(handleDelete).toHaveBeenCalledTimes(1);
      expect(handleDelete).toHaveBeenCalledWith(baseMockTask._id);
    } else {
      throw new Error("Delete button not found");
    }
  });

  it("calls onArchive when the archive button is clicked", async () => {
    const user = setupUser();
    const handleArchive = jest.fn();
    const taskToArchive = { ...baseMockTask, isArchived: false };
    render(<TaskCard task={taskToArchive} onArchive={handleArchive} />);

    // Find the button containing the archive icon (inbox)
    const archiveIcon = screen.getByRole("img", { name: /inbox/i });
    const archiveButton = archiveIcon.closest("button");
    expect(archiveButton).toBeInTheDocument(); // Ensure button found

    if (archiveButton) {
      await user.click(archiveButton);
      expect(handleArchive).toHaveBeenCalledTimes(1);
      expect(handleArchive).toHaveBeenCalledWith(taskToArchive._id, false);
    } else {
      throw new Error("Archive button not found");
    }
  });

  it("disables buttons when isDeleting or isArchiving is true", () => {
    // Helper function to find buttons using test IDs
    const getButtons = () => ({
      deleteButton: screen.getByTestId("task-card-delete-button"),
      archiveButton: screen.getByTestId("task-card-archive-button"),
    });

    // Test delete loading
    const { rerender } = render(
      <TaskCard task={baseMockTask} isDeleting={true} />
    );
    let buttons = getButtons();
    expect(buttons.deleteButton).toBeDisabled();
    expect(buttons.archiveButton).toBeDisabled();

    // Test archive loading
    rerender(<TaskCard task={baseMockTask} isArchiving={true} />);
    buttons = getButtons();
    expect(buttons.deleteButton).toBeDisabled();
    expect(buttons.archiveButton).toBeDisabled();
  });

  // Add more tests for subtasks, button clicks etc.
});
