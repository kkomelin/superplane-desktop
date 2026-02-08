# SuperPlane Desktop

Electron wrapper that runs [SuperPlane](https://superplane.com/) locally via Docker.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/)
- [Docker](https://www.docker.com/) (running)

## Setup

```bash
pnpm install
```

## Run

```bash
pnpm start
```

The app will:

1. Pull `ghcr.io/superplanehq/superplane-demo:stable`
2. Start the container on port 3000
3. Open SuperPlane in an Electron window once ready

Data is persisted in the `spdata` Docker volume.

## Build

```bash
pnpm build          # current platform
pnpm build:linux    # AppImage + deb
pnpm build:mac      # dmg
pnpm build:win      # nsis installer
```

Output goes to the `dist/` folder.

## How it works

A loader screen shows live Docker output while the image is pulled and the container starts. Once the app responds on `http://127.0.0.1:3000`, the loader transitions to the main app window. Closing the window stops the container.
