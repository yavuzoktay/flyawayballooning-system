const express = require('express');
const path = require('path');
const app = express();

// Her ortamda çalışan relative path
const clientBuildPath = path.join(__dirname, '..', 'client', 'build');

app.use(express.static(clientBuildPath));

app.get('*', (_req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});
