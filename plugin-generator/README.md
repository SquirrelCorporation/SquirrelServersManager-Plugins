# Squirrel Servers Manager - Plugin Generator CLI

This CLI tool helps scaffold new plugins for the Squirrel Servers Manager application based on predefined templates.

## Features

*   Generates plugin structure based on existing architecture (`sample-plugin`).
*   Creates necessary configuration files (`manifest.json`, `package.json`, `tsconfig.json`, `webpack.config.js`).
*   Includes basic backend (`index.ts`) and frontend (`React Component`) stubs.
*   Handles EJS templating for dynamic values (plugin name, component name).
*   Optionally include/exclude frontend or backend components.
*   Installs dependencies automatically after generation.

## Installation

1.  **Clone the main repository** if you haven't already.
2.  **Navigate to the generator directory:**
    ```bash
    cd path/to/SquirrelServersManager/plugins/plugin-generator
    ```
3.  **Build the tool:**
    ```bash
    npm install
    npm run build
    ```
4.  **Link the tool for global use:**
    ```bash
    npm link
    ```
    This makes the `generate-ssm-plugin` command available system-wide.

## Usage

Navigate to the directory where you want to create your new plugin (e.g., the root `SquirrelServersManager` directory or the `plugins/` directory) and run:

```bash
generate-ssm-plugin create-plugin <your-plugin-name>
```

Replace `<your-plugin-name>` with the desired name for your plugin (use kebab-case, e.g., `my-cool-plugin`).

### Options

*   `<plugin-name>` (Required): The name of the plugin to create (kebab-case).
*   `--template <template-name>`: Specify the template to use. Currently, only `basic` is available. (Default: `basic`)
*   `--no-frontend`: Exclude the frontend boilerplate (React component, webpack config, client-related scripts/dependencies).
*   `--no-backend`: Exclude the backend boilerplate (`index.ts`, NestJS dependencies, server-related scripts).
*   `-h, --help`: Display help information.

### Examples

*   Create a full-stack plugin named `data-importer`:
    ```bash
    generate-ssm-plugin create-plugin data-importer
    ```
*   Create a backend-only plugin named `api-logger`:
    ```bash
    generate-ssm-plugin create-plugin api-logger --no-frontend
    ```
*   Create a frontend-only plugin named `ui-widget`:
    ```bash
    generate-ssm-plugin create-plugin ui-widget --no-backend
    ```

## Development

*   Source code is in `src/index.ts`.
*   Templates are in `templates/`.
*   Build changes: `npm run build`
*   Run in watch mode: `npm run dev`

## TODO (Potential Improvements)

*   Add more sophisticated templates (e.g., data-source, visualization).
*   Implement interactive prompts for options.
*   Add testing utilities (Task 22.4).
*   Read version from `package.json`.
*   Improve error handling and validation.
*   Allow generation directly into the `plugins/` directory. 