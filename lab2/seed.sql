-- Run in the SQLite CLI:  sqlite3 books.db < seed.sql
-- (or open books.db and paste these statements)
DROP TABLE IF EXISTS book;

CREATE TABLE book (
  id INTEGER PRIMARY KEY,
  title TEXT,
  author TEXT,
  price INTEGER,
  pages INTEGER
);

INSERT INTO book (title, author, price, pages) VALUES
  ('The Alchemist', 'Paulo Coelho', 299, 208),
  ('Wings of Fire', 'A.P.J. Abdul Kalam', 250, 180),
  ('Atomic Habits', 'James Clear', 499, 320),
  ('The Psychology of Money', 'Morgan Housel', 350, 252),
  ('Rich Dad Poor Dad', 'Robert Kiyosaki', 275, 336),
  ('Deep Work', 'Cal Newport', 420, 296),
  ('Ikigai', 'Hector Garcia', 260, 208),
  ('Clean Code', 'Robert C. Martin', 899, 464),
  ('The Pragmatic Programmer', 'Andrew Hunt', 950, 352),
  ('Zero to One', 'Peter Thiel', 380, 224);
