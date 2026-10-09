[← Spark Structured Streaming](../index.md)

# Kafka Source and Checkpoints

**In Spark Structured Streaming the checkpoint, not Kafka, is the source of
truth for where a query is, and Spark's Kafka source does not commit offsets
to a consumer group at all.** Every micro-batch records the offset range it is
about to read in the checkpoint before it runs, and records that it finished
after it runs. On restart, Spark reads those two logs and continues from
there. Consumer-group offsets on the broker play no part, so lag tools that
read them show nothing useful. This page covers how to declare the Kafka
source in PySpark, which options control where and how fast it reads, what is
inside the checkpoint folder, which query changes a checkpoint survives, and
how to run checkpoints on object storage. It is written for Apache Spark
3.5.5. Features that exist only in Spark 4.x are marked as such.

!!! abstract "What you should know after reading this page"
    1. How to declare a Kafka source with **`readStream.format("kafka")`**, and
       which **columns** it produces.
    2. What **`startingOffsets`** does, and why it applies only when a query
       starts **without a checkpoint**.
    3. How **`maxOffsetsPerTrigger`** limits each micro-batch, and how to work
       out the throughput ceiling it sets.
    4. What **`failOnDataLoss`** protects against, and why the group id options
       do not make consumer-group lag tools useful.
    5. What the **`offsets/`** and **`commits/`** logs contain, in which order
       they are written, and how a restart uses them.
    6. Which **query changes** a checkpoint survives, and which ones need a new
       checkpoint.
    7. Why checkpoints on **S3-compatible storage** need care, and what the
       **abortable stream** checkpoint file manager changes.
    8. How to measure **lag** from query progress instead of from the consumer
       group.

---

## Declaring the source

A Kafka source is a streaming DataFrame. You name the brokers, choose which
topics to read, and call `load()`. The query starts only when a sink is
attached with `writeStream` and `start()`, and that is where the checkpoint
location is set.

```python
from pyspark.sql import SparkSession

spark = SparkSession.builder.appName("orders-enrichment").getOrCreate()

orders_raw = (
    spark.readStream
    .format("kafka")
    .option("kafka.bootstrap.servers", "broker:9092")
    .option("subscribe", "orders.created.v1")
    .option("startingOffsets", "earliest")
    .option("maxOffsetsPerTrigger", 1000)
    .option("includeHeaders", "true")
    .load()
)

query = (
    orders_raw
    .selectExpr("CAST(key AS STRING) AS order_key", "value", "partition", "offset")
    .writeStream
    .format("parquet")
    .option("path", "s3a://example-bucket/orders/created/")
    .option("checkpointLocation", "s3a://example-bucket/checkpoints/orders-enrichment/")
    .trigger(processingTime="1 second")
    .start()
)
```

The Kafka connector is not part of the core Spark distribution. The
application needs the `spark-sql-kafka-0-10` package on its classpath, built
for the same Scala and Spark version.

### Columns

Every row has the same fixed schema, whatever the topic contains.

| Column | Type | Meaning |
|---|---|---|
| `key` | binary | Record key, as bytes. |
| `value` | binary | Record value, as bytes. |
| `topic` | string | Topic the record came from. |
| `partition` | int | Partition number. |
| `offset` | long | Offset within the partition. |
| `timestamp` | timestamp | Kafka record timestamp. |
| `timestampType` | int | Kafka timestamp type: create time or log append time. |
| `headers` | array | Record headers. Present only with `includeHeaders` set to `true`. |

Keys and values are always read as bytes. Spark does not accept a Kafka
deserializer. You decode them with DataFrame operations: `CAST(value AS
STRING)` for text, `from_json` for JSON, `from_avro` for Avro.

