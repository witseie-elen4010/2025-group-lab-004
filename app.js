'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const path = require('path')
const ejsMate = require('ejs-mate')
const session = require('express-session')
const http = require('http')
const socketIO = require('socket.io')
const gameSocket = require('./src/sockets/gameSocket')

const app = express()
const server = http.createServer(app)
const io = socketIO(server, { cors: { origin: '*' } })

// Configure middlewares
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')))
//
// View engine setup
app.engine('ejs', ejsMate)
app.set('views', path.join(__dirname, 'src/views'))
app.set('view engine', 'ejs')

// Handling app use
app.use(session({
  secret: 'your-secret-key', // Replace with a strong secret in production
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set `secure: true` if using HTTPS
}))

// Routes
const authRoutes = require('./src/routes/authRoutes')
app.use('/', authRoutes)

// Game routes
const gameRoutes = require('./src/routes/gameRoutes')
app.use('/', gameRoutes)

// Sockets
io.on('connection', (socket) => {
  gameSocket(io, socket)
})

// Update default route to render home page
app.get('/', (req, res) => {
  res.render('home', { title: 'FindMrWhite' })
})

// 404 handler
app.use(function (req, res, next) {
  res.status(404).send('Page Not Found')
})

// Error handler
app.use(function (err, req, res, next) {
  console.error(err.stack)
  res.status(500).send('Something broke!')
})

// Server configuration
const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`FindMrWhite server running on port ${port}`)
})

module.exports = app
