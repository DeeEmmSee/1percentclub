const express = require('express');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server } = require('socket.io');
const { instrument } = require("@socket.io/admin-ui");
const compression = require("compression");

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"//"http://localhost:5173"
  }
});

const Players = { };
let GameSocketID = '';

io.on('connection', (socket) => {
    //console.log('User connected');

    // Set Username (player - server - game)
    socket.on('set_username', (name) => {
      if (!Players.hasOwnProperty(name)) {
        
        socket.name = name;
        let isAdmin = name == "Ryo";
        socket.emit("username_set", isAdmin);

        if (isAdmin) {
          // add admin to game room
          socket.join("admin");
          console.log("Admin joined");
           io.to(GameSocketID).emit("admin_joined");
        }
        else {
          socket.join("players");
          Players[name] = socket.id;
          console.log("User added");
          console.log(Players);
          io.to(GameSocketID).emit("admin_playerjoined", { "name": socket.name, "id": socket.id }); 
        }
      }
      else {
        socket.emit("error", "Player name already exists");
      }
    });
   
    // Update player state (game - server - player) - MUST ALWAYS HAVE PLAYER
    socket.on('update_player_state_player', (data) => {
      io.to(data.socket).emit("update_player_state", data.state);
    });

    // Update game state for a player (game - server - player)
    socket.on('update_game_state_player', (data) => {
      io.to(data.socket).emit("update_state", data.state);
    });

     // Update game state for all players (game - server - players)
    socket.on('update_game_state_all', (state) => {
      socket.to("players").emit("update_state", state);
    });

    // Player sends answer (player - server - game)
    socket.on('send_answer', (data) => {
      console.log("Answer received");
      console.log(data);
      data.socketID = socket.id;
      io.to(GameSocketID).emit("admin_receivedanswer", data);
    });

    // Player sends pass (player - server - game)
     socket.on('use_pass', (data) => {
      data.socketID = socket.id;
      io.to(GameSocketID).emit("admin_usepass", data);
    });

     // Player walks away (player - server - game)
     socket.on('walk_away', (data) => {
      data.socketID = socket.id;
      io.to(GameSocketID).emit("admin_walkaway", data);
    });

    // Player sends answer (player - server - game)
    socket.on('send_to_player', (data) => {
        io.to(data.socket).emit("receive_data", data);
    });

    // ADMIN
    // Only for Game instance (game - server)
    socket.on('game_join_room', () => {
        socket.join("admin");
        console.log("Game joined room");

        GameSocketID = socket.id;
    });

    // Start game (admin - server - game - server - players)
    socket.on('start_game', () => {
      socket.to("players").emit("start_game");
      io.to(GameSocketID).emit("admin_startgame");
    });

    // Post intro (admin - server - game - server - players)
    socket.on('admin_postintro', () => {
      io.to(GameSocketID).emit("admin_postintro");
    });

     // Player intro (admin - server - game - server - players)
    socket.on('admin_playerintro', () => {
      io.to(GameSocketID).emit("admin_playerintro");
    });

    // Next Question (admin - server - game - server - players)
    socket.on('admin_nextquestion', () => {
      io.to(GameSocketID).emit("admin_nextquestion");
    });

    // Advance question (admin - server - game - server - players)
    socket.on('admin_advancequestion', () => {
      io.to(GameSocketID).emit("admin_advancequestion");
    });

    // Update admin panel (game - server - admin)
    socket.on('update_admin_panel_state', (data) => {
        socket.to("admin").emit("update_admin_panel_state", data);
    });

    // Update admin panel (game - server - admin)
    socket.on('send_to_room', (data) => {
        console.log("Data received: " + data);
        socket.to("admin").emit("receive_data", data);
    });

    socket.on('admin_mark_as_correct', (data) => {
      io.to(GameSocketID).emit("admin_mark_as_correct", data);
    });

    socket.on('admin_answer_submitted', (data) => {
      socket.to("admin").emit("admin_answer_submitted", data);
    });
    // /ADMIN

    socket.on('disconnected', () => {
        console.log("User disconnected");

        if (Players.hasOwnProperty(socket.name)) {
          delete Players[socket.name];
          io.to(GameSocketID).emit("admin_playerleft", socket.name); 
        }
    })
});

//app.use(express.static('./node_modules/@socket.io/admin-ui/ui/dist'));
app.use(express.static('./public'));
app.use(compression()); // Compress all routes

instrument(io, {
  auth: false,
  mode: 'development'
});

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});