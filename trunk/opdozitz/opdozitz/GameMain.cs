using System;
using System.Collections.Generic;
using System.Linq;
using System.Xml.Linq;
using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Audio;
using Microsoft.Xna.Framework.Content;
using Microsoft.Xna.Framework.GamerServices;
using Microsoft.Xna.Framework.Graphics;
using Microsoft.Xna.Framework.Input;
using Microsoft.Xna.Framework.Media;
using Microsoft.Xna.Framework.Net;
using Microsoft.Xna.Framework.Storage;
using Opdozitz.Utils;

namespace Opdozitz
{
    /// <summary>
    /// Core Game Logic
    /// </summary>
    public class GameMain : Microsoft.Xna.Framework.Game
    {
        public const int TileSize = 50;
        public const int GirderWidth = 3;
        public const int TileDrawOffset = 5;
        public const int TileDrawSize = TileSize + (TileDrawOffset * 2);
        public const int ColumnXOffset = 25;
        public const int ColumnVOffset = 0;
        public const int FrameTop = 25;
        public const int FrameBottom = 575;
        public const int FrameLeft = 25;
        public const int FrameRight = 775;

        private const double kBaseSpawnInterval = 5000;
        private const double kLevelSpawnFactor = 0.95;
        private const float kLevelSpeedFactor = 0.2f;
        private const double kSpawnRateFactorRatio = 0.8;
        private const int kMaxSpawnRateFactor = 10;
        private const int kZitsPerLevel = 20;
        private const int kMinLevel = 1;
        private const int kMaxLevel = 25;

        private static Texture2D sPixel;

        private GraphicsDeviceManager mGraphics;
        private SpriteBatch mSpriteBatch;
        private List<Zit> mZits = new List<Zit>();
        private List<TileColumn> mColumns = new List<TileColumn>();
        private Texture2D mBackground;
        private Texture2D mFrame;
        private Texture2D mSelectColumn;
        private Texture2D mSelectColumnStuck;
        private Texture2D mSelectTile;

        private SpriteFont mDisplayFont;
        private SpriteFont mDisplayTitleFont;
        private SpriteFont mScoreFont;

        private int mSelectedColumn = 1;
        private int mSelectedTile = 0;
        private int mLevel = 0;
        private int mScore = 0;
        private bool mEditing = false;
        private bool mEdited = false;

        private int mSinceLastSpawn = 0;
        private int mSpawnRateFactor = 1;

        private KeyboardState mLastKeyboardState = new KeyboardState();

        public static Texture2D Pixel
        {
            get { return sPixel; }
        }

        public GameMain()
        {
            mGraphics = new GraphicsDeviceManager(this);
            Content.RootDirectory = "Content";
        }

        /// <summary>
        /// Allows the game to perform any initialization it needs to before starting to run.
        /// This is where it can query for any required services and load any non-graphic
        /// related content.  Calling base.Initialize will enumerate through any components
        /// and initialize them as well.
        /// </summary>
        protected override void Initialize()
        {
            Window.Title = "Opdozitz";

            RunTests();

            base.Initialize();

            LoadLevel(kMinLevel);
        }

        private static void RunTests()
        {
            Geom.Line.TestIntersect.Test();
        }

        /// <summary>
        /// LoadContent will be called once per game and is the place to load
        /// all of your content.
        /// </summary>
        protected override void LoadContent()
        {
            // Create a new SpriteBatch, which can be used to draw textures.
            mSpriteBatch = new SpriteBatch(GraphicsDevice);
            Zit.LoadContent(Content);
            Tile.LoadContent(Content);
            mBackground = Content.Load<Texture2D>("Images/Background");
            mFrame = Content.Load<Texture2D>("Images/Frame");
            mSelectColumn = Content.Load<Texture2D>("Images/SelectColumn");
            mSelectColumnStuck = Content.Load<Texture2D>("Images/SelectColumnStuck");
            mSelectTile = Content.Load<Texture2D>("Images/SelectTile");

            mDisplayFont = Content.Load<SpriteFont>("Fonts/Displays");
            mDisplayTitleFont = Content.Load<SpriteFont>("Fonts/DisplaysTitle");
            mScoreFont = Content.Load<SpriteFont>("Fonts/Score");

            if (sPixel == null)
            {
                sPixel = Content.Load<Texture2D>("Images/Pixel");
            }
        }

