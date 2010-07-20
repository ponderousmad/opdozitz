using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Diagnostics;
using Microsoft.Xna.Framework;

namespace Opdozitz.Geom
{
    public static class Line
    {
        private const float kColinearTolerance = 1e-5f;

        public static bool PPIntersects(Vector2 start1, Vector2 end1, Vector2 start2, Vector2 end2)
        {
            return PDIntersects(start1, end1 - start1, start2, end2 - start2);
        }

        public static bool PDIntersects(Vector2 start1, Vector2 d1, Vector2 start2, Vector2 d2)
        {
            if (CheckAligned(d1, d2, kColinearTolerance))
            {
                Vector2 between = start1 - start2;
                return CheckAligned(d1, between, kColinearTolerance);
            }
            return true;
        }

        public static bool IntersectPP(Vector2 start1, Vector2 end1, Vector2 start2, Vector2 end2, out Vector2 intersection)
        {
            return IntersectPD(start1, end1 - start1, start2, end2 - start2, out intersection);
        }

        public static bool IntersectPD(Vector2 start1, Vector2 d1, Vector2 start2, Vector2 d2, out Vector2 intersection)
        {
            Vector2 between = start1 - start2;

            float denom = Determinant(d1, d2);
            if (TolEqual(denom, 0, kColinearTolerance))
            {
                intersection = start1;
                return CheckAligned(d1, between, kColinearTolerance);
            }

            float t1 = Determinant(d2, between) / denom;
            intersection = start1 + d1 * (float)t1;
            return true;
        }

        public static bool SegmentsPPIntersects(Vector2 start1, Vector2 end1, Vector2 start2, Vector2 end2)
        {
            return SegmentsPDIntersects(start1, end1 - start1, start2, end2 - start2);
        }

        public static bool SegmentsPDIntersects(Vector2 start1, Vector2 d1, Vector2 start2, Vector2 d2)
        {
            Vector2 between = start1 - start2;

            float denom = Determinant(d1, d2);

            if (denom == 0)
            {
                // Lines are parallel, can't intersect, but may overlap.
                if (!CheckAligned(d1, between, kColinearTolerance))
                {
                    return false;
                }

                // There is overlap if the start or end of segment 2 is in segment 1, or if segment 2 contains all of segment 1.
                return InSegmentPD(start1, d1, start2) || InSegmentPD(start1, d1, start2 + d2) || InSegmentPD(start2, d2, start1);
            }

            return InSegment(Determinant(d1, between) / denom) &&
                   InSegment(Determinant(d2, between) / denom);
        }

        private static bool InSegment(float parameter)
        {
            return (0 <= parameter && parameter <= 1);
        }

        public static bool InSegmentPD(Vector2 start, Vector2 direction, Vector2 point)
        {
            Vector2 diff = point - start;
            if (diff.X != 0)
            {
                return InSegment(diff.X / direction.X);
            }
            else if (diff.Y != 0)
            {
                return InSegment(diff.Y / direction.Y);
            }
            return false;
        }

        public static bool CheckAligned(Vector2 v1, Vector2 v2, float tolerance)
        {
            return TolEqual(Determinant(v1, v2), 0, tolerance);
        }

        public static bool TolEqual(double a, double b, double tol)
        {
            return Math.Abs(a - b) <= tol;
        }

        public static bool TolEqual(Vector2 a, Vector2 b, float tol)
        {
            return TolEqual(a.X, b.X, tol) && TolEqual(a.Y, b.Y, tol);
        }

        public static bool RelEqual(float a, float b, float tol)
        {
            tol *= Math.Max(Math.Abs(a), Math.Abs(b));
            return TolEqual(a, b, tol);
        }

        public static bool RelEqual(Vector2 a, Vector2 b, float tol)
        {
            tol *= Math.Max(Math.Max(Math.Abs(a.X), Math.Abs(b.X)), Math.Max(Math.Abs(a.Y), Math.Abs(b.Y)));
            return TolEqual(a.X, b.X, tol) && TolEqual(a.Y, b.Y, tol);
        }

        public static float Determinant(Vector2 v1, Vector2 v2)
        {
            return v1.X * v2.Y - v1.Y * v2.X;
        }

        public static double DeterminantP(Vector2 v1, Vector2 v2)
        {
            return DeterminantP(v1.X, v1.Y, v2.X, v2.Y);
        }

        public static double DeterminantP(double v1X, double v1Y, double v2X, double v2Y)
        {
            return v1X * v2Y - v1Y * v2X;
        }

