const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

let users = {}; // {username: {serverId, lastSeen}}

// Register endpoint with logging
app.post('/register', (req, res) => {
  console.log('Register called:', req.body);
  const { username, serverId } = req.body;
  users[username] = { serverId, lastSeen: Date.now() };
  res.json({ success: true });
});

// Heartbeat endpoint with logging
app.post('/heartbeat', (req, res) => {
  console.log('Heartbeat called:', req.body);
  const { username } = req.body;
  if (users[username]) users[username].lastSeen = Date.now();
  res.json({ success: true });
});

// Users endpoint
app.get('/users', (req, res) => {
  // Remove users not seen in last 30s
  const now = Date.now();
  users = Object.fromEntries(
    Object.entries(users).filter(([_, u]) => now - u.lastSeen < 30000)
  );
  res.json(users);
});

// Start server on the port Render provides
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port', PORT));