        private static string ContentBuildPath
        {
            get
            {
                string assemblyPath = System.IO.Path.GetDirectoryName(typeof(GameMain).Assembly.Location);
                System.IO.DirectoryInfo path = new System.IO.DirectoryInfo(assemblyPath);
                return System.IO.Path.Combine(path.Parent.Parent.Parent.FullName, "Content");
            }
        }

        private System.IO.Stream Load(string location, string resource)
        {
#if DEBUG
            return new System.IO.FileStream(System.IO.Path.Combine(System.IO.Path.Combine(ContentBuildPath, location), resource), System.IO.FileMode.Open, System.IO.FileAccess.Read);
#else
            return GetType().Assembly.GetManifestResourceStream("Opdozitz.Content." + location + "." + resource);
#endif
        }

        private void LoadLevel(int number)
        {
            mLevel = number;
            using (System.IO.Stream stream = Load("Levels", LevelName(mLevel)))
            using (System.IO.TextReader reader = new System.IO.StreamReader(stream))
            {
                int columnLocation = ColumnXOffset;
                mColumns.Clear();
                mZits.Clear();
                XDocument doc = System.Xml.Linq.XDocument.Load(reader);
                XElement root = doc.Elements("Level").First();
                foreach (XElement e in root.Elements("Column"))
                {
                    mColumns.Add(new TileColumn(columnLocation, ColumnVOffset, e.ReadBool("locked", false)));
                    int tileLocation = ColumnVOffset;
                    foreach (XElement t in e.Elements("Tile"))
                    {
                        mColumns.Last().Add(new Tile(t.Read<TileParts>("type"), columnLocation, tileLocation));
                        tileLocation += TileSize;
                    }
                    columnLocation += TileSize;
                }
            }
        }

        private static string LevelName(int number)
        {
            return string.Format("Level{0:00}.xml", number);
        }

        private void StoreLevel()
        {
            string path = System.IO.Path.Combine(System.IO.Path.Combine(ContentBuildPath, "Levels"), LevelName(mLevel));
            using (Utils.DocumentWriter writer = new Opdozitz.Utils.DocumentWriter(path))
            using (Utils.IDataWriter root = writer["Level"])
            {
                foreach (TileColumn column in mColumns)
                {
                    column.Store(root);
                }
            }
        }

        private void StartLevel(GameTime gameTime)
        {
            mZits.Clear();
            mSinceLastSpawn = 0;
            mSpawnRateFactor = 1;
        }

        private void StartLevel(int level, GameTime gameTime)
        {
            LoadLevel(level);
            StartLevel(gameTime);
        }

        private void CheckSpawn(GameTime gameTime)
        {
            mSinceLastSpawn += gameTime.ElapsedGameTime.Milliseconds;

            if (mZits.Count < kZitsPerLevel)
            {
                if (mSinceLastSpawn > ZitSpawnInterval())
                {
                    SpawnZit();
                }
            }
        }

        private double ZitSpawnInterval()
        {
            return Math.Pow(kLevelSpawnFactor, mLevel) * kBaseSpawnInterval * Math.Pow(kSpawnRateFactorRatio, mSpawnRateFactor);
        }

        private void SpawnZit()
        {
            mZits.Add(new Zit(mColumns[0][1], 1 + kLevelSpeedFactor * mLevel));
            mSinceLastSpawn = 0;
        }

        /// <summary>
        /// UnloadContent will be called once per game and is the place to unload
        /// all content.
        /// </summary>
        protected override void UnloadContent()
        {
            // TODO: Unload any non ContentManager content here
        }

