# Complete Beginner's Guide to npm run dev

This guide explains in detail what happens when you run `npm run dev`, what you should expect, and how to use our development server.

## What is npm run dev?

When you run `npm run dev`, you're executing a script that's defined in your `package.json` file. This script starts your application in development mode. Let's break this down:

- `npm`: Node Package Manager command
- `run`: Tells npm to execute a script from package.json
- `dev`: The name of the script you want to run

## What Happens When You Run npm run dev?

### 1. Understanding the Script

In our `package.json`, we have this configuration:

```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js",
  "test": "jest --coverage"
}
```

When you run `npm run dev`, npm executes: `nodemon server.js`

### 2. What is Nodemon?

Nodemon is a development tool that:

- Starts Node.js application
- Watches for file changes in project
- Automatically restarts your server when changes are detected
- Displays real-time output in your terminal

## Step-by-Step: Running Your Development Server

### 1. Open Your Terminal

First, make sure you're in your project directory:

```bash
cd ./findmrwhite
```

### 2. Run the Development Server

Type and execute:

```bash
npm run dev
```

### 3. What You'll See in Your Terminal

After running the command, you'll see output like this:

```
> findmrwhite@1.0.0 dev
> nodemon server.js

[nodemon] 3.1.9
[nodemon] to restart at any time, enter `rs`
[nodemon] watching path(s): *.*
[nodemon] watching extensions: js,mjs,cjs,json
[nodemon] starting `node server.js`
FindMrWhite server running on port 3000
MongoDB connection error: ...
```

Let's understand this output:

- `[nodemon] 3.1.9`: Nodemon version
- `[nodemon] to restart at any time, enter 'rs'`: You can manually restart by typing 'rs'
- `[nodemon] watching path(s): *.*`: Nodemon is watching all files
- `FindMrWhite server running on port 3000`: Your server is ready!
- `MongoDB connection error`: This is normal if you don't have MongoDB running locally

### 4. Opening Your Application in the Browser

Now that your server is running, you need to:

1. **Open your web browser** (Chrome, Firefox, Edge, etc.)
2. **Type the following URL**: `http://localhost:3000`

   Alternative URLs that work the same:

   - `http://127.0.0.1:3000`
   - `localhost:3000`

### 5. What You'll See in the Browser

When you visit `http://localhost:3000`, you'll see:

- Your FindMrWhite homepage
- A navigation bar
- "Welcome to FindMrWhite!" message
- A "Get Started" button to register

### 6. Available Pages

You can navigate to these pages:

- `http://localhost:3000/` - Homepage
- `http://localhost:3000/register` - Registration page
- `http://localhost:3000/login` - Login page (not implemented yet)

## Understanding the Development Workflow

### Making Changes and Watching Updates

1. **When you edit files**: While the server is running, open any file in your IDE
2. **Make a change**: For example, edit the welcome message in `home.ejs`
3. **Save the file**: Press Ctrl+S or Cmd+S
4. **Watch the terminal**: You'll see:
   ```
   [nodemon] restarting due to changes...
   [nodemon] starting `node server.js`
   FindMrWhite server running on port 3000
   ```
5. **Refresh your browser**: You'll see your changes immediately

### Terminal Messages

You might see different types of messages:

1. **Success messages**:

   ```
   FindMrWhite server running on port 3000
   ```

2. **Error messages**:

   ```
   MongoDB connection error: failed to connect
   ```

3. **Restart messages**:

   ```
   [nodemon] restarting due to changes...
   ```

4. **Crash messages**:
   ```
   [nodemon] app crashed - waiting for file changes before starting...
   ```

## Common Issues and Solutions

### Issue 1: Port Already in Use

**Error**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solution**:

1. Close other applications using port 3000
2. Or change the port in app.js:
   ```javascript
   const port = process.env.PORT || 3001;
   ```

### Issue 2: Nodemon Not Found

**Error**: `'nodemon' is not recognized as an internal or external command`

**Solution**:

1. Make sure it's installed:
   ```bash
   npm install --save-dev nodemon
   ```

### Issue 3: MongoDB Connection Failed

**Error**: `MongoDB connection error: failed to connect to server`

**Solution**:

1. Install and start MongoDB locally, or
2. Ignore this error if you're not using database functionality yet

## Development Server Controls

### Stopping the Server

To stop the development server:

1. Click on the terminal window
2. Press `Ctrl+C` (Windows/Linux)
3. You'll see: `^C` and the terminal returns to the command prompt

### Restarting Manually

If you need to manually restart:

1. Type `rs` in the terminal and press Enter
2. Nodemon will restart the server

## Development Mode vs Production Mode

### Development Mode (npm run dev)

- Uses nodemon for auto-restart
- Shows detailed error messages
- Displays debugging information
- Source maps are enabled
- No optimization of code
- Browser caching is disabled

### Production Mode (npm start)

- Uses regular node command
- No auto-restart
- Error messages are minimized
- Code is optimized
- Browser caching is enabled
- Security headers are applied

## Best Practices for FindMrWhite development

1. **Always run in development mode while coding**
2. **Keep the terminal visible** to see errors and logs
3. **Use browser developer tools** (F12) to debug client-side issues
4. **Save frequently** to see changes
5. **Restart manually** if something seems stuck
6. **Check the terminal** for error messages

## What to Expect: A Normal FindMrWhite Development Session

1. **Start**: `npm run dev`
2. **Wait**: For "running on port 3000" message
3. **Browse**: Open `http://localhost:3000`
4. **Code**: Make changes to your files
5. **Save**: Your changes
6. **Refresh**: Browser to see changes
7. **Debug**: Check terminal for errors
8. **Stop**: Press Ctrl+C when done

## Command Summary

```bash
# Start development server
npm run dev

# Stop server
Ctrl+C

# Manually restart
rs (while server is running)

# Start production server
npm start

# Run tests
npm test
```

This comprehensive guide should help understand exactly what happens when you run `npm run dev` and how to use our development server effectively!
