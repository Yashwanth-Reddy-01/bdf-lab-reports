const express = require('express')
const sqlite3 = require('sqlite3')
const {open} = require('sqlite')
const path = require('path')

const app = express()
app.use(express.json())

let db

const dbPath = path.join(__dirname, 'sportsShed.db')

// Database initialization with 3 related tables and foreign keys
const initializeDB = async () => {
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  })

  // Switch on foreign key checking
  await db.exec('PRAGMA foreign_keys = ON')

  // Create the 3 related tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      player_id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS kits (
      kit_id INTEGER PRIMARY KEY AUTOINCREMENT,
      kit_name TEXT NOT NULL,
      sport TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS loans (
      loan_id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      kit_id INTEGER NOT NULL,
      issue_date TEXT NOT NULL DEFAULT (DATE('now')),
      return_date TEXT DEFAULT NULL,
      FOREIGN KEY (player_id) REFERENCES players(player_id),
      FOREIGN KEY (kit_id) REFERENCES kits(kit_id)
    );
  `)
}

// ---------------- PLAYERS ----------------

app.get('/players/', async (request, response) => {
  const players = await db.all('SELECT * FROM players ORDER BY player_id')
  response.send(players)
})

app.get('/players/:id/', async (request, response) => {
  const {id} = request.params
  const player = await db.get(
    'SELECT * FROM players WHERE player_id = ?',
    [id],
  )
  if (!player) {
    response.status(404).send('Player Not Found')
  } else {
    response.send(player)
  }
})

app.post('/players/', async (request, response) => {
  const {playerName} = request.body
  const result = await db.run(
    'INSERT INTO players (player_name) VALUES (?)',
    [playerName],
  )
  response.status(201).send({
    playerId: result.lastID,
    message: 'Player Added Successfully',
  })
})

// Route layout for kits and loans
app.get('/kits/', async (request, response) => {
  const kits = await db.all('SELECT * FROM kits ORDER BY kit_id')
  response.send(kits)
})

app.get('/loans/', async (request, response) => {
  const loans = await db.all('SELECT * FROM loans ORDER BY loan_id')
  response.send(loans)
})

// Centralized error handling middleware
app.use((error, request, response, next) => {
  response.status(500).send('Internal Server Error')
})

const startServer = async () => {
  try {
    await initializeDB()
    console.log('Database connected successfully')
    if (require.main === module) {
      app.listen(3000, () => {
        console.log('Server Running at http://localhost:3000/')
      })
    }
  } catch (error) {
    console.error(`Database Error: ${error.message}`)
    process.exit(1)
  }
}

startServer()

module.exports = app
