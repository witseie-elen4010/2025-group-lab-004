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

var games = {};   // {gameId: {players:{}, player_turn: 0, game_round:1}}

io.on('connect', socket=>{
  
  const username = socket.handshake.session.username;
  console.log(`new player connected - ${username}`);
  
  // New player joining handler
  socket.on('joinGame', (gameId) => {

    socket.join(gameId);
    socket.data.gameId = gameId;
    console.log(socket.id)

    // construct game
    if (!games[gameId]){
        games[gameId] = {};
        games[gameId]["players"] = {};
        games[gameId]["players"][username] = socket.id;
        games[gameId]["player_turn"] = 0;
        games[gameId]["game_round"] = 1;
        games[gameId]["voted"] = [];
        console.log("creating game");
    } 
    else{
      console.log("adding new player");
      games[gameId]["players"][username] = socket.id;
    }

    socket.to(gameId).emit('message', username)
  });

  // Word Description handler
  socket.on('description', descrip => {

    const gameId = socket.data.gameId;
    let player_turn = games[gameId]["player_turn"];
    player_turn++;

    Object.values(games[gameId]["players"]).forEach((socketid, index) => {
      
      if (index == player_turn){
        io.to(socketid).emit('description', `Clue from ${username}: ${descrip}`);
        io.to(socketid).emit('myTurn');
        
      }
      else io.to(socketid).emit('description', `clue from ${username}: ${descrip}`);
    });

    if (player_turn == Object.values(games[gameId]["players"]).length){
      console.log('Inside vote');

      Object.values(games[gameId]["players"]).forEach((socketid, index) => {
       io.to(socketid).emit('voteplayer');
      });

    }
    
    games[gameId]["player_turn"] = player_turn;

  });
  
  // start game handler
  socket.on('start', ()=>{
    const gameId = socket.data.gameId;
    if(Object.values(games[gameId]["players"]).length >= 2){
      console.log('starting the game');
      // need an algorithm to assign words based on roles
      // code here
      // Sending ifomation to players  for UI update
      
      Object.values(games[gameId]["players"]).forEach((sockid, index) => {
        if (index == games[gameId]["player_turn"]){
          io.to(sockid).emit('your_info', {word:"Laptop", round:'1', isMyTurn:true});
        }
        else io.to(sockid).emit('your_info', {word:"Laptop", round:'1', isMyTurn:false});
      });
    }
    else socket.emit('alert', "players must be atleast 3");
  });

  socket.on('eliminate', user=>{
    
    const gameId = socket.data.gameId;
    console.log(`${username} voted for ${user}`);
    games[gameId]["voted"].push(user);

    if (games[gameId]["voted"].length == Object.keys(games[gameId]["players"]).length){
      
      const mostfre = mostFrequentString(games[gameId]["voted"]);
      games[gameId]["player_turn"] = 0;
      games[gameId]["game_round"] += 1;
      games[gameId]["voted"] = [];
      
      Object.values(games[gameId]["players"]).forEach((socketid, index) => {
          io.to(socketid).emit('eliminated', mostfre);
      });
      
    }
  });

  socket.on('removed', user=>{

    const gameId = socket.data.gameId;
    if(games[gameId]["players"][user]){
      delete games[gameId]["players"][user];
    }

    // winning condition here
    // code
    
    Object.values(games[gameId]["players"]).forEach((sockid, index) => {
      if (index == games[gameId]["player_turn"]){
        io.to(sockid).emit('next_round', {round:games[gameId]["game_round"]});
        io.to(sockid).emit('myTurn');
      }
      else io.to(sockid).emit('next_round', {round:games[gameId]["game_round"]});
    });
  })

});


// Returns the string with high frequency
function mostFrequentString(arr) {
  const freq = {};
  let maxCount = 0;
  let mostCommon = null;

  for (const str of arr) {
    freq[str] = (freq[str] || 0) + 1;

    if (freq[str] > maxCount) {
      maxCount = freq[str];
      mostCommon = str;
    }
  }

  return mostCommon;
}

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
