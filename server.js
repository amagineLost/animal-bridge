const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const users = {}; // { username: { serverId, lastSeen } }
const commands = {}; // { serverId: { username: [ { id, from, command, time } ] } }

function now() { return Date.now(); }
const USER_TIMEOUT = 30000; // 30 seconds
const COMMAND_TIMEOUT = 30000; // 30 seconds

// Debug log helper
function debug(...args) {
  console.log('[DEBUG]', ...args);
}

// Health check
app.get('/health', (req, res) => {
  debug('Health check');
  res.json({ status: 'ok', time: now() });
});

// Register user
app.post('/register', (req, res) => {
  debug('POST /register', req.body);
  const { username, serverId } = req.body;
  if (!username || !serverId) {
    debug('Missing username or serverId');
    return res.status(400).json({ error: 'Missing username or serverId' });
  }
  users[username] = { serverId, lastSeen: now() };
  if (!commands[serverId]) commands[serverId] = {};
  if (!commands[serverId][username]) commands[serverId][username] = [];
  debug('Registered user:', username, 'in server:', serverId);
  res.json({ success: true });
});

// Heartbeat
app.post('/heartbeat', (req, res) => {
  debug('POST /heartbeat', req.body);
  const { username } = req.body;
  if (users[username]) users[username].lastSeen = now();
  res.json({ success: true });
});

// Get users
app.get('/users', (req, res) => {
  debug('GET /users');
  // Clean up old users
  for (const [name, info] of Object.entries(users)) {
    if (now() - info.lastSeen > USER_TIMEOUT) {
      debug('Removing inactive user:', name);
      delete users[name];
    }
  }
  res.json(users);
});

// Send command
app.post('/command', (req, res) => {
  debug('POST /command', req.body);
  const { from, to, command, serverId } = req.body;
  if (!from || !to || !command || !serverId) {
    debug('Missing fields in /command');
    return res.status(400).json({ error: 'Missing fields' });
  }
  if (!commands[serverId]) commands[serverId] = {};
  const targets = Array.isArray(to) ? to : [to];
  const cmdObj = {
    id: uuidv4(),
    from,
    command,
    time: now()
  };
  for (const target of targets) {
    if (!commands[serverId][target]) commands[serverId][target] = [];
    commands[serverId][target].push(cmdObj);
    debug(`Queued command for ${target} in server ${serverId}:`, cmdObj);
  }
  res.json({ success: true });
});

// Poll for commands
app.get('/commands', (req, res) => {
  debug('GET /commands', req.query);
  const { username, serverId } = req.query;
  if (!username || !serverId) {
    debug('Missing username or serverId in /commands');
    return res.status(400).json({ error: 'Missing username or serverId' });
  }
  if (!commands[serverId] || !commands[serverId][username]) {
    debug('No commands for', username, 'in server', serverId);
    return res.json([]);
  }
  // Remove expired commands
  commands[serverId][username] = commands[serverId][username].filter(
    cmd => now() - cmd.time < COMMAND_TIMEOUT
  );
  const userCmds = commands[serverId][username];
  commands[serverId][username] = []; // Clear after fetch
  debug('Delivering commands to', username, ':', userCmds);
  res.json(userCmds);
});

// Error handler
app.use((err, req, res, next) => {
  debug('ERROR:', err);
  res.status(500).json({ error: 'Internal server error', details: err.toString() });
});

app.listen(PORT, () => debug(`Bridge backend running on port ${PORT}`));
