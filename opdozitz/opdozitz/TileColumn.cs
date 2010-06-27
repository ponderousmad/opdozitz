using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Opdozitz
{
    class TileColumn
    {
        List<Tile> mTiles = new List<Tile>();

        internal void Add(Tile tile)
        {
            mTiles.Add(tile);
        }
    }
}
