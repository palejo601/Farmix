// FARMA-ETIQUETA para computador (Windows). La misma app web, servida desde app://farma (origen fijo: el historial
// en IndexedDB se conserva entre aperturas) y funcionando sin internet. La cámara web sirve para el escáner en vivo.
const { app, BrowserWindow, protocol, net, ipcMain, shell, dialog, session, Menu } = require('electron');
const path = require('path'), fs = require('fs'), os = require('os');
const { pathToFileURL } = require('url');

protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, allowServiceWorkers: true, stream: true } }]);
if (!app.requestSingleInstanceLock()) app.quit();

const WWW = path.join(__dirname, 'www');
let win;
function createWindow() {
  win = new BrowserWindow({ width: 1200, height: 860, minWidth: 360, title: 'FARMA-ETIQUETA', icon: path.join(WWW, 'icons', 'icon-512.png'), autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  win.loadURL('app://farma/index.html');
  // Vistas del PDF/Word en el navegador (blob:) se abren en ventana propia; enlaces externos, en el navegador del sistema.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) { shell.openExternal(url); return { action: 'deny' }; }
    return { action: 'allow', overrideBrowserWindowOptions: { autoHideMenuBar: true } };
  });
}

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  protocol.handle('app', req => {
    const rel = decodeURIComponent(new URL(req.url).pathname).replace(/^\/+/, '') || 'index.html';
    const file = path.normalize(path.join(WWW, rel));
    if (!file.startsWith(WWW)) return new Response('No permitido', { status: 403 });
    return net.fetch(pathToFileURL(file).toString());
  });
  // Solo se concede la cámara (escáner en vivo); nada más.
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb, details) => cb(perm === 'media' && !(details.mediaTypes || []).includes('audio') || perm === 'clipboard-sanitized-write'));
  session.defaultSession.setPermissionCheckHandler((wc, perm) => perm === 'media' || perm === 'clipboard-sanitized-write');
  createWindow();
});
app.on('window-all-closed', () => app.quit());

const safeName = n => String(n).replace(/[\\/:*?"<>|]+/g, '_').slice(0, 120) || 'archivo';
// VER: se escribe en una carpeta temporal y se abre con el programa predeterminado (Word, lector de PDF…).
ipcMain.handle('fe-open', async (e, name, data) => {
  const dir = path.join(os.tmpdir(), 'FARMA-ETIQUETA'); fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, safeName(name)); fs.writeFileSync(file, Buffer.from(data));
  return shell.openPath(file);      // '' si se abrió; si no, el mensaje de error
});
// GUARDAR / COMPARTIR: «Guardar como» en la carpeta Documentos.
ipcMain.handle('fe-save', async (e, name, data) => {
  const r = await dialog.showSaveDialog(win, { defaultPath: path.join(app.getPath('documents'), safeName(name)) });
  if (r.canceled || !r.filePath) return null;
  fs.writeFileSync(r.filePath, Buffer.from(data)); return r.filePath;
});