        /// <summary>
        /// Allows the game to run logic such as updating the world,
        /// checking for collisions, gathering input, and playing audio.
        /// </summary>
        /// <param name="gameTime">Provides a snapshot of timing values.</param>
        protected override void Update(GameTime gameTime)
        {
            // Allows the game to exit
            if (GamePad.GetState(PlayerIndex.One).Buttons.Back == ButtonState.Pressed)
                this.Exit();

            KeyboardState keyboardState = Keyboard.GetState();

            UpdateSelectedColumn(keyboardState);

            if (IsKeyPress(keyboardState, Keys.E) && IsControlDown(keyboardState))
            {
                if (mEditing && mEdited)
                {
                    mEdited = false;
                    StoreLevel();
                }
                mEditing = !mEditing;
            }

            if (mEditing)
            {
                UpdateEdit(keyboardState);
            }
            else
            {
                UpdateGameplay(gameTime, keyboardState);
            }

            mLastKeyboardState = keyboardState;
            base.Update(gameTime);
        }

        private void UpdateSelectedColumn(KeyboardState keyboardState)
        {
            if (IsKeyPress(keyboardState, Keys.Left))
            {
                for (int column = mSelectedColumn - 1; column > 0; --column)
                {
                    if (!mColumns[column].Locked)
                    {
                        SetSelectedColumn(column);
                        break;
                    }
                }
            }
            else if (IsKeyPress(keyboardState, Keys.Right))
            {
                for (int column = mSelectedColumn + 1; column < mColumns.Count; ++column)
                {
                    if (!mColumns[column].Locked)
                    {
                        mSelectedColumn = column;
                        break;
                    }
                }
            }
        }

        private void UpdateGameplay(GameTime gameTime, KeyboardState keyboardState)
        {
            if (keyboardState.IsKeyDown(Keys.Up))
            {
                if (CanMoveCurrent)
                {
                    CurrentColumn.MoveUp();
                }
            }
            else if (keyboardState.IsKeyDown(Keys.Down))
            {
                if (CanMoveCurrent)
                {
                    CurrentColumn.MoveDown();
                }
            }

            if (IsKeyPress(keyboardState, Keys.OemPeriod))
            {
                mSpawnRateFactor = Math.Min(kMaxSpawnRateFactor, mSpawnRateFactor + 1);
            }
            else if (IsKeyPress(keyboardState, Keys.OemComma))
            {
                mSpawnRateFactor = Math.Max(1, mSpawnRateFactor - 1);
            }

            if (IsKeyPress(keyboardState, Keys.Escape))
            {
                StartLevel(mLevel, gameTime);
            }

            int reps = 1;
            if (IsShiftDown(keyboardState))
            {
                reps = 4;
            }

            for (; reps > 0; --reps)
            {
                CheckSpawn(gameTime);

                foreach (Zit zit in mZits)
                {
                    zit.Update(gameTime, mColumns);
                    if ((IsKeyPress(keyboardState, Keys.Space) && !IsShiftDown(keyboardState)) && zit.IsAlive && zit.InColumn(CurrentColumn))
                    {
                        zit.Die(gameTime);
                    }
                }

                foreach (TileColumn column in mColumns)
                {
                    column.Update(gameTime);
                }
            }

            if (mLevel < kMaxLevel && (IsKeyPress(keyboardState, Keys.N) || LevelSuccessful()))
            {
                StartLevel(mLevel + 1, gameTime);
            }
            if (mLevel > 1 && IsKeyPress(keyboardState, Keys.P))
            {
                StartLevel(mLevel - 1, gameTime);
            }
        }

        private bool LevelSuccessful()
        {
            return (LevelDone() && (ZitHomeCount() > kZitsPerLevel / 2));
        }

