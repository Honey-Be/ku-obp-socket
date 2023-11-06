var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var CHESS_INFO = {
    MIN_PLAYER: 2,
    MAX_PLAYER: 2,
};
var initialChessStatus = {
    roomKey: null,
    size: 0,
    host: null,
    guest: null,
    whitePlayer: null,
    blackPlayer: null,
    isStarted: false,
    isEnded: false,
};
var express = require("express");
var Server = require("socket.io").Server;
var cors = require("cors");
var app = express();
app.use(cors({
    origin: [process.env.KU_OBP_URL, "http://localhost:3000"],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
var port = process.env.PORT || 4000;
var server = app.listen(port, function () {
    return console.log("ku-obp chess socket server listening on port ".concat(port, "!"));
});
var io = new Server(server, {
    cors: {
        origin: [process.env.KU_OBP_URL, "http://localhost:3000"],
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
    },
});
var idInfo = {};
var roomKeys = new Set();
var chessStatus = {};
io.on("connection", onConnected);
function onConnected(socket) {
    console.log(socket.id + " is connected.");
    socket.on("joinRoom", function (_a) {
        var playerName = _a.playerName, roomKey = _a.roomKey;
        console.log(playerName, roomKey);
        if (!chessStatus[roomKey]) {
            // chessStatus[roomKey] = initialChessStatus;
            chessStatus[roomKey] = __assign({}, initialChessStatus);
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
        idInfo[socket.id] = { playerName: playerName, roomKey: roomKey };
        console.log("".concat(playerName, "(").concat(socket.id, ") has connected to ").concat(roomKey));
        if (chessStatus[roomKey].host === null) {
            chessStatus[roomKey].size += 1;
            chessStatus[roomKey].host = playerName;
            Math.random() < 0.5
                ? (chessStatus[roomKey].whitePlayer = playerName)
                : (chessStatus[roomKey].blackPlayer = playerName);
        }
        else if (chessStatus[roomKey].host !== playerName) {
            chessStatus[roomKey].size += 1;
            chessStatus[roomKey].guest = playerName;
            chessStatus[roomKey].whitePlayer === null
                ? (chessStatus[roomKey].whitePlayer = playerName)
                : (chessStatus[roomKey].blackPlayer = playerName);
            chessStatus[roomKey].isStarted = true;
        }
        var color = chessStatus[roomKey].whitePlayer === playerName ? "w" : "b";
        socket.emit("color", color);
        io.to(roomKey).emit("newPlayer", playerName);
        console.log(chessStatus[roomKey]);
    });
    socket.on("turnAction", function (_a) {
        var roomKey = _a.roomKey, action = _a.action;
        socket.broadcast.to(roomKey).emit("turnAction", action);
    });
    socket.on("leaveRoom", function () {
        if (!idInfo[socket.id]) {
            return;
        }
        console.log(socket.id + " is disconnectd.");
        var roomKey = idInfo[socket.id].roomKey;
        socket.broadcast.to(roomKey).emit("explosion");
        delete idInfo[socket.id];
        delete chessStatus[roomKey];
        roomKeys.delete(roomKey);
    });
    socket.on("disconnect", function () {
        if (!idInfo[socket.id]) {
            return;
        }
        console.log(socket.id + " is disconnectd.");
        var roomKey = idInfo[socket.id].roomKey;
        socket.broadcast.to(roomKey).emit("explosion");
        delete idInfo[socket.id];
        delete chessStatus[roomKey];
        roomKeys.delete(roomKey);
    });
}
