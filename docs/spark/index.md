[← Home](../index.md)

# Spark

The engine itself. **These notes apply to batch and Structured Streaming alike** —
a streaming query uses the same DAG scheduler, the same shuffle, the same unified
memory manager and the same spill machinery as a batch job.

Where something is genuinely batch-only — adaptive query execution, cost-based
optimisation — the page says so.

Streaming-specific behaviour (triggers, watermarks, state) lives in
[Streaming](../streaming/index.md) instead.

## In this section

- [PySpark Function Reference](pyspark-functions.md) —
  window functions, aggregates, higher-order functions, and a trap list
- [Recipes](recipes/index.md) — runnable snippets pulled out of
  production jobs

## Planned

- **Execution model** — job/stage/task, lazy evaluation, narrow vs wide, Catalyst and Tungsten
- **Shuffle, joins and skew** — co-partitioning, broadcast sizing, skew detection and salting
- **Memory and spill** — unified memory, per-task budget, OOM vs exit 137
- **AQE and CBO** — coalescing, skew join, runtime conversion *(batch only)*
- **Partitioning and file layout** — repartition, bucketing, the small-files problem
- **UDF performance** — the Python boundary, Arrow and pandas UDFs
- **Deployment and sizing** — YARN vs Kubernetes, executor sizing, dynamic allocation
- **Observability** — diagnostic order, reading plans, spotting plan flips
