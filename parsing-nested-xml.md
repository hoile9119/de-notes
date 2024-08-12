# Parsing Nested XML using XML schema definition (XSD)
## Introduction
- Use `spark-xml` for processing XML data source for Apache Spark 3.x
- [spark-xml](https://github.com/databricks/spark-xml/tree/master) is a library for parsing and querying XML data with Apache Spark, for Spark SQL and DataFrames
- Currently, `spark-xml` is planned to become a part of Apache Spark 4.0

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

