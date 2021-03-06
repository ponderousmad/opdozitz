(function (baseURL) {
    "use strict";

    var COLUMN_X_OFFSET = 25,
        COLUMN_Y_OFFSET = 0,
        FRAME_RECT = new LINEAR.AABox(25, 25, 750, 550),
    
        BASE_SPAWN_INTERVAL = 3000,
        MIN_SPAWN_INTERVAL = 400,
        LEVEL_SPAWN_FACTOR = 0.97,
        LEVEL_SPEED_FACTOR = 0.05,
        SPAWN_RATE_FACTOR = 0.8,
        MAX_SPAWN_RATE_FACTOR = 10,
        LEVEL_DELAY_INCREMENT = 500,
        ZITS_PER_LEVEL = 20,
        MIN_LEVEL = 1,
        MAX_LEVEL = 25,
        NO_LEVEL = -1,
        ZOOM_TOUCH_LOCATION = new LINEAR.Vector(740, 540),
        ZOOM_TOUCH_SIZE = 50,
        ALLOW_EDITS = true,
    
        Instruction = {
            Start : 0,
            LevelPassed : 1,
            LevelFailed : 2,
            Congratulations : 3
        },
        
        imageBatch = new ImageBatch("images/"),
        
        instructions = [
            imageBatch.load("Instructions.png"),
            imageBatch.load("LevelPassedInstruction.png"),
            imageBatch.load("LevelFailedInstruction.png"),
            imageBatch.load("Congratulations.png")
        ],
    
        zits = [],
        columns = [],
        background = imageBatch.load("Background.png"),
        levelFrame = imageBatch.load("Frame.png"),
        selectColumn = imageBatch.load("SelectColumn.png"),
        selectColumnStuck = imageBatch.load("SelectColumnStuck.png"),
        selectTile = imageBatch.load("SelectTile.png"),
    
        selectedColumn = 1,
        selectedTile = 0,
        currentLevel = NO_LEVEL,
        levelScores = [],
        editing = false,
        edited = false,
        instruction = Instruction.Start,
        zoom = false,
        columnsMoveZits = true,
        sinceLastSpawn = 0,
        spawnRateFactor = 0,
        levelStartDelay = 0,
    
        keyboardState = new INPUT.KeyboardState(window, true),
        touchState = null,
        touchDown = null,
        zoomTouch = null,
        
        Keys = {
            Up : 38,
            Down : 40,
            Left : 37,
            Right : 39,
            Space : 32,
            Escape : 27,
            LT : 188,
            GT : 190
        },
        getTimestamp = null,
        lastTime = 0;
    
    (function() {
        imageBatch.commit();
        for (var i = 0; i <= MAX_LEVEL; ++i) {
            levelScores.push(0);
        }
        
        if (window.performance.now) {
            console.log("Using high performance timer");
            getTimestamp = function () { return window.performance.now(); };
        } else {
            if (window.performance.webkitNow) {
                console.log("Using webkit high performance timer");
                getTimestamp = function () { return window.performance.webkitNow(); };
            } else {
                console.log("Using low performance timer");
                getTimestamp = function () { return new Date().getTime(); };
            }
        }
        lastTime = getTimestamp();
    })();
    
    function orderLevels() {
        var levels = [];
        for (var i = MIN_LEVEL; i <= MAX_LEVEL; ++i) {
            levels.push(new Level());
            levels[levels.length - 1].LoadLevel(i);
        }
        var oldOrder = levels.slice();
        levels.sort(function(a, b) {
            if (a.startDelay != b.startDelay) {
                return a.startDelay - b.startDelay;
            }
            return oldOrder.indexOf(a) - oldOrder.indexOf(b);
        });
        for (i = 0; i < levels.Count; ++i) {
            var level = levels[i];
            if (oldOrder.IndexOf(level) != i) {
                storeLevel(i + 1, level.StartDelay, level.Columns);
            }
        }
    }

    function levelName(number) {        
        return "Level" + (number < 10 ? "0" : "") + number + ".json";
    }
    
    function parseLevel(data) {
        var columnLocation = COLUMN_X_OFFSET,
            startDelay = data.startDelay;
        columns = [];

        levelStartDelay = startDelay ? startDelay : 0;

        for (var c = 0; c < data.columns.length; ++c) {
            var columnData = data.columns[c],
                tileLocation = COLUMN_Y_OFFSET,
                column = new TILES.Column(columnLocation, tileLocation, columnData.locked == "True");
            for (var t = 0; t < columnData.tiles.length; ++t) {
                column.add(new TILES.Tile(columnData.tiles[t].type, columnLocation, tileLocation));
                tileLocation += TILES.SIZE;
            }
            columns.push(column);
            columnLocation += TILES.SIZE;
        }
    }

    function clearLevel() {
        zits = [];
        sinceLastSpawn = 0;
        spawnRateFactor = 0;
        zoom = false;
        lastTime = getTimestamp();
    }
    
    function loadLevel(number) {
        var resource = baseURL + "levels/" + levelName(number),
            request = new XMLHttpRequest();
        
        currentLevel = NO_LEVEL;
        zoom = false;
        
        request.open("GET", resource, true);
        request.responseType = "text";
        request.onload = function () {
            parseLevel(JSON.parse(request.response));
            currentLevel = number;
            clearLevel();
        };
        request.send();
    }

    function storeLevel() {
        var columnData = [];
        for (var c = 0; c < columns.length; ++c) {
            columns[c].store(columnData);
        }
        level = {
            startDelay: levelStartDelay,
            columns: columnData
        };
        
        var saveDiv = document.getElementById("save");
        saveDiv.innerHTML = JSON.stringify(level, null, 4);
    }

    function startLevel(number) {
        selectedColumn = 1;
        loadLevel(number);
    }

    function resetLevel(reloadTiles) {
        if (reloadTiles) {
            loadLevel(currentLevel);
        } else {
            clearLevel();
        }
        selectedColumn = 1;
    }

    function zitSpawnInterval() {
        if (zits.length === 0 && levelStartDelay > 0) {
            return levelStartDelay;
        }
        return Math.max(MIN_SPAWN_INTERVAL, Math.pow(LEVEL_SPAWN_FACTOR, currentLevel - 1) * BASE_SPAWN_INTERVAL * Math.pow(SPAWN_RATE_FACTOR, spawnRateFactor));
    }

    function spawnZit() {
        zits.push(new Zit(columns[0].at(1), 1 + LEVEL_SPEED_FACTOR * currentLevel));
        sinceLastSpawn = 0;
    }

    function checkSpawn(elapsed) {
        sinceLastSpawn += elapsed;

        if (zits.length < ZITS_PER_LEVEL) {
            if (sinceLastSpawn > (zoom ? MIN_SPAWN_INTERVAL : zitSpawnInterval())) {
                spawnZit();
            }
        }
    }

    function isKeyPress(key) {
        return keyboardState.wasKeyPressed(key);
    }

    function isAsciiPress(key) {
        return keyboardState.wasAsciiPressed(key);
    }
   
    function checkSwitchLevel() {
        if (currentLevel != NO_LEVEL) {
            if (currentLevel < MAX_LEVEL && isAsciiPress("N")) {
                startLevel(currentLevel + 1);
                return true;
            }
            if (currentLevel > MIN_LEVEL && isAsciiPress("P")) {
                startLevel(currentLevel - 1);
                return true;
            }
        }
        return false;
    }

    function updateInstruction(elapsed) {
        if (keyboardState.keysDown() !== 0 || touchState.touches.length > 0) {
            if (instruction != Instruction.Start) {
                if(currentLevel != NO_LEVEL) {
                    if (!checkSwitchLevel()) {
                        if (instruction == Instruction.LevelFailed) {
                            resetLevel(true);
                        } else if (instruction == Instruction.LevelPassed) {
                            startLevel(currentLevel + 1);
                        } else if (instruction == Instruction.Congratulations) {
                            startLevel(MIN_LEVEL);
                        }
                    }
                }
            }

            instruction = null;
        }
    }

    function setSelectedColumn(column) {
        selectedColumn = column;
        selectedTile = Math.min(columns[selectedColumn].length() - 1, selectedTile);
    }

    function updateSelectedColumn() {
        if (isKeyPress(Keys.Left)) {
            for (var toLeft = selectedColumn - 1; toLeft > 0; --toLeft) {
                if (!columns[toLeft].locked) {
                    setSelectedColumn(toLeft);
                    break;
                }
            }
        } else if (isKeyPress(Keys.Right)) {
            for (var toRight = selectedColumn + 1; toRight < columns.length; ++toRight) {
                if (!columns[toRight].locked) {
                    setSelectedColumn(toRight);
                    break;
                }
            }
        }
        
        if (touchDown !== null) {
            var matchingTouch = touchState.getTouch(touchDown.id);
            if (matchingTouch === null) {
                touchDown = null;
            } else {
                touchDown.y = matchingTouch.clientY;
            }
        }
        
        if (touchDown === null && touchState.touches.length > 0) {
            var touch = touchState.touches[0];
            var x = touch.clientX;
            for (var c = 0; c < columns.length; ++c) {
                if (!columns[c].locked) {
                    if (columns[c].inColumn(x)) {
                        setSelectedColumn(c);
                        touchDown = {
                            id: touch.identifier,
                            y: touch.clientY,
                            lastShift: touch.clientY
                        };
                    }
                }
            }
        }
    }

    function levelDone() {
        if (zits.length == ZITS_PER_LEVEL) {
            for (var z = 0; z < zits.length; ++z) {
                if (zits[z].isAlive()) {
                    return false;
                }
            }
            return true;
        } else {
            return false;
        }
    }

    function zitHomeCount() {
        var home = 0;
        for (var z = 0; z < zits.length; ++z) {
            if (zits[z].isHome()) {
                ++home;
            }
        }
        return home;
    }

    function canMoveColumn(column) {
        if (column.locked || column.moving()) {
            return false;
        }
        if (!columnsMoveZits) {
            for (var z = 0; z < zits.length; ++z) {
                var zit = zits[z];
                if (zit.isAlive() && zit.inColumn(column)) {
                    return false;
                }
            }
        }
        return true;
    }

    function canMoveCurrent() {
        return canMoveColumn(columns[selectedColumn]);
    }
    
    function inZoomTouch(x, y) {       
        if (x < ZOOM_TOUCH_LOCATION.x || (ZOOM_TOUCH_LOCATION.x + ZOOM_TOUCH_SIZE) < x) {
            return;
        }
        
        if (y < ZOOM_TOUCH_LOCATION.y || (ZOOM_TOUCH_LOCATION.y + ZOOM_TOUCH_SIZE) < y) {
            return;
        }
        
        return true;
    }
    
    function touchedZoomToggle() {        
        if (zoomTouch !== null) {
            if (touchState.getTouch(zoomTouch) === null) {
                zoomTouch = null;
            }
        } else if (touchState.touches.length > 0) {
            var touch = touchState.touches[0];
            if (inZoomTouch(touch.clientX, touch.clientY)) {
                zoomTouch = touch.identifier;
                return true;
            }
        }
        return false;
    }

    function updateGameplay(elapsed) {
        if (keyboardState.isKeyDown(Keys.Up)) {
            if (canMoveCurrent()) {
                columns[selectedColumn].moveUp();
            }
        } else if (keyboardState.isKeyDown(Keys.Down)) {
            if (canMoveCurrent()) {
                columns[selectedColumn].moveDown();
            }
        } else if(canMoveCurrent() && touchDown !== null) {
            var touchDelta = touchDown.y - touchDown.lastShift;
            if (touchDelta < -TILES.SIZE) {
                columns[selectedColumn].moveUp();
                touchDown.lastShift -= TILES.SIZE;
            } else if(touchDelta > TILES.SIZE) {
                columns[selectedColumn].moveDown();
                touchDown.lastShift += TILES.SIZE;
            }
        }

        if (isKeyPress(Keys.Escape)) {
            var keepTiles = ALLOW_EDITS && keyboardState.isShiftDown();
            resetLevel(!keepTiles);
        }

        if (isKeyPress(Keys.Space) || touchedZoomToggle()) {
            zoom = !zoom;
        }
        var checkColumns = columns;
        if (!columnsMoveZits) {
            checkColumns = [];
            for (var c = 0; c < columns.length; ++c) {
                if (!columns[c].moving()) {
                    checkColumns.push(columns[c]);
                }
            }
        }
        for (var reps = zoom ? 4 : 1; reps > 0; --reps) {
            checkSpawn(elapsed);

            for (var z = 0; z < zits.length; ++z) {
                zits[z].update(elapsed, checkColumns, FRAME_RECT);
            }
        }

        for (var i = 0; i < columns.length; ++i) {
            var column = columns[i],
                delta = column.update(elapsed);
            if (columnsMoveZits && delta !== 0) {
                for (var t = 0; t < zits.length; ++t) {
                    var zit = zits[t];
                    if (zit.contactTile() !== null && zit.contactTile().left == column.left) {
                        zit.shiftBy(delta);
                    }
                }
            }
        }

        if (levelDone()) {
            if(zitHomeCount() >= (ZITS_PER_LEVEL / 2)) {
                levelScores[currentLevel] = Math.max(zitHomeCount(), levelScores[currentLevel]);
                instruction = currentLevel == MAX_LEVEL ? Instruction.Congratulations : Instruction.LevelPassed;
            } else {
                instruction = Instruction.LevelFailed;
            }
        }

        checkSwitchLevel();
    }    

    function currentTile() {
        return columns[selectedColumn].at(selectedTile);
    }
    
    function toggleTilePart(part) {
        currentTile().togglePart(part);
        edited = true;
    }

    function updateEdit() {
        if (isKeyPress(Keys.Up)) {
            selectedTile = Math.Max(0, selectedTile - 1);
        } else if (isKeyPress(Keys.Down)) {
            selectedTile = Math.Min(columns[selectedColumn].length() - 1, selectedTile + 1);
        } else if (isAsciiPress("1")) {
            toggleTilePart(TILE.Parts.Flat);
        } else if (isAsciiPress("2")) {
            toggleTilePart(TILE.Parts.SlantUp);
        } else if (isAsciiPress("3")) {
            toggleTilePart(TILE.Parts.SlantDown);
        } else if (isAsciiPress("4")) {
            toggleTilePart(TILE.Parts.SpikesUp);
        } else if (isAsciiPress("5")) {
            toggleTilePart(TILE.Parts.SpikesDown);
        } else if (isAsciiPress("6")) {
            toggleTilePart(TILE.Parts.TransitionTop);
        } else if (isAsciiPress("7")) {
            toggleTilePart(TILE.Parts.TransitionBottom);
        } else if (isAsciiPress("8")) {
        } else if (isAsciiPress("9")) {
        } else if (isAsciiPress("0")) {
        } else if (isKeyPress(Keys.LT)) {
            levelStartDelay += LEVEL_DELAY_INCREMENT;
            edited = true;
        } else if (isKeyPress(Keys.GT)) {
            levelStartDelay = Math.Max(0, levelStartDelay - LEVEL_DELAY_INCREMENT);
            edited = true;
        }
    }
    
    function update() {
        var now = getTimestamp(),
            elapsed = Math.min(now - lastTime, 32);
        
        if (instruction !== null) {
            updateInstruction(elapsed);
        } else if(currentLevel != NO_LEVEL) {
            updateSelectedColumn();
            if (ALLOW_EDITS) {
                if (isAsciiPress("E") && keyboardState.isCtrlDown()) {
                    if (!editing) {
                        var oldColumn = selectedColumn;
                        resetLevel(!keyboardState.isShiftDown());
                        selectedColumn = oldColumn;
                    }
                    if (editing && edited) {
                        edited = false;
                        storeLevel();
                    }
                    editing = !editing;
                }
            }

            if (editing) {
                updateEdit();
            } else {
                updateGameplay(elapsed);
            }
        }

        keyboardState.postUpdate();
        lastTime = now;
    }

    function currentScore() {
        var score = 0;
        for (var l = 0; l < levelScores.length; ++l) {
            if (l == currentLevel) {
                score += zitHomeCount();
            } else {
                score += levelScores[l];
            }
        }
        return score;
    }

    function drawTextCentered(context, font, text, top, left, width) {
        context.font = font;
        context.fillText(text, left + width / 2, top);
    }
    
    function drawTouchControls(context) {
        var left = ZOOM_TOUCH_LOCATION.x,
            top = ZOOM_TOUCH_LOCATION.y,
            BORDER = 2;

        context.textAlign = "center";
        context.fillStyle = zoom ? "rgba(0,0,255,0.25)" : "rgba(0,255,0,0.25)";
        context.strokeStyle = zoom ? "rgba(0,0,255,0.5)" : "rgba(0,255,0,0.5)";
        context.lineWidth = BORDER;
       
        context.strokeRect(left + BORDER, top + BORDER, ZOOM_TOUCH_SIZE - 2 * BORDER, ZOOM_TOUCH_SIZE - 2 * BORDER);
        context.fillRect(left, top, ZOOM_TOUCH_SIZE, ZOOM_TOUCH_SIZE);
        
        context.fillStyle = "rgba(0,0,0,0.5)";
        drawTextCentered(context, "16px monospace", "Go", top + 21, left, ZOOM_TOUCH_SIZE);
        drawTextCentered(context, "16px monospace", zoom ? "Slow" : "Fast", top + 36, left, ZOOM_TOUCH_SIZE);
    }
    
    function draw(context) {
        if (!imageBatch.loaded) {
            return;
        }
        context.save();
        context.drawImage(background, 0, 0);
        context.strokeStyle = "rgb(255,0,0)";

        for (var c = 0; c < columns.length; ++c) {
            columns[c].draw(context);
        }
        for (var z = 0; z < zits.length; ++z) {
            zits[z].draw(context);
        }
        context.drawImage(levelFrame, 0, 0);
        
        if (columns.length === 0) {
            context.restore();
            return;
        }

        var currentColumn = columns[selectedColumn],
            cursor = (canMoveCurrent() || currentColumn.moving()) ? selectColumn : selectColumnStuck;
        context.drawImage(cursor, currentColumn.left - TILES.DRAW_OFFSET, currentColumn.top + TILES.SIZE / 2 - TILES.DRAW_OFFSET);
        if (editing) {
            var editTile = currentTile();
            context.drawImage(selectTile, editTile.left, editTile.top, TILES.SIZE, TILES.SIZE);
        }

        var LEFT_DISPLAY_EDGE = 10,
            LEFT_DISPLAY_TOP = 265,
            RIGHT_DISPLAY_EDGE = 738,
            RIGHT_DISPLAY_TOP = 38,
            LINE_HEIGHT = 18,
            SCORE_HEIGHT = 22,
            TITLE_HEIGHT = 14,
            DISPLAYS_WIDTH = 55,
            MILLIS_PER_SECOND = 1000,
            TITLE_FONT = "11px monospace",
            DISPLAY_FONT = "11px monospace",
            SCORE_FONT = "16px monospace",
            zitSpawnRemaining = Math.max(0, zitSpawnInterval() - sinceLastSpawn) / MILLIS_PER_SECOND,
            top = LEFT_DISPLAY_TOP;
                    
        context.textAlign = "center";
        context.fillStyle = "rgb(0,0,196)";
            
        drawTextCentered(context, TITLE_FONT, "Zits:", top, LEFT_DISPLAY_EDGE, DISPLAYS_WIDTH);
        top += TITLE_HEIGHT;
        drawTextCentered(context, DISPLAY_FONT, zits.length + " of " + ZITS_PER_LEVEL, top, LEFT_DISPLAY_EDGE, DISPLAYS_WIDTH);
        top += LINE_HEIGHT;

        drawTextCentered(context, TITLE_FONT, "Spawn In:", top, LEFT_DISPLAY_EDGE, DISPLAYS_WIDTH);
        top += TITLE_HEIGHT;
        drawTextCentered(context, DISPLAY_FONT, zits.length < ZITS_PER_LEVEL ? (zitSpawnRemaining.toFixed(1) + " sec") : "----", top, LEFT_DISPLAY_EDGE, DISPLAYS_WIDTH);
        top += LINE_HEIGHT;

        drawTextCentered(context, TITLE_FONT, "Home:", top, LEFT_DISPLAY_EDGE, DISPLAYS_WIDTH);
        top += TITLE_HEIGHT;
        drawTextCentered(context, DISPLAY_FONT, zitHomeCount().toString(), top, LEFT_DISPLAY_EDGE, DISPLAYS_WIDTH);
        top += LINE_HEIGHT;

        top = RIGHT_DISPLAY_TOP;
        drawTextCentered(context, TITLE_FONT, "Score:", top, RIGHT_DISPLAY_EDGE, DISPLAYS_WIDTH);
        top += TITLE_HEIGHT;
        drawTextCentered(context, SCORE_FONT, currentScore().toString(), top, RIGHT_DISPLAY_EDGE, DISPLAYS_WIDTH);
        top += SCORE_HEIGHT;
        drawTextCentered(context, DISPLAY_FONT, "Level " + currentLevel, top, RIGHT_DISPLAY_EDGE, DISPLAYS_WIDTH);

        if (instruction !== null) {
            context.drawImage(instructions[instruction], 0, 0);
        } else if (window.ontouchstart !== undefined) {
            drawTouchControls(context);
        }

        context.restore();
    }
    
    window.onload = function(e) {
        console.log("window.onload", e, Date.now());
        var canvas = document.getElementById("canvas"),
            context = canvas.getContext("2d");
    
        touchState = new INPUT.TouchState(canvas);
    
        loadLevel(MIN_LEVEL);

        function drawFrame() {
            requestAnimationFrame(drawFrame);
            draw(context);
        }
        
        window.setInterval(update, 16);
        
        drawFrame();
    };
}(rootURL));
