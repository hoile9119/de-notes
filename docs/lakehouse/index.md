[← Home](../index.md)

# Lakehouse

A lakehouse is best understood as four independent layers. Swapping any one of
them shouldn't require rewriting the others — that separation *is* the point.

| Layer | Job | Examples |
|---|---|---|
| **Storage** | Durable bytes | S3, HDFS |
| **Table format** | Files → a table with snapshots, schema, ACID commits | Iceberg, Delta |
| **Catalog** | Names → tables, and atomic pointer swaps | Glue, Lakekeeper, REST catalog, HMS |
| **Compute** | Reading and writing the table | Trino, Spark |

Engine internals live in [Spark](../spark/index.md) rather than being
restated here.

## In this section

- [Table Formats](table-formats.md) — Iceberg internals,
  the commit protocol, CoW vs MoR, and where Delta stands

## Planned

- **Storage** — object-store semantics, and how they differ from HDFS
- **Catalogs** — Glue, Lakekeeper, the REST catalog spec, migrating off Hive Metastore
- **Engines** — Trino and Spark against the same tables
