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
    enum ZitState
    {
        Rolling,
        Dead,
        Falling,
        Home
    }

    class Zit
    {
        private static Texture2D sSprite = null;
        private Vector2 mLocation;
        private Vector2 mContact;
        private float mAngle = 0;
        private ZitState mState = ZitState.Rolling;

        private const int kSize = 20;
        private const float kRadius = kSize / 2f;
        private const float kAngleIncrement = 0.004f;
        private const double kQuarterCircle = Math.PI / 2;

        public static void LoadContent(ContentManager content)
        {
            sSprite = content.Load<Texture2D>("Images/Zit");
        }

        internal Zit(Tile tile)
        {
            LineSegment platform = tile.Platforms.First();
            mContact = platform.Start + platform.Direction * kRadius;
            mLocation = mContact + platform.DirectedNormal * kRadius;
        }

        internal void Update(GameTime gameTime, IList<TileColumn> columns)
        {
            mAngle += gameTime.ElapsedGameTime.Milliseconds * kAngleIncrement;
            if (IsRolling())
            {
                float rotation = gameTime.ElapsedGameTime.Milliseconds * kAngleIncrement;

                Vector2 support = mLocation - mContact;
                double supportAngle = Math.Atan2(support.Y, support.X);
                double newAngle = supportAngle + rotation;

                Vector2 swungLocation = mContact + kRadius * new Vector2((float)Math.Cos(newAngle), (float)Math.Sin(newAngle));

                float left = Math.Min(mLocation.X, swungLocation.X) - kRadius;
                float right = Math.Max(mLocation.X, swungLocation.X) + kRadius;

                LineSegment closestPlatform = null;
                Vector2 newContact = mContact;
                bool closestAtEnd = false;
                float minDistanceSquared = float.MaxValue;
                foreach (TileColumn column in columns)
                {
                    if (column.InColumn(left) || column.InColumn(right))
                    {
                        foreach (Tile tile in column.Tiles)
                        {
                            foreach (LineSegment platform in tile.Platforms)
                            {
                                bool atEnd;
                                Vector2 currentClosest = platform.ClosestPoint(swungLocation, out atEnd);
                                float distanceSquared = Vector2.DistanceSquared(currentClosest, swungLocation);
                                if (distanceSquared < minDistanceSquared)
                                {
                                    closestAtEnd = atEnd;
                                    closestPlatform = platform;
                                    minDistanceSquared = distanceSquared;
                                    newContact = currentClosest;
                                }
                            }
                        }
                    }
                }

                if (closestPlatform != null)
                {
                    mContact = newContact;
                    if (closestAtEnd)
                    {
                        Vector2 normal = swungLocation - mContact;
                        normal.Normalize();
                        mLocation = mContact + normal * kRadius;
                    }
                    else
                    {
                        mLocation = mContact + closestPlatform.DirectedNormal * kRadius;
                    }
                }
                else
                {
                    mLocation = swungLocation;
                }
            }
        }

        private static bool InColumn(TileColumn column, float x)
        {
            return (column.Left <= x && x <= column.Right);
        }

        private bool IsRolling()
        {
            return mState == ZitState.Rolling;
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
            get { return mState == ZitState.Rolling || mState == ZitState.Falling; }
        }

        internal bool InColumn(TileColumn column)
        {
            return column.InColumn(mLocation.X - kRadius) || column.InColumn(mLocation.X + kRadius);
        }
    }
}
