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
    };
    
    var PART_NAMES = [];
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
    
    var ALL_PARTS[];
    var IMAGES = [];

    var tileBatch = new ImageBatch("images/");
    (function () {
        for (var p in Parts) {
            if (Parts.hasOwnProperty(p)) {
                ALL_PARTS.push(p);
                IMAGES[p] = tileBatch.load("Tile" + PART_NAMES[p] + ".png");
            }
        }
        tileBatch.commit();
    }());
    
    var TILE_SIZE = 50,
        GIRDER_WIDTH = 3,
        TILE_DRAW_OFFSET = 5,
        TRANSITION_SLOPE_FRACTION = 0.4,
        TRANSITION_SLOPE_GRADE = 0.5,
        TRANSITION_SLOPE_RUN = TILE_SIZE * TRANSITION_SLOPE_FRACTION,
        TRANSITION_SLOPE_RISE = TRANSITION_SLOPE_RUN * TRANSITION_SLOPE_GRADE,
        TRANSITION_ARC_STEPS = 2,
        SPIKES_SIZE = TILE_SIZE / 4,
        SPIKES_EDGE = TILE_SIZE / 10;

    function Tile(parts, left, top) {
        this.parts = parts;
        this.left = left;
        this.top = top;
    };
    
    Tile.prototype.hasPart = function (part) {
        return (this.parts & part) != 0;
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
                var platformEnd = new Vector(this.left + TRANSITION_SLOPE_RUN, this.bottom() - GIRDER_WIDTH - TRANSITION_SLOPE_RISE));
                result.push(new LINEAR.Segment(this.left, this.bottom() - GIRDER_WIDTH, platformEnd.X, platformEnd.Y);
                var center = new Vector(this.left + TRANSITION_SLOPE_RUN, this.bottom());
                foreach (Geom.LineSegment segment in ArcSegments(center, platformEnd, Math.PI / 2, TRANSITION_ARC_STEPS))
                {
                    yield return segment;
                }
            }
            if (this.hasPart(Parts.TransitionBottom)) {
                var center = new Vector(this.left + TRANSITION_SLOPE_RUN, this.top);
                var radius = GIRDER_WIDTH + TRANSITION_SLOPE_RISE;
                var arcStart = new Vector(this.left + TRANSITION_SLOPE_RUN + radius, this.top);
                foreach (Geom.LineSegment segment in ArcSegments(center, arcStart, Math.PI / 2, TRANSITION_ARC_STEPS))
                {
                    yield return segment;
                }
                result.push(new LINEAR.Segment(this.left + TRANSITION_SLOPE_RUN, this.top + radius, this.left, this.top + GIRDER_WIDTH));
            }
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

    Tile.prototype.arcSegments(segments, center, startPoint, segmentAngle, steps)
    {
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

    Tile.prototype.draw = function(context) {
        for (var i = 0; i < ALL_PARTS.length; ++i) {
            var part = ALL_PARTS[i],
                size = TILE_SIZE + 2 * TILE_DRAW_OFFSET;
            context.drawImage(IMAGES[part], this.left - TILE_DRAW_OFFSET, this.top - TILE_DRAW_OFFSET, size, size);
        }
    };

    Tile.prototype.drawDiagnostics = function(context) {
        var segments = this.platforms();
        for (var i = 0; i < segments, ++i) {
            var platform = segments[i];
            ctx.beginPath();
            ctx.moveTo(i.start);
            ctx.lineTo(i.end);
            ctx.stroke();
        }
    };

    Tile.prototype.toString = function() {
        return "Location: " + this.left + ", " + this.top + " Parts: " + mParts;
    };

    Tile.prototype.store = function(tiles) {
        tiles.push(this.parts);
    };

    Tile.prototype.togglePart(part) {
        this.parts ^= part;
    };
    
    /*
    class TileColumn
    {
        private int mLeft;
        private int mTop;
        private List<Tile> mTiles = new List<Tile>();
        private bool mLocked;
        private bool mMovingUp = false;
        private int mMovingSteps = 0;
        private const int kMoveSize = 5;

        internal TileColumn(int left, int top, bool locked)
        {
            mLeft = left;
            mTop = top;
            mLocked = locked;
        }

        internal void Add(Tile tile)
        {
            mTiles.Add(tile);
        }

        internal void Draw(SpriteBatch batch)
        {
            int tileY = mTop;
            foreach (Tile tile in mTiles)
            {
                tile.Draw(batch);
                tileY += TILE_SIZE;
            }
        }

        internal int IndexOf(Tile tile)
        {
            return mTiles.IndexOf(tile);
        }

        internal Tile this[int index]
        {
            get { return mTiles[index]; }
        }

        internal IEnumerable<Tile> Tiles
        {
            get { return mTiles; }
        }

        internal int Length
        {
            get { return mTiles.Count; }
        }

        internal int Top
        {
            get { return mTop; }
        }

        internal int Left
        {
            get { return mLeft; }
        }

        internal int Right
        {
            get { return Left + TILE_SIZE; }
        }

        internal bool Locked
        {
            get { return mLocked; }
        }

        internal bool Moving
        {
            get { return mMovingSteps > 0; }
        }

        internal bool InColumn(float x)
        {
            return Left <= x && x <= Right;
        }

        internal bool InColumn(int x)
        {
            return Left <= x && x <= Right;
        }

        internal void MoveUp()
        {
            mMovingUp = true;
            mTiles.Add(mTiles.First().Clone(mTiles.Last().Top + TILE_SIZE));
            mMovingSteps = TILE_SIZE;
        }

        internal void MoveDown()
        {
            mMovingUp = false;
            mTiles.Insert(0, mTiles.Last().Clone(mTiles.First().Top - TILE_SIZE));
            mMovingSteps = TILE_SIZE;
        }

        internal int Update(GameTime gameTime)
        {
            int delta = 0;
            if (mMovingSteps > 0)
            {
                if (mMovingUp)
                {
                    delta = -kMoveSize;
                }
                else
                {
                    delta = kMoveSize;
                }
                foreach (Tile tile in mTiles)
                {
                    tile.Top += delta;
                }
                mMovingSteps -= kMoveSize;
                if (!Moving)
                {
                    mTiles.Remove(mMovingUp ? mTiles.First() : mTiles.Last());
                }
            }
            return delta;
        }

        internal void Store(Opdozitz.Utils.IDataWriter writer)
        {
            using (Opdozitz.Utils.IDataWriter element = writer["Column"])
            {
                element.BoolAttribute("locked", Locked, false);
                foreach (Tile t in Tiles)
                {
                    t.Store(element);
                }
            }
        }
    }*/
}());
