import { Game } from "./game.js"

var mainPane = document.getElementById("main_pane");
var fuelPane = document.getElementById("fuel_pane");
var challengeDiv = document.getElementById("game_challenge");
var gameState = new Game(true, mainPane.height, mainPane.width, 7);

mainPane.addEventListener("mousedown", event => {
    gameState.onMouseDown(event);
});

mainPane.addEventListener("mouseup", event => {
    gameState.onMouseUp(event);
})

mainPane.addEventListener("mousemove", event => {
    gameState.onMouseMove(event);
});

window.main = function(){
    window.requestAnimationFrame(main);
    gameState.updateGame();
    gameState.drawGame(mainPane, fuelPane);
    gameState.updateChallenge(challengeDiv);
}

main();