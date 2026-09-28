[← Lakehouse](index.md)
# Iceberg — Table Format Internals

How a table format turns a directory of Parquet files into something with
snapshots, schema evolution and atomic commits — and what that costs to operate.


## 1. The metadata tree

```
catalog  →  metadata.json  →  manifest list (= a snapshot)  →  manifests  →  data files
```

- **metadata.json** — schema, partition specs, sort orders, snapshot history, current snapshot
- **manifest list** — one per snapshot; points at manifests, with partition-range
  summaries so whole manifests can be skipped during planning
- **manifests** — list data files with per-file stats: `record_count`, `column_sizes`,
  `value_counts`, `null_value_counts`, `lower_bounds`, `upper_bounds`
- **data files** — Parquet

Every data file records the **partition spec ID** it was written under. That is what
makes partition evolution possible: a query plans across files written under
different specs.

---

## 2. The commit protocol

1. Write data files — invisible, non-atomic, parallel
2. Write manifests — invisible
3. Write the manifest list — invisible
4. Write a new `metadata.json` — invisible
5. **Ask the catalog to swap the current pointer** ← the only atomic step

> **Everything before step 5 is invisible and doesn't need to be atomic.** If it
> fails you've left orphan files and no reader saw anything. Only the pointer swap
> makes the whole prepared state visible, all at once.

The swap must be **conditional**: *move current from N to N+1, but only if it is
still N.* Without the condition, two concurrent writers both succeed and one
silently erases the other. With it, the loser re-reads, re-applies, retries —
**optimistic concurrency**, and the source of commit contention on hot tables.

---

## 3. Compare-and-swap, and the S3 story

**CAS** = "set X to `new`, but only if X equals `expected`, and tell me if it
worked" — one indivisible operation. It prevents the lost-update race:

```
A: read v5    B: read v5    A: write v6 ✓    B: write v6 ✓   ← A's commit gone, silently
```

Two flavours: **put-if-absent** (create key only if absent — what Delta needs) and
**compare-and-swap on a value** (what an Iceberg catalog does).

### What S3 lacked

| When | State |
|---|---|
| Pre-2020 | Eventually consistent, no conditional writes |
| **Dec 2020** | **Strong** read-after-write consistency — still no conditional writes |
| **Nov 2024** | `If-None-Match: *` on PUT → put-if-absent finally exists |

> **Strong consistency ≠ conditional writes.** After 2020 you could always *read*
> what you wrote. You still couldn't make a write *fail* because someone beat you
> to it.

HDFS and ADLS Gen2 have atomic rename; GCS has generation preconditions.
**S3 was the odd one out** — and S3 is where the data lives.

### Delta's DynamoDB LogStore — a bolted-on CAS

1. Writer wants version N; writes commit content to a **temp file** in S3 (unsafe, invisible, fine)
2. **Conditional put into DynamoDB**, key `(tablePath, "00005.json")`, condition
   `attribute_not_exists` ← **the atomic step**
3. Winner copies temp → `_delta_log/00005.json`
4. Loser gets condition-failure, retries at N+1
5. Writer dies between 2 and 3? The DynamoDB row records the temp path, so any
   later client completes the copy — the recovery path

DynamoDB held no table data. It supplied **one missing primitive**.

### The symmetric point

**Iceberg has the same problem with the wrong catalog.** `HadoopCatalog` tracks the
current metadata via `version-hint.text` and relies on atomic rename — **unsafe on
S3 for exactly the reason Delta needed DynamoDB.** The table format doesn't solve
this; the **catalog choice** does. HMS uses a DB transaction, Glue a conditional
update, a REST catalog its Postgres backend — all just "something that can do a
real CAS."

> **Every lakehouse format needs one atomic conditional operation. The only
> question is which component you make responsible for it — and that component
> becomes a mandatory participant in every write.**

---

## 3a. The operational half — CoW, MoR, MERGE, maintenance

> **Iceberg's format question is settled; its operational questions are not.**
> Every real Iceberg problem is one of three: **write amplification** (CoW),
> **read amplification** (MoR), or **commit contention** (optimistic concurrency).

### Copy-on-write vs merge-on-read

Update **one row** in a 128 MB data file:

| | On write | On read |
|---|---|---|
| **Copy-on-write** | **rewrite the whole 128 MB file** | nothing — just read it |
| **Merge-on-read** | write a small **delete file** + a new data file | **merge deletes against data, every read** |

> **CoW pays once, at write time. MoR pays every time, at read time — until you
> compact.**

Set per operation; **Iceberg defaults all three to copy-on-write**:

```sql
ALTER TABLE t SET TBLPROPERTIES (
  'write.delete.mode' = 'merge-on-read',
  'write.update.mode' = 'merge-on-read',
  'write.merge.mode'  = 'merge-on-read'
);
```

> *"CoW when updates are infrequent and reads frequent — dimensions, gold tables.
> MoR when writes are frequent and small — streaming upserts, CDC. And MoR is only
> viable with compaction actually running, because read cost grows with every
> uncompacted delete file."*

