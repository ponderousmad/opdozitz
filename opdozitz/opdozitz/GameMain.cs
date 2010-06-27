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
        public const int GirderWidth = 5;

        private GraphicsDeviceManager mGraphics;
        private SpriteBatch mSpriteBatch;
        private Zit mZit;
        private List<TileColumn> mColumns = new List<TileColumn>();


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
            mZit = new Zit();

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
            mZit.LoadContent(Content);
            Tile.LoadContent(Content);

            // TODO: use this.Content to load your game content here
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

        private System.IO.Stream Load(string resource)
        {
            return GetType().Assembly.GetManifestResourceStream(resource);
        }

        private void LoadLevel(int number)
        {
            using (System.IO.Stream stream = Load("Opdozitz.Content.Levels.Level" + number.ToString() + ".xml"))
            using (System.IO.TextReader reader = new System.IO.StreamReader(stream))
            {
                int columnLocation = 0;
                int columnTop = 0;
                mColumns.Clear();
                XDocument doc = System.Xml.Linq.XDocument.Load(reader);
                XElement root = doc.Elements("Level").First();
                foreach (XElement e in root.Elements("Column"))
                {
                    mColumns.Add(new TileColumn(columnLocation, columnTop));
                    foreach (XElement t in e.Elements("Tile"))
                    {
                        mColumns.Last().Add(new Tile(t.Read<TileType>("type")));
                    }
                    columnLocation += TileSize;
                }
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

            mZit.Update(gameTime);

            base.Update(gameTime);
        }

        /// <summary>
        /// This is called when the game should draw itself.
        /// </summary>
        /// <param name="gameTime">Provides a snapshot of timing values.</param>
        protected override void Draw(GameTime gameTime)
        {
            GraphicsDevice.Clear(Color.CornflowerBlue);

            mSpriteBatch.Begin();
            mZit.Draw(mSpriteBatch);
            foreach (TileColumn column in mColumns)
            {
                column.Draw(mSpriteBatch);
            }
            mSpriteBatch.End();
            // TODO: Add your drawing code here

            base.Draw(gameTime);
        }
    }
}
