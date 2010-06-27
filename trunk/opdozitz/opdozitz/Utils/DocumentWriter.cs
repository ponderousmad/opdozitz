using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Xml;

namespace Opdozitz.Utils
{
    public interface IWriter
    {
        IDataWriter this[string elementName]
        {
            get;
        }
    }

    public interface IDataWriter : IWriter, IDisposable
    {
        void Attribute(string name, string value);
        void BoolAttribute(string name, bool value, bool defaultValue);
        void Write(string content);
    }

    public class DocumentWriter : IDisposable, IWriter
    {
        public static System.Globalization.NumberFormatInfo InvariantNumberFormat
        {
            get
            {
                return System.Globalization.CultureInfo.InvariantCulture.NumberFormat;
            }
        }

        public static string AsString(float value)
        {
            return value.ToString(InvariantNumberFormat);
        }

        public static string AsString(double value)
        {
            return value.ToString(InvariantNumberFormat);
        }

        public static float AsFloat(string value)
        {
            return float.Parse(value, InvariantNumberFormat);
        }

        public static double AsDouble(string value)
        {
            return double.Parse(value, InvariantNumberFormat);
        }

        public static T As<T>(string value)
        {
            return (T)System.Enum.Parse(typeof(T), value, true);
        }

        public static void WriteVector(IDataWriter element, Microsoft.Xna.Framework.Vector2 value)
        {
            element.Attribute("x", DocumentWriter.AsString(value.X));
            element.Attribute("y", DocumentWriter.AsString(value.Y));
        }

        public static XmlWriterSettings DefaultSettings
        {
            get
            {
                XmlWriterSettings settings = new XmlWriterSettings();
                settings.Indent = true;
                settings.CloseOutput = true;
                return settings;
            }
        }

        private class ElementWriter : IDisposable, IDataWriter
        {
            XmlWriter mWriter;

            public ElementWriter(XmlWriter writer, string elementName)
            {
                mWriter = writer;
                writer.WriteStartElement(elementName);
            }

            ~ElementWriter()
            {
                if (mWriter != null)
                {
                    throw new Exception("ElementWriter not disposed");
                }
            }

            #region IDisposable Members

            public void Dispose()
            {
                mWriter.WriteEndElement();
                mWriter = null;
            }

            #endregion

            #region IWriter Members

            public IDataWriter this[string elementName]
            {
                get
                {
                    return new ElementWriter(mWriter, elementName);
                }
            }

            public void Attribute(string name, string value)
            {
                mWriter.WriteAttributeString(name, value);
            }

            public void BoolAttribute(string name, bool value, bool defaultValue)
            {
                if (value != defaultValue)
                {
                    Attribute(name, value.ToString());
                }
            }

            public void Write(string content)
            {
                mWriter.WriteValue(content);
            }

            #endregion
        }

        private XmlWriter mWriter;

        public DocumentWriter(XmlWriter writer)
        {
            mWriter = writer;
            mWriter.WriteStartDocument(true);
        }

        public DocumentWriter(string path)
            : this(XmlWriter.Create(path, DefaultSettings))
        {
        }

        ~DocumentWriter()
        {
            if (mWriter != null)
            {
                throw new Exception("DataWriter not disposed");
            }
        }

        #region IDisposable Members

        public void Dispose()
        {
            mWriter.WriteEndDocument();
            mWriter.Flush();
            mWriter.Close();
            mWriter = null;
        }

        #endregion

        #region IWriter Members

        public IDataWriter this[string elementName]
        {
            get
            {
                return new ElementWriter(mWriter, elementName);
            }
        }

        #endregion
    }
}
