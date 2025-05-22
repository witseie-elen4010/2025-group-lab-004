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
const players = []
let player_turn = 0
let wordAssignments = {}
let currentWords = { civilian: '', undercover: '' }

const wordPairs = [
  { civilian: 'Laptop', undercover: 'Computer' },
  { civilian: 'Beach', undercover: 'Desert' },
  { civilian: 'Pizza', undercover: 'Burger' },
  { civilian: 'Doctor', undercover: 'Nurse' },
  { civilian: 'Football', undercover: 'Rugby' }
]

io.on('connection', socket => {
  const username = socket.handshake.session.username
  console.log(`New player connected - ${username}`)

  socket.on('joinGame', (gameId) => {
    socket.join(gameId)
    socket.data.gameId = gameId
    players.push(socket.id)


var games = {};   // {gameId: {players:{}, player_turn: 0, game_round:1}}


//   socket.on('start', () => {
//     console.log('Game starting...')
//     player_turn = 0
//     wordAssignments = {}


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

//     // Pick a random word pair
//     const wordPair = wordPairs[Math.floor(Math.random() * wordPairs.length)]
//     currentWords = wordPair

//     // Assign roles
//     const undercoverIndex = Math.floor(Math.random() * players.length)

//     players.forEach((sockid, index) => {
//       const isUndercover = index === undercoverIndex
//       const word = isUndercover ? wordPair.undercover : wordPair.civilian

//       wordAssignments[sockid] = {
//         role: isUndercover ? 'undercover' : 'civilian',
//         word
//       }

//       io.to(sockid).emit('your_info', {
//         word,
//         round: '1',
//         isMyTurn: index === player_turn
//       })
//     })

//     // Let the first player take their turn
//     io.to(players[player_turn]).emit('myTurn')
//   })

//   socket.on('description', descrip => {
//     const gameId = socket.data.gameId
//     const currentSocketId = players[player_turn]

//     if (socket.id !== currentSocketId) {
//       socket.emit('errorMessage', 'Not your turn!')
//       return
//     }

//     const username = socket.handshake.session.username
//     players.forEach(sockid => {
//       io.to(sockid).emit('description', `Clue from ${username}: ${descrip}`)
//     })

//     player_turn++

//     if (player_turn < players.length) {
//       io.to(players[player_turn]).emit('myTurn')
//     } else {
//       io.to(gameId).emit('phaseChanged', {
//         phase: 'voting',
//         message: 'All players have submitted their clues. Voting starts now!'
//       })                                        
//       player_turn = 0
//     }
//   })
// })
// >>>>>>> main


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
