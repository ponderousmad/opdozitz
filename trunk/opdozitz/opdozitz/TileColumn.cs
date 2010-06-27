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
    class TileColumn
    {
        private int mLeftEdge;
        private int mTop;
        private List<Tile> mTiles = new List<Tile>();

        internal TileColumn(int leftEdge, int top)
        {
            mLeftEdge = leftEdge;
            mTop = top;
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
                tile.Draw(batch, mLeftEdge, tileY);
                tileY += GameMain.TileSize;
            }
        }
    }
}
