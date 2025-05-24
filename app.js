'use strict'

const express = require('express')
const connectDB = require('./config/db')
connectDB()
const bodyParser = require('body-parser')
const path = require('path')
const ejsMate = require('ejs-mate')
const session = require('express-session')
const http = require('http')
const socketIo = require('socket.io')
const sharedSession = require('express-socket.io-session')
const socketIO = require('socket.io')
const http = require('http')
const cors = require('cors')
const app = express()
const server = http.createServer(app)
const io = socketIO(server)

// Configure middlewares
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')))

// View engine setup
app.engine('ejs', ejsMate)
app.set('views', path.join(__dirname, 'src/views'))
app.set('view engine', 'ejs')

const sessionMiddleware = session({
  secret: 'your-secret-key', // Replace with a strong secret in production
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set `secure: true` if using HTTPS
})

app.use(sessionMiddleware)

// socket.IO setup for session cookie

io.use(sharedSession(sessionMiddleware, {
  autoSave: true
}))

// socket.io handlers

var players = [];
var player_turn = 0;

io.on('connect', socket=>{
  
  const username = socket.handshake.session.username;
  console.log(`new player connected - ${username}`);
  
  // New player joining handler
  socket.on('joinGame', (gameId) => {
    socket.join(gameId)
    socket.data.gameId = gameId
    console.log(socket.id)

    console.log(`User joined room: ${players[0]}`);
    socket.to(gameId).emit('message', username)
  });

  // Word Description handler
  socket.on('description', descrip => {
    
    player_turn++;
    players.forEach((sockid, index) => {
      
      if (index == player_turn){
        io.to(sockid).emit('description', `clue from ${username}: ${descrip}`);
        io.to(sockid).emit('myTurn');
        
      }
      else io.to(sockid).emit('description', `clue from ${username}: ${descrip}`);
    });
  });
  
  // start game handler
  socket.on('start', ()=>{
    console.log('starting the game');
    // need an algorithm to assign words based on roles
    // code here
    // Sending ifomation to players  for UI update
    players.forEach((sockid, index) => {
      if (index == player_turn){
        io.to(sockid).emit('your_info', {word:"Laptop", round:'1', isMyTurn:true});
      }
      else io.to(sockid).emit('your_info', {word:"Laptop", round:'1', isMyTurn:false});
    });
  });
});


// Routes
const authRoutes = require('./src/routes/authRoutes')
app.use('/', authRoutes)

// Game routes
const gameRoutes = require('./src/routes/gameRoutes')
app.use('/', gameRoutes)

app.get('/', (req, res) => {
  res.render('home', { title: 'FindMrWhite' })
})

app.use((req, res) => {
  res.status(404).send('Page Not Found')
})

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).send('Something broke!')
})

// Server configuration
const port = process.env.PORT || 3000
require('./config/db')()
server.listen(port, () => {
  console.log(`FindMrWhite server running on port ${port}`)
})

app.set('io', io)

const userSockets = new Map()

module.exports = app
