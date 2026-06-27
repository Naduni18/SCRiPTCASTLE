const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  callClaude: (opts) => ipcRenderer.invoke('claude-call', opts),
  saveOutput: (opts) => ipcRenderer.invoke('save-output', opts),
  pickFolder: ()     => ipcRenderer.invoke('pick-folder'),        
  writeFiles: (opts) => ipcRenderer.invoke('write-files',  opts),
  extractFileText:  (opts) => ipcRenderer.invoke('extract-file-text',   opts) 
});