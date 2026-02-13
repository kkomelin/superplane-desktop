# SuperPlane Desktop

[![Release](https://img.shields.io/github/v/release/kkomelin/superplane-desktop)](https://github.com/kkomelin/superplane-desktop/releases)
[![Build](https://github.com/kkomelin/superplane-desktop/actions/workflows/build.yml/badge.svg)](https://github.com/kkomelin/superplane-desktop/actions/workflows/build.yml)

Desktop Electron wrapper that runs [SuperPlane](https://superplane.com/) locally via Docker.

**[🚀 Download for your OS](https://github.com/kkomelin/superplane-desktop/releases)**
_(make sure you have [Docker](https://www.docker.com/) installed)_




## Development

### How it works

A loader screen shows live Docker output while the image is pulled and the container starts. 
Once the app responds on `http://127.0.0.1:3000/health`, the loader transitions to the main app window. 
Closing the window stops the container.

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+)
- [pnpm](https://pnpm.io/)
- [Docker](https://www.docker.com/)

### Setup

```bash
pnpm install
```

### Run

```bash
pnpm start
```

The app will:

1. Pull `ghcr.io/superplanehq/superplane-demo:stable`
2. Start the container on port 3000
3. Open SuperPlane in an Electron window once ready

Data is persisted in the `spdata` Docker volume.

### Build

```bash
pnpm build          # current platform
pnpm build:linux    # AppImage + deb
pnpm build:mac      # dmg
pnpm build:win      # nsis installer
```

Output goes to the `dist/` folder.

### Release

Push a version tag to build all platforms and create a GitHub Release:

```bash
git tag v0.1.0
git push origin v0.1.0
```

You can also trigger a build manually from the Actions tab without creating a release.
