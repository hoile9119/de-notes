[← Streaming](../index.md)

# Spark Structured Streaming

Spark Structured Streaming is built on the Spark SQL engine which runs a **streaming query** as a series of small batch job.

## How to read this section

Start with the [Summary](summary.md) for the whole picture on one page: the
result table, triggers, output modes, watermarks, Hive and Iceberg sinks, and
the official programming guide. Then go deeper into each component through the
concept pages, in this order — one per stage a record passes through.

1. [Micro-batch Execution and Triggers](concepts/micro-batch-execution-and-triggers.md)
   — the batch lifecycle, trigger types, what short and long triggers cost, and
   how to monitor a query.
2. [Kafka Source and Checkpoints](concepts/kafka-source-and-checkpoints.md) —
   reading Kafka, why offsets live in the checkpoint, rate limits, the
   checkpoint folder, and which code changes a checkpoint survives.
3. [Event Time and Watermarks](concepts/event-time-and-watermarks.md) —
   windows, one global watermark per query, late data, and time zones.
4. [Stateful Operations and the State Store](concepts/stateful-operations-and-state-store.md)
   — aggregations, deduplication, stream–stream joins, arbitrary state, and the
   RocksDB state store.
5. [Output Modes, Sinks and Exactly-once](concepts/output-modes-and-sinks.md) —
   append, update and complete; `foreachBatch`; idempotent and transactional
   sinks.

For how a Confluent Avro message is decoded in Spark, see
[Avro and Schema Registry](../kafka/avro-and-schema-registry.md#decoding-in-spark).

---

## Spark and Flink at a glance

| | **Spark Structured Streaming** | **Apache Flink** |
|---|---|---|
| Execution | Micro-batches, planned by the driver one after another | Long-running operators; each record flows through as it arrives |
| Latency floor | The batch duration — sub-second at best | Milliseconds |
| Source position | Offset ranges in the query's **checkpoint** | Offsets in Flink **checkpoints** |
| Watermark | **One per query**, computed on the driver between batches | Per source partition, combined per operator; idleness supported |
| State | State store per operator, versioned per batch, saved in the checkpoint | Keyed state in a state backend, snapshotted by checkpoint barriers |
| Exactly-once output | Replayable source + deterministic batch replay + idempotent or transactional sink | Checkpoint-aligned two-phase commit, or idempotent upserts |
| Upgrades | Restart from the same checkpoint; only some query changes are allowed | Savepoints; state compatibility rules |

The Flink side is covered in [Apache Flink](../apache-flink/index.md).

---

## A typical deployment

The setup the concept pages assume, where it matters:

| Aspect | Setup |
|---|---|
| Runtime | Kubernetes, one Spark Operator `SparkApplication` per streaming job, in cluster mode |
| Scheduling | The YuniKorn batch scheduler, with a queue for streaming jobs |
| Triggers | Processing-time triggers, from sub-second up to a few minutes, depending on the job |
| Input caps | Kafka jobs cap each batch with `maxOffsetsPerTrigger` |
| Checkpoints | S3-compatible object storage, one folder per job |
| Event logs | Rolling event logs on S3, read by the Spark History Server |
| Sinks | Iceberg tables (a REST catalog, or a Hive catalog) and a Cassandra feature store |

---

## Monitoring

Open the application in the
[Spark History Server](https://archive.apache.org/dist/spark/docs/3.5.5/monitoring.html)
and use its **Structured Streaming** tab: input rate, processing rate, batch
duration and state per batch, for running and finished applications alike.

What the numbers on those pages mean — input versus processing rate, batch
duration, watermark, state rows — is explained in
[Micro-batch Execution and Triggers](concepts/micro-batch-execution-and-triggers.md).

---

## Where to start

| If you want to… | Start with |
|---|---|
| Get the whole picture before the details | [Summary](summary.md) |
| Choose an output mode, trigger and sink for a new job | [Summary](summary.md#choosing-a-combination) |
| Understand why a query cannot go below a certain latency | [Micro-batch Execution and Triggers](concepts/micro-batch-execution-and-triggers.md) |
| Tell whether a query is falling behind | [Micro-batch Execution and Triggers](concepts/micro-batch-execution-and-triggers.md) |
| Restart a job from the beginning of a topic | [Kafka Source and Checkpoints](concepts/kafka-source-and-checkpoints.md) |
| Know whether a code change can keep the existing checkpoint | [Kafka Source and Checkpoints](concepts/kafka-source-and-checkpoints.md) |
| Understand why late events are dropped from a window | [Event Time and Watermarks](concepts/event-time-and-watermarks.md) |
| Stop state from growing without bound | [Stateful Operations and the State Store](concepts/stateful-operations-and-state-store.md) |
| Avoid duplicate rows after a restart | [Output Modes, Sinks and Exactly-once](concepts/output-modes-and-sinks.md) |

---

## References

### Apache Spark

The official guide, latest version (Spark 4.x; these pages target 3.5.5):

- [Getting Started: Programming Model](https://spark.apache.org/docs/latest/streaming/getting-started.html#programming-model): the input table, result table, output modes, event time and fault tolerance.
- [APIs on DataFrames and Datasets](https://spark.apache.org/docs/latest/streaming/apis-on-dataframes-and-datasets.html): sources, operations, joins, state, starting, monitoring and recovering queries.
- [Performance Tips](https://spark.apache.org/docs/latest/streaming/performance-tips.html): asynchronous progress tracking and continuous processing.
- [Additional Information](https://spark.apache.org/docs/latest/streaming/additional-information.html): further reading and talks.

Pinned to 3.5.5:

- [Structured Streaming Programming Guide (3.5.5)](https://archive.apache.org/dist/spark/docs/3.5.5/structured-streaming-programming-guide.html) — the model, triggers, watermarks, output modes and sinks.
- [Structured Streaming + Kafka Integration Guide (3.5.5)](https://archive.apache.org/dist/spark/docs/3.5.5/structured-streaming-kafka-integration.html) — Kafka source and sink options.

### Related

- [Apache Flink](../apache-flink/index.md) — the other streaming engine in these notes.
- [Avro and Schema Registry](../kafka/avro-and-schema-registry.md) — the Confluent wire format and decoding it in Spark.
