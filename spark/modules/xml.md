# Parsing Nested XML using XML schema definition (XSD)
## Table of Contents
1. [Extract a Spark DataFrame Schema from an XSD file (using scala via spark-shell)](#extract-a-spark-dataframe-schema-from-xsd-file-scala)
2. [Parsing Nested XML using `schema_of_xml` and `from_xml`](#parsing-nested-xml)
3. [Third Example](#third-example)
4. [Fourth Example](#fourth-examplehttpwwwfourthexamplecom)


## Introduction
- Use `spark-xml` for processing XML data source for Apache Spark 3.x
- [spark-xml](https://github.com/databricks/spark-xml/tree/master) is a library for parsing and querying XML data with Apache Spark, for Spark SQL and DataFrames
- Currently, `spark-xml` is planned to become a part of Apache Spark 4.0

## Categories
  - Although primarily used to convert (portions of) large XML documents into a DataFrame, `spark-xml` can also parse XML in a string-valued column in an existing `DataFrame` with `from_xml`, in order to add it as a new column with parsed results as a struct.

## Prequisites
- Python 3.9.*
- Apache Spark 3.x (In this guide, Spark 3.3.0)
- Scala 2.12 or 2.13 (if using Scala)
- Java 8 or later

## Using with Spark shell
- Using with spark shell 
```bash
spark-shell --packages com.databricks:spark-xml_2.12:0.16.0 
```
- Using with pyspark shell
```bash
pyspark --packages com.databricks:spark-xml_2.12:0.16.0
```

## Extract a Spark DataFrame Schema from XSD file (Scala)
```bash
# launching spark-shell with spark-xml
spark-shell --packages com.databricks:spark-xml_2.12:0.16.0 
```

```scala
import com.databricks.spark.xml.util.XSDToSchema
import java.nio.file.{Files, Paths}

val xsdString = """<?xml version="1.0" encoding="UTF-8" ?>
  <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
    <xs:element name="book">
      <xs:complexType>
        <xs:sequence>
          <xs:element name="author" type="xs:string" />
          <xs:element name="title" type="xs:string" />
          <xs:element name="genre" type="xs:string" />
          <xs:element name="price" type="xs:decimal" />
          <xs:element name="publish_date" type="xs:date" />
          <xs:element name="description" type="xs:string" />
        </xs:sequence>
        <xs:attribute name="id" type="xs:string" use="required" />
      </xs:complexType>
    </xs:element>
  </xs:schema>"""

// extract schema from XSD string
val schemaFromString = XSDToSchema.read(xsdString)

// extract schema from XSD file
val tempXsdFile = Files.createTempFile("tempXsdFile", ".xsd")
Files.write(tempXsdFile, xsdString.getBytes)

val schemaFromFile = XSDToSchema.read(tempXsdFile)
// val schemaFromFile = XSDToSchema.read(Paths.get("path_to_xsd_file.xsd"))
```
## Parsing Nested XML
2. Pyspark notes

```python
from pyspark.sql.column import Column, _to_java_column
from pyspark.sql.types import _parse_datatype_json_string

def ext_from_xml(xml_column, schema, options={}):
    java_column = _to_java_column(xml_column.cast('string'))
    java_schema = spark._jsparkSession.parseDataType(schema.json())
    scala_map = spark._jvm.org.apache.spark.api.python.PythonUtils.toScalaMap(options)
    jc = spark._jvm.com.databricks.spark.xml.functions.from_xml(
        java_column, java_schema, scala_map)
    return Column(jc)

def ext_schema_of_xml_df(df, options={}):
    assert len(df.columns) == 1

    scala_options = spark._jvm.PythonUtils.toScalaMap(options)
    java_xml_module = getattr(getattr(
        spark._jvm.com.databricks.spark.xml, "package$"), "MODULE$")
    java_schema = java_xml_module.schema_of_xml_df(df._jdf, scala_options)
    return _parse_datatype_json_string(java_schema.json())
    
```
