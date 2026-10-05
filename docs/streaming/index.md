[← Home](../index.md)
# Streaming

Continuous data systems: the engines that move and transform data as it arrives,
and the stores that serve the results back at low latency.

## In this section

- **Kafka**
    - [Avro and Schema Registry](kafka/avro-and-schema-registry.md) — the
      Confluent wire format, writer and reader schemas, and how Flink and Spark
      each decode it
- **[Apache Flink](apache-flink/index.md)** — start with the overview, then
  read these pages in order; each builds on the one before.
    1. [Architecture Overview](apache-flink/architecture.md) — the mental
       model: the two control loops, `FlinkDeployment`, JobManager and
       TaskManagers, slots vs parallelism, `keyBy` and keyed state, and failure
       recovery
    2. [Architecture Walkthrough](apache-flink/architecture-walkthrough.md) —
       the concepts confirmed tab by tab in the Flink Web UI against one real
       deployment; read it with a running job's UI open
    3. [Development and Deployment](apache-flink/development-and-deployment.md)
       — the practical path: build the connector fat JAR, run a PyFlink job on
       a local session cluster, retain checkpoints for debugging, and ship it
       through Harbor, Helm and ArgoCD
    4. **Concepts** — seven pages following a record from the
       [Kafka Source](apache-flink/concepts/kafka-source.md) to
       [Sinks and Delivery Guarantees](apache-flink/concepts/sinks-and-delivery-guarantees.md):
       APIs, time and watermarks, windows and joins, state and checkpoints,
       and the PyFlink execution model

## Planned

- **Flink** — HA and zero-downtime upgrades
- **Flink latency** — state backend, checkpointing, and where a 100 ms p99 budget goes
- **Spark Structured Streaming** — triggers, watermarks, the state store, output modes
- **Kafka** — delivery semantics
- **Serving** — writing online features to Cassandra, and the read path back
