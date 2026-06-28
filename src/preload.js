const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  callClaude: (opts) => ipcRenderer.invoke('claude-call', opts),
  saveOutput: (opts) => ipcRenderer.invoke('save-output', opts),
  pickFolder: ()     => ipcRenderer.invoke('pick-folder'),        
  writeFiles: (opts) => ipcRenderer.invoke('write-files',  opts),
  extractFileText:  (opts) => ipcRenderer.invoke('extract-file-text',   opts),
  // ── Session persistence ──────────────────────────────────
  pickSessionFolder: ()     => ipcRenderer.invoke('pick-session-folder'),
  saveSession:       (opts) => ipcRenderer.invoke('save-session',       opts),
  loadSession:       (opts) => ipcRenderer.invoke('load-session',       opts),
  checkSession:      (opts) => ipcRenderer.invoke('check-session',      opts),
  generateExcel:   (opts) => ipcRenderer.invoke('generate-excel',    opts),
});