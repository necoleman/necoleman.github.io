import { Game } from "./game.js"


// Get and set game state & draw elements

var mainPane = document.getElementById("main_pane");
var fuelPane = document.getElementById("fuel_pane");
var challengeDiv = document.getElementById("game_challenge");
var gameState = new Game(mainPane.height, mainPane.width, 5);

mainPane.addEventListener("mousedown", event => {
    gameState.onMouseDown(event);
});

mainPane.addEventListener("mouseup", event => {
    gameState.onMouseUp(event);
})

mainPane.addEventListener("mousemove", event => {
    gameState.onMouseMove(event);
});

// Get and set game state control elements
var resetButton = document.getElementById("reset_button");
resetButton.addEventListener("mouseup", event => { gameState.resetGame() })

window.main = function () {
    window.requestAnimationFrame(main);
    gameState.updateGame();
    gameState.drawGame(mainPane, fuelPane);
    gameState.updateChallenge(challengeDiv);
}

// main();
console.log("RANDOM ARRAY", Array.from({ length: 5 }, () => Math.random() - 0.5))


// for (var j = 0; j < 1; j++) {
//     // window.requestAnimationFrame(main);
//     gameState.updateGame();
//     gameState.drawGame(mainPane, fuelPane);
//     gameState.updateChallenge(challengeDiv);
// }