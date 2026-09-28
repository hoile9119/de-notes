# Data Engineering Notes

Working notes from building streaming and lakehouse systems in fintech — Flink and
Spark in production, Iceberg on object storage, and the platform work around them.

Written for my own recall first. Published because the good version of a note is
the one you had to make legible to someone else.

## Sections

| Section | What's in it |
|---|---|
| [Streaming](streaming/index.md) | Flink on Kubernetes, latency engineering, Kafka, Structured Streaming |
| [Spark](spark/index.md) | The engine — execution model, shuffle, memory, tuning. Batch *and* streaming. |
| [Lakehouse](lakehouse/index.md) | Storage, table formats, catalogs, query engines |
| [Databricks](databricks/index.md) | Notes from the Data Engineer Professional certification track |
| [Architecture](architecture/index.md) | Patterns, feature stores, MLOps |
| [Platform](platform/index.md) | Containers, Kubernetes, local LLMs, MCP servers |
| [Tools](tools/index.md) | A spark-submit command generator |
| [About](about.md) | Who writes this |

## Start here

- [Table Formats](lakehouse/table-formats.md) — Iceberg internals end to end
- [PySpark Function Reference](spark/pyspark-functions.md) — the built-ins that replace a UDF
- [Spark Submit Generator](tools/spark-submit-generator/index.html) — build a command from a form
