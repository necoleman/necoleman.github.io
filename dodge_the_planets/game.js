import { NeuralNet } from "./model.js"

export class Game {

    constructor(mouseControl, maxX, maxY, numPlanets) {
        this.ship = new Ship(maxX / 2, maxY / 2, 0, 1);
        this.numPlanets = numPlanets;
        this.spaceObjectList = new Array(0);
        do {
            this._generatePlanet(this.spaceObjectList, maxX, maxY);
        } while (this.spaceObjectList.length < numPlanets);
        this.mouseControl = mouseControl;
        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseDown = false;
        this.timeTick = 0.001;
        this.maxX = maxX;
        this.maxY = maxY;
        this.G = 300;
        this.collisionCount = 0;
        // TODO: Make reinforcement learner its own object
        // Model: Neural network with 4 inputs for each input in the gameState (x, y, vx, vy)
        // and two real-valued inputs (possible values for angle to point & accelerate/no-accelerate)
        // this will populate 64 real-valued outputs (32 angles to point in * accelerate/no-accelerate)
        // to represent the search space of possible moves
        // this.model = new NeuralNet(4*(this.spaceObjectList.length + 1), 16);
        // this.model.addDenseLayer(32);
        // this.model.addDenseLayer(64);
        this.model = new NeuralNet(4 * (this.spaceObjectList.length + 1) + 2, 1, "LOGISTIC");
        // this.model.addDenseLayer(8, "LOGISTIC");
        // this.model.addDenseLayer(16, "LOGISTIC");
        this.model.addDenseLayer(1, "");
        this.learningRate = 0.1; // TODO make this decrease exponentially with time
        this.predictedValue = 0;
        this.chosenMoves = { "angle": 0, "rocket": false }
    }

    _generatePlanet(spaceObjectList, maxX, maxY, minRadius, maxRadius) {
        // randomly generate a planet in the canvas
        var maxRadius = maxRadius || 10;
        var minRadius = minRadius || 5;
        var newRadius = Math.random() * (maxRadius - minRadius) + minRadius;
        var newMass = 7 * newRadius + Math.random() * 50 - 25
        var newX = Math.random() * maxX;
        var newY = Math.random() * maxY;
        var newVx = 0//10*(newY-maxY/2);
        var newVy = 0//-10*(newX - maxX/2)
        // reject if within a diameter of the middle of the map where the ship starts
        if (Math.pow(newX - maxX / 2, 2) + Math.pow(newY - maxY / 2, 2) < Math.pow(newRadius, 3)) {
            return;
        }
        // reject if too close to the side of the map
        if ((newX + newRadius > maxX) | (newY + newRadius > maxY) | (newX < newRadius) | (newY < newRadius)) {
            return;
        }
        // reject if any collisions with other planets
        var collisionTolerance = 2;
        if (spaceObjectList.some(
            spaceObject => Math.pow(Math.pow(newX - spaceObject.x, 2)
                + Math.pow(newY - spaceObject.y, 2),
                0.5) < (newRadius + spaceObject.radius + collisionTolerance)
        )) {
            return;
        }
        // console.log("Generating planet!")
        spaceObjectList.push(new Planet(newX, newY, newMass, newRadius, newVx, newVy));
    }

    extractGameState() {
        // The first four are the Ship's x, y, vx, vy
        // The rest are each Planet's
        var stateArray = [this.ship.x, this.ship.y, this.ship.vx, this.ship.vy];
        this.spaceObjectList.map(planet => { stateArray = stateArray.concat([planet.x, planet.y, planet.vx, planet.vy]) })
        return stateArray;
    }

