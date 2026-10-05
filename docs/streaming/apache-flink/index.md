[← Streaming](../index.md)

# Apache Flink

**Flink runs real-time pipelines: it reads events from Kafka, keeps state per
key, and writes results out as each event arrives.** The jobs described here
run on Kubernetes under the Flink Kubernetes Operator, and are written in
Python with PyFlink. These pages explain how such a job is laid out at runtime,
how to read it in the Flink UI, and how to build, run and ship one.

## How to read this section

Read the pages in this order. Each one builds on the one before.

1. **[Architecture Overview](architecture.md)** — the mental model. Who
   schedules what: the Operator, the Kubernetes Scheduler, the JobManager and
   the TaskManagers; slots versus parallelism; operator chaining; `keyBy` and
   keyed state; and what happens when a TaskManager fails.
2. **[Architecture Walkthrough](architecture-walkthrough.md)** — the same
   concepts checked against one real deployment, tab by tab in the Flink UI.
   Read it with the UI of a running job open next to it.
3. **[Development and Deployment](development-and-deployment.md)** — the
   practical path: build the connector fat JAR, run the job on a local session
   cluster, keep checkpoints for debugging, and ship it through Harbor, Helm and
   ArgoCD.
4. **Concepts** — one page per stage a record passes through, read in this
   order:
    1. [Kafka Source](concepts/kafka-source.md) — reading Kafka: startup modes,
       offsets, partitions and formats.
    2. [Table API and DataStream API](concepts/table-and-datastream-api.md) —
       which API to use, and append-only versus updating results.
    3. [Time and Watermarks](concepts/time-and-watermarks.md) — event time,
       out-of-order events, idleness and late data.
    4. [Windows and Joins](concepts/windows-and-joins.md) — window TVFs, the
       join types and their state, and hand-built windows.
    5. [State, Checkpoints and Savepoints](concepts/state-and-checkpoints.md) —
       state backends, TTL, barriers, and keeping state across upgrades.
    6. [PyFlink Execution Model](concepts/pyflink-execution-model.md) — where
       Python actually runs, and what it costs.
    7. [Sinks and Delivery Guarantees](concepts/sinks-and-delivery-guarantees.md)
       — exactly-once, idempotent upserts and transactional sinks.

    For how a Confluent Avro message is decoded, see
    [Avro and Schema Registry](../kafka/avro-and-schema-registry.md).

## Where to start

| If you want to… | Start with |
|---|---|
| Understand why a job has the pods, slots and parallelism it has | [Architecture Overview](architecture.md) |
| Diagnose a running job from the Flink UI | [Architecture Walkthrough](architecture-walkthrough.md) |
| Run a PyFlink job on your laptop | [Development and Deployment](development-and-deployment.md#run-locally) |
| Debug state after cancelling a job | [Development and Deployment](development-and-deployment.md#retaining-checkpoints-for-debugging) |
| Ship a change to production | [Development and Deployment](development-and-deployment.md#deploy-to-kubernetes) |
| Understand why late events disappear from a join | [Time and Watermarks](concepts/time-and-watermarks.md) |
| Choose between at-least-once and exactly-once output | [Sinks and Delivery Guarantees](concepts/sinks-and-delivery-guarantees.md) |
