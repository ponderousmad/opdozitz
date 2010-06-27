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
    enum TileType
    {
        Empty,
        Bottom,
        /*
        SlopeUp,
        SlopeDown,
        Spikes
         */
    }

    class Tile
    {
        private TileType mType = TileType.Empty;

        private static List<Texture2D> sTileImages;

        internal static void LoadContent(ContentManager content)
        {
            sTileImages = new List<Texture2D>();
            foreach(TileType type in Enum.GetValues(typeof(TileType)))
            {
                sTileImages.Add(content.Load<Texture2D>("Images/Tile" + type.ToString()));
            }
        }

        public Tile(TileType type)
        {
            mType = type;
        }

        public TileType Type
        {
            get { return mType; }
        }

        internal void Draw(SpriteBatch batch, int x, int y)
        {
            batch.Draw(sTileImages[(int)Type], new Rectangle(x, y, GameMain.TileSize, GameMain.TileSize), Color.White);
        }
    }
}
