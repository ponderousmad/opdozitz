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

        public int Left
        {
            get { return mLeft; }
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
