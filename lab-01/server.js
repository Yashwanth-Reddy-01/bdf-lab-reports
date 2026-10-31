// Part 2: the same idea rewritten with Express, plus more routes.
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// GET / -> welcome text
app.get('/', (req, res) => {
  res.status(200).send('Welcome to my Lab 1 Express server!');
});

// GET /about -> JSON with name and section
app.get('/about', (req, res) => {
  res.status(200).json({
    name: 'Yashwanth Koppula',
    section: 'GENAI-2A(304)'
  });
});

// GET /time -> current date and time
app.get('/time', (req, res) => {
  const now = new Date();
  res.status(200).send(`Current date and time: ${now.toString()}`);
});

// Fallback for any unknown path. Must be registered AFTER all real routes,
// because Express checks routes in the order they are defined.
app.use((req, res) => {
  res.status(404).send('404 - Page Not Found');
});

// Only start listening when run directly (node server.js), so hosting
// platforms can also import the app.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Express server listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
