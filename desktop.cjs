const {app, BrowserWindow, dialog} = require('electron');
const {autoUpdater} = require('electron-updater');
const path = require('node:path');
app.whenReady().then(() => {
 const win = new BrowserWindow({width:1440,height:960,minWidth:900,minHeight:650,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
 win.loadFile(path.join(__dirname,'dist/index.html'));
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 if(app.isPackaged){
  autoUpdater.on('error',()=>{});
  autoUpdater.on('update-downloaded',async()=>{const r=await dialog.showMessageBox(win,{type:'info',buttons:['Restart and update','Later'],message:'A new version of Bakery Ledger is ready.'});if(r.response===0)autoUpdater.quitAndInstall();});
  autoUpdater.checkForUpdatesAndNotify().catch(()=>{});
 }
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
