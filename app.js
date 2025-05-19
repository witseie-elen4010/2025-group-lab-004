'use strict'

const express = require('express')
const connectDB = require('./config/db')
const bodyParser = require('body-parser')
const path = require('path')
const ejsMate = require('ejs-mate')
const session = require('express-session')
const app = express()
const http = require('http');
const socketIo = require('socket.io');
const server = http.createServer(app);
const io = socketIo(server);
const sharedSession = require('express-socket.io-session')

// Configure middlewares
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')))
//
// View engine setup
app.engine('ejs', ejsMate)
app.set('views', path.join(__dirname, 'src/views'))
app.set('view engine', 'ejs')

const cors = require('cors');

const sessionMiddleware = session({
  secret: 'your-secret-key', // Replace with a strong secret in production
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false} // Set `secure: true` if using HTTPS
});

// Handling app use
app.use(sessionMiddleware);

// socket.IO setup for session cookie

io.use(sharedSession(sessionMiddleware, {
  autoSave: true
}));


// socket.io handlers

var players = [];
var player_turn = 0;

io.on('connect', socket=>{
  
  const username = socket.handshake.session.username;
  console.log(`new player connected - ${username}`);
  
  // New player joining handler
  socket.on('joinGame', (gameId) => {

    socket.join(gameId);
    socket.data.gameId = gameId;
    players.push(socket.id);
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

    if (player_turn == players.length){
      console.log('Inside vote');
      players.forEach((sockid, index) => {
       io.to(sockid).emit('voteplayer');
      });

    }
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

  socket.on('eliminate', user=>{
    console.log(`${username} voted for ${user}`);
  });

});

// Routes
const authRoutes = require('./src/routes/authRoutes')
app.use('/', authRoutes)

//Game routes
const gameRoutes = require('./src/routes/gameRoutes')
app.use('/', gameRoutes)

//
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
server.listen(port, () => {
  console.log(`FindMrWhite server running on port ${port}`)
})

module.exports = app
