using System;
using System.Collections.Generic;
using System.Linq;
using System.Xml.Linq;
using System.Text;
using Microsoft.Xna.Framework;

namespace Opdozitz.Utils
{
    public static class XLinqHelpers
    {
        public static Vector2 ReadVector2(this XElement e)
        {
            float x = DocumentWriter.AsFloat(e.Attribute("x").Value);
            float y = DocumentWriter.AsFloat(e.Attribute("y").Value);
            return new Vector2(x, y);
        }

        public static T Read<T>(this XElement e, string name)
        {
            return DocumentWriter.As<T>(e.Attribute(name).Value);
        }

        public static float ReadFloat(this XElement e, string name)
        {
            return DocumentWriter.AsFloat(e.Attribute(name).Value);
        }

        public static double ReadDouble(this XElement e, string name)
        {
            return DocumentWriter.AsDouble(e.Attribute(name).Value);
        }

        public static string Read(this XElement e, string name)
        {
            return e.Attribute(name).Value;
        }
    }
}
