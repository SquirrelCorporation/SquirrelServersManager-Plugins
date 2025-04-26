# Todo Tasks Manager Plugin

A plugin for managing tasks using a Kanban board interface, backed by its own MongoDB database.

## Features

- **Kanban Board Interface:** Visualize tasks in columns representing their status (e.g., Todo, In Progress, Done).
- **Drag-and-Drop:** Easily move tasks between status columns and reorder tasks within a column.
- **Task Management:** Create, read, update, and delete tasks and subtasks.
- **Task Details:** Set priority, due dates, descriptions, and tags via an editing modal.
- **Subtask Tracking:** View subtask progress indicators on parent tasks and manage subtasks within the edit modal.
- **Archiving:** Archive completed or irrelevant tasks to keep the board clean.
- **Tag Filtering:** Filter visible tasks by tags.
- **Responsive UI:** Adapts to different screen sizes.
- **Integrated Logging:** Leverages the plugin system's logger.

## Installation

1. Make sure MongoDB is running and accessible
2. Build the plugin:
   ```bash
   cd plugins/todo-tasks-manager
   npm install
   npm run build
   ```
3. Restart the Squirrel Servers Manager

## Usage

Access the Todo Tasks Manager Kanban board at:
```
http://your-server-url/plugins/todo-tasks-manager/
```

The API endpoints are available under the base path:
```
http://your-server-url/api/plugins/todo-tasks-manager/
```

## API Endpoints

- `GET /` - Get all active (non-archived) todos, typically sorted by status and order. Supports filtering (e.g., `?tags=tag1,tag2`).
- `GET /?archived=true` - Get all archived todos.
- `GET /:id` - Get a specific todo by ID, including its subtasks.
- `POST /` - Create a new todo. Accepts fields like `title`, `description`, `tags`, `dueDate`, `priority`, and optionally `status` (defaults to 'Todo').
- `PUT /:id` - Update a todo by ID. Can update `title`, `description`, `tags`, `dueDate`, `priority`, `status`, `isArchived`, etc.
- `DELETE /:id` - Delete a todo by ID (including its subtasks).
- `PATCH /reorder` - Reorder tasks within a specific status column. Expects a body like `{ "status": "InProgress", "updates": [{ "_id": "task1_id", "order": 0 }, { "_id": "task2_id", "order": 1 }] }`.
- `POST /:parentId/subtasks` - Create a new subtask for a given parent task ID.
- `GET /:parentId/subtasks` - Get all subtasks for a given parent task ID.
- `PUT /subtasks/:id` - Update a specific subtask by its ID.
- `DELETE /subtasks/:id` - Delete a specific subtask by its ID.

*(Note: Specific implementation details like exact query parameters or request/response bodies might vary slightly.)*

## Development

To work on this plugin:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the TypeScript compiler in watch mode:
   ```bash
   npm run watch
   ```

3. Make your changes to the TypeScript files in the `src` directory
4. The compiled JavaScript will be output to the `dist` directory

## Database

This plugin uses a MongoDB database named `todo_plugin`. The database connection is provided by the plugin system. Key fields in the `todos` collection include:

- `title` (String)
- `description` (String)
- `status` (String, Enum: 'Todo', 'InProgress', 'Done', etc. - Indexed)
- `order` (Number - for ordering within a status)
- `tags` (Array of Strings)
- `dueDate` (Date)
- `priority` (String, Enum: 'low', 'medium', 'high')
- `isArchived` (Boolean, Default: false - Indexed)
- `parentId` (ObjectId, for subtasks)
- `createdAt`, `updatedAt` (Timestamps)

## Logging

The plugin uses the logger provided by the plugin system. All plugin activities are logged with appropriate log levels (info, warn, error, debug) and include the plugin name as a prefix for easy identification in the server logs. 