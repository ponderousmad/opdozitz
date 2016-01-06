var SoundEffect = (function (baseURL) {
    "use strict";

    var gAudioContext = null;
    try {
        var Constructor = window.AudioContext || window.webkitAudioContext;
        gAudioContext = new Constructor();
    } catch (error) {
        console.log("Error initializing audio:");
        console.log(error);
    }

    function SoundEffect(resource) {
        this.resource = resource;
        this._source = null;
        this._buffer = null;
        
        resource = baseURL + resource;
        var self = this;
        
        if (gAudioContext !== null) {
            var request = new XMLHttpRequest();
            request.open("GET", resource, true);
            request.responseType = "arraybuffer";
            request.onload = function () {
                var audioData = request.response;
                gAudioContext.decodeAudioData(audioData,
                    function (buffer) {
                        self._buffer = buffer;
                    },
                    function (e) {
                        console.log("Error with decoding audio data" + e.err);
                    });
            };
            request.send();
        }
    }
        
    SoundEffect.prototype.isLoaded = function () {
        return gAudioContext === null || this._buffer !== null;
    };

    SoundEffect.prototype.play = function () {
        if (gAudioContext === null || this._buffer === null) {
            return;
        }
        if (this._source) {
            this._source.disconnect(gAudioContext.destination);
        }
        this._source = gAudioContext.createBufferSource();
        this._source.buffer = this._buffer;
        this._source.connect(gAudioContext.destination);
        this._source.start();
    };
    
    return SoundEffect;
}(rootURL));
