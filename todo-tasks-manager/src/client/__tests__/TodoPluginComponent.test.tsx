import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import TodoPluginComponent from "../TodoPluginComponent";
import { Task, KanbanStatus } from "../types";
import { KANBAN_STATUSES } from "../constants";

// Mock child components to simplify testing TodoPluginComponent in isolation
jest.mock("../components/KanbanColumn", () => (props: any) => (
  <div data-testid={`column-${props.status}`}>
    <h3>{props.title}</h3>
    {props.tasks.map((task: Task) => (
      <div key={task._id} data-testid={`task-${task._id}`}>
        {task.title}
      </div>
    ))}
  </div>
));
jest.mock("../components/TaskEditModal", () => (props: any) => (
  <div
    data-testid="task-edit-modal"
    data-visible={props.visible ? "true" : "false"}
  >
    {props.task ? `Editing: ${props.task.title}` : "Modal Closed"}
  </div>
));

// --- Mock fetch ---
global.fetch = jest.fn();

const mockFetch = (url: string, options?: RequestInit): Promise<Response> => {
  console.log(`[Mock Fetch] Called: ${options?.method || "GET"} ${url}`); // Added prefix
  let responseData: any;
  let success = true;
  let status = 200;

  const apiUrlBase = "/api/plugins/todo-tasks-manager";

  if (url.startsWith(`${apiUrlBase}/tags`)) {
    responseData = ["tag1", "tag2"];
    console.log(`[Mock Fetch] Responding with Tags:`, responseData);
  } else if (url === `${apiUrlBase}/` || url.startsWith(`${apiUrlBase}/?`)) {
    // Extract query params if they exist
    const urlParts = url.split("?");
    const queryParams = new URLSearchParams(urlParts[1] || "");
    const includeArchived = queryParams.get("includeArchived") === "true";
    const tagsFilter = queryParams.get("tags")?.split(",");

    // Basic mock data - adjust as needed for filtering tests
    const allMockTasks = [
      {
        _id: "t1",
        title: "Task 1",
        status: KANBAN_STATUSES[0],
        order: 0,
        tags: ["tag1"],
        subtasks: [],
        isArchived: false,
      },
      {
        _id: "t2",
        title: "Task 2",
        status: KANBAN_STATUSES[1],
        order: 0,
        tags: [],
        subtasks: [],
        isArchived: false,
      },
      {
        _id: "t3-archived",
        title: "Archived Task",
        status: KANBAN_STATUSES[2],
        order: 0,
        tags: ["tag2"],
        subtasks: [],
        isArchived: true,
      },
    ];

    responseData = allMockTasks.filter((task) => {
      const archiveMatch = includeArchived || !task.isArchived;
      const tagMatch =
        !tagsFilter ||
        tagsFilter.length === 0 ||
        task.tags.some((tag) => tagsFilter.includes(tag));
      return archiveMatch && tagMatch;
    });

    console.log(`[Mock Fetch] Responding to ${url} with Tasks:`, responseData);
  } else if (url === `${apiUrlBase}/` && options?.method === "POST") {
    // --- POST Task Logic ---
    const body = JSON.parse(options.body as string);
    console.log("[Mock Fetch] POST Task - Received body:", body);

    // Create a complete task object that matches the expected structure
    const newId = `new-${Date.now()}`; // Generate a unique ID
    responseData = {
      _id: newId, // Use the generated ID
      title: body.title,
      status: body.status || KANBAN_STATUSES[0], // Ensure we use a valid status
      description: "",
      order: 0,
      tags: body.tags || [],
      subtasks: [],
      isArchived: false,
      dueDate: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log("[Mock Fetch] POST Task - Responding with:", responseData);
    success = true;
    status = 201; // Created
  } else {
    // --- Unhandled URL ---
    console.warn(`[Mock Fetch] Unhandled URL: ${url}`);
    responseData = null; // Explicitly set to null for unhandled
    success = false;
    status = 404;
  }

  // Construct Final Response
  const finalResponsePayload = { success, data: responseData };

  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status: status,
    json: () => {
      console.log(
        "[Mock Fetch] .json() called, returning:",
        finalResponsePayload
      );
      return Promise.resolve(finalResponsePayload);
    },
    text: () => {
      console.log(
        "[Mock Fetch] .text() called, returning:",
        JSON.stringify(finalResponsePayload)
      );
      return Promise.resolve(JSON.stringify(finalResponsePayload));
    },
    headers: new Headers({
      "Content-Type": "application/json",
      "content-length": JSON.stringify(finalResponsePayload).length.toString(),
    }),
  } as Response);
};

