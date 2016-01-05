/*
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

        enum Instruction
        {
            Start,
            LevelPassed,
            LevelFailed,
            Congratulations
        }

        private const double kBaseSpawnInterval = 3000;
        private const double kMinSpawnInterval = 400;
        private const double kLevelSpawnFactor = 0.97;
        private const float kLevelSpeedFactor = 0.05f;
        private const double kSpawnRateFactorRatio = 0.8;
        private const int kMaxSpawnRateFactor = 10;
        private const int kLevelDelayIncrement = 500;
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
        private Dictionary<Instruction, Texture2D> mInstructions = new Dictionary<Instruction, Texture2D>();

        private SpriteFont mDisplayFont;
        private SpriteFont mDisplayTitleFont;
        private SpriteFont mScoreFont;

        private int mSelectedColumn = 1;
        private int mSelectedTile = 0;
        private int mLevel = 0;
        private List<int> mLevelScores = new List<int>();
        private bool mEditing = false;
        private bool mEdited = false;
        private Instruction? mInstruction = Instruction.Start;
        private bool mZoom = false;

        private bool mColumnsMoveZits = true;

        private int mSinceLastSpawn = 0;
        private int mSpawnRateFactor = 0;
        private int mLevelStartDelay = 0;

        private KeyboardState mLastKeyboardState = new KeyboardState();

        public static Texture2D Pixel
        {
            get { return sPixel; }
        }

        public GameMain()
        {
            mGraphics = new GraphicsDeviceManager(this);
            Content.RootDirectory = "Content";

            for (int i = 0; i <= kMaxLevel; ++i)
            {
                mLevelScores.Add(0);
            }
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

        [System.Diagnostics.Conditional("DEBUG")]
        private void OrderLevels()
        {
            List<Level> levels = new List<Level>();
            for (int i = kMinLevel; i <= kMaxLevel; ++i)
            {
                Level level = new Level();
                level.LoadLevel(i);
                levels.Add(level);
            }
            List<Level> oldOrder = new List<Level>(levels);
            levels.Sort((System.Comparison<Level>)delegate(Level a, Level b)
            {
                if (a.StartDelay != b.StartDelay)
                {
                    return a.StartDelay - b.StartDelay;
                }
                return oldOrder.IndexOf(a) - oldOrder.IndexOf(b);
            });
            for (int i = 0; i < levels.Count; ++i)
            {
                Level level = levels[i];
                if (oldOrder.IndexOf(level) != i)
                {
                    StoreLevel(i + 1, level.StartDelay, level.Columns);
                }
            }
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

            mInstructions[Instruction.Start] = Content.Load<Texture2D>("Images/Instructions");
            mInstructions[Instruction.LevelFailed] = Content.Load<Texture2D>("Images/LevelFailedInstruction");
            mInstructions[Instruction.LevelPassed] = Content.Load<Texture2D>("Images/LevelPassedInstruction");
            mInstructions[Instruction.Congratulations] = Content.Load<Texture2D>("Images/Congratulations");

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

        private static System.IO.Stream Load(string location, string resource)
        {
#if DEBUG
            return new System.IO.FileStream(System.IO.Path.Combine(System.IO.Path.Combine(ContentBuildPath, location), resource), System.IO.FileMode.Open, System.IO.FileAccess.Read);
#else
            return typeof(GameMain).Assembly.GetManifestResourceStream("Opdozitz.Content." + location + "." + resource);
#endif
        }

        private void LoadLevel(int number)
        {
            mLevel = number;
            Level level = new Level();
            level.LoadLevel(number);
            mLevelStartDelay = level.StartDelay;
            mColumns = new List<TileColumn>(level.Columns);
        }

        private class Level
        {
            private int mLevelStartDelay = 0;
            private List<TileColumn> mColumns = new List<TileColumn>();

            public int StartDelay { get { return mLevelStartDelay; } }
            public IEnumerable<TileColumn> Columns { get { return mColumns; } }

            public void LoadLevel(int number)
            {
                using (System.IO.Stream stream = Load("Levels", LevelName(number)))
                using (System.IO.TextReader reader = new System.IO.StreamReader(stream))
                {
                    int columnLocation = ColumnXOffset;
                    mColumns.Clear();
                    XDocument doc = System.Xml.Linq.XDocument.Load(reader);
                    XElement root = doc.Elements("Level").First();

                    mLevelStartDelay = ReadStartDelay(root);

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
        }

        private static int ReadStartDelay(XElement root)
        {
            XAttribute levelStartDelay = root.Attribute("startDelay");
            if (levelStartDelay != null)
            {
                int delay;
                if (int.TryParse(levelStartDelay.Value, out delay))
                {
                    return delay;
                }
            }
            return 0;
        }

        private static string LevelName(int number)
        {
            return string.Format("Level{0:00}.xml", number);
        }

        private void StoreLevel()
        {
            StoreLevel(mLevel, mLevelStartDelay, mColumns);
        }

        private static void StoreLevel(int number, int startDelay, IEnumerable<TileColumn> columns)
        {
            string path = System.IO.Path.Combine(System.IO.Path.Combine(ContentBuildPath, "Levels"), LevelName(number));
            using (Utils.DocumentWriter writer = new Opdozitz.Utils.DocumentWriter(path))
            using (Utils.IDataWriter root = writer["Level"])
            {
                root.Attribute("startDelay", startDelay.ToString());
                foreach (TileColumn column in columns)
                {
                    column.Store(root);
                }
            }
        }

        private void StartLevel(GameTime gameTime)
        {
            mZits.Clear();
            mSinceLastSpawn = 0;
            mSpawnRateFactor = 0;
            mZoom = false;
        }

        private void StartLevel(int level, GameTime gameTime)
        {
            mSelectedColumn = 1;
            LoadLevel(level);
            StartLevel(gameTime);
        }

        private void ResetLevel(GameTime gameTime, bool reloadTiles)
        {
            if (reloadTiles)
            {
                LoadLevel(mLevel);
            }
            mSelectedColumn = 1;
            StartLevel(gameTime);
        }

        private void CheckSpawn(GameTime gameTime)
        {
            mSinceLastSpawn += gameTime.ElapsedGameTime.Milliseconds;

            if (mZits.Count < kZitsPerLevel)
            {
                if (mSinceLastSpawn > (mZoom ? kMinSpawnInterval : ZitSpawnInterval()))
                {
                    SpawnZit();
                }
            }
        }

        private double ZitSpawnInterval()
        {
            if (mZits.Count == 0 && mLevelStartDelay > 0)
            {
                return mLevelStartDelay;
            }
            return Math.Max(kMinSpawnInterval, Math.Pow(kLevelSpawnFactor, mLevel - 1) * kBaseSpawnInterval * Math.Pow(kSpawnRateFactorRatio, mSpawnRateFactor));
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

            if (mInstruction != null)
            {
                keyboardState = UpdateInstruction(gameTime, keyboardState);
            }
            else
            {
                UpdateSelectedColumn(keyboardState);
#if DEBUG
                if (IsKeyPress(keyboardState, Keys.E) && IsControlDown(keyboardState))
                {
                    if (!mEditing)
                    {
                        int oldColumn = mSelectedColumn;
                        ResetLevel(gameTime, !IsShiftDown(keyboardState));
                        mSelectedColumn = oldColumn;
                    }
                    if (mEditing && mEdited)
                    {
                        mEdited = false;
                        StoreLevel();
                    }
                    mEditing = !mEditing;
                }
#endif

                if (mEditing)
                {
                    UpdateEdit(keyboardState);
                }
                else
                {
                    UpdateGameplay(gameTime, keyboardState);
                }
            }

            mLastKeyboardState = keyboardState;
            base.Update(gameTime);
        }

        private KeyboardState UpdateInstruction(GameTime gameTime, KeyboardState keyboardState)
        {
            if (keyboardState.GetPressedKeys().Length != 0)
            {
                if (mInstruction != Instruction.Start)
                {
                    if (!CheckSwitchLevel(gameTime, keyboardState))
                    {
                        if (mInstruction == Instruction.LevelFailed)
                        {
                            ResetLevel(gameTime, true);
                        }
                        else if (mInstruction == Instruction.LevelPassed)
                        {
                            StartLevel(mLevel + 1, gameTime);
                        }
                        else if (mInstruction == Instruction.Congratulations)
                        {
                            StartLevel(kMinLevel, gameTime);
                        }
                    }
                }

                mInstruction = null;
            }
            return keyboardState;
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

            if (IsKeyPress(keyboardState, Keys.Escape))
            {
                bool keepTiles = false;
#if DEBUG
                keepTiles = IsShiftDown(keyboardState);
#endif
                ResetLevel(gameTime, !keepTiles);
            }

            if (IsKeyPress(keyboardState, Keys.Space))
            {
                mZoom = !mZoom;
            }
            for (int reps = mZoom ? 4 : 1; reps > 0; --reps)
            {
                CheckSpawn(gameTime);

                TileColumn[] columns = (mColumnsMoveZits ? mColumns : mColumns.Where(c => !c.Moving)).ToArray();

                foreach (Zit zit in mZits)
                {
                    zit.Update(gameTime, columns);
                }
            }

            foreach (TileColumn column in mColumns)
            {
                int delta = column.Update(gameTime);
                if (mColumnsMoveZits && delta != 0)
                {
                    foreach (Zit zit in mZits)
                    {
                        if (zit.ContactTile != null && zit.ContactTile.Left == column.Left)
                        {
                            zit.ShiftBy(delta);
                        }
                    }
                }
            }

            if (LevelDone())
            {
                if(ZitHomeCount() >= (kZitsPerLevel / 2))
                {
                    mLevelScores[mLevel] = Math.Max(ZitHomeCount(), mLevelScores[mLevel]);
                    mInstruction = mLevel == kMaxLevel ? Instruction.Congratulations : Instruction.LevelPassed;
                }
                else
                {
                    mInstruction = Instruction.LevelFailed;
                }
            }

            CheckSwitchLevel(gameTime, keyboardState);
        }

        private bool CheckSwitchLevel(GameTime gameTime, KeyboardState keyboardState)
        {
            if (mLevel < kMaxLevel && IsKeyPress(keyboardState, Keys.N))
            {
                StartLevel(mLevel + 1, gameTime);
                return true;
            }
            if (mLevel > kMinLevel && IsKeyPress(keyboardState, Keys.P))
            {
                StartLevel(mLevel - 1, gameTime);
                return true;
            }
            return false;
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
            else if (IsKeyPress(keyboardState, Keys.OemPeriod))
            {
                mLevelStartDelay += kLevelDelayIncrement;
                mEdited = true;
            }
            else if (IsKeyPress(keyboardState, Keys.OemComma))
            {
                mLevelStartDelay = Math.Max(0, mLevelStartDelay - kLevelDelayIncrement);
                mEdited = true;
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
            if (!mColumnsMoveZits)
            {
                foreach (Zit zit in mZits)
                {
                    if (zit.IsAlive && zit.InColumn(column))
                    {
                        return false;
                    }
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
            DrawTextCentered(mScoreFont, CurrentScore().ToString(), top, kRightDisplayEdge, kDisplaysWidth, Color.Blue);
            top += kScoreHeight;
            DrawTextCentered(mDisplayFont, string.Format("Level {0}", mLevel), top, kRightDisplayEdge, kDisplaysWidth, Color.Blue);

            if (mInstruction != null)
            {
                mSpriteBatch.Draw(mInstructions[mInstruction.Value], new Rectangle(0, 0, Window.ClientBounds.Width, Window.ClientBounds.Height), Color.White);
            }

            mSpriteBatch.End();

            base.Draw(gameTime);
        }

        private int CurrentScore()
        {
            return mLevelScores.Sum() - mLevelScores[mLevel] + ZitHomeCount();
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
*/

(function () {
    "use strict";
    
    window.onload = function(e) {
        console.log("window.onload", e, Date.now());
        var canvas = document.getElementById("canvas"),
            context = canvas.getContext("2d"),
            imageBatch = new ImageBatch("images/"),
            frame = imageBatch.load("Frame.png");
        
        imageBatch.commit();

        function draw() {
            requestAnimationFrame(draw);
            context.fillStyle = "black";
            context.fillRect(0, 0, canvas.width, canvas.height);
            if(imageBatch.loaded) {
                context.drawImage(frame, 0, 0);
            }
        }
        
        draw();
    };
}());
