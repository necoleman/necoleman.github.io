/**Neural net model */

export class NeuralNet {
    /**Follow Keras pattern of initialize, then add rows to build architecture */
    constructor(numInputs, rowSize, activation) {
        // random initialization of first row
        this.rows = [new DenseLayer(numInputs, rowSize, activation)];
    }

    addDenseLayer(numNeurons, activation) {
        var newLayer = new DenseLayer(this.rows[this.rows.length - 1].row.length, numNeurons, activation);

        this.rows.push(newLayer);
    }

    predict(inputArray) {
        // prediction
        console.log("\tMODEL GENERATING PREDICTION")
        var prediction = inputArray;
        for (var j = 0; j < this.rows.length; j++) {
            prediction = this.rows[j].predict(prediction);
        }
        return prediction[0];
    }

    backpropagate(predictedValue, actualValue) {
        // backpropagation
        // handle output layer
        var errorDeriv = predictedValue - actualValue;
        console.log("ERROR DERIVATIVE", errorDeriv)
        this.rows[this.rows.length - 1].row.map(neuron => {
            for (var i = 0; i < neuron.weights.length; i++) {
                neuron.weights[i] = neuron.weights[i] + neuron.learningRate * errorDeriv;
                neuron.outputDerivative = errorDeriv;
            }
        })
        // console.log("FINAL LAYER", this.rows[this.rows.length - 1])
        var nextRow = this.rows[this.rows.length - 1];
        // handle all other layers
        for (var j = this.rows.length - 2; j > -1; j--) {
            var currentRow = this.rows[j];
            currentRow.row.map(neuron => { neuron.backpropagate(errorDeriv, nextRow) })
            nextRow = currentRow;
        }
        return;
    }

    drawSelf(canvasPane) {
        for (var j = 0; j < this.rows.length; j++) {
            this.rows[j].drawSelf(canvasPane, (j + 0.5) / this.rows.length)
        }
    }
}

class DenseLayer {
    constructor(numInputs, numNeurons, activation) {
        //random initialization of row given number
        this.row = []
        for (var i = 0; i < numNeurons; i++) {
            this.row.push(new Neuron(numInputs, i))
        }
        if (activation == "LOGISTIC") { this.activation = function (x) { return 1 / (1 + Math.exp(x)); } }
        else { this.activation = function (x) { return x; } }
    }

    predict(inputArray) {
        var prediction = this.row.map(neuron => this.activation(neuron.predict(inputArray)));
        return prediction;
    }

    drawSelf(canvasPane, heightRatio) {
        var height = heightRatio * canvasPane.height;
        for (var j = 0; j < this.row.length; j++) {
            this.row[j].drawSelf(canvasPane, (j + 0.5) / this.row.length, height);
        }
    }
}

class Neuron {
    constructor(numInputs, index) {
        // random initialization
        this.weights = Array.from({ length: numInputs }, () => 0);
        console.log(this.weights)
        this.bias = 0;
        // for use in backpropagation
        this.learningRate = 1;
        this.mostRecentPrediction = 0;
        this.mostRecentInputs = Array.from({ length: numInputs }, () => 0);
        this.index = index;
        this.outputDerivative = 0;
        this.inputDerivativeArray = Array.from({ length: numInputs }, () => 0);
        console.log("JUST GENERATED NEURON", this)
    }

    predict(inputArray) {
        console.log("\t\tINPUT", inputArray)
        console.log("\t\tWEIGHTS", this.weights)
        var returnValue = this.bias;
        for (var j = 0; j < this.weights.length; j++) {
            returnValue += this.weights[j] * inputArray[j];
        }
        this.mostRecentPrediction = returnValue;
        this.mostRecentInputs = inputArray;
        // compute derivatives
        this.inputDerivativeArray = this.weights.map(weight => {
            return this.mostRecentPrediction * (1 - this.mostRecentPrediction) * weight;
        })
        console.log("\t\tPREDICTION", this.mostRecentPrediction)
        console.log("\t\tDERIVATIVES", this.inputDerivativeArray)
        return returnValue;
    }

    backpropagate(errorDerivative, nextLayer) {
        // 1) Use dNextRow to compute dThisNeuron
        // 2) For each weight:
        //    a) compute dThisNeuron/dWeight
        //    b) compute dError/dWeight
        //    C) adjust weight by epsilon*dError/dWeight
        // 3) Return dOutput/dSelf
        console.log("BACKPROP NEURON")
        console.log("\tNEURON STATE", this)
        this.outputDerivative = nextLayer.row.reduce((runningTotal, currentNeuron) => {
            // console.log("\t\tNEURON BACKPROP ITERATION running total", runningTotal)
            var currentDerivative = currentNeuron.outputDerivative * currentNeuron.inputDerivativeArray[this.index];
            return runningTotal + currentDerivative;
        }, 0)
        console.log("\t\tOUTPUT DERIVATIVE", this.outputDerivative)
        console.log("\t\tMOST RECENT PREDICTION", this.mostRecentPrediction)
        console.log("\t\tMOST RECENT INPUTS", this.mostRecentInputs)
        for (var i = 0; i < this.weights.length; i++) {
            this.weights[i] = this.weights[i] + this.learningRate * errorDerivative * this.outputDerivative
                * this.mostRecentPrediction * (1 - this.mostRecentPrediction) * this.mostRecentInputs[i];
        }
        // console.log("\tOUTPUT DERIVATIVE", this.outputDerivative)
        console.log("\tNEURON NEXT STATE", this)
        return;
    }

    drawSelf(canvasPane, widthRatio, height) {
        var width = widthRatio * canvasPane.width;
        var canvasContext = canvasPane.getContext("2d")
        canvasContext.fillStyle = "#C3C3C3";
        canvasContext.beginPath();
        canvasContext.arc(width, height, 3, 0, 2 * Math.PI);
        canvasContext.fill();
        canvasContext.stroke();
        canvasContext.font = "10px Arial"
        canvasContext.fillText(this.weights.toString(), width, height)
        return;
    }

}
