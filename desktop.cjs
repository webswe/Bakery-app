const {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  safeStorage,
  shell,
} = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("node:path");
const fs = require("node:fs/promises");
const { releaseNotes } = require("./release-notes.cjs");

let mainWindow;
let updateState = {
  state: "idle",
  currentVersion: app.getVersion(),
  message: "Bakery Ledger is up to date.",
};

const publishStatus = (patch) => {
  updateState = { ...updateState, ...patch, currentVersion: app.getVersion() };
  if (mainWindow && !mainWindow.isDestroyed())
    mainWindow.webContents.send("updates:status", updateState);
};

const checkForUpdates = async () => {
  if (!app.isPackaged) {
    publishStatus({
      state: "development",
      message: "Update checks run in the installed Windows app.",
    });
    return updateState;
  }
  publishStatus({
    state: "checking",
    checkedAt: new Date().toISOString(),
    message: "Checking for updates…",
    error: "",
  });
  try {
    await autoUpdater.checkForUpdates();
  } catch (error) {
    publishStatus({
      state: "error",
      message: "Could not check for updates.",
      error: error.message,
    });
  }
  return updateState;
};

ipcMain.handle("updates:get-state", () => updateState);
ipcMain.handle("updates:check", checkForUpdates);
ipcMain.handle("updates:install", () => {
  if (updateState.state === "downloaded") autoUpdater.quitAndInstall();
  return updateState;
});
ipcMain.handle("support:app-info", () => ({
  version: app.getVersion(),
  platform: `${process.platform} ${process.getSystemVersion?.() || ""}`.trim(),
}));
ipcMain.handle("support:save-report", async (_event, report) => {
  const folder = path.join(
    app.getPath("documents"),
    "Bakery Ledger Support Reports",
  );
  await fs.mkdir(folder, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const target = path.join(folder, `Bakery-Ledger-support-${stamp}.txt`);
  await fs.writeFile(target, String(report || ""), "utf8");
  return { path: target };
});
ipcMain.handle("support:open-email", (_event, address, subject, body) => {
  const target = `mailto:${encodeURIComponent(String(address || ""))}?subject=${encodeURIComponent(String(subject || ""))}&body=${encodeURIComponent(String(body || ""))}`;
  return shell.openExternal(target);
});
ipcMain.handle("backup:create-device", async (_event, workspace, day) => {
  if (!safeStorage.isEncryptionAvailable())
    return { available: false, message: "Device encryption is unavailable." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(day || "")))
    throw Error("Invalid backup date.");
  const folder = path.join(app.getPath("documents"), "Bakery Ledger Backups");
  await fs.mkdir(folder, { recursive: true });
  const target = path.join(folder, `Bakery-Ledger-device-${day}.bkl-device`);
  const encrypted = safeStorage.encryptString(JSON.stringify(workspace));
  await fs.writeFile(target, encrypted);
  const files = (await fs.readdir(folder))
    .filter((name) =>
      /^Bakery-Ledger-device-\d{4}-\d{2}-\d{2}\.bkl-device$/.test(name),
    )
    .sort();
  for (const old of files.slice(0, -30))
    await fs.unlink(path.join(folder, old));
  return { available: true, path: target, kept: Math.min(30, files.length) };
});
ipcMain.handle("backup:restore-device", async () => {
  if (!safeStorage.isEncryptionAvailable())
    throw Error("Device encryption is unavailable.");
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Open a Bakery Ledger device backup",
    defaultPath: path.join(app.getPath("documents"), "Bakery Ledger Backups"),
    properties: ["openFile"],
    filters: [
      { name: "Bakery Ledger device backup", extensions: ["bkl-device"] },
    ],
  });
  if (result.canceled || !result.filePaths[0]) return null;
  const encrypted = await fs.readFile(result.filePaths[0]);
  return {
    path: result.filePaths[0],
    workspace: JSON.parse(safeStorage.decryptString(encrypted)),
  };
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
  mainWindow.on("focus", () => {
    if (!mainWindow.webContents.isDestroyed()) mainWindow.webContents.focus();
  });

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
    publishStatus({
      state: "current",
      message: "Bakery Ledger is up to date.",
    }),
  );
  autoUpdater.on("download-progress", (progress) =>
    publishStatus({
      state: "downloading",
      progress: Math.round(progress.percent || 0),
      message: `Downloading update… ${Math.round(progress.percent || 0)}%`,
    }),
  );
  autoUpdater.on("error", (error) =>
    publishStatus({
      state: "error",
      message: "Update check failed.",
      error: error.message,
    }),
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
      detail: notes
        ? `What’s new\n\n${notes}`
        : "Restart to install the update. Your saved bakery data will remain on this computer.",
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
