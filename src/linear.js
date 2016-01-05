var LINEAR = (function() {
    "use strict";
    
    var linear = {};

    function Vector(x, y) {
        this.x = x;
        this.y = y;
    }
    
    linear.Vector = Vector;

    Vector.prototype.clone = function () {
        return new Vector(this.x, this.y);
    };

    Vector.prototype.set = function (x, y) {
        this.x = x;
        this.y = y;
    };

    Vector.prototype.copy = function (v) {
        this.x = v.x;
        this.y = v.y;
    };

    Vector.prototype.add = function (v) {
        this.x += v.x;
        this.y += v.y;
    };

    Vector.prototype.addScaled = function (v, s) {
        this.x += v.x * s;
        this.y += v.y * s;
    };

    Vector.prototype.sub = function (v) {
        this.x -= v.x;
        this.y -= v.y;
    };

    Vector.prototype.scale = function (s) {
        this.x *= s;
        this.y *= s;
    };

    Vector.prototype.lengthSq = function () {
        return this.x * this.x + this.y * this.y;
    };

    Vector.prototype.length = function () {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    };

    Vector.prototype.normalize = function () {
        var length = this.length();
        this.x /= length;
        this.y /= length;
    };

    linear.scaleVector = function (p, s) {
        return new Vector(p.x * s, p.y * s);
    };

    linear.addVectors = function (a, b) {
        return new Vector(a.x + b.x, a.y + b.y);
    };

    linear.subVectors = function (a, b) {
        return new Vector(a.x - b.x, a.y - b.y);
    };

    linear.pointDistanceSq = function (a, b) {
        var xDiff = a.x - b.x,
            yDiff = a.y - b.y;
        return xDiff * xDiff + yDiff * yDiff;
    };

    linear.pointDistance = function (a, b) {
        return Math.sqrt(pointDistanceSq(a, b));
    };

    linear.vectorNormalize = function (v) {
        var length = v.length();
        return new Vector(v.x / length, v.y / length);
    };

    linear.angleToVector = function (angle) {
        return new Vector(Math.cos(angle), Math.sin(angle));
    };

    linear.parseVector = function (data) {
        return new Vector(parseFloat(data.x), parseFloat(data.y));
    };

    linear.clampAngle = function (angle) {
        while (angle < -Math.PI) {
            angle += 2 * Math.PI;
        }

        while (angle > Math.PI) {
            angle -= 2 * Math.PI;
        }
        return angle;
    };
}());