// Helper function to wait for loading spinner to disappear
const waitForLoadingToFinish = async () => {
  await waitFor(
    () => {
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    },
    { timeout: 2000 }
  ); // Increase timeout if needed
};

describe("TodoPluginComponent", () => {
  beforeEach(() => {
    // Reset mocks before each test
    (fetch as jest.Mock).mockImplementation(mockFetch);
    jest.clearAllMocks();
  });

  it("renders columns and initial tasks after loading", async () => {
    render(<TodoPluginComponent />);

    // Wait for initial loading to complete (spinner disappears)
    await waitForLoadingToFinish();

    // Wait specifically for the columns to appear
    await waitFor(() => {
      KANBAN_STATUSES.forEach((status) => {
        expect(screen.getByTestId(`column-${status}`)).toBeInTheDocument();
      });
    });

    // Now, wait specifically for the tasks to appear within the columns
    await waitFor(() => {
      const task1 = screen.getByTestId("task-t1");
      const task2 = screen.getByTestId("task-t2");
      expect(task1).toBeInTheDocument();
      expect(screen.getByText("Task 1")).toBeInTheDocument();
      expect(
        screen.getByTestId(`column-${KANBAN_STATUSES[0]}`)
      ).toContainElement(task1);

      expect(task2).toBeInTheDocument();
      expect(screen.getByText("Task 2")).toBeInTheDocument();
      expect(
        screen.getByTestId(`column-${KANBAN_STATUSES[1]}`)
      ).toContainElement(task2);
    });

    // Verify fetch calls (can be outside waitFor as they are triggered earlier)
    // Use assertNthCalledWith for stricter order checking
    expect(fetch).toHaveBeenNthCalledWith(
      1, // First call
      "/api/plugins/todo-tasks-manager/" // No options object passed for initial GET
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2, // Second call
      expect.stringContaining("/api/plugins/todo-tasks-manager/tags") // No options object passed for initial GET
    );
  });

  it("adds a new task and displays it in the correct column", async () => {
    render(<TodoPluginComponent />);
    const user = userEvent.setup();

    // Wait for initial load
    await waitForLoadingToFinish();
    await waitFor(() => {
      expect(
        screen.getByTestId(`column-${KANBAN_STATUSES[0]}`)
      ).toBeInTheDocument();
    });

    // Find input and button
    const input = screen.getByPlaceholderText("New Task Title");
    const addButton = screen.getByRole("button", { name: /add task/i });

    // Type new task title and click add
    const newTaskTitle = "My New Test Task";
    await user.type(input, newTaskTitle);
    await user.click(addButton);

    // Wait for the success message to appear, indicating state update likely processed
    await screen.findByText(
      `Task "${newTaskTitle}" added to ${KANBAN_STATUSES[0]}`
    );

    // Verify POST request
    // NOTE: We check this *after* the message because the state update happens before the message in the handler
    expect(fetch).toHaveBeenCalledWith(
      "/api/plugins/todo-tasks-manager/",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle,
          status: KANBAN_STATUSES[0], // Default status
          tags: [],
        }),
      })
    );

    // Verify the new task appears in the first column (optimistic update)
    const firstColumn = screen.getByTestId(`column-${KANBAN_STATUSES[0]}`);
    const newTaskElement = await screen.findByText(newTaskTitle);
    expect(firstColumn).toContainElement(newTaskElement);

    // Verify input is cleared
    expect(input).toHaveValue("");
  });

  // Add tests for deleting, editing, archiving, reordering...
});
