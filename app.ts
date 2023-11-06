import { BlobOptions } from "buffer";

const express = require("express");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(
  cors({
    origin: [process.env.OBP, "http://localhost:3000"],
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

const GAME_INFO = {
  CHESS: {
    MIN_PLAYER: 2,
    MAX_PLAYER: 2,
  },
};

interface ChessStatus {
  whitePlayer: string | null;
  blackPlayer: string | null;
  isStarted: boolean;
  isEnded: boolean;
}

const initialChessStatus = {
  whitePlayer: null,
  blackPlayer: null,
  isStarted: false,
  isEnded: false,
};

const roomKeys: Set<string> = new Set();
const roomPlayers: { [roomKey: string]: Set<string> } = {};
const playerRoom: { [playerName: string]: string } = {};
const chessStatus: { [roomKey: string]: ChessStatus } = {};

io.on("connection", onConnected);

function onConnected(socket: any) {
  console.log(socket.id + " is connected.");

  socket.on(
    "joinRoom",
    ({ playerName, roomKey }: { playerName: string; roomKey: string }) => {
      socket.join(roomKey);
      console.log(`${socket.id} has connected to ${roomKey}`);

      if (!roomPlayers[roomKey]) {
        roomPlayers[roomKey] = new Set();
        chessStatus[roomKey] = initialChessStatus;
        roomKeys.add(roomKey);
      }

      if (roomPlayers[roomKey].size >= GAME_INFO.CHESS.MAX_PLAYER) {
        socket.emit("joinFailed", "Room is full now.");
        return;
      }

      roomPlayers[roomKey].add(playerName);
      playerRoom[playerName] = roomKey;

      if (roomPlayers[roomKey].size === 1) {
        Math.random() < 0.5
          ? (chessStatus[roomKey].whitePlayer = playerName)
          : (chessStatus[roomKey].blackPlayer = playerName);
      } else {
        chessStatus[roomKey].whitePlayer === null
          ? (chessStatus[roomKey].whitePlayer = playerName)
          : (chessStatus[roomKey].blackPlayer = playerName);
      }

      const color = chessStatus[roomKey].whitePlayer === playerName ? "w" : "b";
      socket.emit("color", color);
      io.to(roomKey).emit("newPlayer", playerName);
    }
  );

  socket.on("leaveRoom", (roomKey: string) => {
    socket.leave(roomKey);
    if (roomPlayers[roomKey]) {
      roomPlayers[roomKey].delete(socket.id);
      if (roomPlayers[roomKey].size === 0) {
        delete roomPlayers[roomKey];
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected", socket.id);
    for (let roomKey in roomPlayers) {
      roomPlayers[roomKey].delete(socket.id);
      if (roomPlayers[roomKey].size === 0) {
        delete roomPlayers[roomKey];
      }
    }
  });

  interface ChessAction {
    from: string;
    to: string;
  }

  socket.on(
    "turnAction",
    ({ roomKey, action }: { roomKey: string; action: ChessAction }) => {
      socket.broadcast.to(roomKey).emit("turnAction", action);
    }
  );
}