    predictMove() {
        // extract gameState and use it to generate values
        console.log("COMPUTING VALUE FUNCTION")
        var gameState = this.extractGameState();
        var possibleMoves = [0, 1, 2, 3, 4, 5, 6, 7]
        var numAngles = 4;
        var valueFunc = new Array(0);
        for (var j = 0; j < possibleMoves.length; j++) {
            var angle = 2 * Math.PI * possibleMoves[j] % 2 / (possibleMoves.length / 2)
            var accel = (j > possibleMoves.length / 2 - 1) ? 1 : 0
            valueFunc.push(this.model.predict(gameState.concat([angle, accel])))
        }
        var argMax = (Math.random() < this.learningRate) ? Math.floor(Math.random() * valueFunc.length) : valueFunc.map((x, i) => [x, i]).reduce((r, a) => (a[0] > r[0] ? a : r))[1]
        var finalAngle = 2 * Math.PI * (argMax % numAngles) / numAngles;
        var rocket = (argMax > valueFunc.length / 2);
        // console.log("GAME STATE", gameState);
        console.log("VALUE FUNCTION", valueFunc);
        console.log("ARGMAX", argMax);
        console.log("ANGLE", finalAngle);
        console.log("ACCELERATE", argMax > 3)
        this.predictedValue = valueFunc[argMax];
        this.chosenMoves = { "angle": finalAngle, "rocket": rocket }
        return this.chosenMoves
    }

    /** Game update methods */

    updateGame() {
        console.log("\n\n\n~~~==== GAME TURN ====~~~")
        // update the game state (move ship, accelerate ship, check collisions, bounce, etc)
        this.ship.updateSelf(this);
        this.spaceObjectList.map(spaceObject => spaceObject.updateSelf(this));
        this.updateModel();
    }

    updateModel() {
        // check model prediction and backpropagate
        console.log("UPDATING MODEL")
        var gameState = this.extractGameState();
        var angle = this.chosenMoves["angle"];
        var rocket = this.chosenMoves["rocket"] ? 1 : 0;
        console.log("\tChosen angle", angle);
        console.log("\tRocketing", rocket);
        this.predictedValue = this.model.predict(gameState.concat([angle, rocket]));

        var actualValue = 0;
        if (this.ship.isColliding === true) {
            actualValue = -10;
        }
        var minimizer = (accumulator, planet) => {
            return Math.floor(accumulator,
                Math.pow(Math.pow(planet.x - this.ship.x, 2) + Math.pow(planet.x - this.ship.x, 2), 0.5)
            )
        }
        var minDistance = this.spaceObjectList.reduce(minimizer, 5);
        actualValue = actualValue + Math.exp(-minDistance);
        if (this.ship.isRocketing) { actualValue = actualValue - 0.5 }
        console.log("ACTUAL VALUE", actualValue)
        console.log("PREDICTED VALUE", this.predictedValue)
        this.model.backpropagate(this.predictedValue, actualValue);
        console.log("BACKPROPAGATION COMPLETE")
    }

    drawGame(canvas, fuelPane) {
        var canvasContext = canvas.getContext("2d");
        canvasContext.clearRect(0, 0, canvas.width, canvas.height);
        var fuelContext = fuelPane.getContext("2d");
        fuelContext.clearRect(0, 0, fuelPane.width, fuelPane.height);
        this.spaceObjectList.map(planet => planet.drawSelf(canvas))
        this.ship.drawSelf(canvas, fuelPane);
        return;
    }

    /** Input and html update methods */

    updateChallenge(challengeDiv) {
        challengeDiv.innerHTML = "How long can you dodge the planets?? You've hit the planets "
            + this.collisionCount.toString()
            + " times and you have "
            + (this.ship.fuelLeft * 100).toString().slice(0, 4) + "% fuel left."
    }

    onMouseDown(event) {
        // console.log("MOUSEDOWN");
        this.mouseDown = true;
    }

    onMouseUp(event) {
        // console.log("MOUSEUP")
        this.mouseDown = false;
    }

    onMouseMove(event) {
        this.mouseX = event.clientX;
        this.mouseY = event.clientY;
        // console.log("MOUSEMOVE:", this.mouseX, this.mouseY)
    }

