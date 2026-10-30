const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("node:path");

let mainWindow;
let updateState = {
  state: "idle",
  currentVersion: app.getVersion(),
  message: "Bakery Ledger is up to date.",
};

const releaseNotes = (info) => {
  if (Array.isArray(info?.releaseNotes))
    return info.releaseNotes.map((entry) => entry.note || "").filter(Boolean).join("\n\n");
  return typeof info?.releaseNotes === "string" ? info.releaseNotes : "";
};

const publishStatus = (patch) => {
  updateState = { ...updateState, ...patch, currentVersion: app.getVersion() };
  if (mainWindow && !mainWindow.isDestroyed())
    mainWindow.webContents.send("updates:status", updateState);
};

const checkForUpdates = async () => {
  if (!app.isPackaged) {
    publishStatus({ state: "development", message: "Update checks run in the installed Windows app." });
    return updateState;
  }
  publishStatus({ state: "checking", message: "Checking for updates…", error: "" });
  try {
    await autoUpdater.checkForUpdates();
  } catch (error) {
    publishStatus({ state: "error", message: "Could not check for updates.", error: error.message });
  }
  return updateState;
};

ipcMain.handle("updates:get-state", () => updateState);
ipcMain.handle("updates:check", checkForUpdates);
ipcMain.handle("updates:install", () => {
  if (updateState.state === "downloaded") autoUpdater.quitAndInstall();
  return updateState;
});

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 900,
    minHeight: 650,
    icon: path.join(__dirname, "build", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });
  mainWindow.loadFile(path.join(__dirname, "dist", "index.html"));
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  autoUpdater.autoDownload = true;
  autoUpdater.on("checking-for-update", () =>
    publishStatus({ state: "checking", message: "Checking for updates…" }),
  );
  autoUpdater.on("update-available", (info) =>
    publishStatus({
      state: "downloading",
      availableVersion: info.version,
      notes: releaseNotes(info),
      message: `Downloading Bakery Ledger ${info.version}…`,
    }),
  );
  autoUpdater.on("update-not-available", () =>
    publishStatus({ state: "current", message: "Bakery Ledger is up to date." }),
  );
  autoUpdater.on("download-progress", (progress) =>
    publishStatus({
      state: "downloading",
      progress: Math.round(progress.percent || 0),
      message: `Downloading update… ${Math.round(progress.percent || 0)}%`,
    }),
  );
  autoUpdater.on("error", (error) =>
    publishStatus({ state: "error", message: "Update check failed.", error: error.message }),
  );
  autoUpdater.on("update-downloaded", async (info) => {
    const notes = releaseNotes(info);
    publishStatus({
      state: "downloaded",
      availableVersion: info.version,
      notes,
      progress: 100,
      message: `Bakery Ledger ${info.version} is ready to install.`,
    });
    const response = await dialog.showMessageBox(mainWindow, {
      type: "info",
      buttons: ["Restart and update", "Later"],
      defaultId: 0,
      cancelId: 1,
      title: "Bakery Ledger update ready",
      message: `Bakery Ledger ${info.version} is ready.`,
      detail: notes ? `What’s new\n\n${notes}` : "Restart to install the update. Your saved bakery data will remain on this computer.",
    });
    if (response.response === 0) autoUpdater.quitAndInstall();
  });

  mainWindow.webContents.once("did-finish-load", () => {
    publishStatus({});
    setTimeout(checkForUpdates, 1500);
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
