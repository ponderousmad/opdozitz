﻿using System;
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

        internal bool Locked
        {
            get { return mLocked; }
        }

        internal bool Moving
        {
            get { return mMovingSteps > 0; }
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

        internal void Update(GameTime gameTime)
        {
            if (mMovingSteps > 0)
            {
                foreach (Tile tile in mTiles)
                {
                    if (mMovingUp)
                    {
                        tile.Top -= kMoveSize;
                    }
                    else
                    {
                        tile.Top += kMoveSize;
                    }
                }
                mMovingSteps -= kMoveSize;
                if (!Moving)
                {
                    mTiles.Remove(mMovingUp ? mTiles.First() : mTiles.Last());
                }
            }
        }
    }
}