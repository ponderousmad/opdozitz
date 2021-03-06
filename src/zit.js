﻿var Zit = (function() {
    var State =  {
            Rolling: 0,
            Dead: 1,
            Falling: 2,
            Home: 3
        },
    
        SIZE = 20,
        RADIUS = SIZE / 2.0,
        ANGLE_INCREMENT = 0.006,
        FALL_FORCE = 0.03,
        FATAL_VELOCITY = 9,
        EXPLOSION_TIME_PER_FRAME = 80,
        EXPLOSION_DRAW_SIZE = SIZE * 2,
        // Empirically determined to elimnate spurrious physics results.
        MAX_ANGLE_STEP = 0.7,
        MINUS_Y = new LINEAR.Vector(0, -1),
    
        zitBatch = new ImageBatch("images/"),
        sprite = zitBatch.load("Zit.png"),
        explosion = new Flipbook(zitBatch, "Explode", 9, 2),
        explodeSound = new AUDIO.SoundEffect("audio/Splat.wav"),
        landSound = new AUDIO.SoundEffect("audio/Pip.wav"),
        homeSound = new AUDIO.SoundEffect("audio/Blip.wav"),
        spawnSound = new AUDIO.SoundEffect("audio/Ding.wav");

    function Zit(tile, speedFactor) {
        var platform = tile.platforms()[0];
        
        this.speedFactor = speedFactor;
        this.contact = platform.start.clone();
        this.contact.addScaled(platform.direction(), RADIUS);
        this.location = this.contact.clone();
        this.location.addScaled(platform.directedNormal(), RADIUS);
        this.angle = 0;
        this.state = State.Rolling;
        this.fallSpeed = 0;
        this.exploding = null;

        this.currentTile = tile;
        
        spawnSound.play();
    };
    
    Zit.prototype.getSize = function () { return SIZE; };
    Zit.prototype.contactTile = function () { return this.currentTile; };

    Zit.prototype.update = function (elapsed, columns, frame) {
        var rotationRemaining = elapsed * ANGLE_INCREMENT * this.speedFactor;

        while (this.isRolling() && rotationRemaining > 0) {
            var rotation = rotationRemaining > MAX_ANGLE_STEP ? MAX_ANGLE_STEP : rotationRemaining;
            rotationRemaining -= rotation;

            this.angle += rotation;

            this.updateRolling(columns, rotation);
            this.checkBoundaries(frame);
            this.checkHazards(columns);
            this.checkHome(columns);
        }

        if (this.isFalling()) {
            this.angle += rotationRemaining;
            this.updateFalling(columns, elapsed);
            this.checkBoundaries(frame);
        }

        if (this.exploding !== null && explosion.updatePlayback(elapsed, this.exploding)) {
            this.exploding = null;
        }
    };

    // Calculate the angle between to already normalized vectors.
    // Does not check if the vectors are normalized
    function normalAngle(n1, n2) {
        return Math.acos(Math.min(1, n1.dot(n2)));
    }

    Zit.prototype.updateRolling = function (columns, rotation) {
        var support = LINEAR.subVectors(this.location, this.contact),
            supportAngle = Math.atan2(support.y, support.x),
            newAngle = supportAngle + rotation,
    
            swungLocation = LINEAR.addVectors(this.contact, LINEAR.scaleVector(LINEAR.angleToVector(newAngle), RADIUS)),
    
            top = Math.floor(Math.min(this.location.y, swungLocation.y)) - SIZE,
            bottom = Math.ceil(Math.max(this.location.y, swungLocation.y)) + SIZE,
            left = Math.floor(Math.min(this.location.x, swungLocation.x) - RADIUS),
            right = Math.ceil(Math.max(this.location.x, swungLocation.x) + RADIUS),
    
            closestPlatform = null,
            newContact = this.contact,
            closestTile = null,
            closestAtEnd = false,
            DISTANCE_CHECK_HACK = 1.01,
            minDistanceSquared = RADIUS * RADIUS * DISTANCE_CHECK_HACK,
            
            overlapping = this.tilesInColumns(columns, left, right, top, bottom);
        
        for (var i = 0; i < overlapping.length; ++i) {
            var tile = overlapping[i],
                platforms = tile.platforms();
            for (var p = 0; p < platforms.length; ++p) {
                var platform = platforms[p],
                    currentClosest = platform.closestPoint(swungLocation),
                    distanceSquared = LINEAR.pointDistanceSq(currentClosest.point, swungLocation);
                if (distanceSquared < minDistanceSquared) {
                    closestAtEnd = currentClosest.atEnd;
                    closestPlatform = platform;
                    minDistanceSquared = distanceSquared;
                    newContact = currentClosest.point;
                    closestTile = tile;
                }
            }
        }

        if (closestPlatform !== null) {
            this.contact = newContact;
            var DIE_RADIUS = RADIUS / 2;
            if (minDistanceSquared < DIE_RADIUS * DIE_RADIUS) {
                this.die();
            } else if (closestAtEnd) {
                var FALL_ANGLE = Math.PI * 0.4,
                    normal = LINEAR.subVectors(swungLocation, this.contact);
                normal.normalize();
                    
                var angle = normalAngle(closestPlatform.directedNormal(), normal);
                if (normal.y > 0 && angle > FALL_ANGLE) {
                    this.location = swungLocation;
                    this.fall();
                } else {
                    this.location.copy(this.contact);
                    this.location.addScaled(normal, RADIUS);
                }
            } else {
                this.location.copy(this.contact);
                this.location.addScaled(closestPlatform.directedNormal(), RADIUS);
            }
            this.currentTile = closestTile;
        } else {
            this.location = swungLocation;
            this.fall();
        }
    };

    Zit.prototype.updateFalling = function (columns, elapsed) {
        this.fallSpeed += elapsed * FALL_FORCE;

        var fallLocation = new LINEAR.Vector(this.location.x, this.location.y + this.fallSpeed),
            closestPlatform = null,
            newContact = new LINEAR.Vector(0, 0),
            contactTile = null;
        if (this.fallSpeed < FATAL_VELOCITY) {
            var highestIntersection = fallLocation.y,
                overlapping = this.tilesInCurrentColumns(columns);
            for (var i = 0; i < overlapping.length; ++i) {
                var tile = overlapping[i],
                    platforms = tile.platforms();
                for (var p = 0; p < platforms.length; ++p) {
                    var platform = platforms[p];
                    if (this.isCeiling(platform.directedNormal())) {
                        continue;
                    }
                    var offsetVector = LINEAR.scaleVector(platform.directedNormal(), -RADIUS),
                        offsetStart = LINEAR.addVectors(fallLocation, offsetVector),
                        offsetEnd = LINEAR.addVectors(offsetStart.clone(), new LINEAR.Vector(0,-SIZE)),
                        contact = new LINEAR.Vector(),
                        segment = new LINEAR.Segment(offsetStart, offsetEnd);
                    if (platform.findIntersection(segment, contact)) {
                        var landLocation = LINEAR.subVectors(contact, offsetVector);
                        if (this.location.y < landLocation.y && landLocation.y < highestIntersection) {
                            closestPlatform = platform;
                            newContact = contact;
                            contactTile = tile;
                        }
                    }
                }
            }
        }
        if (closestPlatform !== null) {
            this.fallSpeed = 0;
            this.contact = newContact;
            this.location.copy(this.contact);
            this.location.addScaled(closestPlatform.directedNormal(), RADIUS);
            this.currentTile = contactTile;
            this.state = State.Rolling;
            landSound.play();
        } else {
            this.location = fallLocation;
        }
    };

    Zit.prototype.checkHome = function (columns) {
        if (this.isRolling()) {
            var overlapping = this.tilesInCurrentColumns(columns);
            for (var i = 0; i < overlapping.length; ++i) {
                var home = overlapping[i].home(SIZE);
                if (home !== null) {
                    if (home.contains(this.roundLocation())) {
                        this.markHome();
                    }
                }
            }
        }
    };

    Zit.prototype.checkBoundaries = function(frame) {
        if (this.location.y < (frame.top + RADIUS)) {
            this.location.y = frame.top + RADIUS;
            this.die();
        } else if (this.location.y > (frame.bottom - RADIUS)) {
            this.location.y = frame.bottom - RADIUS;
            this.die();
        } else if (this.location.x < (frame.left + RADIUS) || frame.right < this.location.x) {
            this.die();
        }
    };

    Zit.prototype.checkHazards = function (columns) {
        var overlapping = this.tilesInCurrentColumns(columns);
        for (var i = 0; i < overlapping.length; ++i) {
            var tile = overlapping[i];
            var hazards = tile.hazards();
            for (var h = 0; h < hazards.length; ++h) {
                if (this.inHazard(hazards[h]))
                {
                    this.die();
                }
            }
        }
    };

    Zit.prototype.isCeiling = function (directedNormal) {
        return normalAngle(directedNormal, MINUS_Y) > (Math.PI / 2);
    };

    Zit.prototype.inHazard = function (hazard) {
        var location = this.roundLocation();
        if (this.hazardCheck(hazard, SIZE / 2, 0, location) || this.hazardCheck(hazard, 0, SIZE / 2, location)) {
            return true;
        }
        return this.overlapsCorner(hazard, true, true) ||
               this.overlapsCorner(hazard, true, false) ||
               this.overlapsCorner(hazard, false, true) ||
               this.overlapsCorner(hazard, false, false);
    };

    Zit.prototype.roundLocation = function () {
        return new LINEAR.Vector(Math.round(this.location.x), Math.round(this.location.y));
    };

    Zit.prototype.overlapsCorner = function (hazard, top, left) {
        var diffX = hazard.left + (left ? 0 : hazard.width) - this.location.x;
        var diffY = hazard.top + (top ? 0 : hazard.height) - this.location.y;
        return (diffX * diffX + diffY * diffY) < RADIUS * RADIUS;
    };

    Zit.prototype.hazardCheck = function (hazard, widthBuffer, heightBuffer, location) {
        var expanded = hazard.inflated(widthBuffer, heightBuffer);
        return expanded.contains(location);
    };

    Zit.prototype.tilesInCurrentColumns = function (columns) {
        return this.tilesInColumns(
            columns,
            Math.floor(this.location.x - RADIUS),
            Math.ceil(this.location.x + RADIUS),
            Math.floor(this.location.y - RADIUS),
            Math.ceil(this.location.y + RADIUS + SIZE)
        );
    };

    function inTile(tile, y) {
        return (tile.top <= y && y <= tile.bottom());
    }

    Zit.prototype.tilesInColumns = function (columns, left, right, top, bottom) {
        var result = [];
        for (var c = 0; c < columns.length; ++c) {
            var column = columns[c];
            if (column.inColumn(left) || column.inColumn(right)) {
                for (var t = 0; t < column.length(); ++t) {
                    var tile = column.at(t);
                    if (inTile(tile, top) || inTile(tile, bottom)) {
                        result.push(tile);
                    }
                }
            }
        }
        return result;
    };

    Zit.prototype.fall = function () {
        if (!this.isFalling()) {
            this.currentTile = null;
            this.state = State.Falling;
        }
    };

    Zit.prototype.die = function () {
        if (this.isAlive()) {
            this.state = State.Dead;
            this.exploding = explosion.setupPlayback(EXPLOSION_TIME_PER_FRAME);
            explodeSound.play();
        }
    };

    Zit.prototype.markHome = function () {
        if (!this.isHome()) {
            this.state = State.Home;
            homeSound.play();
        }
    };

    Zit.prototype.draw = function (context) {
        if (this.isAlive()) {
            context.save();
            context.translate(this.location.x, this.location.y);
            context.rotate(this.angle);
            context.drawImage(sprite, -RADIUS, -RADIUS, SIZE, SIZE);
            context.restore();
        } else if (this.exploding !== null) {
            explosion.draw(context, this.exploding, this.location, EXPLOSION_DRAW_SIZE, EXPLOSION_DRAW_SIZE, true);
        }        
    };
        
    Zit.prototype.isRolling = function () { return this.state === State.Rolling; };
    Zit.prototype.isFalling = function () { return this.state === State.Falling; };
    Zit.prototype.isAlive = function () { return this.state === State.Rolling || this.state === State.Falling; };
    Zit.prototype.isHome = function () { return this.state === State.Home; };

    Zit.prototype.inColumn = function (column) { return column.inColumn(this.location.x); };

    Zit.prototype.shiftBy = function (delta) {
        if (this.isRolling()) {
            this.location.y += delta;
            this.contact.y += delta;
        }
    };
    
    return Zit;
}());
