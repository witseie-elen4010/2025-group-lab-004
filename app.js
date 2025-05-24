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

const app = express()
const server = http.createServer(app)
const io = socketIo(server)

// Configure middlewares
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')))

// View engine setup
app.engine('ejs', ejsMate)
app.set('views', path.join(__dirname, 'src/views'))
app.set('view engine', 'ejs')

const sessionMiddleware = session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
})

app.use(sessionMiddleware)
io.use(sharedSession(sessionMiddleware, { autoSave: true }))

// Game state
var games = {};   // {gameId: {players:{}, player_turn: 0, game_round:1}}
var assignment = {};
var eliminatedPlayers = {};

const wordPairs = [
  ['Laptop', 'Computer' ],
  ['Beach', 'Desert' ],
  ['Pizza', 'Burger' ],
  ['Doctor', 'Nurse' ],
  ['Football', 'Rugby']
];

// // Role and word assignment algorithms

function getRandomWordPair(pairs) {
  const randomIndex = Math.floor(Math.random() * pairs.length);
  return pairs[randomIndex];
}

function assignRolesAndWords(players, wordPairs) {
  const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
  const assignments = {};

  const [civilianWord, undercoverWord] = getRandomWordPair(wordPairs);

  const numPlayers = players.length;

  // Step 1: Assign Mr. White
  const mrWhitePlayer = shuffledPlayers.pop();
  assignments[mrWhitePlayer] = { role: "mr white", word: 'you are Mr white (no word assigned for you)' };

  // Step 2: Split remaining evenly
  const remaining = shuffledPlayers.length;
  const half = Math.floor(remaining / 2);

  // Step 3: Assign Undercover
  for (let i = 0; i < half; i++) {
    const undercoverPlayer = shuffledPlayers.pop();
    assignments[undercoverPlayer] = { role: "undercover", word: undercoverWord };
  }

  // Step 4: Assign Civilians
  for (const player of shuffledPlayers) {
    assignments[player] = { role: "civilian", word: civilianWord };
  }

  return assignments;
}



io.on('connection', socket => {

  const username = socket.handshake.session.username
  console.log(`New player connected - ${username}`)

  socket.on('joinGame', (gameId) => {
    socket.join(gameId)
    socket.data.gameId = gameId
    console.log(socket.id)

    // construct game
    if (!games[gameId]){
        games[gameId] = {};
        games[gameId]["players"] = {};
        games[gameId]["players"][username] = socket.id;
        games[gameId]["player_turn"] = 0;
        games[gameId]["game_round"] = 1;
        games[gameId]["voted"] = [];
        eliminatedPlayers[gameId] = [];
    } 
    else{
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

      // need an algorithm to assign words based on roles
      assignment[gameId] = assignRolesAndWords(Object.keys(games[gameId]["players"]), wordPairs);


      // Sending information to players  for UI update
      
      Object.keys(games[gameId]["players"]).forEach((user, index) => {
        if (index == games[gameId]["player_turn"]){
          io.to(games[gameId]["players"][user]).emit('word', assignment[gameId][user]['word']);
          io.to(games[gameId]["players"][user]).emit('myTurn');
          io.to(games[gameId]["players"][user]).emit('next_round', {round:games[gameId]["game_round"]});

        }
        else{
          io.to(games[gameId]["players"][user]).emit('word', assignment[gameId][user]['word']);
          io.to(games[gameId]["players"][user]).emit('next_round', {round:games[gameId]["game_round"]});
        } 
      });
    }
    else socket.emit('alert', "players must be atleast 3");
  });

  socket.on('eliminate', user=>{
    
    const gameId = socket.data.gameId;
    games[gameId]["voted"].push(user);
    console.log(games[gameId]["voted"].length);
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
      eliminatedPlayers[gameId].push(user);
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

const port = process.env.PORT || 3000
server.listen(port, () => {
  console.log(`FindMrWhite server running on port ${port}`)
})

module.exports = app
