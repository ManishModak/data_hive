# DataHive Standalone

A standalone Node.js implementation of the DataHive extension, reverse-engineered to run data collection jobs without the browser extension interface. This project allows for headless execution of DataHive jobs using Puppeteer.

## Features

- **Standalone Execution**: Runs as a Node.js process, independent of a browser extension context.
- **Job Management**: Automatically fetches, processes, and completes jobs from the DataHive API.
- **Puppeteer Integration**: Uses Puppeteer for "offscreen" and "fetch-and-extract" scraping tasks.
- **Variable Substitution**: Supports dynamic variable substitution in job rules (e.g., `{{vars.url}}`).
- **Robust Logging**: Detailed logging to console and files (`datahive.log` for general logs, `jobs.log` for job-specific details).
- **Device Emulation**: Mimics extension headers and device fingerprints (CPU, OS, etc.).

## Prerequisites

- Node.js (v16 or higher recommended)
- npm

## Installation

1.  Clone the repository or download the source code.
2.  Install dependencies:

    ```bash
    npm install
    ```

## Configuration

1.  Create a `.env` file in the root directory (copy from `.env.example` if available).
2.  Add your DataHive credentials:

    ```env
    DATAHIVE_JWT=your_jwt_token_here
    DATAHIVE_DEVICE_ID=your_device_id_here
    ```

    > **Note**: You can obtain these values by inspecting network requests from the actual DataHive extension in your browser.

## Usage

Start the application:

```bash
npm start
```

The script will:
1.  Authenticate/Ping the DataHive API.
2.  Start a job loop to poll for new jobs.
3.  Execute jobs using Puppeteer or simple fetch requests.
4.  Report results back to the API.

## Docker Support

You can also run the application using Docker. This ensures all dependencies, including Puppeteer's browser binaries, are correctly installed.

### Build the Image

```bash
docker build -t datahive-standalone .
```

### Run the Container

You need to pass your environment variables to the container. You can do this by mounting your `.env` file or passing variables directly.

**Option 1: Mount .env file (Recommended)**

```bash
docker run -d \
  --name datahive \
  -v $(pwd)/.env:/app/.env \
  datahive-standalone
```

**Option 2: Pass environment variables**

```bash
docker run -d \
  --name datahive \
  -e DATAHIVE_JWT=your_jwt_token \
  -e DATAHIVE_DEVICE_ID=your_device_id \
  datahive-standalone
```

## Project Structure

- `datahive.js`: Main application logic. Handles API communication, job management, and scraping.
- `test_substitution.js`: Unit tests for the variable substitution logic.
- `package.json`: Project dependencies and scripts.
- `logs/`: (Created at runtime) Contains `datahive.log` and `jobs.log`.

## Development

To run the substitution logic tests:

```bash
node test_substitution.js
```

## Disclaimer

This project is for educational and research purposes only. It is a reverse-engineered implementation and is not officially supported by DataHive. Use responsibly.
