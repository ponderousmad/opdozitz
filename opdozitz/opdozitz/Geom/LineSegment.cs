using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Microsoft.Xna.Framework;

namespace Opdozitz.Geom
{
    class LineSegment
    {
        public readonly Vector2 Start;
        public readonly Vector2 End;

        public LineSegment(Vector2 start, Vector2 end)
        {
            Start = start;
            End = end;
        }

        public LineSegment(float startX, float startY, float endX, float endY)
        {
            Start = new Vector2(startX, startY);
            End = new Vector2(endX, endY);
        }

        public Vector2 Direction
        {
            get
            {
                Vector2 direction = End - Start;
                direction.Normalize();
                return direction;
            }
        }

        public Vector2 Normal
        {
            get
            {
                Vector2 dir = Direction;
                return new Vector2(-dir.Y, dir.X);
            }
        }

        public float Length
        {
            get { return Vector2.Distance(Start, End); }
        }

        public bool Intersects(LineSegment other)
        {
            return Line.SegmentPPIntersects(Start, End, other.Start, other.End);
        }

        public bool FindIntersection(LineSegment other, out Vector2 intersection)
        {
            return Line.IntersectSegmentPP(Start, End, other.Start, other.End, out intersection);
        }

        public bool Intersects(LineSegment other, float tolerance)
        {
            return Line.SegmentPPIntersects(Start, End, other.Start, other.End, tolerance);
        }

        public bool FindIntersection(LineSegment other, float tolerance, out Vector2 intersection)
        {
            return Line.IntersectSegmentPP(Start, End, other.Start, other.End, tolerance, out intersection);
        }

        public LineSegment ExtendAtStart(float length)
        {
            return new LineSegment(Start - Direction * length, End);
        }

        public LineSegment ExtendAtEnd(float length)
        {
            return new LineSegment(Start, End + Direction * length);
        }

        public LineSegment ExtendBoth(float length)
        {
            return new LineSegment(Start - Direction * length, End + Direction * length);
        }

        internal LineSegment Shift(Vector2 offset)
        {
            return new LineSegment(Start + offset, End + offset);
        }

        public override string ToString()
        {
            return "Start: " + Start.ToString() + ", End: " + End.ToString();
        }
    }
}