**MoR without compaction is a trap, not a design.**

### Delete files — positional vs equality

| | What it records | Writer cost | Reader cost | Who writes it |
|---|---|---|---|---|
| **Positional** | *row 42 of file X is dead* | must **read data** to find positions | cheap — sorted merge by position | **Spark** |
| **Equality** | *all rows where `id = 123` are dead* | **near zero** — just a predicate | **expensive** — anti-join per file in scope | **Flink CDC** |

**Sequence numbers make it correct:** a delete file applies only to data files with
a **lower** sequence number, so a re-inserted row is not re-deleted by an old
delete.

**Iceberg v3 adds deletion vectors** — a Roaring bitmap per data file replacing
scattered positional deletes. One vector per file, far better reads. **Delta
shipped these earlier**, and it is a place Delta was genuinely ahead.

> *"Spark writes positional deletes, Flink CDC writes equality deletes. Equality
> deletes make writes nearly free and reads expensive, so a Flink-written table
> with no compaction degrades fast — that is usually the actual bug behind
> 'Iceberg got slow'."*

### `MERGE INTO` — cost is measured in files, not rows

`MERGE INTO` is a **join** between target and source, then a rewrite (CoW) or
delete files plus new data (MoR).

> **The cost driver is how many *files* the matched rows touch, not how many rows
> changed.** 1,000 updates scattered across 1,000 files rewrites 1,000 files under
> CoW.

So **layout is the tuning knob** — sorted or bucketed on the merge key, updates
cluster into few files:

```sql
ALTER TABLE fact WRITE ORDERED BY customer_id;
```

**The production trap:** if the source has more than one row per merge key, the
**MERGE fails** — a target row matching multiple source rows is an error, not a
silent pick. In CDC this happens constantly.

```python
w = Window.partitionBy("customer_id").orderBy(F.col("op_ts").desc())
latest = (cdc.withColumn("rn", F.row_number().over(w))
             .filter(F.col("rn") == 1).drop("rn"))
```

**Deduplicate to the latest change per key before merging.** Unprompted, this is
real signal — the most common Iceberg CDC bug.

### Maintenance — four procedures, four problems

| Procedure | Fixes |
|---|---|
| `rewrite_data_files` | **small files** and **accumulated deletes** — bin-pack or sort |
| `rewrite_manifests` | **planning time** — the driver-side listing cost |
| `expire_snapshots` | **storage** — the only thing that deletes unreferenced data files |
| `remove_orphan_files` | files from **failed commits**, referenced by no snapshot |

- **Compaction alone *increases* storage** — old files stay until their snapshots
  expire. `expire_snapshots` is what reclaims it.
- **Snapshot retention *is* the time-travel window.** One decision, not two.
- **`remove_orphan_files` is dangerous with concurrent writers** — an
  in-flight file looks orphaned. Always use an age threshold.

```sql
CALL sys.rewrite_data_files(table => 'db.fact',
     strategy => 'sort', sort_order => 'customer_id',
     where => 'event_date >= current_date() - 7');
```

**Note the `where`** — targeted compaction is the answer to "rewrite the whole
table?", which was missed when this was drilled (2026-08-25).

### Branching and tagging — data quality as a gate

```sql
SELECT * FROM db.fact FOR SYSTEM_TIME AS OF '2026-09-01 00:00:00';
SELECT * FROM db.fact FOR SYSTEM_VERSION AS OF 8291374892;
```

> **Write-Audit-Publish:** write to a branch, run quality checks against it, and
> `fast_forward` main only if they pass. **Bad data never becomes visible** — no
> rollback, no "we noticed at 9am."

```sql
ALTER TABLE db.fact CREATE BRANCH etl_run;
-- spark.wap.branch = etl_run; write; assert; then:
CALL sys.fast_forward('db.fact', 'main', 'etl_run');
```

**Tags** pin a snapshot past expiry (`month_end_2026_08`) — the regulated-industry
answer for point-in-time reproducibility.

### Concurrency — where "optimistic" bites

Two writers prepare, both try to swap, one loses, re-reads and retries. Fine at low
concurrency; on a hot table it is a retry storm, and commits fail after
`commit.retry.num-retries` (**default 4**).

**Isolation level matters:** `serializable` (default) fails the commit if *any*
conflicting file appeared; `snapshot` is more permissive.

```sql
ALTER TABLE t SET TBLPROPERTIES ('write.merge.isolation-level' = 'snapshot');
```

**The fix is structural, not config:** fewer and larger commits, partition-scoped
writers that cannot conflict, or serialised writes. **Twelve micro-batch writers on
one table is a design problem no retry count solves.**

### Delta equivalents

