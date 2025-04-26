# Todo Tasks Manager Plugin - Kanban Transformation Plan

This document outlines the strategy for transforming the Todo Tasks Manager plugin from a list-based view to a Kanban board interface.

**High-Level Goal:** Create a multi-column Kanban board where tasks can be visualized by status and moved between columns via drag-and-drop.

---

## Phase 1: Backend & Data Model Foundations

**Goal:** Update the backend to support the concept of task status (columns) and ordering within statuses.

**Implementation Details:**

1.  **Define Kanban Columns/Statuses:**
    - [x] Decide on the standard columns (e.g., "Backlog", "Todo", "In Progress", "Review", "Done").
    - [x] Consider if these statuses should be configurable or fixed initially. (Started with fixed: "Todo", "In Progress", "Done").

2.  **Data Model (`src/models/todo.ts`):**
    - [x] Add a `status` field (Type: `String`, Required: `true`, Indexed: `true`).
    - [x] Define allowed values for `status` using `enum`.
    - [x] Set a sensible `default` value (e.g., 'Todo').
    - [x] **Decision:** How does `status` interact with the existing `completed` boolean?
        - [x] Option A: Replace `completed` with `status: 'Done'`. (Recommended for simplicity)
        - [ ] Option B: Keep both, `completed` is true only when `status` is 'Done'.
    - [x] Add index to `status` field.
    - [x] Ensure the `order` field (from previous D&D implementation) is retained for ordering within columns.

3.  **API Changes (`src/routes.ts`):**
    - [x] **Task Creation (`POST /`, `POST /:parentId/subtasks`):
        - [x] Modify handlers to accept an optional `status` field in the request body, defaulting to the defined default (e.g., 'Todo') if not provided.
    - [x] **Task Update (`PUT /:id`):
        - [x] Ensure the handler can update the `status` field.
        - [ ] **Important:** When status changes, potentially reset the `order` field or recalculate based on the new column. (Initial approach: Keep order, handle reordering within columns separately).
    - [ ] **Task Retrieval (`GET /`):
        - [ ] Modify handler to potentially group tasks by status or return all tasks allowing the frontend to group. (Returning all is simpler initially).
        - [x] Ensure sorting includes `status` if needed, then `order`.
    - [x] **Reorder Endpoint (`PATCH /reorder`):
        - [x] Modify endpoint to accept an optional `status` or `columnId` parameter.
        - [x] The `updates` array `[{ _id, order }]` should now represent the new order *within* a specific status/column.
        - [x] Backend logic needs to update the order only for tasks matching the provided status/column.
    - [x] **Status Toggle (`PATCH /toggle/:id`):
        - [x] **Decision:** Remove this endpoint if `completed` is replaced by `status`. (Removed)
    - [ ] **Subtask Retrieval (`GET /:parentId/subtasks`):
        - [x] Ensure subtasks are still retrieved correctly and sorted by their `order`.

4.  **Data Migration (If necessary):**
    - [ ] If replacing `completed`, write a script or logic to migrate existing tasks: // Marked as pending - requires manual script execution
        - [ ] Set `status` to 'Done' where `completed` is `true`.
        - [ ] Set `status` to 'Todo' (or default) where `completed` is `false`.
        - [ ] Assign a default `order` to existing tasks (e.g., based on `createdAt`).

---

## Phase 2: Frontend Kanban UI Refactoring

**Goal:** Replace the current list view with a multi-column Kanban interface using `@dnd-kit`.

**Implementation Details (`src/client/TodoPluginComponent.tsx` and potentially new components):**

1.  **Component Structure:**
    - [x] Refactor `TodoPluginComponent` for Kanban structure. (Removed old list view)
    - [x] Create a `KanbanColumn` component to represent a single status column.
    - [x] Create a `TaskCard` component to represent a single task item within a column.

2.  **Layout:**
    - [x] Use CSS (Flexbox) to create a horizontal layout for the columns.
    - [x] Ensure columns scroll vertically if content overflows (`KanbanColumn.tsx`).

3.  **Data Fetching & State Management:**
    - [x] Update `loadTasks` to fetch all relevant tasks.
    - [x] Restructure component state to store tasks grouped by status (`tasksByStatus` using `useMemo`).
    - [x] Update filtering logic (tags) to work with the new grouped state. (Verified)

