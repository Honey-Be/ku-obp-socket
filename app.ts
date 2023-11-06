const CHESS_INFO = {
  MIN_PLAYER: 2,
  MAX_PLAYER: 2,
};

interface ChessStatus {
  roomKey: string | null;
  size: 0 | 1 | 2;
  host: string | null;
  guest: string | null;
  whitePlayer: string | null;
  blackPlayer: string | null;
  isStarted: boolean;
  isEnded: boolean;
}

const initialChessStatus: ChessStatus = {
  roomKey: null,
  size: 0,
  host: null,
  guest: null,
  whitePlayer: null,
  blackPlayer: null,
  isStarted: false,
  isEnded: false,
};

interface IdInfo {
  playerName: string;
  roomKey: string;
}

interface ChessAction {
  from: string;
  to: string;
}

const express = require("express");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(
  cors({
    origin: [process.env.KU_OBP_URL, "http://localhost:3000"],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

const port = process.env.PORT || 4000;
const server = app.listen(port, () =>
  console.log(`ku-obp chess socket server listening on port ${port}!`)
);

const io = new Server(server, {
  cors: {
    origin: [process.env.KU_OBP_URL, "http://localhost:3000"],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  },
});

const idInfo: { [id: string]: IdInfo } = {};
const roomKeys: Set<string> = new Set();
const chessStatus: { [roomKey: string]: ChessStatus } = {};

io.on("connection", onConnected);

function onConnected(socket: any) {
  console.log(socket.id + " is connected.");

  socket.on(
    "joinRoom",
    ({ playerName, roomKey }: { playerName: string; roomKey: string }) => {
      console.log(playerName, roomKey);
      if (!chessStatus[roomKey]) {
        // chessStatus[roomKey] = initialChessStatus;
        chessStatus[roomKey] = { ...initialChessStatus };
        chessStatus[roomKey].roomKey = roomKey;
        roomKeys.add(roomKey);
      }

      if (chessStatus[roomKey].host && chessStatus[roomKey].guest) {
        console.log(chessStatus);
        console.log(chessStatus[roomKey]);
        socket.emit("joinFailed", "Room is full now.");
        console.log(playerName + " has failed to join the room");
        return;
      }

      socket.join(roomKey);
      idInfo[socket.id] = { playerName, roomKey };
      console.log(`${playerName}(${socket.id}) has connected to ${roomKey}`);

      if (chessStatus[roomKey].host === null) {
        chessStatus[roomKey].size += 1;
        chessStatus[roomKey].host = playerName;
        Math.random() < 0.5
          ? (chessStatus[roomKey].whitePlayer = playerName)
          : (chessStatus[roomKey].blackPlayer = playerName);
      } else if (chessStatus[roomKey].host !== playerName) {
        chessStatus[roomKey].size += 1;
        chessStatus[roomKey].guest = playerName;
        chessStatus[roomKey].whitePlayer === null
          ? (chessStatus[roomKey].whitePlayer = playerName)
          : (chessStatus[roomKey].blackPlayer = playerName);
        chessStatus[roomKey].isStarted = true;
      }

      const color = chessStatus[roomKey].whitePlayer === playerName ? "w" : "b";
      socket.emit("color", color);
      io.to(roomKey).emit("newPlayer", playerName);

      console.log(chessStatus[roomKey]);
    }
  );

  socket.on(
    "turnAction",
    ({ roomKey, action }: { roomKey: string; action: ChessAction }) => {
      socket.broadcast.to(roomKey).emit("turnAction", action);
    }
  );

  socket.on("leaveRoom", () => {
    if (!idInfo[socket.id]) {
      return;
    }

    console.log(socket.id + " is disconnectd.");
    const roomKey = idInfo[socket.id].roomKey;
    socket.broadcast.to(roomKey).emit("explosion");

    delete idInfo[socket.id];
    delete chessStatus[roomKey];
    roomKeys.delete(roomKey);
  });

  socket.on("disconnect", () => {
    if (!idInfo[socket.id]) {
      return;
    }

    console.log(socket.id + " is disconnectd.");
    const roomKey = idInfo[socket.id].roomKey;
    socket.broadcast.to(roomKey).emit("explosion");

    delete idInfo[socket.id];
    delete chessStatus[roomKey];
    roomKeys.delete(roomKey);
  });
}
