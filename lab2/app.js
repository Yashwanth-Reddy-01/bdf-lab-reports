// Lab 2: Express server connected to a SQLite database with CRUD routes.
const express = require('express');
const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

const app = express();
app.use(express.json()); // lets us read JSON bodies in POST and PUT

const dbPath = path.join(__dirname, 'books.db');
const PORT = process.env.PORT || 3000;
let db = null;

// Open the database FIRST, and start the server only if that succeeds.
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}/`);
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

// Helpers ---------------------------------------------------------------
const isValidId = (value) => /^[1-9]\d*$/.test(value);

// Returns an error message if the body is not a valid book, otherwise null.
const validateBook = (body) => {
  const { title, author, price, pages } = body || {};
  if (typeof title !== 'string' || title.trim() === '') {
    return 'title is required and must be a non-empty string';
  }
  if (typeof author !== 'string' || author.trim() === '') {
    return 'author is required and must be a non-empty string';
  }
  if (!Number.isInteger(price) || price < 0) {
    return 'price is required and must be a non-negative integer';
  }
  if (!Number.isInteger(pages) || pages <= 0) {
    return 'pages is required and must be a positive integer';
  }
  return null;
};

// 1. GET /books/  -> all books
app.get('/books/', async (req, res) => {
  try {
    const books = await db.all('SELECT * FROM book ORDER BY id;');
    res.status(200).json(books);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. GET /books/:bookId/  -> one book
app.get('/books/:bookId/', async (req, res) => {
  const { bookId } = req.params;
  if (!isValidId(bookId)) {
    return res.status(400).json({ error: 'bookId must be a positive integer' });
  }
  try {
    const book = await db.get('SELECT * FROM book WHERE id = ?;', [bookId]);
    if (!book) {
      return res.status(404).json({ error: 'Book Not Found' });
    }
    res.status(200).json(book);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3. POST /books/  -> add a book
app.post('/books/', async (req, res) => {
  const message = validateBook(req.body);
  if (message) {
    return res.status(400).json({ error: message });
  }
  const { title, author, price, pages } = req.body;
  try {
    const result = await db.run(
      'INSERT INTO book (title, author, price, pages) VALUES (?, ?, ?, ?);',
      [title, author, price, pages]
    );
    res.status(201).json({ message: 'Book Added Successfully', bookId: result.lastID });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 4. PUT /books/:bookId/  -> update a book (replaces all fields)
app.put('/books/:bookId/', async (req, res) => {
  const { bookId } = req.params;
  if (!isValidId(bookId)) {
    return res.status(400).json({ error: 'bookId must be a positive integer' });
  }
  const message = validateBook(req.body);
  if (message) {
    return res.status(400).json({ error: message });
  }
  const { title, author, price, pages } = req.body;
  try {
    const result = await db.run(
      'UPDATE book SET title = ?, author = ?, price = ?, pages = ? WHERE id = ?;',
      [title, author, price, pages, bookId]
    );
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Book Not Found' });
    }
    res.status(200).json({ message: 'Book Updated Successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 5. DELETE /books/:bookId/  -> remove a book
app.delete('/books/:bookId/', async (req, res) => {
  const { bookId } = req.params;
  if (!isValidId(bookId)) {
    return res.status(400).json({ error: 'bookId must be a positive integer' });
  }
  try {
    const result = await db.run('DELETE FROM book WHERE id = ?;', [bookId]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Book Not Found' });
    }
    res.status(200).json({ message: 'Book Deleted Successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Unknown routes
app.use((req, res) => {
  res.status(404).json({ error: '404 - Page Not Found' });
});

// Invalid JSON in the request body
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  res.status(500).json({ error: 'Internal Server Error' });
});
