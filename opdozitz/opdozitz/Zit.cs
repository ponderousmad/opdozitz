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
    class Zit
    {
        private Texture2D mSprite = null;
        private Vector2 mLocation = new Vector2(kSize, GameMain.TileSize * 2 - GameMain.GirderWidth - (kSize / 2f));
        private float mAngle = 0;
        private float mSpeed = kSpeedFactor;

        private const int kSize = 20;
        private const float kAngleIncrement = (float)(kSpeedFactor / kSize * Math.PI);
        private const float kSpeedFactor = kSize / 1000f;

        public void LoadContent(ContentManager content)
        {
            mSprite = content.Load<Texture2D>("Images/Zit");
        }

        internal void Update(GameTime gameTime)
        {
            mAngle += gameTime.ElapsedGameTime.Milliseconds * kAngleIncrement;
            mLocation.X += gameTime.ElapsedGameTime.Milliseconds * mSpeed;
        }

        public void Draw(SpriteBatch batch)
        {
            batch.Draw(mSprite, mLocation, null, Color.White, mAngle, new Vector2(mSprite.Width / 2, mSprite.Height / 2), kSize / (float)mSprite.Width, SpriteEffects.None, 0);
        }
    }
}
