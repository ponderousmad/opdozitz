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
        private static Flipbook sExplosion = null;
        private static SoundEffect sExplodeSound = null;

        private const int kSize = 20;
        private const float kRadius = kSize / 2f;
        private const float kAngleIncrement = 0.004f;
        private const int kInColumnPad = 5;
        private const float kFallForce = 0.03f;
        private const float kFatalVelocity = 9;
        private const int kExplosionTimePerFrame = 80;
        private static readonly Vector2 kExplosionDrawSize = new Vector2(kSize * 2, kSize * 2);

        private Vector2 mLocation;
        private Vector2 mContact;
        private float mAngle = 0;
        private ZitState mState = ZitState.Rolling;
        private float mFallSpeed = 0;
        private Flipbook.Playback mExploding = null;

        public static void LoadContent(ContentManager content)
        {
            sSprite = content.Load<Texture2D>("Images/Zit");
            sExplosion = new Flipbook(content, "Images/Explode", 9, 2);
            sExplodeSound = content.Load<SoundEffect>("Sounds/Splat");
        }

        internal Zit(Tile tile)
        {
            LineSegment platform = tile.Platforms.First();
            mContact = platform.Start + platform.Direction * kRadius;
            mLocation = mContact + platform.DirectedNormal * kRadius;
        }

        internal void Update(GameTime gameTime, IList<TileColumn> columns)
        {
            int elapsed = gameTime.ElapsedGameTime.Milliseconds;
            float rotation = elapsed * kAngleIncrement;

            if (IsAlive)
            {
                mAngle += rotation;
            }

            if (IsRolling())
            {
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
                foreach (Tile tile in TilesInCurrentColumns(columns, left, right))
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

                if (closestPlatform != null)
                {
                    mContact = newContact;
                    if (closestAtEnd)
                    {
                        Vector2 normal = swungLocation - mContact;
                        normal.Normalize();

                        double angle = Math.Acos(Vector2.Dot(closestPlatform.DirectedNormal, normal));
                        if (normal.Y > 0 && angle > (Math.PI * 0.9 / 2))
                        {
                            Fall();
                        }
                        else
                        {
                            mLocation = mContact + normal * kRadius;
                        }
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
            else if (mState == ZitState.Falling)
            {
                mFallSpeed += elapsed * kFallForce;

                Vector2 fallLocation = new Vector2(mLocation.X, mLocation.Y + mFallSpeed);
                LineSegment closestPlatform = null;
                Vector2 newContact = Vector2.Zero;
                if (mFallSpeed < kFatalVelocity)
                {
                    float highestIntersection = fallLocation.Y;
                    foreach (Tile tile in TilesInCurrentColumns(columns))
                    {
                        foreach (LineSegment platform in tile.Platforms)
                        {
                            Vector2 offsetVector = -platform.DirectedNormal * kRadius;
                            Vector2 offsetPoint = fallLocation + offsetVector;
                            Vector2 contact;
                            if (platform.FindIntersection(new LineSegment(offsetPoint.X, offsetPoint.Y, offsetPoint.X, offsetPoint.Y - kSize), out contact))
                            {
                                Vector2 landLocation = contact - offsetVector;
                                if (mLocation.Y < landLocation.Y && landLocation.Y < highestIntersection)
                                {
                                    closestPlatform = platform;
                                    newContact = contact;
                                }
                            }
                        }
                    }
                }
                if (closestPlatform != null)
                {
                    mFallSpeed = 0;
                    mContact = newContact;
                    mLocation = mContact + kRadius * closestPlatform.DirectedNormal;
                    mState = ZitState.Rolling;
                }
                else
                {
                    mLocation = fallLocation;
                }
            }

            if (IsAlive)
            {
                if (mLocation.Y < (GameMain.FrameTop + kRadius))
                {
                    mLocation.Y = GameMain.FrameTop + kRadius;
                    Die(gameTime);
                }
                else if (mLocation.Y > (GameMain.FrameBottom -kRadius) )
                {
                    mLocation.Y = GameMain.FrameBottom - kRadius;
                    Die(gameTime);
                }
                else
                {
                    foreach (Tile tile in TilesInCurrentColumns(columns))
                    {
                        foreach (Rectangle hazard in tile.Hazards)
                        {
                            if (InHazard(hazard))
                            {
                                Die(gameTime);
                            }
                        }
                    }
                }
            }
            else if (mExploding != null && mExploding.Update(gameTime))
            {
                mExploding = null;
            }
        }

        private bool InHazard(Rectangle hazard)
        {
            Point location = new Point((int)Math.Round(mLocation.X), (int)Math.Round(mLocation.Y));
            if (HazardCheck(hazard, kSize / 2, 0, location) || HazardCheck(hazard, 0, kSize / 2, location))
            {
                return true;
            }
            return OverlapsCorner(ref hazard, true, true) ||
                   OverlapsCorner(ref hazard, true, false) ||
                   OverlapsCorner(ref hazard, false, true) ||
                   OverlapsCorner(ref hazard, false, false);
        }

        private bool OverlapsCorner(ref Rectangle hazard, bool top, bool left)
        {
            Vector2 corner = new Vector2(hazard.Left + (left ? 0 : hazard.Width), hazard.Top + (top ? 0 : hazard.Height));
            return Vector2.Distance(corner, mLocation) < kRadius;
        }

        private bool HazardCheck(Rectangle hazard, int widthBuffer, int heightBuffer, Point location)
        {
            hazard.Inflate(widthBuffer, heightBuffer);
            return hazard.Contains(location);
        }

        private IEnumerable<Tile> TilesInCurrentColumns(IList<TileColumn> columns)
        {
            return TilesInCurrentColumns(columns, mLocation.X - kRadius, mLocation.X + kRadius);
        }

        private IEnumerable<Tile> TilesInCurrentColumns(IEnumerable<TileColumn> columns, float left, float right)
        {
            foreach (TileColumn column in columns)
            {
                if (column.InColumn(left) || column.InColumn(right))
                {
                    foreach (Tile tile in column.Tiles)
                    {
                        yield return tile;
                    }
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

        private void Die(GameTime gameTime)
        {
            if (IsAlive)
            {
                mState = ZitState.Dead;
                mExploding = sExplosion.Start(gameTime, kExplosionTimePerFrame);
                sExplodeSound.Play();
            }
        }

        public void Draw(SpriteBatch batch)
        {
            if (IsAlive)
            {
                batch.Draw(sSprite, mLocation, null, Color.White, mAngle, new Vector2(sSprite.Width / 2, sSprite.Height / 2), kSize / (float)sSprite.Width, SpriteEffects.None, 0);
            }
            else if (mExploding != null)
            {
                sExplosion.Draw(batch, mExploding, mLocation, kExplosionDrawSize, true);
            }
        }

        public bool IsAlive
        {
            get { return mState == ZitState.Rolling || mState == ZitState.Falling; }
        }

        internal bool InColumn(TileColumn column)
        {
            float radius = kRadius + kInColumnPad;
            return column.InColumn(mLocation.X - radius) || column.InColumn(mLocation.X + radius);
        }
    }
}
