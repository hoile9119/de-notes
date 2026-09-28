[← Home](../index.md)
# Streaming

Continuous data systems: the engines that move and transform data as it arrives,
and the stores that serve the results back at low latency.

## In this section

- **Apache Flink**
    - [Architecture Overview](apache-flink/architecture.md) — the two control
      loops, `FlinkDeployment`, JobManager and TaskManagers, slots vs
      parallelism, `keyBy` and keyed state, and failure recovery

## Planned

- **Flink** — HA and zero-downtime upgrades
- **Flink latency** — state backend, checkpointing, and where a 100 ms p99 budget goes
- **Spark Structured Streaming** — triggers, watermarks, the state store, output modes
- **Kafka** — delivery semantics and the schema registry at the boundary
- **Serving** — writing online features to Cassandra, and the read path back
