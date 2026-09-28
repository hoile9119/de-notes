[← Spark](../index.md)

# Recipes

Runnable snippets rather than conceptual notes — small helpers lifted out of
production jobs and stripped down to something reusable.

- [HDFS Helper](hdfs.md) — a wrapper over the Hadoop `FileSystem` API
- [Impala Client](impala.md) — querying Impala from a Spark job
- [JSON Flattener](json.md) — flatten nested JSON, infer a schema from a string column
- [Nested XML with XSD](xml.md) — parsing deeply nested XML against a schema
- [Write Table](write.md) — partitioning, overwrite modes, compaction
- [Webhook Sender](webhook.md) — notifications out of a cluster job

For HDFS as a *storage layer*, see [Lakehouse](../../lakehouse/index.md);
the HDFS helper here is a PySpark wrapper over the FileSystem API.
