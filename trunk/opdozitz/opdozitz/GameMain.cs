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

        private const double kBaseSpawnFrequency = 5000f;
        private const double kLevelSpawnFactor = 0.9f;
        private const double kLevelSpeedFactor = 1.2f;
        private const int kZitsPerLevel = 20;

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

        private int mSelectedColumn = 1;
        private int mSelectedTile = 0;
        private int mLevel = 0;
        private bool mEditing = false;

        private int mSinceLastSpawn = 0;

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

            LoadLevel(1);
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
            using (System.IO.Stream stream = Load("Levels", "Level" + number.ToString() + ".xml"))
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

        private void StoreLevel()
        {
            string path = System.IO.Path.Combine(ContentBuildPath, @"Levels\\Level" + mLevel.ToString() + ".xml");
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
        }

        private void CheckSpawn(GameTime gameTime)
        {
            mSinceLastSpawn += gameTime.ElapsedGameTime.Milliseconds;

            if (mZits.Count < kZitsPerLevel)
            {
                double spawnFrequency = Math.Pow(kLevelSpawnFactor, mLevel) * kBaseSpawnFrequency;
                if (mSinceLastSpawn > spawnFrequency)
                {
                    SpawnZit();
                }
            }
        }

        private void SpawnZit()
        {
            mZits.Add(new Zit(mColumns[0][1], (float)Math.Pow(kLevelSpeedFactor,mLevel)));
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

            if (IsKeyPress(keyboardState, Keys.Escape))
            {
                StartLevel(gameTime);
            }

            CheckSpawn(gameTime);

            foreach (Zit zit in mZits)
            {
                zit.Update(gameTime, mColumns);
                if (IsKeyPress(keyboardState, Keys.Space) && zit.IsAlive && zit.InColumn(CurrentColumn))
                {
                    zit.Die(gameTime);
                }
            }

            foreach (TileColumn column in mColumns)
            {
                column.Update(gameTime);
            }
        }

        private void UpdateEdit(KeyboardState keyboardState)
        {
            if (IsKeyPress(keyboardState, Keys.S) && IsControlDown(keyboardState))
            {
                StoreLevel();
            }
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
                CurrentTile.TogglePart(TileParts.Flat);
            }
            else if (IsKeyPress(keyboardState, Keys.D2))
            {
                CurrentTile.TogglePart(TileParts.SlantUp);
            }
            else if (IsKeyPress(keyboardState, Keys.D3))
            {
                CurrentTile.TogglePart(TileParts.SlantDown);
            }
            else if (IsKeyPress(keyboardState, Keys.D4))
            {
                CurrentTile.TogglePart(TileParts.SpikesUp);
            }
            else if (IsKeyPress(keyboardState, Keys.D5))
            {
                CurrentTile.TogglePart(TileParts.SpikesDown);
            }
            else if (IsKeyPress(keyboardState, Keys.D6))
            {
                CurrentTile.TogglePart(TileParts.TransitionTop);
            }
            else if (IsKeyPress(keyboardState, Keys.D7))
            {
                CurrentTile.TogglePart(TileParts.TransitionBottom);
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

        private static bool IsControlDown(KeyboardState keyboardState)
        {
            return keyboardState.IsKeyDown(Keys.RightControl) || keyboardState.IsKeyDown(Keys.LeftControl);
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
            mSpriteBatch.End();

            base.Draw(gameTime);
        }
    }
}
