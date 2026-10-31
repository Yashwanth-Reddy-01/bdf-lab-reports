// Part 1: a plain server built only with Node's built-in http module.
const http = require('http');

const PORT = process.env.PORT || 3000;

// This callback runs once for every incoming request.
// req = what the client sent (method, url, headers); res = what we send back.
const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello');
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 - Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`Plain HTTP server listening on http://localhost:${PORT}`);
});
