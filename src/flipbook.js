var Flipbook = (function () {
    function Flipbook(imageBatch, baseName, frameCount, digits) {
        this.frames = [];
        for (var i = 1; i <= frameCount; ++i) {
            var number = i.toString();
            while (number.length < digits) {
                number = "0" + number;
            }
            this.frames.push(imageBatch.load(baseName + number + ".png"));
        }
    }
    
    Flipbook.prototype.setupPlayback = function(frameTime) {
        return {
            elapsed: 0,
            timePerFrame: frameTime
        };
    };
    
    Flipbook.prototype.updatePlayback = function(elapsed, playback) {
        playback.elapsed += elapsed;
        return playback.elapsed > (playback.timePerFrame * this.frames.length);
    };
    
    Flipbook.prototype.draw = function(context, playback, location, width, height, center) {
        var index = Math.min(this.frames.length - 1, Math.floor(playback.elapsed / playback.timePerFrame)),
            x = location.x - (center ? width * 0.5 : 0),
            y = location.y - (center ? height * 0.5 : 0);
        context.drawImage(this.frames[index], x, y, width, height);
    };
    
    return Flipbook;
}());
