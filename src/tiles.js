using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Audio;
using Microsoft.Xna.Framework.Content;
using Microsoft.Xna.Framework.GamerServices;
using Microsoft.Xna.Framework.Graphics;
using Microsoft.Xna.Framework.Input;
using Microsoft.Xna.Framework.Media;
using Microsoft.Xna.Framework.Net;
using Microsoft.Xna.Framework.Storage;

namespace Opdozitz
{
    [Flags]
    enum TileParts
    {
        Empty = 0,
        Flat = 1,
        SlantUp = 2,
        SlantDown = 4,
        TransitionTop = 8,
        TransitionBottom = 16,
        Block = 32,
        SpikesUp = 64,
        SpikesDown = 128,
        Start = 256,
        End = 512
    }

    class Tile
    {
        private TileParts mParts = TileParts.Empty;
        private int mLeft, mTop;

        private static Dictionary<TileParts, Texture2D> sTileImages;

        private const float kTransitionSlopeFraction = 0.4f;
        private const float kTransitionSlopeGrade = 0.5f;
        private const float kTransitionSlopeRun = GameMain.TileSize * kTransitionSlopeFraction;
        private const float kTransitionSlopeRise = kTransitionSlopeRun * kTransitionSlopeGrade;
        private const int kTransitionArcSteps = 2;
        private const int kSpikesSize = GameMain.TileSize / 4;
        private const int kSpikesEdge = GameMain.TileSize / 10;

        internal static void LoadContent(ContentManager content)
        {
            sTileImages = new Dictionary<TileParts, Texture2D>();
            foreach (TileParts part in AllParts())
            {
                sTileImages.Add(part, content.Load<Texture2D>("Images/Tile" + part.ToString()));
            }
        }

        private static Array AllParts()
        {
            return Enum.GetValues(typeof(TileParts));
        }

        private IEnumerable<TileParts> PartsList()
        {
            foreach (TileParts part in AllParts())
            {
                if (HasPart(part))
                {
                    yield return part;
                }
            }
        }

        private bool HasPart(TileParts part)
        {
            return (Parts & part) != 0;
        }

        public Tile(TileParts parts, int left, int top)
        {
            mParts = parts;
            mLeft = left;
            mTop = top;
        }

        public int Top
        {
            get { return mTop; }
            set { mTop = value; }
        }

        public int Bottom
        {
            get
            {
                return Top + GameMain.TileSize;
            }
        }

        public int Left
        {
            get { return mLeft; }
        }

        public int Right
        {
            get { return mLeft + GameMain.TileSize; }
        }

        public IEnumerable<Geom.LineSegment> Platforms
        {
            get
            {
                if (HasPart(TileParts.Flat))
                {
                    yield return new LineSegment(Left, Bottom - GameMain.GirderWidth, Right, Bottom - GameMain.GirderWidth);
                    yield return new LineSegment(Right, Bottom + GameMain.GirderWidth, Left, Bottom + GameMain.GirderWidth);
                }
                if (HasPart(TileParts.SlantUp))
                {
                    yield return new LineSegment(Left, Bottom - GameMain.GirderWidth, Right, Top - GameMain.GirderWidth);
                    yield return new LineSegment(Right, Top + GameMain.GirderWidth, Left, Bottom + GameMain.GirderWidth);
                }
                if (HasPart(TileParts.SlantDown))
                {
                    yield return new LineSegment(Left, Top - GameMain.GirderWidth, Right, Bottom - GameMain.GirderWidth);
                    yield return new LineSegment(Right, Bottom + GameMain.GirderWidth, Left, Top + GameMain.GirderWidth);
                }
                if (HasPart(TileParts.TransitionTop))
                {
                    Vector2 platformEnd = new Vector2(Left + kTransitionSlopeRun, Bottom - GameMain.GirderWidth - kTransitionSlopeRise);
                    yield return new LineSegment(Left, Bottom - GameMain.GirderWidth, platformEnd.X, platformEnd.Y);
                    Vector2 center = new Vector2(Left + kTransitionSlopeRun, Bottom);
                    foreach (Geom.LineSegment segment in ArcSegments(center, platformEnd, Math.PI / 2, kTransitionArcSteps))
                    {
                        yield return segment;
                    }
                }
                if (HasPart(TileParts.TransitionBottom))
                {
                    Vector2 center = new Vector2(Left + kTransitionSlopeRun, Top);
                    float radius = GameMain.GirderWidth + kTransitionSlopeRise;
                    Vector2 arcStart = new Vector2(Left + kTransitionSlopeRun + radius, Top);
                    foreach (Geom.LineSegment segment in ArcSegments(center, arcStart, Math.PI / 2, kTransitionArcSteps))
                    {
                        yield return segment;
                    }
                    yield return new LineSegment(Left + kTransitionSlopeRun, Top + radius, Left, Top + GameMain.GirderWidth);
                }
            }
        }