        private bool LevelDone()
        {
            if (mZits.Count == kZitsPerLevel)
            {
                foreach (Zit zit in mZits)
                {
                    if (zit.IsAlive)
                    {
                        return false;
                    }
                }
                return true;
            }
            else
            {
                return false;
            }
        }

        private void UpdateEdit(KeyboardState keyboardState)
        {
            if (IsKeyPress(keyboardState, Keys.Up))
            {
                mSelectedTile = Math.Max(0, mSelectedTile - 1);
            }
            else if (IsKeyPress(keyboardState, Keys.Down))
            {
                mSelectedTile = Math.Min(CurrentColumn.Length - 1, mSelectedTile + 1);
            }
            else if (IsKeyPress(keyboardState, Keys.D1))
            {
                ToggleTilePart(TileParts.Flat);
            }
            else if (IsKeyPress(keyboardState, Keys.D2))
            {
                ToggleTilePart(TileParts.SlantUp);
            }
            else if (IsKeyPress(keyboardState, Keys.D3))
            {
                ToggleTilePart(TileParts.SlantDown);
            }
            else if (IsKeyPress(keyboardState, Keys.D4))
            {
                ToggleTilePart(TileParts.SpikesUp);
            }
            else if (IsKeyPress(keyboardState, Keys.D5))
            {
                ToggleTilePart(TileParts.SpikesDown);
            }
            else if (IsKeyPress(keyboardState, Keys.D6))
            {
                ToggleTilePart(TileParts.TransitionTop);
            }
            else if (IsKeyPress(keyboardState, Keys.D7))
            {
                ToggleTilePart(TileParts.TransitionBottom);
            }
            else if (IsKeyPress(keyboardState, Keys.D8))
            {
            }
            else if (IsKeyPress(keyboardState, Keys.D9))
            {
            }
            else if (IsKeyPress(keyboardState, Keys.D0))
            {
            }
        }

        private void ToggleTilePart(TileParts part)
        {
            CurrentTile.TogglePart(part);
            mEdited = true;
        }

        private static bool IsControlDown(KeyboardState keyboardState)
        {
            return keyboardState.IsKeyDown(Keys.RightControl) || keyboardState.IsKeyDown(Keys.LeftControl);
        }

        private static bool IsShiftDown(KeyboardState keyboardState)
        {
            return keyboardState.IsKeyDown(Keys.RightShift) || keyboardState.IsKeyDown(Keys.LeftShift);
        }

        private bool IsKeyPress(KeyboardState keyboardState, Keys key)
        {
            return keyboardState.IsKeyDown(key) && !mLastKeyboardState.IsKeyDown(key);
        }

        private TileColumn CurrentColumn
        {
            get
            {
                return mColumns[mSelectedColumn];
            }
        }

        private void SetSelectedColumn(int column)
        {
            mSelectedColumn = column;
            mSelectedTile = Math.Min(CurrentColumn.Length - 1, mSelectedTile);
        }

        private Tile CurrentTile
        {
            get { return CurrentColumn[mSelectedTile]; }
        }

        private bool CanMoveColumn(TileColumn column)
        {
            if (column.Locked || column.Moving)
            {
                return false;
            }
            foreach (Zit zit in mZits)
            {
                if (zit.IsAlive && zit.InColumn(column))
                {
                    return false;
                }
            }
            return true;
        }

        private bool CanMoveCurrent
        {
            get
            {
                return CanMoveColumn(CurrentColumn);
            }
        }