!!! note "Avro values with Schema Registry"
    Confluent Avro values carry a 5-byte header, and a topic can hold several
    writer schemas. Spark's `from_avro` handles neither on its own. See
    [Avro and Schema Registry: Decoding in Spark](../../kafka/avro-and-schema-registry.md#decoding-in-spark).

---

## Choosing topics and where reading starts

### Which partitions

Set **exactly one** of these three options.

| Option | Value | Reads |
|---|---|---|
| `subscribe` | Comma-separated topics, such as `orders.created.v1,orders.updated.v1` | Every partition of the listed topics. |
| `subscribePattern` | A Java regular expression, such as `orders\..*` | Every partition of every topic that matches. |
| `assign` | JSON, such as `{"orders.created.v1":[0,1]}` | Only the listed partitions. |

Partitions that appear while the query runs, from new partitions or from new
topics matching a pattern, are read from their **earliest** offset.

### Where reading starts

`startingOffsets` chooses the first offset for each partition.

| Value | Starts at |
|---|---|
| `latest` | The end of each partition. **The default for streaming queries.** |
| `earliest` | The oldest offset Kafka still retains. |
| JSON, such as `{"orders.created.v1":{"0":23,"1":-2}}` | The given offset per partition. `-2` means earliest and `-1` means latest. |

Spark also accepts `startingTimestamp` and `startingOffsetsByTimestamp`, which
look up the first offset at or after an epoch-millisecond timestamp. They take
precedence over `startingOffsets` when set.

!!! warning "The streaming default is `latest`"
    A new query that sets no starting position begins at the end of each
    partition. Records already in the topic are never read. Set
    `startingOffsets` on purpose for every new query.

### First start versus restart

All starting options apply **only when a query starts with no checkpoint**. As
soon as the checkpoint location holds offsets, they win.

| Situation | Where each partition starts |
|---|---|
| First start, empty checkpoint location | `startingOffsets` (or the timestamp options). |
| Restart with the same checkpoint | Where the checkpoint says the query left off. |
| Restart with a new, empty checkpoint location | `startingOffsets` again. With `latest`, records produced while the query was down are **skipped**. |

!!! danger "Changing `startingOffsets` does not rewind a query"
    Switching to `earliest` and restarting with the same checkpoint does
    **not** replay the topic. To reprocess, start with a new checkpoint
    location, and accept that all state in the old checkpoint is left behind.

`endingOffsets`, `endingTimestamp` and `endingOffsetsByTimestamp` exist only
for **batch** queries (`spark.read.format("kafka")`). A streaming Kafka source
never ends.

---

## Rate limiting

Without a limit, each micro-batch reads everything available up to the latest
offsets. After a long stop, the first batch can therefore be enormous.
**`maxOffsetsPerTrigger`** caps the total number of offsets one micro-batch
reads, across all partitions together. The cap is split across partitions in
proportion to how much data each one has waiting, not evenly.

The cap sets a throughput ceiling:

```text
max records per second ≈ maxOffsetsPerTrigger / time per micro-batch
```

The time per micro-batch is the trigger interval, or the batch duration when a
batch takes longer than the interval. With a cap of 1,000 and a 1-second
trigger, the query reads at most about 1,000 records per second. If the topic
receives more than that, lag grows, however much spare CPU the executors have.

!!! info "A common cap is 1,000 offsets"
    Many streaming applications set `maxOffsetsPerTrigger` to 1000. Check the
    ceiling above against the topic's peak rate before you copy that value. A
    capped query catching up after downtime drains its backlog at no more than
    the ceiling.

| Option | Default | Effect |
|---|---|---|
| `maxOffsetsPerTrigger` | none | Upper limit on offsets per micro-batch. |
| `minOffsetsPerTrigger` | none | Delays a micro-batch until at least this many offsets are available. |
| `maxTriggerDelay` | `15m` | With `minOffsetsPerTrigger`, the longest a trigger is delayed while some data is available. A batch then runs even below the minimum. |

Adding, removing or changing these limits is allowed with an existing
checkpoint. See [Changes a checkpoint survives](#changes-a-checkpoint-survives).

---

## Partitions, data loss and group ids

### Kafka partitions and Spark tasks

By default each Kafka partition with new data becomes **one Spark partition**,
read by one task. **`minPartitions`** asks Spark to split large Kafka
partitions into smaller offset ranges so more tasks read in parallel. It is a
hint: the number of tasks is only approximately `minPartitions`.

!!! note "Spark 4.x only: `maxRecordsPerPartition`"
    Spark 4.0 adds `maxRecordsPerPartition`, which splits a Kafka partition so
    that each Spark partition holds at most that many records. It does not
    exist in Spark 3.5.5.

### `failOnDataLoss`

Spark tracks offsets itself and never resets them. If the offsets a query
needs no longer exist in Kafka, the data in between is gone. That happens
when:

- **Retention deleted unread data.** The query was stopped, or read too
  slowly, and Kafka removed the segments before the query reached them.
- **The topic was deleted, or deleted and recreated.** The offsets in the
  checkpoint then point at data that no longer exists.

With `failOnDataLoss` set to `true`, the default, the query **fails** when it
detects that data may have been lost. With `false`, it continues from what
Kafka still has. Keep the default. The Spark documentation notes that the
check can raise false alarms, so investigate before you turn it off, and turn
it back on afterwards.

### Group ids and lag tools

Spark generates a **unique consumer group id** for every query, prefixed with
`groupIdPrefix` (default `spark-kafka-source`). `kafka.group.id` forces a
fixed group id instead, and `groupIdPrefix` is then ignored.

| Option | Use it for | Do not expect |
|---|---|---|
| `groupIdPrefix` | Recognising Spark's consumers on the broker. | Offsets to be committed under it. |
| `kafka.group.id` | Brokers with group-based authorization that only allow named groups. | Lag tools to show progress. Spark still commits nothing. |

!!! warning "A fixed group id can make queries interfere"
    The Spark documentation warns that queries or sources sharing one
    `kafka.group.id` are likely to interfere with each other, so each reads
    only part of the data. This can also happen when a query is restarted in
    quick succession. Use it only when authorization requires it, and never
    share one group id between queries.

The Kafka option `enable.auto.commit` has no effect: the documentation states
that the Kafka source does not commit any offset. Because nothing is
committed, `kafka-consumer-groups` and similar tools show either no group or
no useful lag. Measure lag from query progress instead, as described in
[Monitoring lag](#monitoring-lag).

---

## What is in a checkpoint

The checkpoint location is a folder, set with the `checkpointLocation` option
on `writeStream`. Each query needs its own folder. A common setup is
S3-compatible storage, one folder per application.

| Path | Written | Contains |
|---|---|---|
| `metadata` | Once, when the query first starts | The query `id`, which stays the same across restarts. |
| `offsets/<batchId>` | **Before** the batch runs | The end offset of every source for this batch, plus batch metadata such as the watermark and some SQL settings. This is the **write-ahead log**. |
| `commits/<batchId>` | **After** the batch has completed and the sink has written | A marker that the batch finished. |
| `sources/<n>/` | When a source first starts | Source-specific data, such as the Kafka source's initial offsets. |
| `state/<operator>/<partition>/` | Every batch, by stateful operators | State store files. Present only for stateful queries. See [Stateful Operations and the State Store](stateful-operations-and-state-store.md). |

### Order of writes and restart

The driver writes `offsets/N` **before** batch *N* reads any data, applying
the rate limit to choose its end offsets, and writes `commits/N` only **after**
the sink has written. On restart, a batch that has `offsets/N` but no
`commits/N` is run again with the **same offset range** and the **same
batchId**. That is what lets a sink recognise a batch it has already written.

The batch lifecycle and the restart rules are explained step by step in
[Micro-batch Execution and Triggers](micro-batch-execution-and-triggers.md#lifecycle-of-one-batch).
Whether a replayed batch ends up in the output exactly once depends on the
sink, as described in
[Output Modes, Sinks and Exactly-once](output-modes-and-sinks.md).

!!! info "Replays after a failure are expected"
    Records in an interrupted batch are read **again** after restart. This is
    the same trade-off as in Flink: the input position and state are rolled
    back together, and the sink decides whether the replay shows up as
    duplicates.

### Retention

Spark deletes old entries from `offsets/`, `commits/` and the state store as
it goes. The internal setting `spark.sql.streaming.minBatchesToRetain`
(default `100`) sets how many recent batches remain recoverable. You rarely
need to change it, but it explains why a checkpoint folder does not grow
without limit.

---

## Changes a checkpoint survives

A restart from the same checkpoint works only if the new query is compatible
with what the checkpoint recorded. The Spark guide uses two terms:

- **Allowed**: you can make the change, but whether its effect is
  well-defined depends on the query and the change.
- **Not allowed**: you should not make the change, because the restarted query
  is likely to fail with unpredictable errors.

| Change | Allowed? | Why / Note |
|---|---|---|
| Number or type of input sources | **No** | Offsets in the checkpoint are stored per source. |
| Rate limits on a source, such as adding `maxOffsetsPerTrigger` | Yes | Only how much each batch reads changes. |
| Subscribed topics, such as `subscribe` from one topic to another | Generally **no** | Results are unpredictable. |
| Sink type: file sink to Kafka sink | Yes | Kafka sees only the new data. |
| Sink type: Kafka sink to file sink | **No** | |
| Sink type: Kafka sink to `foreach`, or the reverse | Yes | |
| Sink type: other combinations | Case by case | Verify each combination. |
| Output directory of a file sink | **No** | |
| Output topic of a Kafka sink | Yes | |
| Code inside a `foreach` sink's writer | Yes | The meaning of the change depends on the code. |
| Adding or removing filters | Yes | |
| Projection change with the same output schema | Yes | |
| Projection change with a different output schema | Conditionally | Only if the sink accepts the schema change. |
| Streaming aggregation: number or type of grouping keys or aggregates | **No** | The state schema must stay the same. |
| Streaming deduplication: number or type of columns | **No** | The state schema must stay the same. |
| Stream-stream join: schema, equi-join columns or join type | **No** | Other changes to the join condition are ill-defined. |
| `mapGroupsWithState` / `flatMapGroupsWithState`: state schema or timeout type | **No** | Changes inside the function are allowed; their effect depends on the logic. |

Any addition, deletion or schema change of a **stateful operation** is not
allowed between restarts. The guide's suggested escape hatch for arbitrary
stateful operations is to store state as bytes in a format that supports
schema evolution, such as Avro.

!!! warning "`spark.sql.shuffle.partitions` is fixed once a checkpoint exists"
    State is partitioned by a hash of the key into
    `spark.sql.shuffle.partitions` partitions. For a stateful query, that
    number is fixed by the first run. Changing it later does not take effect
    for the restored query. To change it, discard the checkpoint and start a
    new query. The same applies to `spark.sql.streaming.stateStore.providerClass`
    and `spark.sql.streaming.multipleWatermarkPolicy`.

---

## Checkpoints on object storage

The default checkpoint file manager writes each log file to a temporary name
and then **renames** it into place. The Spark cloud integration guide says
that with this default manager, streams should only be checkpointed to a store
with a fast and **atomic** `rename()`. Otherwise checkpointing may be slow and
potentially unreliable.

S3 does not have that. Through the S3A connector, a rename is a **copy
followed by a delete**, which is neither fast nor atomic. If your streaming
checkpoints live on S3-compatible storage, this applies to you.

| Checkpoint file manager | How it writes a file | Needs |
|---|---|---|
| Default (`FileContextBasedCheckpointFileManager`) | Write a temporary file, then rename it | A file system with fast, atomic rename. |
| `org.apache.spark.internal.io.cloud.AbortableStreamBasedCheckpointFileManager` | Write directly to the final name through an abortable stream, with no rename | S3A on Hadoop 3.3.1 or later, and the `spark-hadoop-cloud` module on the classpath. |

To use the abortable manager, set:

```text
spark.sql.streaming.checkpointFileManagerClass=org.apache.spark.internal.io.cloud.AbortableStreamBasedCheckpointFileManager
```

!!! danger "Never share a checkpoint location between running queries"
    The cloud integration guide warns that with the abortable stream manager,
    reusing a checkpoint location among queries running in parallel can
    corrupt the checkpoint. One folder per application, never two running
    applications on the same folder.

---

## Monitoring lag

Because Spark commits nothing to Kafka, lag comes from the query itself.
Every completed micro-batch produces a progress report, available as
`query.lastProgress` and `query.recentProgress`, and through a
`StreamingQueryListener`. The Spark UI's Structured Streaming tab, and the
Spark History Server, chart the same numbers over time.

Each entry in the report's `sources` list has these fields:

| Field | Meaning |
|---|---|
| `startOffset` | Offsets per partition where the batch started. |
| `endOffset` | Offsets per partition where the batch ended. |
| `latestOffset` | The latest offsets per partition that Kafka reported when the batch was planned. |
| `numInputRows` | Records read in the batch. |
| `metrics` | For the Kafka source: `minOffsetsBehindLatest`, `maxOffsetsBehindLatest` and `avgOffsetsBehindLatest`. |

The three `metrics` values compare the latest offsets available in Kafka with
the offsets the query has consumed, per partition, and report the minimum,
maximum and average difference. A rate-limited query that cannot keep up
shows them growing from batch to batch.

```python
progress = query.lastProgress
if progress:
    for source in progress["sources"]:
        print(source["description"],
              source["metrics"].get("maxOffsetsBehindLatest"),
              source["numInputRows"])
```

| Signal | What it tells you |
|---|---|
| `maxOffsetsBehindLatest` rising over many batches | The query is falling behind. Compare the topic's rate with the throughput ceiling. |
| `numInputRows` always equal to `maxOffsetsPerTrigger` | Every batch is capped, so the query is running at its ceiling. |
| Lag shown by `kafka-consumer-groups` | Nothing useful. Spark does not commit offsets. |

---

## Flink and Spark side by side

| Topic | Flink Kafka source | Spark Structured Streaming Kafka source |
|---|---|---|
| Source of truth for position | Checkpoint (operator state) | Checkpoint (`offsets/` and `commits/`) |
| Commits offsets to the consumer group | Yes, when a checkpoint completes, for monitoring only | **No**, never |
| Lag from consumer-group tools | Works, with a saw-tooth tied to the checkpoint interval | Does not work. Use query progress `metrics`. |
| Group id | Set one per job | Generated per query; `kafka.group.id` only when authorization needs it |
| Default start on first run | DataStream: `earliest()`. SQL: `group-offsets` | `latest` |
| Starting position on restart | Ignored for partitions in state | Ignored once the checkpoint holds offsets |
| When progress is recorded | Periodic checkpoints, by barriers | Every micro-batch: offsets before, commit after |
| Rate limiting | No per-checkpoint cap; backpressure slows the source | `maxOffsetsPerTrigger` per micro-batch |
| Partitions to parallel readers | Each partition to one subtask | One Spark partition per Kafka partition; `minPartitions` splits |
| New partitions while running | Read from earliest | Read from earliest |
| Changing the query | Needs stable operator UIDs; SQL is hard to upgrade | Follow the compatibility table; stateful changes need a new checkpoint |

The Flink pages are [Kafka Source](../../apache-flink/concepts/kafka-source.md)
and [State, Checkpoints and Savepoints](../../apache-flink/concepts/state-and-checkpoints.md).

---

## Self-check

Answer these from memory before expanding them. They map to the outcomes listed
at the top of the page.

??? question "1. A new streaming query is deployed without `startingOffsets`. The topic already holds a week of data, but the output only contains records produced after the deployment. Why?"
    The default `startingOffsets` for streaming queries is **`latest`**. With
    an empty checkpoint location, the query started at the end of every
    partition. To read the backlog, start again with a **new, empty**
    checkpoint location and `startingOffsets` set to `earliest`.

??? question "2. You set `startingOffsets` to `earliest` and restart a query to backfill. Nothing is replayed. Why?"
    Starting options apply only when the query starts **without a
    checkpoint**. The checkpoint already holds offsets, so the query continues
    from where it left off. To replay, use a new checkpoint location, and
    accept that any state in the old one is left behind.

??? question "3. A query has `maxOffsetsPerTrigger` set to 1,000 and each batch takes about one second. The topic receives 3,000 records per second at peak. What happens, and how do you see it?"
    The ceiling is about 1,000 records per second, so the query falls behind
    by about 2,000 records per second at peak. In query progress,
    `numInputRows` stays at 1,000 per batch and `maxOffsetsBehindLatest` in
    the source `metrics` keeps rising. Raise the cap, shorten batches, or
    accept the lag if peaks are short.

??? question "4. The team checks consumer lag with `kafka-consumer-groups` and finds no committed offsets for the query, even after setting `kafka.group.id`. Is the query broken?"
    No. Spark's Kafka source **does not commit offsets**, with or without a
    fixed group id. The position lives in the checkpoint. Read lag from the
    `sources` entries in query progress, or from the Spark History Server.

??? question "5. A query that counts orders per customer must also group by region. Can you redeploy it with the same checkpoint? And can you change `spark.sql.shuffle.partitions` at the same time?"
    No to both. Changing the grouping keys of a streaming aggregation changes
    the **state schema**, which is not allowed. `spark.sql.shuffle.partitions`
    is fixed for a stateful query once the checkpoint exists. Start the new
    query with a new checkpoint, and plan how to rebuild the counts.

??? question "6. Checkpointing to S3-compatible storage is slow, and the team considers `AbortableStreamBasedCheckpointFileManager`. What does it change, and what must they avoid?"
    The default manager writes a temporary file and renames it, and on S3A a
    rename is a non-atomic copy and delete. The abortable manager writes
    directly to the final name, with no rename. It needs S3A on Hadoop 3.3.1
    or later and the `spark-hadoop-cloud` module. They must never let two
    queries run in parallel on the same checkpoint location, which can
    corrupt it.

---

## References

### Apache Spark

- [Structured Streaming + Kafka Integration Guide](https://archive.apache.org/dist/spark/docs/3.5.5/structured-streaming-kafka-integration.html): source columns, `subscribe` / `assign`, `startingOffsets`, `maxOffsetsPerTrigger`, `failOnDataLoss`, group ids and Kafka-specific configuration.
- [Structured Streaming Programming Guide](https://archive.apache.org/dist/spark/docs/3.5.5/structured-streaming-programming-guide.html): checkpointing, recovery semantics after changes in a query, monitoring query progress, and settings fixed after the first run.
- [Integration with Cloud Infrastructures](https://archive.apache.org/dist/spark/docs/3.5.5/cloud-integration.html): object stores, rename, and the abortable stream based checkpoint file manager.

### Related

- [Spark Structured Streaming overview](../index.md): what each Spark page covers.
- [Micro-batch Execution and Triggers](micro-batch-execution-and-triggers.md): how batches are planned and when they start.
- [Event Time and Watermarks](event-time-and-watermarks.md): event time and the watermark stored in the offset log.
- [Stateful Operations and the State Store](stateful-operations-and-state-store.md): what lives under `state/`.
- [Output Modes, Sinks and Exactly-once](output-modes-and-sinks.md): what replayed batches mean for output.
- [Avro and Schema Registry](../../kafka/avro-and-schema-registry.md#decoding-in-spark): decoding Confluent Avro values in Spark.
- [Flink Kafka Source](../../apache-flink/concepts/kafka-source.md): the Flink counterpart of this page.
- [Flink State, Checkpoints and Savepoints](../../apache-flink/concepts/state-and-checkpoints.md): how Flink checkpoints compare.
