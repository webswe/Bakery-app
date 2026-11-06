const { contextBridge, ipcRenderer } = require("electron");

const statusChannel = "updates:status";

contextBridge.exposeInMainWorld("bakeryDesktop", {
  getUpdateState: () => ipcRenderer.invoke("updates:get-state"),
  checkForUpdates: () => ipcRenderer.invoke("updates:check"),
  installUpdate: () => ipcRenderer.invoke("updates:install"),
  getAppInfo: () => ipcRenderer.invoke("support:app-info"),
  saveSupportReport: (report) =>
    ipcRenderer.invoke("support:save-report", report),
  openSupportEmail: (address, subject, body) =>
    ipcRenderer.invoke("support:open-email", address, subject, body),
  createDeviceBackup: (workspace, day) =>
    ipcRenderer.invoke("backup:create-device", workspace, day),
  restoreDeviceBackup: () => ipcRenderer.invoke("backup:restore-device"),
  onUpdateStatus: (listener) => {
    const handler = (_event, status) => listener(status);
    ipcRenderer.on(statusChannel, handler);
    return () => ipcRenderer.removeListener(statusChannel, handler);
  },
});