        public IEnumerable<Rectangle> Hazards
        {
            get
            {
                if (HasPart(TileParts.Block))
                {
                    yield return new Rectangle(Left, Top, GameMain.TileSize, GameMain.TileSize);
                }
                if (HasPart(TileParts.SpikesUp))
                {
                    yield return new Rectangle(Left + kSpikesEdge, Bottom - GameMain.GirderWidth - kSpikesSize, Right-Left - 2 * kSpikesEdge, kSpikesSize);
                }
                if (HasPart(TileParts.SpikesDown))
                {
                    yield return new Rectangle(Left + kSpikesEdge, Top + GameMain.GirderWidth, Right - Left - 2 * kSpikesEdge, kSpikesSize);
                }
            }
        }

        public IEnumerable<Rectangle> Homes
        {
            get
            {
                if (HasPart(TileParts.End))
                {
                    yield return new Rectangle(Left + Zit.Size/ 4, Top + GameMain.GirderWidth, Zit.Size / 2, Zit.Size);
                }
            }
        }

        private IEnumerable<Geom.LineSegment> ArcSegments(Vector2 center, Vector2 startPoint, double segmentAngle, int steps)
        {
            double angleStep = -segmentAngle / steps;
            Vector2 startSpoke = startPoint - center;
            double startAngle = Math.Atan2(-startSpoke.Y, startSpoke.X);
            float radius = startSpoke.Length();

            for (int i = 1; i <= steps; ++i)
            {
                double angle = startAngle + i * angleStep;
                Vector2 platformEnd = center + radius * new Vector2((float)Math.Cos(angle), -(float)Math.Sin(angle));
                yield return new LineSegment(startPoint, platformEnd);
                startPoint = platformEnd;
            }
        }

        public Tile Clone(int newTop)
        {
            return new Tile(Parts, Left, newTop);
        }

        private TileParts Parts
        {
            get { return mParts; }
        }

        internal void Draw(SpriteBatch batch)
        {
            foreach (TileParts part in PartsList())
            {
                Rectangle drawBounds = new Rectangle(
                    Left - GameMain.TileDrawOffset, Top - GameMain.TileDrawOffset,
                    GameMain.TileDrawSize, GameMain.TileDrawSize
                );
                batch.Draw(sTileImages[part], drawBounds, Color.White);
            }
        }

        [System.Diagnostics.Conditional("DEBUG")]
        private void DrawDiagnostics(SpriteBatch batch)
        {
            foreach (LineSegment platform in Platforms)
            {
                batch.Draw(GameMain.Pixel, new Rectangle((int)(Math.Round(platform.Start.X)), (int)(Math.Round(platform.Start.Y)), 1, 1), Color.White);
            }
        }

        public override string ToString()
        {
            return "Location: " + Left.ToString() + ", " + Top.ToString() + " Parts: " + mParts.ToString();
        }

        internal void Store(Opdozitz.Utils.IDataWriter writer)
        {
            using (Opdozitz.Utils.IDataWriter element = writer["Tile"])
            {
                element.Attribute("type", Parts.ToString());
            }
        }

        internal void TogglePart(TileParts part)
        {
            mParts ^= part;
        }
    }
    
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
                tileY += GameMain.TileSize;
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
            get { return Left + GameMain.TileSize; }
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
            mTiles.Add(mTiles.First().Clone(mTiles.Last().Top + GameMain.TileSize));
            mMovingSteps = GameMain.TileSize;
        }

        internal void MoveDown()
        {
            mMovingUp = false;
            mTiles.Insert(0, mTiles.Last().Clone(mTiles.First().Top - GameMain.TileSize));
            mMovingSteps = GameMain.TileSize;
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
    }
}
