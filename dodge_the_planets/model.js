export class NeuralNet {
    /**Follow Keras pattern of initialize, then add rows to build architecture */
    constructor(numInputs, rowSize){
        // random initialization of first row
        this.rows = [new DenseLayer(numInputs, rowSize)];
    }

    addDenseLayer(numNeurons){
        this.rows.push(new DenseLayer(this.rows[-1].length, numNeurons));
    }

    predict(){
        // prediction
        return this.rows.reduce((prediction, currentRow) => currentRow.predict(prediction))
    }

    backpropagate(){
        // backpropagation
    }

    drawSelf(canvas){
        var canvasContext = canvas.context("2d");
        // draw representation on a canvas
    }
}

class Neuron {
    constructor (numInputs) {
        // random initialization
        this.weights = (new Array(numInputs)).map(x => Math.random());
        this.bias = 0;
        this.learningRate = 0.1;
    }

    predict(inputArray){
        accumulator = this.bias;
        for(var j = 0; j < this.weights.length; j++){
            accumulator += this.weights[j]*inputArray[j];
        }
        return 1/(1 + np.exp(accumulator)); // logistic activation
    }

    backpropagate(dNextRow){
        this.learningRate
    }
}

class DenseLayer {
    constructor (numInputs, numNeurons) {
        //random initialization of row given number
        this.row = []
        for(var i=0; i < numNeurons; i++){
            this.row.push(new Neuron(numInputs))
        }
    }

    predict(inputArray){
        return this.row.map(neuron => neuron.predict(inputArray));
    }
}