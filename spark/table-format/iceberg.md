# Apache Iceberg Guide

## Tables of Contents

### Architecture
1. The definition of table format
2. The Hive table format, including pros and cons
3. How Apache Iceberg was created as the result of Hive cons

## Architecture

### **The definition of table format**
**1. What's a Table format?**
- Table format is a way to organize a dataset’s files to present them as a single abstraction “table”

**2. A Brief History**
- Hadoop had shortcomings that Facebook needed to address: (1) Users needed to write MapReduce with Java implementation to use data. 
(2) There was no metadata defining information about the datasets, like its schema
- To address (1), they built Hive SQL to take a user's SQL ( more general purpose programming model ) and translate it into MapReduce jobs
- To address (1) & (2), the need to define what dataset's schema was and how to refer to that as a table in users's SQL query.
To solve these, [Hive table format](https://www.vldb.org/pvldb/vol2/vldb09-938.pdf) was define 

**3. The Hive Table format**