        internal class TestIntersect
        {
            [Conditional("DEBUG")]
            internal static void Test()
            {
                int failCount = 0;
                const float kZeroTolerance = 1e-6f;
                const float kTestTolerance = 1e-2f;
                const float kMaxCoordinate = 100f;
                const int kTestCount = 1000;
                Random r = new Random();
                for (int i = 0; i < kTestCount; ++i)
                {
                    var origin = RandomP(r, kMaxCoordinate);
                    var dir = RandomV(r, 1);
                    var end = origin + dir * (kMaxCoordinate * (float)r.NextDouble());

                    var intersectionOffset = dir * (kMaxCoordinate * (float)r.NextDouble());
                    var intersection = origin + intersectionOffset;

                    var otherDir = RandomV(r, 1);
                    var between = intersectionOffset + otherDir * (kMaxCoordinate * (float)r.NextDouble());
                    var otherOrigin = origin + between;
                    var otherEnd = otherOrigin + otherDir * (kMaxCoordinate * (float)r.NextDouble());

                    if (TolEqual(dir, Vector2.Zero, kZeroTolerance) || TolEqual(otherDir, Vector2.Zero, kZeroTolerance))
                    {
                        continue;
                    }

                    Vector2 testIntersection;
                    bool colinear = false;
                    if (CheckAligned(dir, otherDir, kColinearTolerance))
                    {
                        colinear = CheckAligned(dir, between, kColinearTolerance);
                        if (colinear != PDIntersects(origin, dir, otherOrigin, otherDir))
                        {
                            ++failCount;
                            Log("PD intersection expected");
                            continue;
                        }
                        if (colinear)
                        {
                            if (!IntersectPD(origin, dir, otherOrigin, otherDir, out testIntersection))
                            {
                                ++failCount;
                                Log("PD intersection expected");
                                continue;
                            }

                            if (!TolEqual(testIntersection, origin, kTestTolerance))
                            {
                                ++failCount;
                                Log("PD intersection differs from expected");
                                continue;
                            }
                        }
                    }
                    else
                    {
                        if (!PDIntersects(origin, dir, otherOrigin, otherDir))
                        {
                            ++failCount;
                            Log("PD intersection expected");
                            continue;
                        }

                        if (!IntersectPD(origin, dir, otherOrigin, otherDir, out testIntersection))
                        {
                            ++failCount;
                            Log("PD intersection expected");
                            continue;
                        }

                        float det = Math.Abs(Determinant(dir, otherDir));
                        float tolerance = kTestTolerance;
                        while (det < kTestTolerance)
                        {
                            tolerance *= 10;
                            det *= 10;
                        }
                        tolerance *= Vector2.Distance(otherOrigin, origin);
                        if (!RelEqual(testIntersection, intersection, kTestTolerance))
                        {
                            ++failCount;
                            Log("PD intersection differs from expected");
                            continue;
                        }
                    }

                    if (CheckAligned(end - origin, otherEnd - otherOrigin, kColinearTolerance))
                    {
                        colinear = CheckAligned(end - origin, between, kColinearTolerance);
                        if (colinear != PPIntersects(origin, end, otherOrigin, otherEnd))
                        {
                            ++failCount;
                            Log("PP intersection expected");
                            continue;
                        }
                        if (colinear)
                        {
                            if (!IntersectPP(origin, end, otherOrigin, otherEnd, out testIntersection))
                            {
                                ++failCount;
                                Log("PP intersection expected");
                                continue;
                            }

                            if (!TolEqual(testIntersection, origin, kTestTolerance))
                            {
                                ++failCount;
                                Log("PP intersection differs from expected");
                                continue;
                            }
                        }
                    }
                    else
                    {
                        if (!PPIntersects(origin, end, otherOrigin, otherEnd))
                        {
                            ++failCount;
                            Log("PP intersection expected");
                            continue;
                        }

                        if (!IntersectPP(origin, end, otherOrigin, otherEnd, out testIntersection))
                        {
                            ++failCount;
                            Log("PP intersection expected");
                            continue;
                        }

                        float det = Math.Abs(Determinant(end - origin, otherEnd - otherOrigin));
                        float tolerance = kTestTolerance;
                        while (det < kTestTolerance)
                        {
                            tolerance *= 10;
                            det *= 10;
                        }
                        tolerance *= Math.Max(Vector2.Distance(otherOrigin, origin), Math.Max(Vector2.Distance(end, origin), Vector2.Distance(otherEnd, otherOrigin)));
                        if (!TolEqual(testIntersection, intersection, 2 * tolerance))
                        {
                            ++failCount;
                            Log("PP intersection differs from expected");
                            continue;
                        }
                    }
                }
                Log("Total failures: " + failCount.ToString());
            }

            private static void Log(string message)
            {
                System.Console.Out.WriteLine(message);
            }

            private static Vector2 RandomP(Random r, float scale)
            {
                return new Vector2(RandomCoordinate(r, scale), RandomCoordinate(r, scale));
            }

            private static Vector2 RandomV(Random r, float scale)
            {
                return new Vector2(RandomCoordinate(r, scale), RandomCoordinate(r, scale));
            }

            private static Vector2 RandomN(Random r, float scale)
            {
                var v = new Vector2(RandomCoordinate(r, scale), RandomCoordinate(r, scale));
                v.Normalize();
                return v;
            }

            private static float RandomCoordinate(Random r, float scale)
            {
                return scale * (float)r.NextDouble() * RandomSign(r);
            }

            private static int RandomSign(Random r)
            {
                return (r.Next(2) % 2 == 0 ? 1 : -1);
            }

            private static Vector2 P(float x, float y)
            {
                return new Vector2(x, y);
            }

            private static Vector2 D(float x, float y)
            {
                return new Vector2(x, y);
            }
        }
    }
}
