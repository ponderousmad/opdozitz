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
        Dead
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
        private const float kAngleIncrement = (float)(kSpeedFactor / kSize * Math.PI);
        private const float kSpeedFactor = kSize / 1000f;

        public static void LoadContent(ContentManager content)
        {
            sSprite = content.Load<Texture2D>("Images/Zit");
        }

        internal void Update(GameTime gameTime)
        {

            mAngle += gameTime.ElapsedGameTime.Milliseconds * kAngleIncrement;
            mLocation.X += gameTime.ElapsedGameTime.Milliseconds * mSpeed * ((mState == ZitState.Floor) ? 1 : -1);
        }

        public void Draw(SpriteBatch batch)
        {
            batch.Draw(sSprite, mLocation, null, Color.White, mAngle, new Vector2(sSprite.Width / 2, sSprite.Height / 2), kSize / (float)sSprite.Width, SpriteEffects.None, 0);
        }

        public Tile CurrentTile
        {
            get { return mCurrentTile; }
            set { mCurrentTile = value; }
        }

        public TileColumn CurrentColumn
        {
            get { return mCurrentColumn; }
            set { mCurrentColumn = value; }
        }
    }
}
