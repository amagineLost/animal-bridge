// server.js
const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

let users = {}; // {username: {serverId, lastSeen}}

app.post('/register', (req, res) => {
  const { username, serverId } = req.body;
  users[username] = { serverId, lastSeen: Date.now() };
  res.json({ success: true });
});

app.post('/heartbeat', (req, res) => {
  const { username } = req.body;
  if (users[username]) users[username].lastSeen = Date.now();
  res.json({ success: true });
});

app.get('/users', (req, res) => {
  // Remove users not seen in last 30s
  const now = Date.now();
  users = Object.fromEntries(
    Object.entries(users).filter(([_, u]) => now - u.lastSeen < 30000)
  );
  res.json(users);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port', PORT));
