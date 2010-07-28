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
        private Vector2 mLocation;
        private float mAngle = 0;
        private LineSegment mRail;
        private float mRailTraveled;
        private ZitState mState = ZitState.Floor;
        private Tile mCurrentTile = null;
        private TileColumn mCurrentColumn = null;

        private const int kSize = 20;
        private const float kRadius = kSize / 2f;
        private const float kAngleIncrement = (float)(kSpeedFactor / kSize * Math.PI);
        private const float kSpeedFactor = kSize / 1000f;
        private const float kRailIntersectionTolerance = 1e-2f;
        private const double kQuarterCircle = Math.PI / 2;

        public static void LoadContent(ContentManager content)
        {
            sSprite = content.Load<Texture2D>("Images/Zit");
        }

        internal Zit(TileColumn column, Tile tile)
        {
            mCurrentColumn = column;
            mCurrentTile = tile;
            LineSegment platform = tile.Platforms(true).First();
            mRail = platform.Shift(PlatformOffset(platform, true));
            mLocation = mRail.Start + mRail.Direction * kRadius;
            mRailTraveled = kRadius;
        }

        internal void Update(GameTime gameTime, IList<TileColumn> columns)
        {
            mAngle += gameTime.ElapsedGameTime.Milliseconds * kAngleIncrement;
            if (IsRolling())
            {
                LineSegment rail = mRail;
                float distance = gameTime.ElapsedGameTime.Milliseconds * kSpeedFactor;

                bool isFloor = mState == ZitState.Floor;
                int nextColumn = columns.IndexOf(mCurrentColumn) + (isFloor ? 1 : -1);

                TileColumn targetColumn = columns[nextColumn];
                Tile targetTile = null;
                LineSegment targetRail = null;

                if (!targetColumn.Moving)
                {
                    LineSegment currentPath = rail.ExtendAtEnd(kSize);
                    for (int i = 0; i < targetColumn.Length && targetRail == null; ++i)
                    {
                        Tile tile = targetColumn[i];
                        foreach (LineSegment platform in tile.Platforms(isFloor))
                        {
                            LineSegment next = platform.ExtendAtStart(kRadius).Shift(PlatformOffset(platform, isFloor));

                            Vector2 intersection;
                            if (currentPath.FindIntersection(next, kRailIntersectionTolerance, out intersection))
                            {
                                targetTile = tile;
                                targetRail = new LineSegment(intersection, next.End);
                                rail = new LineSegment(rail.Start, intersection);
                                break;
                            }
                        }
                    }
                }

                if (mRailTraveled + distance > rail.Length)
                {
                    mLocation = rail.End;
                    distance -= (rail.Length - mRailTraveled);
                    mRailTraveled = 0;

                    if (targetRail == null)
                    {
                        Fall();
                    }
                    else
                    {
                        mRail = rail = targetRail;
                        mCurrentColumn = targetColumn;
                        mCurrentTile = targetTile;
                    }
                }

                mRailTraveled += distance;
                mLocation += rail.Direction * distance;
            }
        }

        private static Vector2 PlatformOffset(LineSegment platform, bool isFloor)
        {
            Vector2 normal = platform.Normal;
            if (Geom.Line.Angle(normal, isFloor ? Vector2.UnitY : -Vector2.UnitY) > kQuarterCircle)
            {
                return normal * kRadius;
            }
            return normal * (-kRadius);
        }

        private bool IsRolling()
        {
            return mState == ZitState.Floor || mState == ZitState.Ceiling;
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