4.  **Drag-and-Drop Setup:**
    - [x] Wrap the entire board in a single `DndContext`.
    - [ ] **Within Columns:**
        - [x] Wrap the task card area of each `KanbanColumn` in a `SortableContext`.
        - [x] Make `TaskCard` sortable using `useSortable`.
        - [x] Update `onDragEnd` to handle reordering *within* the same column: (Basic implementation added)
            - [x] Identify source and target columns/statuses.
            - [x] If same column, calculate new order and call `PATCH /reorder` with the specific status and updated orders.
            - [x] Update local state optimistically.
    - [ ] **Between Columns:**
        - [x] Update `onDragEnd` to handle moving cards to a *different* column: (Basic implementation added)
            - [x] Identify source and target columns/statuses.
            - [x] Update the task's `status` locally (optimistic update).
            - [x] Trigger an API call (`PUT /:id`) to update the task's status on the backend.
            - [x] Recalculate order for both source and destination columns if necessary (optimistic update + API call for target column order).
    - [x] **Sensors & Styling:** Configure basic sensors (`PointerSensor`, `KeyboardSensor`). Use `DragOverlay` for better visual feedback during drag. Hide original item while dragging. Provide visual feedback during drag operations (column highlighting via `onDragOver` added). (Further improvements possible, like drop placeholders)

5.  **Column Rendering:**
    - [x] Implement `KanbanColumn.tsx` to display its title and render `TaskCard` components based on the tasks passed to it.
    - [x] Wrap the task card area in `SortableContext`. (Done in previous step)

6.  **Task Card Rendering:**
    - [x] Display essential task info (title, tags, overdue indicator) in `TaskCard.tsx`.
    - [x] Include controls (delete button, drag handle) in `TaskCard.tsx`.
    - [x] Adapt overdue styling in `TaskCard.tsx`.

7.  **Subtasks:**
    - [x] **Decision:** How to display subtasks in Kanban?
        - [x] Option A: Show a subtask count/progress indicator on the parent `TaskCard`. Clicking opens a modal/detail view. (Recommended for cleaner cards) - **Decision Made**
        - [ ] Option B: Render subtasks directly within the `TaskCard` (can make cards cluttered).
        - [ ] Option C: Subtasks are not displayed directly on the board, only in a detail view.
    - [x] Implement the chosen display method (Indicator added to `TaskCard.tsx`. Backend needs to provide subtask data). Subtasks themselves are likely not independently draggable on the board initially.

8.  **Adapt Existing Features:**
    - [x] Ensure tag filtering still works with the new structure. (Verified)
    - [ ] Adapt "Add Task" / "Add Subtask" modals:
        - [x] Assign default status on creation (`handleAddTask`).
        - [ ] Potentially allow selecting status on creation/edit (future enhancement).
    - [x] Ensure task deletion works correctly from cards (`handleDeleteTask` passed down).

---

## Phase 3: Polish & Refinements

- [x] Add UI for creating/editing task details (including status, tags, description, due date) via a modal (`TaskEditModal.tsx`).
- [x] Implement subtask viewing and management (add, toggle, delete) within the edit modal.
- [x] Implement the "Intuitive Date Picker" for due dates (`DatePicker` added to modal).
- [x] Implement the "Archiving" feature (Frontend: Added archive button to card, handler in main component. Backend: Assumes API updates `isArchived` flag and `GET /` filters by default).
- [x] Add loading indicators for column/card operations.
- [x] Improve visual styling and responsiveness.
- [ ] Add accessibility considerations for drag-and-drop.
- [ ] Write tests for new components and logic.
    - **Strategy:**
        - **Unit Tests (Jest + RTL):** Focus on pure functions (e.g., helpers) and isolated component rendering logic (e.g., TaskCard displays correct title, icon, tags).
        - **Integration Tests (Jest + RTL + MSW):** Test component interactions (e.g., TodoPluginComponent drag-and-drop, TaskEditModal save) by mocking API calls (`fetch`).
        - **E2E Tests (Optional - Cypress/Playwright):** Test full user flows through the browser against a backend.
    - **Initial Focus:**
        - Set up Jest + RTL environment. (Done)
        - [x] Test `TaskCard` rendering based on props. (Done)
        - Test `TodoPluginComponent` interactions with mocked API calls.
- [ ] Update `README.md`.

---