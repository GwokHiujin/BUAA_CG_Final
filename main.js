function main(nworker, iterationsPerMessage, width, height){
    if(typeof(Worker) == 'undefined') {
        alert('Your browser does not support web worker!');
        return;
    }
    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext('2d');
    document.body.appendChild(canvas);
    var image = ctx.getImageData(0, 0, width, height);
    var buffer = [];
    var iterations = 0;
    for(var i = 0; i < width*height*3; i++) {
        buffer.push(0.0);
    }

    var workers = [];
    for(i = 0; i < nworker;i++){
        var shader = new Worker('shader.js');
        shader.onmessage = function(message) {
            iterations += iterationsPerMessage;
            var data = message.data;
            if(typeof(data) == 'string') {
                data = JSON.parse(data);
            }
            for(var j = 0; j < data.length; j++) {
                buffer[j] += data[j];
            }
            for(var k=0,j=0;k < width*height*4;) {
                image.data[k++] = buffer[j++]*255/iterations;
                image.data[k++] = buffer[j++]*255/iterations;
                image.data[k++] = buffer[j++]*255/iterations;
                image.data[k++] = 255;
            }
            ctx.putImageData(image, 0, 0);
        }
        shader.postMessage([width, height, iterationsPerMessage]);
    }
}