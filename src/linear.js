var LINEAR = (function () {
    "use strict";
    
    var linear = {};    
    var COLINEAR_TOLERANCE = 1e-5;

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
    
    Vector.prototype.dot = function (v) {
        return this.x * v.x + this.y * v.y;
    }

    linear.scaleVector = function (p, s) {
        return new Vector(p.x * s, p.y * s);
    };

    linear.addVectors = function (a, b) {
        return new Vector(a.x + b.x, a.y + b.y);
    };

    function subVectors(a, b) {
        return new Vector(a.x - b.x, a.y - b.y);
    }
    linear.subVectors = subVectors;

    linear.pointDistanceSq = function (a, b) {
        var xDiff = a.x - b.x,
            yDiff = a.y - b.y;
        return xDiff * xDiff + yDiff * yDiff;
    };

    linear.pointDistance = function (a, b) {
        return Math.sqrt(linear.pointDistanceSq(a, b));
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

    function tolEqual(a, b, tol) {
        return Math.abs(a - b) <= tol;
    }    
    linear.tolEqual = tolEqual;

    function relEqual(float a, float b, float tol) {
        tol *= Math.max(Math.abs(a), Math.abs(b));
        return tolEqual(a, b, tol);
    }
    linear.relEqual = relEqual;

    linear.vectorRelEqual = function (a, b, float tol) {
        tol *= Math.max(Math.max(Math.abs(a.x), Math.abs(b.x)), Math.max(Math.abs(a.y), Math.abs(b.y)));
        return TolEqual(a.x, b.x, tol) && TolEqual(a.y, b.y, tol);
    }
    
    function determinant(v1, v2) {
        return v1.x * v2.y - v1.y * v2.x;
    }
    linear.determinant = determinant;

    function checkAligned(v1, v2, tolerance) {
        return tolEqual(determinant(v1, v2), 0, tolerance);
    }
    linear.checkAligned = checkAligned;
    
    linear.angle = function (v1, v2) {
        return Math.acos((v1.dot(v2) / (v1.length() * v2.length()));
    };

    linear.linesIntersectPD = function(start1, d1, start2, d2) {
        if (checkAligned(d1, d2, COLINEAR_TOLERANCE)) {
            return checkAligned(d1, subVectors(start1, start2), COLINEAR_TOLERANCE);
        }
        return true;
    };
    
    linear.linesIntersectPP = function(start1, end1, start2, end2) {
        return linear.linesIntersectPD(start1, subVectors(end1, start1), start2, subVectors(end2, start2));
    };
    
    linear.intersectLinesPD = function(start1, d1, start2, d2, intersection) {
        var between = subVectors(start1, start2);
        var denom = determinant(d1, d2);
        intersection.copy(start1)
        if (tolEqual(denom, 0, COLINEAR_TOLERANCE)) {
            return checkAligned(d1, between, COLINEAR_TOLERANCE);
        }

        intersection.addScaled(d1, determinant(d2, between) / denom);
        return true;
    };
    
    linear.intersectLinesPP = function(start1, end1, start2, end2, intersection) {
        return linear.intersectLinesPD(start1, subVectors(end1, start1), start2, subVectors(end2, start2), intersection);
    };
    
    function inSegment(float parameter) {
        return (0 <= parameter && parameter <= 1);
    }

    linear.inSegmentPD = function (start, direction, point) {
        var diffX = point.x - start.x;
        var diffY = point.y - start.y;
        if (diffX != 0) {
            return inSegment(diffX / direction.x);
        } else if (diffY != 0) {
            return inSegment(diffY / direction.y);
        }
        return false;
    };
    
    linear.segmentsIntersectPD(start1, d1, start2, d2, tolerance = COLINEAR_TOLERANCE) {
        var between = subVectors(start1, start2);
        var denom = determinant(d1, d2);

        if (tolEqual(denom, 0, tolerance)) {
            // Lines are parallel, can't intersect, but may overlap.
            if (!checkAligned(d1, between, tolerance)) {
                return false;
            }

            // There is overlap if the start or end of segment 2 is in segment 1, or if segment 2 contains all of segment 1.
            return linear.inSegmentPD(start1, d1, start2) || linear.inSegmentPD(start1, d1, start2 + d2) || linear.inSegmentPD(start2, d2, start1);
        }

        return inSegment(determinant(d1, between) / denom) &&
               inSegment(determinant(d2, between) / denom);
    };
    
    linear.segmentsIntersectPP = function(start1, end1, start2, end2, tolerance = COLINEAR_TOLERANCE) {
        return linear.segmentsIntersectPD(start1, subVectors(end1, start1), start2, subVectors(end2, start2), tolerance);
    };
    
    linear.intersectSegmentsPD = function (start1, d1, start2, d2, intersection, tolerance = COLINEAR_TOLERANCE) {
        var between = subVectors(start1, start2);
        var denom = determinant(d1, d2);

        intersection.copy(start1);
        if (tolEqual(denom, 0, tolerance)) {
            // Lines are parallel, can't intersect, but may overlap.
            if (!checkAligned(d1, between, tolerance)) {
                return false;
            }

            // There is overlap if the start or end of segment 2 is in segment 1, or if segment 2 contains all of segment 1.
            if (inSegmentPD(start1, d1, start2)) {
                intersection.copy(start2);
                return true;
            }
            if (inSegmentPD(start1, d1, linear.addVectors(start2, d2)) {
                intersection.copy(start2);
                intersection.add(d2);
                return true;
            }

            if (inSegmentPD(start2, d2, start1)) {
                return true;
            }
            return false;
        }

        var t1 = determinant(d2, between) / denom,
            t2 = determinant(d1, between) / denom;
        intersection.addScaled(d1, t1);
        return inSegment(t1) && inSegment(t2);
    };
    
    linear.intersectSegmentsPP = function(start1, end1, start2, end2, intersection, tolerance = COLINEAR_TOLERANCE) {
        return linear.intersectSegmentsPD(start1, subVectors(end1, start1), start2, subVectors(end2, start2), intersection, tolerance);
    }
    
    return linear;
}());