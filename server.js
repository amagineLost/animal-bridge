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

// Register user
app.post('/register', (req, res) => {
  const { username, serverId } = req.body;
  if (!username || !serverId) return res.status(400).send('Missing username or serverId');
  users[username] = { serverId, lastSeen: now() };
  if (!commands[serverId]) commands[serverId] = {};
  if (!commands[serverId][username]) commands[serverId][username] = [];
  res.json({ success: true });
});

// Heartbeat
app.post('/heartbeat', (req, res) => {
  const { username } = req.body;
  if (users[username]) users[username].lastSeen = now();
  res.json({ success: true });
});

// Get users
app.get('/users', (req, res) => {
  // Clean up old users
  for (const [name, info] of Object.entries(users)) {
    if (now() - info.lastSeen > USER_TIMEOUT) delete users[name];
  }
  res.json(users);
});

// Send command
app.post('/command', (req, res) => {
  const { from, to, command, serverId } = req.body;
  if (!from || !to || !command || !serverId) return res.status(400).send('Missing fields');
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
  }
  res.json({ success: true });
});

// Poll for commands
app.get('/commands', (req, res) => {
  const { username, serverId } = req.query;
  if (!username || !serverId) return res.status(400).send('Missing username or serverId');
  if (!commands[serverId] || !commands[serverId][username]) return res.json([]);
  const userCmds = commands[serverId][username];
  commands[serverId][username] = []; // Clear after fetch
  res.json(userCmds);
});

app.listen(PORT, () => console.log(`Bridge backend running on port ${PORT}`));
