const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'admin-secret';
const DATA_FILE = path.join(__dirname, 'data', 'licenses.json');

if (!fs.existsSync(path.dirname(DATA_FILE))) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}

function loadLicenses() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(data).licenses || [];
    }
  } catch (e) {
    console.error('Error loading licenses:', e.message);
  }
  return [];
}

function saveLicenses(licenses) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ licenses }, null, 2));
  } catch (e) {
    console.error('Error saving licenses:', e.message);
  }
}

function generateCode(prefix) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = prefix + '-';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => (body += chunk.toString()));
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}

function checkAdmin(req) {
  const key = req.headers['x-admin-key'];
  return key === ADMIN_KEY;
}

async function handleRequest(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.url === '/admin/create' && req.method === 'POST') {
    if (!checkAdmin(req)) {
      res.writeHead(401);
      res.end(JSON.stringify({ ok: false, message: 'Unauthorized' }));
      return;
    }

    try {
      const body = await parseBody(req);
      const count = Math.min(body.count || 10, 1000);
      const prefix = (body.prefix || 'EDSCI').toUpperCase();

      const licenses = loadLicenses();
      const newCodes = [];

      for (let i = 0; i < count; i++) {
        let code = generateCode(prefix);
        while (licenses.some(l => l.code === code)) {
          code = generateCode(prefix);
        }
        licenses.push({
          code,
          status: 'available',
          device_id: null,
          created_at: new Date().toISOString(),
          activated_at: null
        });
        newCodes.push(code);
      }

      saveLicenses(licenses);
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true, count, codes: newCodes }));
    } catch (e) {
      res.writeHead(400);
      res.end(JSON.stringify({ ok: false, message: e.message }));
    }
    return;
  }

  if (req.url === '/admin/list' && req.method === 'POST') {
    if (!checkAdmin(req)) {
      res.writeHead(401);
      res.end(JSON.stringify({ ok: false, message: 'Unauthorized' }));
      return;
    }

    try {
      const licenses = loadLicenses();
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true, licenses }));
    } catch (e) {
      res.writeHead(400);
      res.end(JSON.stringify({ ok: false, message: e.message }));
    }
    return;
  }

  if (req.url === '/admin/reset' && req.method === 'POST') {
    if (!checkAdmin(req)) {
      res.writeHead(401);
      res.end(JSON.stringify({ ok: false, message: 'Unauthorized' }));
      return;
    }

    try {
      const body = await parseBody(req);
      const code = body.code;
      const licenses = loadLicenses();
      const license = licenses.find(l => l.code === code);

      if (!license) {
        res.writeHead(404);
        res.end(JSON.stringify({ ok: false, message: 'Code not found' }));
        return;
      }

      license.status = 'available';
      license.device_id = null;
      license.activated_at = null;

      saveLicenses(licenses);
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true, message: `Code ${code} reset to available.` }));
    } catch (e) {
      res.writeHead(400);
      res.end(JSON.stringify({ ok: false, message: e.message }));
    }
    return;
  }

  if (req.url === '/activate' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const code = body.code;
      const deviceId = body.device_id;

      if (!code || !deviceId) {
        res.writeHead(400);
        res.end(JSON.stringify({ ok: false, message: 'Missing code or device_id' }));
        return;
      }

      const licenses = loadLicenses();
      const license = licenses.find(l => l.code === code);

      if (!license) {
        res.writeHead(404);
        res.end(JSON.stringify({ ok: false, message: 'Code not found' }));
        return;
      }

      if (license.status === 'active') {
        res.writeHead(409);
        res.end(JSON.stringify({ ok: false, message: 'Code already activated' }));
        return;
      }

      license.status = 'active';
      license.device_id = deviceId;
      license.activated_at = new Date().toISOString();

      saveLicenses(licenses);
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true, message: 'Code activated' }));
    } catch (e) {
      res.writeHead(400);
      res.end(JSON.stringify({ ok: false, message: e.message }));
    }
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ ok: false, message: 'Not found' }));
}

const server = http.createServer(handleRequest);
server.listen(PORT, () => {
  console.log(`🔐 Learn With ED Science License Admin running on http://localhost:${PORT}`);
  console.log(`Admin Key: ${ADMIN_KEY}`);
  console.log(`Data file: ${DATA_FILE}`);
});
