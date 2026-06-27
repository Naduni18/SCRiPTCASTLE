const { app, BrowserWindow, ipcMain, dialog, session } = require('electron');
const path = require('path');
const fs = require('fs');

let win;

app.whenReady().then(() => {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'AI Test Agent',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Fix CSP — allow inline styles and all connections
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline'; connect-src *; font-src * data:;"
        ]
      }
    });
  });

  win.loadFile(path.join(__dirname, 'renderer/index.html'));
});

// Save generated files to disk
ipcMain.handle('save-output', async (_, { filename, content }) => {
  const { filePath } = await dialog.showSaveDialog(win, {
    defaultPath: filename,
    filters: [{ name: 'All Files', extensions: ['*'] }]
  });
  if (filePath) {
    fs.writeFileSync(filePath, content, 'utf8');
    return { success: true, path: filePath };
  }
  return { success: false };
});

// ── Pick a folder ────────────────────────────────────────────
ipcMain.handle('pick-folder', async () => {
  const { filePaths } = await dialog.showOpenDialog(win, {
    title: 'Choose folder to save Cypress framework',
    properties: ['openDirectory', 'createDirectory']
  });
  return filePaths?.[0] ?? null;
});

// ── Write multiple files into that folder ────────────────────
ipcMain.handle('write-files', async (_, { folderPath, allFiles }) => {
  let count = 0;
  for (const file of allFiles) {
    try {
      const fullPath = path.join(folderPath, file.name);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, file.content, 'utf8');
      console.log('✓ Written:', fullPath);
      count++;
    } catch (err) {
      console.error('✗ Failed:', file.name, err.message);
    }
  }
  return { success: true, count };
});

ipcMain.handle('extract-file-text', async (_, { name, ext, data }) => {
  const buffer = Buffer.from(data);
  const os   = require('os');
  const path = require('path');
  const fs   = require('fs');

  // Write buffer to temp file
  const tmpPath = path.join(os.tmpdir(), name);
  fs.writeFileSync(tmpPath, buffer);

  if (ext === 'pdf') {
    try {
      // Use pdftotext if available (install poppler-utils)
      const { execSync } = require('child_process');
      const text = execSync(`pdftotext "${tmpPath}" -`).toString();
      fs.unlinkSync(tmpPath);
      return text;
    } catch {
      // Fallback: return placeholder
      fs.unlinkSync(tmpPath);
      return fs.readFileSync(tmpPath, 'utf8').replace(/[^\x20-\x7E\n]/g,' ');
    }
  }

  if (ext === 'docx' || ext === 'doc') {
    try {
      const mammoth = require('mammoth');
      const result  = await mammoth.extractRawText({ path: tmpPath });
      fs.unlinkSync(tmpPath);
      return result.value;
    } catch {
      fs.unlinkSync(tmpPath);
      return 'Could not extract DOCX text — paste requirements manually';
    }
  }

  // Plain text fallback
  return buffer.toString('utf8');
});

// Proxy Claude API calls (keeps key off renderer)
ipcMain.handle('claude-call', async (_, { apiKey, system, user }) => {
  const { net } = require('electron');
  return new Promise((resolve, reject) => {
    const request = net.request({
      method: 'POST',
      url: 'https://api.anthropic.com/v1/messages',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      }
    });
    let body = '';
    request.on('response', (res) => {
      res.on('data', (chunk) => { body += chunk.toString(); });
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data.error) reject(new Error(data.error.message));
          else resolve(data.content.map(b => b.text || '').join(''));
        } catch (e) { reject(e); }
      });
    });
    request.on('error', reject);
    request.write(JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      system,
      messages: [{ role: 'user', content: user }]
    }));
    request.end();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});