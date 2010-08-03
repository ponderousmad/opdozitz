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
        private static Flipbook sExplosion = null;
        private static SoundEffect sExplodeSound = null;
        private static SoundEffect sLandSound = null;
        private static SoundEffect sHomeSound = null;
        private static SoundEffect sSpawnSound = null;

        private const int kSize = 20;
        private const float kRadius = kSize / 2f;
        private const float kAngleIncrement = 0.006f;
        private const float kFallForce = 0.03f;
        private const float kFatalVelocity = 9;
        private const int kExplosionTimePerFrame = 80;
        private static readonly Vector2 kExplosionDrawSize = new Vector2(kSize * 2, kSize * 2);

        private float mSpeedFactor = 1;
        private Vector2 mLocation;
        private Vector2 mContact;
        private float mAngle = 0;
        private ZitState mState = ZitState.Rolling;
        private float mFallSpeed = 0;
        private Flipbook.Playback mExploding = null;

        private Tile mCurrentTile = null;

        public static int Size
        {
            get { return kSize; }
        }

        public Tile ContactTile
        {
            get { return mCurrentTile; }
        }

        public static void LoadContent(ContentManager content)
        {
            sSprite = content.Load<Texture2D>("Images/Zit");
            sExplosion = new Flipbook(content, "Images/Explode", 9, 2);
            sExplodeSound = content.Load<SoundEffect>("Sounds/Splat");
            sLandSound = content.Load<SoundEffect>("Sounds/Pip");
            sHomeSound = content.Load<SoundEffect>("Sounds/Blip");
            sSpawnSound = content.Load<SoundEffect>("Sounds/Ding");
        }

        internal Zit(Tile tile, float speedFactor)
        {
            mSpeedFactor = speedFactor;
            LineSegment platform = tile.Platforms.First();
            mContact = platform.Start + platform.Direction * kRadius;
            mLocation = mContact + platform.DirectedNormal * kRadius;
            mCurrentTile = tile;
            sSpawnSound.Play();
        }

        internal void Update(GameTime gameTime, TileColumn[] columns)
        {
            int elapsed = gameTime.ElapsedGameTime.Milliseconds;
            // Empirically determined to elimnate spurrious physics results.
            const float kMaxAngleStep = 0.2f;
            float rotationRemaining = elapsed * kAngleIncrement * mSpeedFactor;

            while (IsRolling && rotationRemaining > 0)
            {
                float rotation = rotationRemaining > kMaxAngleStep ? kMaxAngleStep : rotationRemaining;
                rotationRemaining -= rotation;

                mAngle += rotation;

                UpdateRolling(columns, rotation, gameTime);
                CheckBoundaries(gameTime);
                CheckHazards(columns, gameTime);
                CheckHome(columns);
            }

            if (IsFalling)
            {
                mAngle += rotationRemaining;
                UpdateFalling(columns, elapsed);
                CheckBoundaries(gameTime);
            }

            if (mExploding != null && mExploding.Update(gameTime))
            {
                mExploding = null;
            }
        }

        private void UpdateRolling(IList<TileColumn> columns, float rotation, GameTime gameTime)
        {
            Vector2 support = mLocation - mContact;
            double supportAngle = Math.Atan2(support.Y, support.X);
            double newAngle = supportAngle + rotation;

            Vector2 swungLocation = mContact + kRadius * new Vector2((float)Math.Cos(newAngle), (float)Math.Sin(newAngle));

            float left = Math.Min(mLocation.X, swungLocation.X) - kRadius;
            float right = Math.Max(mLocation.X, swungLocation.X) + kRadius;

            LineSegment closestPlatform = null;
            Vector2 newContact = mContact;
            Tile closestTile = null;
            bool closestAtEnd = false;
            const float kDistanceCheckFudge = 1.01f;
            float minDistanceSquared = kRadius * kRadius * kDistanceCheckFudge;
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
                        closestTile = tile;
                    }
                }
            }

            if (closestPlatform != null)
            {
                mContact = newContact;
                const float kDieRadius = kRadius / 2;
                if (minDistanceSquared < kDieRadius * kDieRadius)
                {
                    Die(gameTime);
                }
                else if (closestAtEnd)
                {
                    Vector2 normal = swungLocation - mContact;
                    normal.Normalize();

                    const double kFallAngle = Math.PI * 0.4;
                    double angle = NormalAngle(closestPlatform.DirectedNormal, normal);
                    if (normal.Y > 0 && angle > kFallAngle)
                    {
                        mLocation = swungLocation;
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
                mCurrentTile = closestTile;
            }
            else
            {
                mLocation = swungLocation;
                Fall();
            }
        }

        /// <summary>
        /// Calculate the angle between to already normalized vectors.
        /// </summary>
        /// <remarks>Does not check if the vectors are normalized.</remarks>
        private static double NormalAngle(Vector2 n1, Vector2 n2)
        {
            return Math.Acos(Math.Min(1, Vector2.Dot(n1, n2)));
        }

        private void UpdateFalling(IList<TileColumn> columns, int elapsed)
        {
            mFallSpeed += elapsed * kFallForce;

            Vector2 fallLocation = new Vector2(mLocation.X, mLocation.Y + mFallSpeed);
            LineSegment closestPlatform = null;
            Vector2 newContact = Vector2.Zero;
            Tile contactTile = null;
            if (mFallSpeed < kFatalVelocity)
            {
                float highestIntersection = fallLocation.Y;
                foreach (Tile tile in TilesInCurrentColumns(columns))
                {
                    foreach (LineSegment platform in tile.Platforms)
                    {
                        if (IsCeiling(platform.DirectedNormal))
                        {
                            continue;
                        }
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
                                contactTile = tile;
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
                mCurrentTile = contactTile;
                mState = ZitState.Rolling;
                sLandSound.Play();
            }
            else
            {
                mLocation = fallLocation;
            }
        }

        private void CheckHome(IList<TileColumn> columns)
        {
            if (IsRolling)
            {
                foreach (Tile tile in TilesInCurrentColumns(columns))
                {
                    foreach (Rectangle home in tile.Homes)
                    {
                        if (home.Contains(LocationAsPoint()))
                        {
                            MarkHome();
                        }
                    }
                }
            }
        }

        private void CheckBoundaries(GameTime gameTime)
        {
            if (mLocation.Y < (GameMain.FrameTop + kRadius))
            {
                mLocation.Y = GameMain.FrameTop + kRadius;
                Die(gameTime);
            }
            else if (mLocation.Y > (GameMain.FrameBottom - kRadius))
            {
                mLocation.Y = GameMain.FrameBottom - kRadius;
                Die(gameTime);
            }
            else if (mLocation.X < (GameMain.FrameLeft + kRadius) || GameMain.FrameRight < mLocation.X)
            {
                Die(gameTime);
            }
        }

        private void CheckHazards(IList<TileColumn> columns, GameTime gameTime)
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

        private static bool IsCeiling(Vector2 directedNormal)
        {
            return NormalAngle(directedNormal, -Vector2.UnitY) > (Math.PI / 2);
        }

        private bool InHazard(Rectangle hazard)
        {
            Point location = LocationAsPoint();
            if (HazardCheck(hazard, kSize / 2, 0, location) || HazardCheck(hazard, 0, kSize / 2, location))
            {
                return true;
            }
            return OverlapsCorner(ref hazard, true, true) ||
                   OverlapsCorner(ref hazard, true, false) ||
                   OverlapsCorner(ref hazard, false, true) ||
                   OverlapsCorner(ref hazard, false, false);
        }

        private Point LocationAsPoint()
        {
            return new Point((int)Math.Round(mLocation.X), (int)Math.Round(mLocation.Y));
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

        private void Fall()
        {
            if (!IsFalling)
            {
                mCurrentTile = null;
                mState = ZitState.Falling;
            }
        }

        internal void Die(GameTime gameTime)
        {
            if (IsAlive)
            {
                mState = ZitState.Dead;
                mExploding = sExplosion.Start(gameTime, kExplosionTimePerFrame);
                sExplodeSound.Play();
            }
        }

        private void MarkHome()
        {
            if (!IsHome)
            {
                mState = ZitState.Home;
                sHomeSound.Play();
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

        private bool IsRolling
        {
            get { return mState == ZitState.Rolling; }
        }

        private bool IsFalling
        {
            get { return mState == ZitState.Falling; }
        }

        public bool IsAlive
        {
            get { return IsRolling || IsFalling; }
        }

        internal bool IsHome
        {
            get { return mState == ZitState.Home; }
        }

        internal bool InColumn(TileColumn column)
        {
            return column.InColumn(mLocation.X);
        }

        internal void ShiftBy(int delta)
        {
            if (IsRolling)
            {
                mLocation.Y += delta;
                mContact.Y += delta;
            }
        }
    }
}
