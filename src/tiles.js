var TILES = (function () {
    "use strict";

    var Parts = {
            Empty : 0,
            Flat : 1,
            SlantUp : 2,
            SlantDown : 4,
            TransitionTop : 8,
            TransitionBottom : 16,
            Block : 32,
            SpikesUp : 64,
            SpikesDown : 128,
            Start : 256,
            End : 512
        },
        PART_NAMES = [],
        PART_VALUES = {},
        ALL_PARTS = [],
        IMAGES = [],
        TILE_SIZE = 50,
        GIRDER_WIDTH = 3,
        TILE_DRAW_OFFSET = 5,
        TRANSITION_SLOPE_FRACTION = 0.4,
        TRANSITION_SLOPE_GRADE = 0.5,
        TRANSITION_SLOPE_RUN = TILE_SIZE * TRANSITION_SLOPE_FRACTION,
        TRANSITION_SLOPE_RISE = TRANSITION_SLOPE_RUN * TRANSITION_SLOPE_GRADE,
        TRANSITION_ARC_STEPS = 2,
        SPIKES_SIZE = TILE_SIZE / 4,
        SPIKES_EDGE = TILE_SIZE / 10,
        MOVE_SIZE = 5;
        tileBatch = new ImageBatch("images/");
        
    PART_NAMES[Parts.Empty] = "Empty";
    PART_NAMES[Parts.Flat] = "Flat";
    PART_NAMES[Parts.SlantUp] = "SlantUp";
    PART_NAMES[Parts.SlantDown] = "SlantDown";
    PART_NAMES[Parts.TransitionTop] = "TransitionTop";
    PART_NAMES[Parts.TransitionBottom] = "TransitionBottom";
    PART_NAMES[Parts.Block] = "Block";
    PART_NAMES[Parts.SpikesUp] = "SpikesUp";
    PART_NAMES[Parts.SpikesDown] = "SpikesDown";
    PART_NAMES[Parts.Start] = "Start";
    PART_NAMES[Parts.End] = "End";

    (function () {
        for (var p in Parts) {
            if (Parts.hasOwnProperty(p)) {
                ALL_PARTS.push(p);
                PART_VALUES[PART_NAMES[p]] = p;
                IMAGES[p] = tileBatch.load("Tile" + PART_NAMES[p] + ".png");
            }
        }
        tileBatch.commit();
    }());
    
    function Tile(parts, left, top) {
        this.parts = Parts.empty;
        for (var i = 0; i < parts.length; ++i) {
            this.parts |= PART_VALUES[parts[i]];
        }
        this.left = left;
        this.top = top;
    }
    
    Tile.prototype.hasPart = function (part) {
        return (this.parts & part) !== 0;
    };
    
    Tile.prototype.bottom = function () {
        return this.top + TILE_SIZE;
    };
    
    Tile.prototype.right = function () {
        return this.left + TILE_SIZE;
    };

    Tile.prototype.platforms = function () {
        result = [];
        if (this.hasPart(Parts.Flat)) {
            result.push(new LINEAR.Segment(this.left, this.bottom() - GIRDER_WIDTH, this.right(), this.bottom() - GIRDER_WIDTH));
            result.push(new LINEAR.Segment(this.right(), this.bottom() + GIRDER_WIDTH, this.left, this.bottom() + GIRDER_WIDTH));
        }
        if (this.hasPart(Parts.SlantUp)) {
            result.push(new LINEAR.Segment(this.left, this.bottom() - GIRDER_WIDTH, this.right(), this.top - GIRDER_WIDTH));
            result.push(new LINEAR.Segment(this.right(), this.top + GIRDER_WIDTH, this.left, this.bottom() + GIRDER_WIDTH));
        }
        if (this.hasPart(Parts.SlantDown)) {
            result.push(new LINEAR.Segment(this.left, this.top - GIRDER_WIDTH, this.right(), this.bottom() - GIRDER_WIDTH));
            result.push(new LINEAR.Segment(this.right(), this.bottom() + GIRDER_WIDTH, this.left, this.top + GIRDER_WIDTH));
        }
        if (this.hasPart(Parts.TransitionTop)) {
            var platformEnd = new Vector(this.left + TRANSITION_SLOPE_RUN, this.bottom() - GIRDER_WIDTH - TRANSITION_SLOPE_RISE);
            result.push(new LINEAR.Segment(this.left, this.bottom() - GIRDER_WIDTH, platformEnd.X, platformEnd.Y));
            var topCenter = new Vector(this.left + TRANSITION_SLOPE_RUN, this.bottom());
            makeArcSegments(topCenter, platformEnd, Math.PI / 2, TRANSITION_ARC_STEPS, result);
        }
        if (this.hasPart(Parts.TransitionBottom)) {
            var bottomCenter = new Vector(this.left + TRANSITION_SLOPE_RUN, this.top);
            var radius = GIRDER_WIDTH + TRANSITION_SLOPE_RISE;
            var arcStart = new Vector(this.left + TRANSITION_SLOPE_RUN + radius, this.top);
            makeArcSegments(bottomCenter, arcStart, Math.PI / 2, TRANSITION_ARC_STEPS, result);
            result.push(new LINEAR.Segment(this.left + TRANSITION_SLOPE_RUN, this.top + radius, this.left, this.top + GIRDER_WIDTH));
        }
        return result;
    };

    Tile.prototype.hazards = function () {
        var boxes = [];
        if (this.hasPart(Parts.Block)) {
            boxes.push(new LINEAR.AABox(this.left, this.top, TILE_SIZE, TILE_SIZE));
        }
        if (this.hasPart(Parts.SpikesUp)) {
            boxes.push(new LINEAR.AABox(this.left + SPIKES_EDGE, this.bottom() - GIRDER_WIDTH - SPIKES_SIZE, this.right()-this.left - 2 * SPIKES_EDGE, SPIKES_SIZE));
        }
        if (this.hasPart(Parts.SpikesDown)) {
            boxes.push(new LINEAR.AABox(this.left + SPIKES_EDGE, this.top + GIRDER_WIDTH, this.right() - this.left - 2 * SPIKES_EDGE, SPIKES_SIZE));
        }
    };

    Tile.prototype.home = function (size) {
        if (this.hasPart(Parts.End))
        {
            return new LineSegment.AABox(this.left + size / 4, this.top + GIRDER_WIDTH, size / 2, size);
        }
        return null;
    };

    Tile.prototype.makeArcSegments = function (center, startPoint, segmentAngle, steps, segments) {
        var angleStep = -segmentAngle / steps,
            startSpoke = LINEAR.subVectors(startPoint, center),
            startAngle = Math.atan2(-startSpoke.Y, startSpoke.X),
            radius = startSpoke.length();

        for (var i = 1; i <= steps; ++i)
        {
            var angle = startAngle + i * angleStep,
                platformEnd = center.clone(),
                spoke = LINEAR.angleToVector(angle);
            spoke.y = -spoke.y;
            platformEnd.addScaled(spoke, radius);
            segments.push(new LINEAR.Segment(startPoint, platformEnd));
            startPoint = platformEnd;
        }
    };

    Tile.prototype.clone = function (newTop) {
        return new Tile(this.parts, this.left, newTop);
    };

    Tile.prototype.draw = function (context) {
        var size = TILE_SIZE + 2 * TILE_DRAW_OFFSET;
        for (var i = 0; i < ALL_PARTS.length; ++i) {
            var part = ALL_PARTS[i];
            if (this.hasPart(part)) {
                context.drawImage(IMAGES[part], this.left - TILE_DRAW_OFFSET, this.top - TILE_DRAW_OFFSET, size, size);
            }
        }
    };

    Tile.prototype.drawDiagnostics = function (context) {
        var segments = this.platforms();
        for (var i = 0; i < segments; ++i) {
            var platform = segments[i];
            ctx.beginPath();
            ctx.moveTo(i.start);
            ctx.lineTo(i.end);
            ctx.stroke();
        }
    };

    Tile.prototype.toString = function () {
        return "Location: " + this.left + ", " + this.top + " Parts: " + mParts;
    };

    Tile.prototype.store = function (tiles) {
        var partNames = [];
        tiles.push(this.parts);
    };

    Tile.prototype.togglePart = function (part) {
        this.parts ^= part;
    };
    
    function Column(left, top, locked) {
        this.left = left;
        this.top = top;
        this.locked = locked;
        this.tiles = [];
        this.movingUp = false;
        this.movingSteps = 0;
    }

    Column.prototype.add = function (tile) {
        this.tiles.push(tile);
    };

    Column.prototype.draw = function (context) {
        for (var i = 0; i < this.tiles.length; ++i) {
            this.tiles[i].draw(context);
        }
    };

    Column.prototype.indexOf = function (tile) {
        for (var i = 0; i < this.tiles.length; ++i) {
            if (this.tiles[i] == tile) {
                return i;
            }
        }
        return null;
    };

    Column.prototype.at = function (index) {
        return this.tiles[index];
    };

    Column.prototype.length = function ()  {
        return this.tiles.length;
    };

    Column.prototype.right = function () {
        return this.left + TILE_SIZE;
    };

    Column.prototype.moving = function () {
        return this.movingSteps > 0;
    };

    Column.prototype.inColumn = function (x) {
        return this.left <= x && x <= this.right;
    };

    Column.prototype.moveUp = function () {
        this.movingUp = true;
        this.tiles.push(this.tiles[0].clone(this.tiles[this.tiles.length-1].top + TILE_SIZE));
        this.movingSteps = TILE_SIZE;
    };

    Column.prototype.moveDown = function () {
        this.movingUp = false;
        this.tiles.insert(0, this.tiles[this.tiles.length-1].clone(this.tiles[0].top - TILE_SIZE));
        this.movingSteps = TILE_SIZE;
    };

    Column.prototype.update = function (elapsed) {
        var delta = 0;
        if (this.movingSteps > 0) {
            delta = this.movingUp ? -MOVE_SIZE : MOVE_SIZE;
            for (var i = 0; i < this.tiles.length; ++i) {
                this.tiles[i].top += delta;
            }
            this.movingSteps -= MOVE_SIZE;
            if (!this.moving()) {
                this.tiles.splice(mMovingUp ? 0 : this.tiles.length - 1, 1);
            }
        }
        return delta;
    };

    Column.prototype.store = function (columns) {
        var column = {
            locked: this.locked,
            tiles: []
        };
        for (var i = 0; i < this.tiles.length; ++i) {
            this.tiles[i].store(column.tiles);
        }
        columns.push(column);
    };
    
    return { Tile: Tile, TileColumn: Column, Parts: Parts, SIZE: TILE_SIZE, GIRDER_WIDTH: GIRDER_WIDTH };
}());