    resetGame() {
        this.ship = new Ship(this.maxX / 2, this.maxY / 2, 0, 1);
        this.spaceObjectList = new Array(0);
        do {
            this._generatePlanet(this.spaceObjectList, this.maxX, this.maxY);
        } while (this.spaceObjectList.length < this.numPlanets);
    }

    switchControl() {
        // change control from mouse to model or from model to mouse
        this.mouseControl = !this.mouseControl;
    }


    drawModel(modelPane) {
        // draw model
        this.model.drawSelf(modelPane);
    }

}

class SpaceObject {
    constructor(xCoord, yCoord, mass, radius, vx, vy) {
        this.x = xCoord;
        this.y = yCoord;
        this.vx = vx;
        this.vy = vy;
        this.radius = radius;
        this.mass = mass;
        this.recordCollisions = false;
        this.isColliding = false;
    }

    _handlePlanet(planet, state) {
        // console.log("Handling planet with mass", planet.mass, "and radius", planet.radius)
        var dx = planet.x - this.x;
        var dy = planet.y - this.y;
        var angleToPlanet = Math.atan2(dy, dx)
        var rSquared = (Math.pow(dx, 2) + Math.pow(dy, 2));
        if (rSquared === 0) {
            return;
        }
        // check for collision and handle
        if (rSquared < Math.pow(planet.radius + this.radius, 2)) {
            this.isColliding = true;
            // if colliding, transport back to the surface of the planet
            // this avoids a numerical feedback loop where ship experiences
            // greater acceleration the further it numerically errors
            // into the planet, thus speeding it up, thus causing greater
            // numerical errors upon collision
            this.x = planet.x - (planet.radius + this.radius) * dx / Math.pow(rSquared, 0.5)//
            this.y = planet.y - (planet.radius + this.radius) * dy / Math.pow(rSquared, 0.5)//
            var dx = planet.x - this.x;
            var dy = planet.y - this.y;
            var angleToPlanet = Math.atan2(dy, dx)
            var rSquared = (Math.pow(dx, 2) + Math.pow(dy, 2));
            // v_par = <v, r>r/|r|^2 --- component of velocity toward planet
            // v_perp = v - v_par --- component of velocity parallel planet
            var vParallelX = (this.vx * dx + this.vy * dy) * dx / rSquared
            var vParallelY = (this.vx * dx + this.vy * dy) * dy / rSquared
            var vPerpX = this.vx - vParallelX
            var vPerpY = this.vy - vParallelY
            // on reflection, v_par --> -v_par and v_perp --> v_perp
            // so this will be our new velocity
            this.vx = vPerpX - vParallelX
            this.vy = vPerpY - vParallelY
            if (this.recordCollisions) { state.collisionCount++; }
        }
        else { this.isColliding = false; }
        // calculate acceleration and update velocity
        var fx = (state.G * planet.mass / rSquared) * Math.cos(angleToPlanet)
        var fy = (state.G * planet.mass / rSquared) * Math.sin(angleToPlanet)
        this.vx += fx
        this.vy += fy
    }
}

class Planet extends SpaceObject {
    constructor(xCoord, yCoord, mass, radius, vx, vy) {
        super(xCoord, yCoord, mass, radius, vx, vy);
        this.radius = radius;
    }
    drawSelf(canvasPane) {
        var canvasContext = canvasPane.getContext("2d");
        canvasContext.fillStyle = "#C3C3C3";
        canvasContext.beginPath();
        canvasContext.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
        canvasContext.fill();
        canvasContext.stroke();
        return;
    }

    updateSelf(state) {
        this.x = this.x + state.timeTick * this.vx;
        this.y = this.y + state.timeTick * this.vy;
        // handle wall bouncing
        if (this.x + this.radius > state.maxX) {
            this.vx = -this.vx;
        }
        if (this.y + this.radius > state.maxY) {
            this.vy = -this.vy;
        }
        if (this.x < this.radius) {
            this.vx = -this.vx;
        }
        if (this.y < this.radius) {
            this.vy = -this.vy;
        }
        for (var j = 0; j < state.spaceObjectList.length; j++) {
            this._handlePlanet(state.spaceObjectList[j], state)
        }
        // console.log("PLANET", this.x, this.y, this.vx, this.vy)
        return;
    }
}

