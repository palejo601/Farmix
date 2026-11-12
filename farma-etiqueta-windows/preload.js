// Puente mínimo y seguro entre la app y Windows: abrir un archivo con su programa y «Guardar como».
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('farmaDesktop', {
  open: (name, data) => ipcRenderer.invoke('fe-open', name, data),
  save: (name, data) => ipcRenderer.invoke('fe-save', name, data),
});
