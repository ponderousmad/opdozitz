"use strict";

var KeyboardState = function (element) {
    this.pressed = {};
    var self = this;
    
    element.onkeydown = function (e) {
        e = e || window.event;
        self.pressed[e.keyCode] = true;
    };

    element.onkeyup = function (e) {
        e = e || window.event;
        delete self.pressed[e.keyCode];
    };
};

KeyboardState.prototype.isKeyDown = function (keyCode) {
    return this.pressed[keyCode] ? true : false;
};

KeyboardState.prototype.isCtrlDown = function() {
    return this.isKeyDown(17);
};
   
KeyboardState.prototype.isAsciiDown = function (ascii) {
    return this.isKeyDown(ascii.charCodeAt());
};
   
KeyboardState.prototype.keysDown = function () {
    var count = 0;
    for (var p in this.pressed) {
        if (this.pressed.hasOwnProperty(p)) {
            ++count;
        }
    }
    return count;
};

var MouseState = function (element) {
    this.location = new Vector(0, 0);
    this.left = false;
    this.middle = false;
    this.right = false;
    this.shift = false;
    this.ctrl = false;
    this.alt = false;
    
    var self = this;
    var updateState = function (event) {
        var bounds = element.getBoundingClientRect();
        self.location.set(event.clientX - bounds.left, event.clientY - bounds.top);
        self.left = (event.buttons & 1) == 1;
        self.right = (event.buttons & 2) == 2;
        self.middle = (event.buttons & 4) == 4;
        self.shift = event.shiftKey;
        self.ctrl = event.ctrlKey;
        self.altKey = event.altKey;
    };
    
    element.addEventListener("mousemove", updateState);
    element.addEventListener("mousedown", updateState);
    element.addEventListener("mouseup", updateState);
};