class Ship extends SpaceObject {
    constructor(xCoord, yCoord, angle, fuelLeft) {
        super(xCoord, yCoord, 0, 0, 0, 0);
        this.angle = angle;
        this.fuelLeft = fuelLeft;
        this.fuelUseOnMouseDown = 0;// 0.001;
        this.accel = 50;
        this.recordCollisions = true;
        this.isRocketing = false;
    }

    updateSelf(state) {
        if (state.mouseControl) {
            this.angle = Math.atan2(state.mouseY - this.y, state.mouseX - this.x);
            if (state.mouseDown && this.fuelLeft > 0) {
                this.isRocketing = true;
            } else { this.isRocketing = false; }
        }
        else {
            // extract gameState and use it to generate values
            var predictedMove = state.predictMove();
            this.angle = predictedMove.angle;
            this.isRocketing = predictedMove.rocket && this.fuelLeft > 0;
        }
        if (this.isRocketing) {
            this.vx += this.accel * Math.cos(this.angle);
            this.vy += this.accel * Math.sin(this.angle);
            this.fuelLeft = Math.max(this.fuelLeft - this.fuelUseOnMouseDown, 0);
        }
        this.x = this.x + state.timeTick * this.vx;
        this.y = this.y + state.timeTick * this.vy;
        // handle wall bouncing
        if (this.x > state.maxX) {
            this.vx = -this.vx;
        }
        if (this.y > state.maxY) {
            this.vy = -this.vy;
        }
        if (this.x < 0) {
            this.vx = -this.vx;
        }
        if (this.y < 0) {
            this.vy = -this.vy;
        }
        // update gravity and handle planet collisions
        for (var j = 0; j < state.spaceObjectList.length; j++) {
            this._handlePlanet(state.spaceObjectList[j], state)
        }
        // console.log(this.x, this.y);
    }

    drawSelf(canvasPane, fuelPane) {
        var canvasContext = canvasPane.getContext("2d");
        canvasContext.fillStyle = "#FFFFFF";
        canvasContext.beginPath();
        canvasContext.moveTo(this.x + 5 * Math.cos(this.angle + Math.PI),
            this.y + 5 * Math.sin(this.angle + Math.PI));
        canvasContext.lineTo(this.x + 9 * Math.cos(this.angle + 4 * Math.PI / 5),
            this.y + 9 * Math.sin(this.angle + 4 * Math.PI / 5));
        canvasContext.lineTo(this.x + 9 * Math.cos(this.angle),
            this.y + 9 * Math.sin(this.angle));
        canvasContext.lineTo(this.x + 9 * Math.cos(this.angle - 4 * Math.PI / 5),
            this.y + 9 * Math.sin(this.angle - 4 * Math.PI / 5));
        canvasContext.lineTo(this.x + 5 * Math.cos(this.angle + Math.PI),
            this.y + 5 * Math.sin(this.angle + Math.PI));
        canvasContext.stroke();

        if (this.isRocketing) {
            for (var j = 0; j < 9; j++) {
                canvasContext.beginPath();
                canvasContext.moveTo(this.x + 5 * Math.cos(this.angle + Math.PI),
                    this.y + 5 * Math.sin(this.angle + Math.PI));
                canvasContext.lineTo(this.x + 15 * Math.cos(this.angle + Math.PI + (4 - j) * Math.PI / 25),
                    this.y + 15 * Math.sin(this.angle + Math.PI + (4 - j) * Math.PI / 25));
                canvasContext.stroke();
            }
        }

        // TODO fuelContext rect with remaining fuel
        var fuelContext = fuelPane.getContext("2d");
        fuelContext.fillStyle = "#GGGGGG";
        fuelContext.fillRect(0, fuelPane.height * (1 - this.fuelLeft), fuelPane.width, fuelPane.height);
        return;
    }
}