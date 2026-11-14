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

// LG-5 Twist: Player returned loan history (Test 3)
app.get('/players/:id/history', async (request, response) => {
  const {id} = request.params

  const player = await db.get(
    'SELECT * FROM players WHERE player_id = ?',
    [id],
  )

  if (!player) {
    response.status(404).send('Player Not Found')
    return
  }

  const history = await db.all(
    `SELECT
       loans.loan_id,
       loans.player_id,
       players.player_name,
       loans.kit_id,
       kits.kit_name,
       kits.sport,
       loans.issue_date,
       loans.return_date
     FROM loans
     INNER JOIN players ON loans.player_id = players.player_id
     INNER JOIN kits ON loans.kit_id = kits.kit_id
     WHERE loans.player_id = ? AND loans.return_date IS NOT NULL
     ORDER BY loans.loan_id DESC`,
    [id],
  )

  response.send(history)
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

  // Validation: player name is required
  if (typeof playerName !== 'string' || playerName.trim() === '') {
    response.status(400).send('Player name is required')
    return
  }

  const result = await db.run(
    'INSERT INTO players (player_name) VALUES (?)',
    [playerName.trim()],
  )
  response.status(201).send({
    playerId: result.lastID,
    message: 'Player Added Successfully',
  })
})

// ---------------- KITS (CRUD & SEARCH BY SPORT) ----------------

app.get('/kits/', async (request, response) => {
  const {sport} = request.query
  let query = 'SELECT * FROM kits'
  const params = []

  // Search by query parameter: case-insensitive match, empty list when no match
  if (sport !== undefined) {
    query += ' WHERE LOWER(sport) = LOWER(?)'
    params.push(sport)
  }

  query += ' ORDER BY kit_id'
  const kits = await db.all(query, params)
  response.send(kits)
})

app.get('/kits/:id/', async (request, response) => {
  const {id} = request.params
  const kit = await db.get(
    'SELECT * FROM kits WHERE kit_id = ?',
    [id],
  )
  if (!kit) {
    response.status(404).send('Kit Not Found')
  } else {
    response.send(kit)
  }
})

app.post('/kits/', async (request, response) => {
  const {kitName, sport} = request.body

  // Validation: kit name and sport are required
  if (
    typeof kitName !== 'string' ||
    kitName.trim() === '' ||
    typeof sport !== 'string' ||
    sport.trim() === ''
  ) {
    response.status(400).send('Kit name and sport are required')
    return
  }

  const result = await db.run(
    'INSERT INTO kits (kit_name, sport) VALUES (?, ?)',
    [kitName.trim(), sport.trim()],
  )
  response.status(201).send({
    kitId: result.lastID,
    message: 'Kit Added Successfully',
  })
})

app.put('/kits/:id/', async (request, response) => {
  const {id} = request.params
  const {kitName, sport} = request.body

  // Validation: kit name and sport are required
  if (
    typeof kitName !== 'string' ||
    kitName.trim() === '' ||
    typeof sport !== 'string' ||
    sport.trim() === ''
  ) {
    response.status(400).send('Kit name and sport are required')
    return
  }

  const kit = await db.get(
    'SELECT * FROM kits WHERE kit_id = ?',
    [id],
  )
  if (!kit) {
    response.status(404).send('Kit Not Found')
    return
  }

  await db.run(
    'UPDATE kits SET kit_name = ?, sport = ? WHERE kit_id = ?',
    [kitName.trim(), sport.trim(), id],
  )
  response.send('Kit Updated Successfully')
})

app.delete('/kits/:id/', async (request, response) => {
  const {id} = request.params
  const kit = await db.get(
    'SELECT * FROM kits WHERE kit_id = ?',
    [id],
  )
  if (!kit) {
    response.status(404).send('Kit Not Found')
    return
  }

  try {
    await db.run('DELETE FROM kits WHERE kit_id = ?', [id])
    response.send('Kit Deleted Successfully')
  } catch (error) {
    response.status(409).send('Kit has existing loan records')
  }
})

// ---------------- LOANS (ISSUE & JOIN ENDPOINTS) ----------------

app.get('/loans/', async (request, response) => {
  const loans = await db.all(`
    SELECT
      loans.loan_id,
      loans.player_id,
      players.player_name,
      loans.kit_id,
      kits.kit_name,
      kits.sport,
      loans.issue_date,
      loans.return_date
    FROM loans
    INNER JOIN players ON loans.player_id = players.player_id
    INNER JOIN kits ON loans.kit_id = kits.kit_id
    ORDER BY loans.loan_id
  `)
  response.send(loans)
})

app.post('/loans/', async (request, response) => {
  const {playerId, kitId} = request.body

  // Validation: check for valid IDs
  if (
    playerId === undefined ||
    kitId === undefined ||
    !Number.isInteger(Number(playerId)) ||
    !Number.isInteger(Number(kitId))
  ) {
    response.status(400).send('Valid Player ID and Kit ID are required')
    return
  }

  const player = await db.get(
    'SELECT * FROM players WHERE player_id = ?',
    [playerId],
  )
  if (!player) {
    response.status(404).send('Player Not Found')
    return
  }

  const kit = await db.get(
    'SELECT * FROM kits WHERE kit_id = ?',
    [kitId],
  )
  if (!kit) {
    response.status(404).send('Kit Not Found')
    return
  }

  const result = await db.run(
    'INSERT INTO loans (player_id, kit_id) VALUES (?, ?)',
    [playerId, kitId],
  )
  response.status(201).send({
    loanId: result.lastID,
    message: 'Loan Added Successfully',
  })
})

// ---------------- YOUR TWIST: RETURN FLOW (LG-5) ----------------

// Twist Test 1 & 2: Return a loan once (200), second attempt gets 409 "Already returned"
app.post('/loans/:id/return', async (request, response) => {
  const {id} = request.params
  const loan = await db.get(
    'SELECT * FROM loans WHERE loan_id = ?',
    [id],
  )

  if (!loan) {
    response.status(404).send('Loan Not Found')
    return
  }

  if (loan.return_date !== null) {
    response.status(409).send('Already returned')
    return
  }

  await db.run(
    "UPDATE loans SET return_date = DATE('now') WHERE loan_id = ?",
    [id],
  )

  response.status(200).send('Loan Returned Successfully')
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
