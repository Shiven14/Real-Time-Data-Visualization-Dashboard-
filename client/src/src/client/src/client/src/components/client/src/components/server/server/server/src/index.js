const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

const wss = new WebSocket.Server({ server });

wss.on('connection', ws => {
  console.log('Client connected');
  ws.on('message', message => {
    console.log(`Received message => ${message}`);
  });

  // Simulate real-time data updates
  setInterval(() => {
    ws.send(JSON.stringify({ value: Math.random() * 100 }));
  }, 5000);
});
