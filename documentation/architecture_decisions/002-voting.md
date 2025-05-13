# Voting and Elimination Features

## What Was Added

- **Player voting system** - Players can vote to eliminate suspected imposters
- **Elimination mechanics** - Players with most votes are eliminated and their roles revealed
- **Game end detection** - Game ends when all imposters are eliminated or when only one civilian remains

## Implementation Details

### Game Model Changes

Enhanced the Game schema to track:

- Player roles (civilian, undercover, mrwhite)
- Player votes with round tracking
- Eliminated players history
- Game status progression (waiting → in-progress → completed)

### New Views & UI

- Created game round interface showing active players with voting buttons
- Added eliminated players section that reveals roles
- Built game results screen showing all players' roles and words after game ends
- Designed UI with responsive cards layout for player information

### Core Logic

- Vote counting automatically identifies player with most votes
- Game checks for end conditions after each elimination
- Host-only controls manage game flow between rounds
- Players only see their own role/word (hidden from others)

## Design Decisions

1. **Host-Controlled Flow**: Only the host (game creator) can start the game and end voting rounds to maintain orderly gameplay.

2. **Progressive Disclosure**: Player roles are only revealed after elimination to maintain suspense.

3. **Session-Based Security**: All game actions verify the user is authenticated and belongs to the game.

4. **Mobile-Friendly UI**: Card-based layout works well on both desktop and mobile devices.

5. **MongoDB Document Structure**: Used nested arrays for players, votes, and eliminated players to maintain data integrity.

## Files Added

- **src/views/game_round.ejs** - Main gameplay screen with voting interface
- **src/views/game_results.ejs** - Game results screen showing winners and player roles
- **public/css/game_round.css** - Styling for game round page
- **public/css/game_results.css** - Styling for results page
- **tests/controllers/voting.test.js** - Tests for voting functionality

## Files Modified

- **src/models/Game.js** - Enhanced with player roles, voting, and elimination tracking
- **src/controllers/gameController.js** - Added functions for gameplay, voting, and results
- **src/routes/gameRoutes.js** - Added routes for gameplay features
- **src/views/start_page.ejs** - Updated to pass gameId to game round page

## How To Test

1. Create a game as one user
2. Join with at least one other user
3. Start the game (only host can do this)
4. Vote to eliminate players
5. End voting (only host can do this)
6. Continue until game end condition is reached
7. View results page

## Next Steps

- Add word description phase
- Implement real-time updates with maybe WebSockets
- Add game chat functionality
