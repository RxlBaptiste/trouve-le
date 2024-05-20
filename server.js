const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const players = ["Papa", "Moi", "Ma Sœur", "Son Copain", "Grand-mère"];
const objects = [
  "chaise",
  "téléphone",
  "livre",
  "bouteille",
  "coussin",
  "plante",
  "télécommande",
  "montre",
  "stylo",
];
let currentPlayerIndex = 0;
let currentObjectIndex = -1;
let scores = Array(players.length).fill(0);
let timer;
const turnDuration = 15 * 60 * 1000; // 15 minutes in milliseconds

function getRandomIndex(max) {
  return Math.floor(Math.random() * max);
}

function selectNextPlayer() {
  currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
}

function selectNextObject() {
  currentObjectIndex = getRandomIndex(objects.length);
}

function allObjectsFound() {
  return scores.reduce((a, b) => a + b, 0) >= objects.length;
}

function startTurn() {
  selectNextPlayer();
  selectNextObject();
  const state = {
    player: players[currentPlayerIndex],
    object: objects[currentObjectIndex],
    allObjectsFound: allObjectsFound(),
    scores: scores,
  };

  io.emit("stateUpdate", state);

  if (state.allObjectsFound) {
    endGame();
  } else {
    clearTimeout(timer);
    timer = setTimeout(endTurn, turnDuration);
  }
}

function endTurn() {
  startTurn();
}

function endGame() {
  let maxScore = Math.max(...scores);
  let winnerIndices = scores.reduce((indices, score, index) => {
    if (score === maxScore) indices.push(index);
    return indices;
  }, []);

  let resultText =
    "Gagnant(s): " + winnerIndices.map((index) => players[index]).join(", ");
  io.emit("gameOver", { result: resultText });
  clearTimeout(timer);
}

io.on("connection", (socket) => {
  console.log("A user connected");

  // Send initial state
  socket.emit("stateUpdate", {
    player: players[currentPlayerIndex],
    object: objects[currentObjectIndex],
    remainingTime: turnDuration,
  });

  socket.on("objectFound", () => {
    scores[currentPlayerIndex]++;
    startTurn();
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

app.use(express.static("public"));

server.listen(3000, () => {
  console.log("Server is running on port 3000");
});

startTurn();
