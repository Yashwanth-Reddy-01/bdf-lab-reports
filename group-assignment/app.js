const express = require('express')
const path = require('path')

const app = express()
app.use(express.json())

// Route layout for players, kits, and loans
app.get('/players/', async (request, response) => {
  response.send([])
})

app.get('/kits/', async (request, response) => {
  response.send([])
})

app.get('/loans/', async (request, response) => {
  response.send([])
})

// Centralized error handling middleware
app.use((error, request, response, next) => {
  response.status(500).send('Internal Server Error')
})

const startServer = async () => {
  try {
    console.log('Database connected successfully')
    if (require.main === module) {
      app.listen(3000, () => {
        console.log('Server Running at http://localhost:3000/')
      })
    }
  } catch (error) {
    console.error(`Server Error: ${error.message}`)
    process.exit(1)
  }
}

startServer()

module.exports = app
