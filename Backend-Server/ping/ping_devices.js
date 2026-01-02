const { execFile } = require('node:child_process');
const fs = require('node:fs');
const clientDb = require('../../database/clientDb');

const PING_PATHS = ['/bin/ping', '/usr/bin/ping', '/sbin/ping', '/usr/sbin/ping'];
const PING_CMD = PING_PATHS.find(path => fs.existsSync(path));

if (!PING_CMD) {
  console.warn('Warning: Could not locate absolute path for ping. Defaulting to "ping" (less secure).');
}

async function getDevices() {
  const res = await clientDb.query('SELECT "Device_Id", "Ip_Address" FROM "Devices"');
  return res.rows.map(r => ({ id: r.Device_Id, ip: r.Ip_Address }));
}

function pingOnce(ip) {
  return new Promise((resolve) => {
    const cmd = PING_CMD || 'ping';
    execFile(cmd, ['-c', '1', '-W', '1', ip], (error, stdout, stderr) => {
      if (error) {
        resolve({ ok: false, ms: null });
        return;
      }
      const match = stdout.match(/time=([\d.]+)\s*ms/);
      const ms = match ? Math.round(Number(match[1])) : null;
      resolve({ ok: true, ms });
    });
  });
}

async function updateDeviceStatus(id, active) {
  const value = active ? 'active' : 'inactive';
  await clientDb.query('UPDATE "Devices" SET "Status" = $1 WHERE "Device_Id" = $2', [value, id]);
}

async function run() {
  await clientDb.testConnection();
  const devices = await getDevices();
  for (const d of devices) {
    try {
      const res = await pingOnce(d.ip);
      await updateDeviceStatus(d.id, res.ok);
      let message = `${d.ip} • `;
      message += res.ok ? 'Online' : 'Offline';
      if (typeof res.ms === 'number') {
        message += ` • ${res.ms} ms`;
      }
      console.log(message);
    } catch (e) {
      console.error(`Failed to ping ${d.ip}: ${e.message}`);
    }
  }
  process.exit(0);
}

if (require.main === module) {
 await run().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

