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
        Top = 1,
        Bottom = 2,
        SlantUp = 4,
        SlantDown = 8,
        //        SpikesUp = 16,
        //        SpikesDown = 32
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

        public int? LeftFloorHeight
        {
            get
            {
                if ((mParts & (TileParts.Bottom | TileParts.SlantUp)) != 0)
                {
                    return Bottom - GameMain.GirderWidth;
                }
                else if ((mParts & TileParts.SlantDown) != 0)
                {
                    return Top - GameMain.GirderWidth;
                }
                return null;
            }
        }

        public int? RightFloorHeight
        {
            get
            {
                if ((mParts & (TileParts.Bottom | TileParts.SlantDown)) != 0)
                {
                    return Bottom - GameMain.GirderWidth;
                }
                else if ((mParts & TileParts.SlantUp) != 0)
                {
                    return Top - GameMain.GirderWidth;
                }
                return null;
            }
        }

        public int? LeftCeilingHeight
        {
            get
            {
                if ((mParts & (TileParts.Top | TileParts.SlantDown)) != 0)
                {
                    return Top + GameMain.GirderWidth;
                }
                if ((mParts & TileParts.SlantUp) != 0)
                {
                    return Bottom + GameMain.GirderWidth;
                }
                return null;
            }
        }

        public int? RightCeilingHeight
        {
            get
            {
                if ((mParts & (TileParts.Top | TileParts.SlantUp)) != 0)
                {
                    return Top + GameMain.GirderWidth;
                }
                if ((mParts & TileParts.SlantDown) != 0)
                {
                    return Bottom + GameMain.GirderWidth;
                }
                return null;
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
            foreach (TileParts part in AllParts())
            {
                if ((Parts & part) != 0)
                {
                    batch.Draw(sTileImages[part], new Rectangle(mLeft - GameMain.TileDrawOffset, mTop - GameMain.TileDrawOffset, GameMain.TileDrawSize, GameMain.TileDrawSize), Color.White);
                }
            }
        }
    }
}
