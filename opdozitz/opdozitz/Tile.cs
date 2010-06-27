using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Opdozitz
{
    enum TileType
    {
        Empty,
        Flat,
        SlopeUp,
        SlopeDown,
        Spikes
    }

    class Tile
    {
        private TileType mType = TileType.Empty;

        public Tile(TileType type)
        {
            mType = type;
        }

        public TileType Type
        {
            get { return mType; }
        }
    }
}
