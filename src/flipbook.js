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
    class Flipbook
    {
        private Texture2D[] mFrames = null;

        public class Playback
        {
            private double mElapsed = 0;
            private double mTimePerFrame;
            private int mFrameCount;

            public Playback(GameTime start, double timePerFrame, int frameCount)
            {
                mTimePerFrame = timePerFrame;
                mFrameCount = frameCount;
            }

            public bool Update(GameTime time)
            {
                mElapsed += time.ElapsedGameTime.TotalMilliseconds;
                return mElapsed > mTimePerFrame * mFrameCount;
            }

            public int Frame
            {
                get
                {
                    return Math.Min(mFrameCount - 1, (int)Math.Floor(mElapsed / mTimePerFrame));
                }
            }
        }

        public Flipbook(ContentManager content, string basename, int frames, int digits)
        {
            mFrames = new Texture2D[frames];
            for (int i = 0; i < frames; ++i)
            {
                mFrames[i] = content.Load<Texture2D>(basename + FrameID(i, digits));
            };
        }

        private string FrameID(int i, int digits)
        {
            StringBuilder id = new StringBuilder((i + 1).ToString());
            while (id.Length < digits)
            {
                id.Insert(0, '0');
            }
            return id.ToString();
        }

        public Playback Start(GameTime time, double timePerFrame)
        {
            return new Playback(time, timePerFrame, mFrames.Length);
        }

        public void Draw(SpriteBatch batch, Playback playback, Vector2 location, Vector2 size, bool center)
        {
            int frameIndex = playback.Frame;
            if (frameIndex >= 0)
            {
                Rectangle destination = new Rectangle(
                    (int)Math.Round(location.X - (center ? size.X / 2 : 0)),
                    (int)Math.Round(location.Y - (center ? size.Y / 2 : 0)),
                    (int)Math.Round(size.X),
                    (int)Math.Round(size.Y)
                );
                batch.Draw(mFrames[frameIndex], destination, Color.White);
            }
        }
    }
}
