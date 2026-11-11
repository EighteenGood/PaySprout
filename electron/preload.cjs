const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('grass', {
  getState: () => ipcRenderer.invoke('state:get'),
  saveSettings: settings => ipcRenderer.invoke('settings:save', settings),
  today: action => ipcRenderer.invoke('today:action', action),
  toggleWidget: () => ipcRenderer.invoke('widget:toggle'),
  resetWidget: () => ipcRenderer.invoke('widget:reset'),
  openMain: () => ipcRenderer.send('main:open'),
  hideWidget: () => ipcRenderer.send('widget:hide'),
  quit: () => ipcRenderer.send('app:quit'),
  onState: callback => { const listener = (_event, state) => callback(state); ipcRenderer.on('state:changed', listener); return () => ipcRenderer.removeListener('state:changed', listener); }
});
