const { app, BrowserWindow, ipcMain } = require("electron");
const { spawn, execSync } = require("child_process");
const path = require("path");
const http = require("http");

const IMAGE = "ghcr.io/superplanehq/superplane-demo:stable";
const PORT = 3000;
const POLL_INTERVAL = 1500;
const POLL_TIMEOUT = 120_000;

let loaderWindow = null;
let containerProcess = null;

function createLoaderWindow() {
  loaderWindow = new BrowserWindow({
    width: 900,
    height: 600,
    resizable: false,
    frame: false,
    transparent: false,
    backgroundColor: "#060b18",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  loaderWindow.loadFile("loader.html");
  loaderWindow.once("ready-to-show", () => {
    loaderWindow.show();
    startSuperPlane();
  });
}

// ── Send messages to the loader ──

function sendStatus(text) {
  loaderWindow?.webContents.send("status-update", text);
}

function sendLog(text) {
  const lines = text.split("\n");
  for (const line of lines) {
    const trimmed = line.trimEnd();
    if (trimmed) loaderWindow?.webContents.send("log-line", trimmed);
  }
}

function sendError(text) {
  loaderWindow?.webContents.send("error", text);
}

// ── Docker helpers ──

function dockerAvailable() {
  try {
    execSync("docker info", { stdio: "ignore", timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}

function pullImage() {
  return new Promise((resolve, reject) => {
    sendStatus("Pulling Docker image…");
    sendLog(`$ docker pull ${IMAGE}`);

    const proc = spawn("docker", ["pull", IMAGE]);

    proc.stdout.on("data", (d) => sendLog(d.toString()));
    proc.stderr.on("data", (d) => sendLog(d.toString()));

    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`docker pull exited with code ${code}`));
    });

    proc.on("error", reject);
  });
}

function runContainer() {
  return new Promise((resolve, reject) => {
    sendStatus("Starting container…");
    sendLog(
      `$ docker run --rm -p ${PORT}:${PORT} -v spdata:/app/data ghcr.io/superplanehq/superplane-demo:stable`,
    );

    containerProcess = spawn("docker", [
      "run",
      "--rm",
      "-p",
      `${PORT}:${PORT}`,
      "-v",
      "spdata:/app/data",
      IMAGE,
    ]);

    let started = false;

    containerProcess.stdout.on("data", (d) => {
      sendLog(d.toString());
      if (!started) {
        started = true;
        resolve();
      }
    });

    containerProcess.stderr.on("data", (d) => {
      sendLog(d.toString());
      if (!started) {
        started = true;
        resolve();
      }
    });

    containerProcess.on("error", (err) => {
      if (!started) reject(err);
    });

    containerProcess.on("close", (code) => {
      if (!started)
        reject(
          new Error(
            `Container exited with code ${code} before producing output`,
          ),
        );
      containerProcess = null;
    });

    // If no output after 5s, resolve anyway and let the poller handle readiness
    setTimeout(() => {
      if (!started) {
        started = true;
        resolve();
      }
    }, 5000);
  });
}

function waitForReady() {
  sendStatus("Waiting for SuperPlane to be ready…");
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      if (Date.now() - start > POLL_TIMEOUT) {
        return reject(new Error("Timed out waiting for SuperPlane to start"));
      }

      const req = http.get(`http://127.0.0.1:${PORT}/`, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          sendLog(`Got HTTP ${res.statusCode} — app is ready.`);
          resolve();
        } else {
          setTimeout(check, POLL_INTERVAL);
        }
        res.resume();
      });

      req.on("error", () => setTimeout(check, POLL_INTERVAL));
      req.setTimeout(3000, () => {
        req.destroy();
        setTimeout(check, POLL_INTERVAL);
      });
    };

    check();
  });
}

function openApp() {
  sendStatus("Launching SuperPlane…");

  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: "#060b18",
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    loaderWindow?.close();
    loaderWindow = null;
  });

  mainWindow.on("closed", () => {
    stopContainer();
    app.quit();
  });
}

function stopContainer() {
  if (containerProcess) {
    containerProcess.kill("SIGTERM");
    containerProcess = null;
  }
}

// ── Main flow ──

async function startSuperPlane() {
  try {
    if (!dockerAvailable()) {
      sendError("Docker is not running. Please start Docker and retry.");
      return;
    }

    await pullImage();
    await runContainer();
    await waitForReady();
    openApp();
  } catch (err) {
    sendLog(`Error: ${err.message}`);
    sendError(`Failed: ${err.message}`);
  }
}

// ── App lifecycle ──

app.whenReady().then(createLoaderWindow);

app.on("window-all-closed", () => {
  stopContainer();
  app.quit();
});

app.on("before-quit", stopContainer);

ipcMain.on("retry", () => {
  stopContainer();
  startSuperPlane();
});
