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
    enum ZitState
    {
        Floor,
        Ceiling,
        Transition,
        Dead,
        Falling,
        Home
    }

    class Zit
    {
        private static Texture2D sSprite = null;
        private Vector2 mLocation = new Vector2(kSize + GameMain.ColumnXOffset, GameMain.TileSize * 2 - GameMain.GirderWidth - (kSize / 2f) + GameMain.ColumnVOffset);
        private float mAngle = 0;
        private float mSpeed = kSpeedFactor;
        private ZitState mState = ZitState.Floor;
        private Tile mCurrentTile = null;
        private TileColumn mCurrentColumn = null;

        private const int kSize = 20;
        private const int kRadius = kSize / 2;
        private const float kAngleIncrement = (float)(kSpeedFactor / kSize * Math.PI);
        private const float kSpeedFactor = kSize / 1000f;

        public static void LoadContent(ContentManager content)
        {
            sSprite = content.Load<Texture2D>("Images/Zit");
        }

        internal Zit(TileColumn column, Tile tile)
        {
            mCurrentColumn = column;
            mCurrentTile = tile;
        }

        internal void Update(GameTime gameTime, IList<TileColumn> columns)
        {
            mAngle += gameTime.ElapsedGameTime.Milliseconds * kAngleIncrement;
            if (mState == ZitState.Floor || mState == ZitState.Ceiling)
            {
                int columnIndex = columns.IndexOf(mCurrentColumn);
                mLocation.X += gameTime.ElapsedGameTime.Milliseconds * mSpeed * ((mState == ZitState.Floor) ? 1 : -1);

                if (mState == ZitState.Floor)
                {
                    if (mLocation.X > mCurrentTile.Right)
                    {
                        ++columnIndex;
                        if (columns[columnIndex].Moving)
                        {
                            Die();
                        }
                        else
                        {
                            TileColumn targetColumn = columns[columnIndex];
                            int targetTileIndex = mCurrentColumn.IndexOf(mCurrentTile);

                            while (targetTileIndex + 1 < targetColumn.Length && targetColumn[targetTileIndex].LeftFloorHeight == null)
                            {
                                ++targetTileIndex;
                            }
                            if (targetColumn[targetTileIndex].LeftFloorHeight == null || mCurrentTile.RightFloorHeight.Value > targetColumn[targetTileIndex].LeftFloorHeight.Value)
                            {
                                Fall();
                            }

                            mCurrentColumn = targetColumn;
                            mCurrentTile = targetColumn[targetTileIndex];;
                        }
                    }
                }
                else
                {
                    if (mLocation.X < mCurrentTile.Left)
                    {

                    }
                }
            }
        }

        private void Fall()
        {
            mState = ZitState.Falling;
        }

        private void Die()
        {
            mState = ZitState.Dead;
        }

        public void Draw(SpriteBatch batch)
        {
            if (IsAlive)
            {
                batch.Draw(sSprite, mLocation, null, Color.White, mAngle, new Vector2(sSprite.Width / 2, sSprite.Height / 2), kSize / (float)sSprite.Width, SpriteEffects.None, 0);
            }
        }

        public bool IsAlive
        {
            get { return mState != ZitState.Dead && mState != ZitState.Dead && mState != ZitState.Falling; }
        }

        public Tile CurrentTile
        {
            get { return mCurrentTile; }
        }

        public TileColumn CurrentColumn
        {
            get { return mCurrentColumn; }
        }
    }
}
