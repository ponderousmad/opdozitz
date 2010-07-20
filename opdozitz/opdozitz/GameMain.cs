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

        private GraphicsDeviceManager mGraphics;
        private SpriteBatch mSpriteBatch;
        private List<Zit> mZits = new List<Zit>();
        private List<TileColumn> mColumns = new List<TileColumn>();
        private Texture2D mBackground;
        private Texture2D mFrame;
        private Texture2D mSelectColumn;

        private int mSelectedColumn = 1;

        private KeyboardState mLastKeyboardState = new KeyboardState();

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
            Window.Title = "Opdozitz - Reddit Game Jam 02";

            base.Initialize();

            LoadLevel(1);
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
                mZits.Add(new Zit(mColumns[0],mColumns[0][1]));
            }
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

            if (IsKeyPress(keyboardState, Keys.Up))
            {
                if (CanMoveColumn(mSelectedColumn))
                {
                    mColumns[mSelectedColumn].MoveUp();
                }
            }
            else if (IsKeyPress(keyboardState, Keys.Down))
            {
                if (CanMoveColumn(mSelectedColumn))
                {
                    mColumns[mSelectedColumn].MoveDown();
                }
            }

            if (IsKeyPress(keyboardState, Keys.Left))
            {
                for (int column = mSelectedColumn-1; column > 0; --column)
                {
                    if (CanMoveColumn(column))
                    {
                        mSelectedColumn = column;
                        break;
                    }
                }
            }
            else if (IsKeyPress(keyboardState, Keys.Right))
            {
                for (int column = mSelectedColumn + 1; column < mColumns.Count; ++column)
                {
                    if (CanMoveColumn(column))
                    {
                        mSelectedColumn = column;
                        break;
                    }
                }
            }


            foreach (Zit zit in mZits)
            {
                zit.Update(gameTime, mColumns);
            }

            foreach (TileColumn column in mColumns)
            {
                column.Update(gameTime);
            }

            mLastKeyboardState = keyboardState;
            base.Update(gameTime);
        }

        private bool CanMoveColumn(int column)
        {
            if (mColumns[column].Locked || mColumns[column].Moving)
            {
                return false;
            }
            foreach (Zit zit in mZits)
            {
                if (zit.IsAlive&& zit.CurrentColumn == mColumns[column])
                {
                    return false;
                }
            }
            return true;
        }

        private bool IsKeyPress(KeyboardState keyboardState, Keys key)
        {
            return keyboardState.IsKeyDown(key) && !mLastKeyboardState.IsKeyDown(key);
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
            mSpriteBatch.Draw(mSelectColumn, new Rectangle(mColumns[mSelectedColumn].Left - TileDrawOffset, mColumns[mSelectedColumn].Top + TileSize / 2 - TileDrawOffset, mSelectColumn.Width, mSelectColumn.Height), Color.White);
            mSpriteBatch.End();

            base.Draw(gameTime);
        }
    }
}