| Iceberg | Delta |
|---|---|
| MoR delete files | **deletion vectors** (shipped earlier) |
| `rewrite_data_files` + sort | `OPTIMIZE` + `ZORDER` / **Liquid Clustering** |
| `expire_snapshots` + `remove_orphan_files` | `VACUUM` |
| Branches / tags, WAP | none — shallow clones are the nearest |
| **Equality deletes** | **none** |
| `FOR SYSTEM_VERSION AS OF` | `VERSION AS OF` |

**Two real differences remain:** Iceberg has **branching** and **equality
deletes**; Delta has **Liquid Clustering** and the Databricks runtime. The rest has
converged.

---

## 4. Iceberg vs Delta

### The architectural difference — one sentence

> **Delta pushes the atomic commit down into the filesystem; Iceberg pushes it up
> into the catalog.**

Both write commit data as files, so "commits to files" doesn't separate them.
The load-bearing word is **atomicity**.

| | Atomic operation | Provider |
|---|---|---|
| **Delta** | Put-if-absent on `N.json` | The **filesystem** |
| **Iceberg** | CAS the current-metadata pointer | The **catalog** |

**Rendezvous:** Delta's is the **path** (log at a known location — point any engine
at it). Iceberg's is the **catalog** (metadata files are UUID-named, so "which one
is current?" needs a shared answer). With several engines writing concurrently, that
shared answer *is* the catalog — and once it's mandatory, it becomes the natural
place for authorization and credential vending. **The governance story is a side
effect of a decision made for atomicity.**

### What Iceberg buys

**Hidden partitioning.** Delta needs a physical partition column, so you carry `dt`
alongside `event_ts` and every query needs both predicates — forget one and you
full-scan. Iceberg declares `PARTITIONED BY (days(event_ts))`; users query
`event_ts`. **Users cannot forget a predicate they never have to write.**

**Partition evolution.** Iceberg-only, and the strongest single argument:

```sql
ALTER TABLE events ADD PARTITION FIELD hours(event_ts)
```

Old files keep their spec, new writes use the new one, queries plan across both.
**No rewrite.** In Delta, changing partitioning means rewriting the table.

⚠ **The caveat an interviewer will probe:** evolution changes layout *going
forward*. Old data keeps its old **pruning granularity** — you do *not* get hourly
pruning on two years of daily-partitioned files.

### Where Delta genuinely wins

- **Simpler operationally** — self-describing at a path; no catalog service to run,
  make HA, back up, restore. Iceberg's catalog is a stateful dependency on every
  query's planning path.
- **Databricks integration** — Photon, Liquid Clustering, predictive optimization,
  Unity Catalog. On Databricks the choice flips.
- **Deletion vectors shipped earlier**; long-strong MERGE performance.

### ⚠ Traps

- **"Iceberg because it's open."** Delta is Linux Foundation open source. This marks
  you as repeating marketing.
- **"Delta is vendor-locked."** Imprecise. The *format* is open; the gravity is
  toward Databricks' **implementation** (Photon, Liquid Clustering, Unity Catalog).
  Say "the features that make Delta compelling are largely Databricks features."
- **"Delta has no catalog."** Too strong — say "doesn't *require* one to find the
  table." Unity Catalog very much exists.
- **"Delta suits object storage."** Backwards — Delta had the *harder* time on S3.

---

## 5. Current state (as of ~May 2026 — verify before an interview)

1. **The S3 problem is solved.** Conditional writes (Nov 2024) gave Delta
   put-if-absent natively. DynamoDB LogStore persists only for back-compat. Tell
   that story as **history**.
2. **Delta moved the commit into a service.** **Coordinated Commits** (formerly
   Managed Commits): a commit coordinator owns the atomic commit. **That is
   Iceberg's architecture.** Faster commits (no `LIST` of the log dir),
   cross-region tables, catalog-managed tables — the same benefits Iceberg got
   from the same choice.
3. **Interop stopped being a differentiator.** Delta **UniForm** writes Iceberg
   metadata alongside Delta. Databricks **acquired Tabular** (2024, ~$2B — the
   Iceberg creators' company). Databricks supports Iceberg natively. **Unity
   Catalog was open-sourced and implements the Iceberg REST Catalog API** — the
   clearest signal available about which way the standard settled.
4. **Features converge both ways.** Iceberg **v3** added deletion vectors, row
   lineage, variant type. Delta 4.0 added type widening, variant.
5. **The fight moved up the stack to catalogs** — Unity Catalog vs Apache Polaris
   vs Lakekeeper vs Nessie vs Gravitino, all speaking the Iceberg REST API.
   Differentiators: governance, credential vending, multi-engine authz, who runs it.

> **The architectural distinction in §4 is now historical, not current.** Say it
> with a time marker.

### Still genuinely different

- **Partition evolution** — Iceberg-only. Delta's answer is Liquid Clustering, a
  different mechanism and largely a Databricks feature.
- **Liquid Clustering** — Databricks. Iceberg has sort orders and bucket transforms;
  not the same thing.
- **Ecosystem gravity** — Iceberg is the neutral interop standard; Delta is
  strongest inside Databricks.

---
