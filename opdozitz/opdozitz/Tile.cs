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
using Opdozitz.Geom;

namespace Opdozitz
{
    [Flags]
    enum TileParts
    {
        Empty = 0,
        Flat = 1,
        SlantUp = 2,
        SlantDown = 4,
        //        SpikesUp = 8,
        //        SpikesDown = 16
    }

    class Tile
    {
        private TileParts mParts = TileParts.Empty;
        private int mLeft, mTop;

        private static Dictionary<TileParts, Texture2D> sTileImages;

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
                    yield return new LineSegment(Left, Bottom + GameMain.GirderWidth, Right, Bottom + GameMain.GirderWidth);
                }
                if (HasPart(TileParts.SlantUp))
                {
                    yield return new LineSegment(Left, Bottom - GameMain.GirderWidth, Right, Top - GameMain.GirderWidth);
                    yield return new LineSegment(Left, Bottom + GameMain.GirderWidth, Right, Top + GameMain.GirderWidth);
                }
                if (HasPart(TileParts.SlantDown))
                {
                    yield return new LineSegment(Left, Top - GameMain.GirderWidth, Right, Bottom - GameMain.GirderWidth);
                    yield return new LineSegment(Left, Top + GameMain.GirderWidth, Right, Bottom + GameMain.GirderWidth);
                }
            }
        }

        public Tile Clone(int newTop)
        {
            return new Tile(Parts, mLeft, newTop);
        }

        public TileParts Parts
        {
            get { return mParts; }
        }

        internal void Draw(SpriteBatch batch)
        {
            foreach (TileParts part in PartsList())
            {
                Rectangle drawBounds = new Rectangle(
                    mLeft - GameMain.TileDrawOffset, mTop - GameMain.TileDrawOffset,
                    GameMain.TileDrawSize, GameMain.TileDrawSize
                );
                batch.Draw(sTileImages[part], drawBounds, Color.White);
            }
        }

        public override string ToString()
        {
            return "Location: " + Left.ToString() + ", " + Top.ToString() + " Parts: " + mParts.ToString();
        }
    }
}
