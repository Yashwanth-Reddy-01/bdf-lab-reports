// Lab 3: REST API with query parameters, validation and consistent responses.
const express = require('express');
const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

const app = express();
app.use(express.json()); // read JSON request bodies

const dbPath = path.join(__dirname, 'books.db');
const PORT = process.env.PORT || 3000;
let db = null;

// Open the database first; start the server only if that works.
const initializeDBAndServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}/`);
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Every error uses the same shape: { "message": "..." }
const sendError = (res, status, message) => res.status(status).json({ message });

const isValidId = (value) => /^[1-9]\d*$/.test(value);

// Column names cannot be sent as ? placeholders, so ORDER BY only accepts
// names from this fixed list. User input never goes into the SQL directly.
const SORTABLE_COLUMNS = ['id', 'title', 'author', 'price', 'pages'];

// Converts a query value such as "250" into a number, or returns null.
const toNumber = (value) => {
  if (value === undefined || String(value).trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

// Checks a book body. Returns an error message, or null when it is valid.
const validateBook = (body) => {
  const { title, author, price, pages } = body || {};
  if (typeof title !== 'string' || title.trim() === '') {
    return 'title is required and must be a non-empty string';
  }
  if (typeof author !== 'string' || author.trim() === '') {
    return 'author is required and must be a non-empty string';
  }
  if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) {
    return 'price is required and must be a non-negative number';
  }
  if (pages !== undefined && pages !== null) {
    if (!Number.isInteger(pages) || pages <= 0) {
      return 'pages must be a positive integer when provided';
    }
  }
  return null;
};

// ---------------------------------------------------------------------------
// GET /books/  -> list with search, filter, sort and pagination
// Query parameters (all optional):
//   search_q   partial title match            default: "" (no filter)
//   min_price  lowest price                   default: none
//   max_price  highest price                  default: none
//   order_by   id | title | author | price | pages     default: id
//   order      ASC | DESC                     default: ASC
//   limit      rows per page (1 to 100)       default: 10
//   offset     rows to skip                   default: 0
// ---------------------------------------------------------------------------
app.get('/books/', async (req, res) => {
  const {
    search_q = '',
    order_by = 'id',
    order = 'ASC',
  } = req.query;

  // order_by and order: must be one of the allowed values
  if (!SORTABLE_COLUMNS.includes(order_by)) {
    return sendError(res, 400, `order_by must be one of: ${SORTABLE_COLUMNS.join(', ')}`);
  }
  const direction = String(order).toUpperCase();
  if (direction !== 'ASC' && direction !== 'DESC') {
    return sendError(res, 400, 'order must be ASC or DESC');
  }

  // limit and offset: whole numbers in range
  const limit = req.query.limit === undefined ? 10 : toNumber(req.query.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return sendError(res, 400, 'limit must be a whole number between 1 and 100');
  }
  const offset = req.query.offset === undefined ? 0 : toNumber(req.query.offset);
  if (!Number.isInteger(offset) || offset < 0) {
    return sendError(res, 400, 'offset must be a whole number of 0 or more');
  }

  // price range
  const minPrice = toNumber(req.query.min_price);
  const maxPrice = toNumber(req.query.max_price);
  if (req.query.min_price !== undefined && (minPrice === null || minPrice < 0)) {
    return sendError(res, 400, 'min_price must be a non-negative number');
  }
  if (req.query.max_price !== undefined && (maxPrice === null || maxPrice < 0)) {
    return sendError(res, 400, 'max_price must be a non-negative number');
  }
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    return sendError(res, 400, 'min_price cannot be greater than max_price');
  }

  // Build the WHERE part with placeholders only
  const conditions = [];
  const params = [];

  if (String(search_q).trim() !== '') {
    conditions.push('title LIKE ?');
    params.push(`%${search_q}%`);
  }
  if (minPrice !== null && maxPrice !== null) {
    conditions.push('price BETWEEN ? AND ?');
    params.push(minPrice, maxPrice);
  } else if (minPrice !== null) {
    conditions.push('price >= ?');
    params.push(minPrice);
  } else if (maxPrice !== null) {
    conditions.push('price <= ?');
    params.push(maxPrice);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  // order_by and direction were checked against fixed lists above, so they are safe here.
  const sql = `SELECT * FROM book ${where} ORDER BY ${order_by} ${direction} LIMIT ? OFFSET ?;`;

  try {
    const books = await db.all(sql, [...params, limit, offset]);
    res.status(200).json(books);
  } catch (error) {
    sendError(res, 500, 'Internal Server Error');
  }
});

// GET /books/:bookId/  -> one book
app.get('/books/:bookId/', async (req, res) => {
  const { bookId } = req.params;
  if (!isValidId(bookId)) {
    return sendError(res, 400, 'bookId must be a positive whole number');
  }
  try {
    const book = await db.get('SELECT * FROM book WHERE id = ?;', [bookId]);
    if (!book) {
      return sendError(res, 404, 'Book Not Found');
    }
    res.status(200).json(book);
  } catch (error) {
    sendError(res, 500, 'Internal Server Error');
  }
});

// POST /books/  -> create a book (201)
app.post('/books/', async (req, res) => {
  const problem = validateBook(req.body);
  if (problem) {
    return sendError(res, 400, problem);
  }
  const { title, author, price, pages = null } = req.body;
  try {
    const result = await db.run(
      'INSERT INTO book (title, author, price, pages) VALUES (?, ?, ?, ?);',
      [title.trim(), author.trim(), price, pages]
    );
    res.status(201).json({ message: 'Book Added Successfully', bookId: result.lastID });
  } catch (error) {
    sendError(res, 500, 'Internal Server Error');
  }
});

// PUT /books/:bookId/  -> replace all fields of a book (200, or 404)
app.put('/books/:bookId/', async (req, res) => {
  const { bookId } = req.params;
  if (!isValidId(bookId)) {
    return sendError(res, 400, 'bookId must be a positive whole number');
  }
  const problem = validateBook(req.body);
  if (problem) {
    return sendError(res, 400, problem);
  }
  const { title, author, price, pages = null } = req.body;
  try {
    const result = await db.run(
      'UPDATE book SET title = ?, author = ?, price = ?, pages = ? WHERE id = ?;',
      [title.trim(), author.trim(), price, pages, bookId]
    );
    if (result.changes === 0) {
      return sendError(res, 404, 'Book Not Found');
    }
    res.status(200).json({ message: 'Book Updated Successfully' });
  } catch (error) {
    sendError(res, 500, 'Internal Server Error');
  }
});

// DELETE /books/:bookId/  -> remove a book (200, or 404)
app.delete('/books/:bookId/', async (req, res) => {
  const { bookId } = req.params;
  if (!isValidId(bookId)) {
    return sendError(res, 400, 'bookId must be a positive whole number');
  }
  try {
    const result = await db.run('DELETE FROM book WHERE id = ?;', [bookId]);
    if (result.changes === 0) {
      return sendError(res, 404, 'Book Not Found');
    }
    res.status(200).json({ message: 'Book Deleted Successfully' });
  } catch (error) {
    sendError(res, 500, 'Internal Server Error');
  }
});

// Unknown routes -> 404 in the same format
app.use((req, res) => {
  sendError(res, 404, 'Route Not Found');
});

// Error handler: invalid JSON body -> 400, anything else -> 500
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return sendError(res, 400, 'Invalid JSON body');
  }
  sendError(res, 500, 'Internal Server Error');
});