        /// <summary>
        /// This is called when the game should draw itself.
        /// </summary>
        /// <param name="gameTime">Provides a snapshot of timing values.</param>
        protected override void Draw(GameTime gameTime)
        {
            GraphicsDevice.Clear(Color.Black);

            mSpriteBatch.Begin();
            mSpriteBatch.Draw(mBackground, new Rectangle(0, 0, Window.ClientBounds.Width, Window.ClientBounds.Height), Color.White);

            foreach (TileColumn column in mColumns)
            {
                column.Draw(mSpriteBatch);
            }
            foreach (Zit zit in mZits)
            {
                zit.Draw(mSpriteBatch);
            }
            mSpriteBatch.Draw(mFrame, new Rectangle(0, 0, Window.ClientBounds.Width, Window.ClientBounds.Height), Color.White);
            Texture2D cursor = (CanMoveCurrent || CurrentColumn.Moving) ? mSelectColumn : mSelectColumnStuck;
            mSpriteBatch.Draw(cursor, new Rectangle(CurrentColumn.Left - TileDrawOffset, CurrentColumn.Top + TileSize / 2 - TileDrawOffset, cursor.Width, cursor.Height), Color.White);
            if (mEditing)
            {
                mSpriteBatch.Draw(mSelectTile, new Rectangle(CurrentTile.Left, CurrentTile.Top, GameMain.TileSize, GameMain.TileSize), Color.White);
            }

            const int kLeftDisplayEdge = 10;
            const int kLeftDisplayTop = 255;
            const int kRightDisplayEdge = 738;
            const int kRightDisplayTop = 28;
            const int kLineHeight = 18;
            const int kScoreHeight = 22;
            const int kTitleHeight = 14;
            const int kDisplaysWidth = 55;
            int top = kLeftDisplayTop;
            DrawTextCentered(mDisplayTitleFont, string.Format("Zits:", mZits.Count, kZitsPerLevel), top, kLeftDisplayEdge, kDisplaysWidth, Color.Blue);
            top += kTitleHeight;
            DrawTextCentered(mDisplayFont, string.Format("{0} of {1}", mZits.Count, kZitsPerLevel), top, kLeftDisplayEdge, kDisplaysWidth, Color.Blue);
            top += kLineHeight;

            const int kMillisPerSecond = 1000;
            double zitSpawnRemaining = Math.Max(0, ZitSpawnInterval() - mSinceLastSpawn) / kMillisPerSecond;

            DrawTextCentered(mDisplayTitleFont, string.Format("Spawn In:", mZits.Count, kZitsPerLevel), top, kLeftDisplayEdge, kDisplaysWidth, Color.Blue);
            top += kTitleHeight;
            DrawTextCentered(mDisplayFont, mZits.Count < kZitsPerLevel ? string.Format("{0:0.0} sec", zitSpawnRemaining) : "----", top, kLeftDisplayEdge, kDisplaysWidth, Color.Blue);
            top += kLineHeight;

            DrawTextCentered(mDisplayTitleFont, string.Format("Home:", mZits.Count, kZitsPerLevel), top, kLeftDisplayEdge, kDisplaysWidth, Color.Blue);
            top += kTitleHeight;
            DrawTextCentered(mDisplayFont, ZitHomeCount().ToString(), top, kLeftDisplayEdge, kDisplaysWidth, Color.Blue);
            top += kLineHeight;

            top = kRightDisplayTop;
            DrawTextCentered(mDisplayTitleFont, string.Format("Score:", mZits.Count, kZitsPerLevel), top, kRightDisplayEdge, kDisplaysWidth, Color.Blue);
            top += kTitleHeight;
            DrawTextCentered(mScoreFont, (mScore + ZitHomeCount()).ToString(), top, kRightDisplayEdge, kDisplaysWidth, Color.Blue);
            top += kScoreHeight;
            DrawTextCentered(mDisplayFont, string.Format("Level {0}", mLevel), top, kRightDisplayEdge, kDisplaysWidth, Color.Blue);

            mSpriteBatch.End();

            base.Draw(gameTime);
        }

        private void DrawTextCentered(SpriteFont font, string text, int top, int left, int width, Color color)
        {
            left += (int)Math.Floor((width - font.MeasureString(text).X) / 2);
            mSpriteBatch.DrawString(font, text, new Vector2(left, top), color);
        }

        private int ZitHomeCount()
        {
            return mZits.Where(z => z.IsHome).Count();
        }
    }
}
