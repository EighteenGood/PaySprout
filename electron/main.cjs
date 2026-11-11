const { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../src/calculator.js');

const smoke = process.argv.includes('--smoke-test');
const smokeOutput = app.isPackaged ? path.join(process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(app.getPath('exe')), '.artifacts') : path.join(__dirname, '../.artifacts');
let mainWindow, widgetWindow, tray, state, statePath, quitting = false, saveTimer;
const defaultState = () => ({ settings: { ...C.DEFAULTS }, records: {}, widgetPosition: null, widgetVisible: true });
function loadState() {
  statePath = path.join(app.getPath('userData'), 'settings.json');
  try {
    const raw = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    state = { ...defaultState(), ...raw, settings: C.normalizeSettings(raw.settings), records: raw.records && typeof raw.records === 'object' ? raw.records : {} };
    if (C.validateSettings(state.settings)) state.settings = { ...C.DEFAULTS };
  } catch { state = defaultState(); }
}
function persist() {
  clearTimeout(saveTimer);
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  const temporary = `${statePath}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(temporary, statePath);
}
function broadcast() {
  for (const window of [mainWindow, widgetWindow]) if (window && !window.isDestroyed()) window.webContents.send('state:changed', state);
  updateTray();
}
function secureWindow(options) {
  const win = new BrowserWindow({ ...options, icon: path.join(__dirname, '../assets/icon.ico'), webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false } });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', event => event.preventDefault());
  return win;
}
function openMain() { if (!mainWindow.isVisible()) mainWindow.show(); mainWindow.focus(); }
function createMain() {
  mainWindow = secureWindow({ width: 1150, height: 810, minWidth: 1000, minHeight: 710, title: '牛马吃草', backgroundColor: '#f6f7f2', autoHideMenuBar: true, show: false });
  mainWindow.loadFile(path.join(__dirname, '../src/index.html'));
  mainWindow.once('ready-to-show', () => { if (!process.argv.includes('--background')) mainWindow.show(); });
  mainWindow.on('close', event => { if (!quitting) { event.preventDefault(); mainWindow.hide(); } });
}
function widgetPosition() {
  const size = { width: 292, height: 166 };
  const saved = state.widgetPosition;
  if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
    const area = screen.getDisplayMatching({ x: saved.x, y: saved.y, ...size }).workArea;
    return { x: Math.round(Math.max(area.x, Math.min(saved.x, area.x + area.width - size.width))), y: Math.round(Math.max(area.y, Math.min(saved.y, area.y + area.height - size.height))), ...size };
  }
  const area = screen.getPrimaryDisplay().workArea;
  return { x: area.x + area.width - size.width - 20, y: area.y + area.height - size.height - 20, ...size };
}
function positionWidget() { if (widgetWindow && !widgetWindow.isDestroyed()) widgetWindow.setBounds(widgetPosition()); }
function createWidget() {
  widgetWindow = secureWindow({ ...widgetPosition(), frame: false, transparent: true, resizable: false, maximizable: false, skipTaskbar: true, alwaysOnTop: state.settings.alwaysOnTop, hasShadow: false, show: false });
  widgetWindow.loadFile(path.join(__dirname, '../src/widget.html'));
  widgetWindow.once('ready-to-show', () => { if (state.widgetVisible) widgetWindow.showInactive(); });
  widgetWindow.on('moved', () => { const [x, y] = widgetWindow.getPosition(); state.widgetPosition = { x, y }; clearTimeout(saveTimer); saveTimer = setTimeout(persist, 350); });
  widgetWindow.on('close', event => { if (!quitting) { event.preventDefault(); setWidgetVisible(false); } });
}
function setWidgetVisible(visible) {
  state.widgetVisible = visible;
  if (visible) { positionWidget(); widgetWindow.showInactive(); } else widgetWindow.hide();
  persist(); broadcast();
}
function updateTray() {
  if (!tray) return;
  const now = new Date();
  const snap = C.snapshot(now, state.settings, state.records[C.dateKey(now)]);
  tray.setToolTip(`牛马吃草 · 今日已赚 ¥${snap.earned.toFixed(2)}`);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '打开我的牧场', click: openMain },
    { label: '显示收入悬浮窗', type: 'checkbox', checked: state.widgetVisible, click: item => setWidgetVisible(item.checked) },
    { type: 'separator' },
    { label: '退出牛马吃草', click: () => { quitting = true; app.quit(); } }
  ]));
}
function wireIPC() {
  ipcMain.handle('state:get', () => state);
  ipcMain.handle('settings:save', (_event, raw) => {
    const settings = C.normalizeSettings(raw);
    const error = C.validateSettings(settings);
    if (error) throw new Error(error);
    if (!smoke && settings.launchAtLogin !== state.settings.launchAtLogin) {
      if (!app.isPackaged) throw new Error('开机启动需要先运行打包后的便携版应用。');
      const exePath = process.env.PORTABLE_EXECUTABLE_FILE || app.getPath('exe');
      app.setLoginItemSettings({ openAtLogin: settings.launchAtLogin, path: exePath, args: ['--background'] });
    }
    state.settings = settings;
    widgetWindow.setAlwaysOnTop(settings.alwaysOnTop);
    persist(); broadcast(); return state;
  });
  ipcMain.handle('today:action', (_event, action) => {
    const now = new Date(), key = C.dateKey(now);
    const record = { ...state.records[key] };
    if (action === 'stop') record.stoppedAt = now.getTime();
    else if (action === 'resume') delete record.stoppedAt;
    else if (action === 'work') { record.workday = true; delete record.stoppedAt; }
    else if (action === 'rest') { record.workday = false; delete record.stoppedAt; }
    else throw new Error('未知操作');
    state.records[key] = record;
    persist(); broadcast(); return state;
  });
  ipcMain.handle('widget:toggle', () => { setWidgetVisible(!state.widgetVisible); return state; });
  ipcMain.handle('widget:reset', () => { state.widgetPosition = null; positionWidget(); setWidgetVisible(true); return state; });
  ipcMain.on('main:open', openMain);
  ipcMain.on('app:quit', () => { quitting = true; app.quit(); });
  ipcMain.on('widget:hide', () => setWidgetVisible(false));
}
async function runSmokeTest() {
  const out = smokeOutput; fs.mkdirSync(out, { recursive: true });
  const errors = [];
  for (const win of [mainWindow, widgetWindow]) {
    win.webContents.on('console-message', (_e, level, message) => { if (level >= 3) errors.push(message); });
    win.webContents.on('render-process-gone', (_e, details) => errors.push(JSON.stringify(details)));
  }
  await Promise.all([mainWindow, widgetWindow].map(win => new Promise(resolve => { if (!win.webContents.isLoading()) resolve(); else win.webContents.once('did-finish-load', resolve); })));
  await new Promise(resolve => setTimeout(resolve, 1500));
  const results = {};
  results.overview = await mainWindow.webContents.executeJavaScript(`({ title: document.title, earned: document.querySelector('#earned').textContent, cards: document.querySelectorAll('.stat-card').length, overflow: document.documentElement.scrollWidth > innerWidth })`);
  fs.writeFileSync(path.join(out, 'overview.png'), (await mainWindow.webContents.capturePage()).toPNG());
  results.widget = await widgetWindow.webContents.executeJavaScript(`({ earned: document.querySelector('#widget-earned').textContent, status: document.querySelector('#widget-status').textContent })`);
  fs.writeFileSync(path.join(out, 'widget.png'), (await widgetWindow.webContents.capturePage()).toPNG());
  await mainWindow.webContents.executeJavaScript(`document.querySelector('[data-view="settings"]').click()`);
  await new Promise(resolve => setTimeout(resolve, 250));
  results.settings = await mainWindow.webContents.executeJavaScript(`({ visible: !document.querySelector('#view-settings').hidden, salary: document.querySelector('[name="salary"]').value, fields: document.querySelectorAll('#settings-form input').length })`);
  fs.writeFileSync(path.join(out, 'settings.png'), (await mainWindow.webContents.capturePage()).toPNG());
  results.formSubmit = await mainWindow.webContents.executeJavaScript(`(async () => { const f = document.querySelector('#settings-form'); f.elements.salary.value = '11000'; f.elements.salary.dispatchEvent(new Event('input', { bubbles: true })); f.requestSubmit(); await new Promise(resolve => setTimeout(resolve, 200)); return (await window.grass.getState()).settings.salary === 11000; })()`);
  results.overnightRejected = await mainWindow.webContents.executeJavaScript(`(async () => { const s = await window.grass.getState(); try { await window.grass.saveSettings({ ...s.settings, startTime: '23:00' }); return false; } catch { return (await window.grass.getState()).settings.startTime === '09:00'; } })()`);
  // Exercise the real preload / IPC / disk persistence / broadcast path using isolated smoke data.
  results.saved = await mainWindow.webContents.executeJavaScript(`(async () => { const s = await window.grass.getState(); await window.grass.saveSettings({ ...s.settings, salary: 12345, restMode: 'single' }); const after = await window.grass.getState(); return after.settings.salary === 12345 && after.settings.restMode === 'single'; })()`);
  results.workAction = await mainWindow.webContents.executeJavaScript(`(async () => { await window.grass.today('work'); const s = await window.grass.getState(); return s.records[GrassCalculator.dateKey(new Date())].workday === true; })()`);
  results.restAction = await mainWindow.webContents.executeJavaScript(`(async () => { await window.grass.today('rest'); return (await window.grass.getState()).records[GrassCalculator.dateKey(new Date())].workday === false; })()`);
  results.widgetToggle = await mainWindow.webContents.executeJavaScript(`(async () => { const before = (await window.grass.getState()).widgetVisible; await window.grass.toggleWidget(); const after = (await window.grass.getState()).widgetVisible; await window.grass.toggleWidget(); return before !== after; })()`);
  const persisted = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  results.persisted = persisted.settings.salary === 12345 && persisted.records[C.dateKey(new Date())].workday === false;
  await mainWindow.webContents.executeJavaScript(`document.querySelector('[data-view="overview"]').click()`);
  mainWindow.setSize(1000, 710);
  await new Promise(resolve => setTimeout(resolve, 250));
  results.minimumWindow = await mainWindow.webContents.executeJavaScript(`({ overflow: document.documentElement.scrollWidth > innerWidth, heroFits: document.querySelector('.earnings-card').getBoundingClientRect().right <= innerWidth })`);
  fs.writeFileSync(path.join(out, 'minimum-window.png'), (await mainWindow.webContents.capturePage()).toPNG());
  results.errors = errors;
  results.passed = results.saved && results.formSubmit && results.overnightRejected && results.persisted && results.workAction && results.restAction && results.widgetToggle && results.settings.visible && results.overview.cards === 4 && !results.overview.overflow && !results.minimumWindow.overflow && results.minimumWindow.heroFits && errors.length === 0;
  fs.writeFileSync(path.join(out, 'smoke-results.json'), JSON.stringify(results, null, 2));
  quitting = true; app.exit(results.passed ? 0 : 1);
}
if (smoke) app.setPath('userData', path.join(smokeOutput, 'smoke-profile'));
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (mainWindow) openMain(); });
  app.whenReady().then(() => {
    loadState(); if (smoke) { state = defaultState(); persist(); } wireIPC(); createMain(); createWidget();
    tray = new Tray(nativeImage.createFromPath(path.join(__dirname, '../assets/tray.png')));
    tray.on('double-click', openMain); updateTray();
    const timer = setInterval(updateTray, 60000); timer.unref();
    screen.on('display-removed', positionWidget); screen.on('display-metrics-changed', positionWidget);
    if (smoke) runSmokeTest().catch(error => { console.error(error); quitting = true; app.exit(1); });
  });
}
app.on('before-quit', () => { quitting = true; if (state) persist(); });
app.on('window-all-closed', () => {});
