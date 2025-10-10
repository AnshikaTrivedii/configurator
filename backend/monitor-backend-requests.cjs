const express = require('express');
const http = require('http');

// Create a simple monitoring server to see if requests are coming in
const app = express();

app.use(express.json());

app.all('*', (req, res) => {
  console.log(`📡 REQUEST RECEIVED: ${req.method} ${req.path}`);
  console.log(`📋 Headers:`, req.headers);
  console.log(`📦 Body:`, req.body);
  console.log(`⏰ Time:`, new Date().toISOString());
  console.log('─'.repeat(50));
  
  // Forward to actual backend
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: req.path,
    method: req.method,
    headers: req.headers
  };
  
  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  
  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Proxy error' });
  });
  
  if (req.body) {
    proxyReq.write(JSON.stringify(req.body));
  }
  proxyReq.end();
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`🔍 Monitoring server running on port ${PORT}`);
  console.log('📡 All requests will be logged and forwarded to port 3001');
});
