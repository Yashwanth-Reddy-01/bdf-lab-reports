# Lab 2: SQLite database and CRUD routes

- **Name:** K.YASHWANTH REDDY
- **Registration Number:** 252U1R9073
- **Section:** CSE-GEN-AI-2A-304
- **Course:** Backend Development Fundamentals
- **Lab Number:** 02

## Live Link

**Deployment URL:** YOUR_LIVE_URL_HERE

*(If the project cannot be deployed, replace this line with the reason and rely on the Postman screenshots below.)*

## Objective

Connect an Express server to a SQLite database and expose CRUD operations (Create, Read, Update, Delete) over HTTP.

## Technologies Used

Node.js, Express.js, SQLite (`sqlite` + `sqlite3` packages), nodemon, Postman, Visual Studio Code

## Project Structure

```
lab-02/
├── screenshots/
├── app.js            # Express server + SQLite + all routes
├── books.db          # SQLite database file (table: book, 10 rows)
├── seed.sql          # SQL used to create the table and insert the rows
├── package.json
├── package-lock.json
├── .env.example
├── .gitignore
└── README.md
```

## How to Run

**Prerequisites:** Node.js and npm installed. (Optional: the SQLite CLI, to inspect `books.db`.)

```
cd lab-02
npm install
npm run dev      # development: nodemon restarts the server on every change
npm start        # plain start: node app.js
```

The server runs at `http://localhost:3000/`.

**Environment variables:** none are required. `PORT` is optional (default `3000`); see `.env.example`. Never commit a real `.env` file.

### Create the database again (optional)

`books.db` is already included. To rebuild it from scratch with the SQLite CLI:

```
sqlite3 books.db < seed.sql
```

To inspect the data:

```
sqlite3 books.db
.headers on
.mode column
SELECT * FROM book;
```

## Endpoints

| Method | Path             | Description                          | Success status | Error statuses |
| ------ | ---------------- | ------------------------------------ | -------------- | -------------- |
| GET    | `/books/`        | Returns all books                    | 200 OK         | 500            |
| GET    | `/books/:bookId/`| Returns one book by id               | 200 OK         | 400, 404, 500  |
| POST   | `/books/`        | Adds a new book (JSON body)          | 201 Created    | 400, 500       |
| PUT    | `/books/:bookId/`| Updates all fields of a book         | 200 OK         | 400, 404, 500  |
| DELETE | `/books/:bookId/`| Deletes a book                       | 200 OK         | 400, 404, 500  |

**Request body for POST and PUT:**

```json
{
  "title": "Sample Book",
  "author": "Sample Author",
  "price": 300,
  "pages": 200
}
```

- `400 Bad Request`: invalid id, missing or invalid fields, or invalid JSON.
- `404 Not Found`: no book with that id, or an unknown route.
- Every query that uses user input is parameterised with `?` placeholders.

## Screenshots

Postman screenshots of each endpoint, plus the database view:

### GET all books

![GET all books](screenshots/get-all.png)

### GET one book

![GET one book](screenshots/get-one.png)

### POST add a book (201)

![POST add book](screenshots/post.png)

### PUT update a book

![PUT update book](screenshots/put.png)

### DELETE remove a book

![DELETE remove book](screenshots/delete.png)

### Invalid input (400)

![POST invalid input](screenshots/post-400.png)

### SQLite database (DB Browser for SQLite)

![Database view](screenshots/db-view.png)

## Viva Questions

### 1. Why `await` the database call?

Database calls take time and return a Promise. `await` pauses that function until the result is ready, so we use real data and not an unfinished Promise. It also lets us wait for the connection to open before the server starts.

### 2. What is SQL injection and how do placeholders prevent it?

SQL injection is when an attacker puts SQL code into an input, such as `1 OR 1=1`, and it becomes part of the query. With `?` placeholders, the SQL text and the values are sent separately, so the input is always treated as data and never as SQL code.

### 3. When is PUT used instead of POST?

POST creates a new resource (the server picks the id). PUT replaces or updates an existing resource at a known URL, such as `/books/3/`.

## Notes: Problems Faced and Solutions

- The SQLite command-line tool was not installed on my computer, so I viewed `books.db` with DB Browser for SQLite instead.
- Write your own notes here. For example, describe an error you hit while testing in Postman or deploying, and how you fixed it.
- The free hosting plan used for deployment may reset the file system on restart, so changes made through POST, PUT and DELETE on the live link can disappear after a redeploy. The local `books.db` file keeps changes.
