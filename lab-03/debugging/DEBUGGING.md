# Debugging exercise: four common errors

The faculty gives a broken version of the project. These are the four errors to fix, with how each one looks and how to solve it. The same fixes apply to any Express and SQLite project.

## 1. Port already in use (`EADDRINUSE`)

**What you see**

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Cause:** Another program (often your own earlier server) is still using port 3000.

**Fix**
- Press **Ctrl + C** in the terminal that is running the old server, or close that terminal.
- Or find and stop the process on Windows:
  ```powershell
  netstat -ano | findstr :3000
  taskkill /PID <the number in the last column> /F
  ```
- Or start on another port: `set PORT=3001` then `npm start` (PowerShell: `$env:PORT=3001; npm start`).

## 2. Wrong import path

**What you see**

```
Error: Cannot find module './databse'
```

**Cause:** A `require` points to a file or package that does not exist, usually a typo, wrong folder or wrong capital letters.

**Fix:** Check the spelling and the path in the `require(...)` line, check that the file exists, and run `npm install` if it is a package. A path that starts with `./` is relative to the file that contains the `require`.

## 3. Table name typo (`no such table`)

**What you see**

```
SQLITE_ERROR: no such table: books
```

**Cause:** The SQL uses a table name that is not in the database. In this project the table is `book`, not `books`.

**Fix:** Open `books.db` in DB Browser for SQLite (or run `.tables` in the SQLite CLI) to see the exact table name, then correct it in the SQL string in `app.js`.

## 4. Missing `await`

**What you see:** The route returns `{}` or a Promise, or the next line runs before the data arrives. For example, `db.all(...)` without `await` sends back an empty or unfinished result.

**Cause:** Database calls return a Promise. Without `await`, the code does not wait for the result.

**Fix:** Write `await` before the database call, and make sure the function around it is marked `async`:

```js
app.get('/books/', async (req, res) => {
  const books = await db.all('SELECT * FROM book;');
  res.status(200).json(books);
});
```

## How to practise

Copy `app.js` to a scratch file, add one of these bugs on purpose, read the error message, and fix it. Never leave a deliberate bug in the version you submit.
