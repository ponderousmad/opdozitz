my Zit = (function() {
    var State =  {
        Rolling = 0,
        Dead = 1,
        Falling = 2,
        Home = 3
    };
    
    var SIZE = 20;
    var RADIUS = SIZE / 2.0;
    var ANGLE_INCREMENT = 0.006;
    var FALL_FORCE = 0.03;
    var FATAL_VELOCITY = 9;
    var EXPLOSION_TIME_PER_FRAME = 80;
    var EXPLOSION_DRAW_SIZE = SIZE * 2;
    // Empirically determined to elimnate spurrious physics results.
    var MAX_ANGLE_STEP = 0.7;
    
    var zitBatch = new ImageBatch("images/");
    var sprite = zitBatch.load("Zit.png");
    var explosion = new Flipbook(zitBatch, "Explode", 9, 2);
    var explodeSound = SoundEffect("/opdozitz/audio/Splat.wav");
    var landSound = SoundEffect("/opdozitz/audio/Pip.wav");
    var homeSound = SoundEffect("/opdozitz/audio/Blip.wav");
    var spawnSound = SoundEffect("/opdozitz/audio/Ding.wav");

    var Zit = function(tile, speedFactor, frame) {
        var platform = tile.platform(0);
        
        this.speedFactor = speedFactor;
        this.contact = platform.start.clone();
        this.contact.addScaled(platform.direction(), RADIUS);
        this.location = this.contact.clone();
        this.addScaled(platform.directedNormal(), RADIUS);
        this.angle = 0;
        this.state = State.Rolling;
        this.fallSpeed = 0;
        this.exploding = null;

        this.currentTile = tile;
        this.frame = frame;
        
        spawnSound.play()
    };
    
    Zit.prototype.getSize = function () { return SIZE; };
    Zit.prototype.contactTile = function () { return this.currentTile; };

    Zit.prototype.update = function() (elapsed, columns, frame) {
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

        if (this.exploding !== null && exposion.update(elapsed, this.exploding)) {
            this.exploding = null;
        }
    }

    // Calculate the angle between to already normalized vectors.
    // Does not check if the vectors are normalized
    function normalAngle(n1, n2) {
        return Math.acos(Math.min(1, n1.dot(n2)));
    }

    Zit.prototype.updateRolling = function (columns, rotation) {
        var support = LINEAR.subVectors(this.location, this.contact);
        var supportAngle = Math.atan2(support.y, support.x);
        var newAngle = supportAngle + rotation;

        var swungLocation = LINEAR.addVectors(this.contact, LINEAR.scaleVector(LINEAR.angleToVector(newAngle), RADIUS);

        var top = Math.floor(Math.min(this.location.y, swungLocation.y)) - SIZE;
        var bottom = Math.ceiling(Math.max(this.location.y, swungLocation.y)) + SIZE;
        var left = Math.floor(Math.min(this.location.x, swungLocation.x) - RADIUS);
        var right = Math.ceiling(Math.max(this.location.x, swungLocation.x) + RADIUS);

        var closestPlatform = null;
        var newContact = this.contact;
        var closestTile = null;
        var closestAtEnd = false;
        var DISTANCE_CHECK_HACK = 1.01;
        var minDistanceSquared = RADIUS * RADIUS * DISTANCE_CHECK_HACK;
        
        var overlapping = this.tilesInColumns(columns, left, right, top, bottom);
        for (var i = 0; i < overlapping.length; ++i) {
            var tile = overlapping[i];
            var platforms = tile.platforms();
            for (var p = 0; p < platforms.length; ++p) {
                var platform = platforms[p];
                var currentClosest = platform.closestPoint(swungLocation;
                var distanceSquared = LINEAR.pointDistanceSq(currentClosest.point, swungLocation);
                if (distanceSquared < minDistanceSquared) {
                    closestAtEnd = currentClosest.atEnd;
                    closestPlatform = platform;
                    minDistanceSquared = distanceSquared;
                    newContact = currentClosest.point;
                    closestTile = tile;
                }
            }
        }

        if (closestPlatform != null) {
            this.contact = newContact;
            var DIE_RADIUS = RADIUS / 2;
            if (minDistanceSquared < DIE_RADIUS * DIE_RADIUS) {
                this.die();
            } else if (closestAtEnd) {
                var normal = LINEAR.subVectors(swungLocation, this.contact);
                normal.normalize();

                var FALL_ANGLE = Math.PI * 0.4;
                double angle = normalAngle(closestPlatform.directedNormal(), normal);
                if (normal.y > 0 && angle > FALL_ANGLE) {
                    this.location = swungLocation;
                    this.fall();
                } else {
                    this.location.copy(this.contact);
                    this.location.addScaled(normal, RADIUS);
                }
            } else {
                this.location.copy(this.contact);
                this.addScaled(closestPlatform.directedNormal(), RADIUS);
            }
            this.currentTile = closestTile;
        } else {
            this.location = swungLocation;
            this.fall();
        }
    };

    Zit.updateFalling = function (columns, elapsed) {
        this.fallSpeed += elapsed * FALL_FORCE;

        var fallLocation = new Vector(this.location.x, this.location.y + this.fallSpeed);
        var closestPlatform = null;
        var newContact = new Vector(0,0);
        var contactTile = null;
        if (this.fallSpeed < FATAL_VELOCITY) {
            var highestIntersection = fallLocation.y;
            var overlapping = this.tilesInCurrentColumns(columns);
            for (var i = 0; i < overlapping.length; ++i) {
                var tile = overlapping[i];
                var platforms = tile.platforms();
                for (var p = 0; p < platforms.length; ++p) {
                    var platform = platforms[p];
                    if (this.isCeiling(platform.directedNormal())) {
                        continue;
                    }
                    var offsetVector = LINEAR.scaleVector(platform.directedNormal(), RADIUS);
                    var offsetStart = LINEAR.addVectors(fallLocation, offsetVector);
                    var offsetEnd = offsetStart.clone();
                    offsetEnd.y -= SIZE;
                    var contact = new LINEAR.Vector();
                    var segment = new LINEAR.Segment(offsetStart, offsetEnd)
                    if (platform.FindIntersection(segment, contact)) {
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
    }

    Zit.prototype.checkHome(columns) {
        if (this.isRolling()) {
            var overlapping = this.tilesInCurrentColumns(columns);
            for (var i = 0; i < overlapping.length; ++i) {
                var home = overlapping[i].home();
                if (home !== null) {
                    if (home.contains(this.roundLocation())) {
                        this.markHome();
                    }
                }
            }
        }
    }

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
    }

    var minusY = new Vector(0, -1);
    Zit.isCeiling = function(directedNormal) {
        return normalAngle(directedNormal, minusY) > (Math.PI / 2);
    };

    Zit.prototype.inHazard = function (hazard) {
        var location = this.roundLocation();
        if (this.hazardCheck(hazard, SIZE / 2, 0, location) || thus.hazardCheck(hazard, 0, SIZE / 2, location)) {
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
        hazard.inflate(widthBuffer, heightBuffer);
        return hazard.contains(location);
    };

    Zit.prototype.tilesInCurrentColumns = function (columns) {
        return this.tilesInColumns(
            columns,
            Math.floor(this.location.x - RADIUS),
            Math.ceiling(this.location.x + RADIUS),
            Math.floor(this.location.y - RADIUS),
            Math.ceiling(this.location.y + RADIUS + Size)
        );
    }

    function inTile(tile, y) {
        return (tile.top <= y && y <= tile.bottom);
    }

    Zit.prototype.tilesInColumns(columns, int left, int right, int top, int bottom) {
        var result = [];
        for (var c = 0; c < columns.length; ++c) {
            var column = columns[c];
            if (column.inColumn(left) || column.inColumn(right)) {
                for (var t = 0; t < column.length; ++t) {
                    var tile = column[t];
                    if (inTile(tile, top) || inTile(tile, bottom))
                    {
                        result.push(tile);
                    }
                }
            }
        }
    }

    Zit.prototype.fall = function() {
        if (!this.isFalling()) {
            this.currentTile = null;
            this.state = State.Falling;
        }
    };

    Zit.prototype.die() {
        if (this.isAlive()) {
            this.state = State.Dead;
            this.exploding = explosion.setupPlayback(EXPLOSION_TIME_PER_FRAME);
            explodeSound.play();
        }
    }

    Zit.markHome = function () {
        if (!this.isHome()) {
            this.state = State.Home;
            homeSound.play();
        }
    };

    Zit.draw = function(context) {
        if (this.isAlive()) {
            context.save();   
            context.rotate(this.angle);
            context.drawImage(sprite, this.location.x, this.location.y, SIZE, SIZE);
            context.restore();
        } else if (this.exploding !== null) {
            explosion.draw(context, this.exploding, this.location, EXPLOSION_DRAW_SIZE, EXPLOSION_DRAW_SIZE, true);
        }
    };
        
    Zit.prototype.isRolling = function () { return this.state === State.Rolling; };
    Zit.prototype.isFalling = function () { return this.state === State.Falling; };
    Zit.prototype.isAlive = function () { return this.state === State.Rolling || this.state === State.Falling; };
    Zit.prototype.isHome = function () { return this.state === State.Home; };

    Zit.prototype.inColumn = function(column) { return column.inColumn(this.location.x); };

    Zit.prototype.shiftBy = function(delta) {
        if (this.isRolling()) {
            this.location.y += delta;
            this.contact.y += delta;
        }
    };
    
    return Zit;
}());
