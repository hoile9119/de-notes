[← Spark](index.md)
# PySpark Built-in Functions — Reference

`from pyspark.sql import functions as F, Window`

Version markers below (3.4 / 3.5) note when a function landed.

> **Why this matters beyond recall:** a Python UDF serialises every row to a
> Python process and back, and is opaque to Catalyst — no pushdown, no codegen.
> Knowing the built-in that replaces a UDF is a performance skill, not trivia.

---

## 1. Window functions

### Building the spec

```python
w = Window.partitionBy("customer_id").orderBy(F.col("event_ts").desc())

w_running  = Window.partitionBy("k").orderBy("ts") \
                   .rowsBetween(Window.unboundedPreceding, Window.currentRow)
w_last3    = Window.partitionBy("k").orderBy("ts").rowsBetween(-2, 0)
w_1hour    = Window.partitionBy("k").orderBy(F.col("ts").cast("long")) \
                   .rangeBetween(-3600, 0)
```

Boundaries: `Window.unboundedPreceding`, `Window.unboundedFollowing`,
`Window.currentRow`, or integer offsets.

### ⚠ The default-frame trap

| Spec | Implicit frame |
|---|---|
| `partitionBy(...)` **with** `.orderBy(...)` | `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` |
| `partitionBy(...)` **without** `orderBy` | `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` |

So `F.sum("x").over(Window.partitionBy("k").orderBy("ts"))` is a **running total**,
not a partition total. Adding `orderBy` silently changes the answer. Add an
explicit `rowsBetween(unboundedPreceding, unboundedFollowing)` if you want the
whole-partition sum.

**`rowsBetween` = physical row offsets. `rangeBetween` = logical value offsets**
based on the `orderBy` column's value.

### ⚠ The empty-partitionBy trap

`Window.orderBy("ts")` with **no** `partitionBy` moves the entire dataset into
**one partition, one task**. Fine on 1,000 rows; fatal on a billion. Spark even
warns: *"No Partition Defined for Window operation!"*

### Ranking

| Function | Behaviour on ties |
|---|---|
| `F.row_number()` | 1,2,3,4 — **arbitrary but unique**; use for dedup |
| `F.rank()` | 1,2,2,4 — **gaps**; emits duplicates |
| `F.dense_rank()` | 1,2,2,3 — no gaps |
| `F.percent_rank()` | relative rank 0–1 |
| `F.ntile(n)` | bucket into n groups |
| `F.cume_dist()` | cumulative distribution |

**Ranking functions ignore the frame.**

### Analytic

```python
F.lag("amount", 1, 0).over(w)        # previous row (offset, default)
F.lead("amount", 1).over(w)          # next row
F.first("status", ignorenulls=True).over(w)
F.last("status",  ignorenulls=True).over(w)
F.nth_value("amount", 2).over(w)
```

`first`/`last` are **nondeterministic without an ordered frame** — a very common
correctness bug.

### Aggregates over a window

Any aggregate works: `F.sum`, `F.avg`, `F.min`, `F.max`, `F.count`,
`F.collect_list`, `F.approx_count_distinct`.

### The two patterns you will actually be asked

**Latest record per key (CDC dedup):**
```python
w = Window.partitionBy("id").orderBy(F.col("updated_at").desc(), F.col("lsn").desc())
df.withColumn("rn", F.row_number().over(w)).filter("rn = 1").drop("rn")
```

**Sessionization (gaps-and-islands):**
```python
w = Window.partitionBy("user_id").orderBy("event_ts")
(df.withColumn("prev", F.lag("event_ts").over(w))
   .withColumn("new_session",
       (F.col("event_ts").cast("long") - F.col("prev").cast("long") > 1800).cast("int"))
   .withColumn("session_id", F.sum(F.coalesce("new_session", F.lit(1))).over(w)))
```

### Streaming time windows (different thing, same word)

```python
F.window("event_ts", "10 minutes", "5 minutes")   # tumbling / sliding
F.session_window("event_ts", "30 minutes")        # 3.2+
```

---

## 2. Aggregates

```python
F.count("*")              # counts rows including nulls
F.count("col")            # SKIPS nulls  ← classic interview trap
F.countDistinct("a","b")
F.approx_count_distinct("id", rsd=0.05)      # HyperLogLog
F.sum, F.avg / F.mean, F.min, F.max, F.sum_distinct
F.stddev, F.variance, F.skewness, F.kurtosis, F.corr, F.covar_pop
F.percentile_approx("amt", 0.95)
F.median("amt")           # 3.4+
F.count_if(F.col("x") > 0)   # 3.5+
F.any_value("x")             # 3.5+
F.collect_list("x"), F.collect_set("x")
F.first("x", ignorenulls=True), F.last("x", ignorenulls=True)
F.grouping("k"), F.grouping_id()    # with rollup / cube
```

> ⚠ **`collect_list` / `collect_set` do not combine map-side** and materialise the
> whole group in memory. On a skewed key that's an unspillable OOM — see
> `notes/spark.md` §6. `count`/`sum`/`min`/`max`/`avg` all combine and are
> skew-resistant.

> ⚠ `collect_list` ordering is **not guaranteed** unless applied over an ordered
> window.

---

## 3. Conditionals & nulls

```python
F.when(F.col("x") > 0, "pos").when(F.col("x") < 0, "neg").otherwise("zero")
F.coalesce("a", "b", F.lit(0))
F.nvl("a", 0), F.ifnull("a", 0), F.nvl2("a", "yes", "no")
F.isnull("x"), F.isnan("x"), F.nanvl("x", F.lit(0))
F.greatest("a","b","c"), F.least("a","b","c")
df.na.fill({"x": 0}), df.na.drop(subset=["x"]), df.na.replace(...)
F.try_cast(F.col("s"), "int"), F.try_divide("a","b")     # 3.5+ — null instead of error
```

---

## 4. Strings

```python
F.concat("a","b"), F.concat_ws("-", "a", "b")
F.substring("s", 1, 5), F.substring_index("s", ".", 2)
F.split("s", ","), F.split_part("s", ",", 2)          # 3.4+
F.regexp_replace("s", r"\d+", ""), F.regexp_extract("s", r"(\d+)", 1)
F.regexp_extract_all("s", r"(\d+)", 1)                # 3.4+
F.lower, F.upper, F.initcap, F.trim, F.ltrim, F.rtrim, F.btrim
F.lpad("s", 10, "0"), F.rpad, F.repeat, F.reverse, F.overlay
F.length("s"), F.instr("s","x"), F.locate("x","s"), F.translate("s","abc","xyz")
F.contains("s","x"), F.startswith("s","x"), F.endswith("s","x")   # 3.5+
F.format_string("%s-%d", "a", "b"), F.format_number("x", 2)
F.levenshtein("a","b"), F.soundex("s")
```

---

## 5. Dates & timestamps

```python
F.current_date(), F.current_timestamp()
F.to_date("s", "yyyy-MM-dd"), F.to_timestamp("s", "yyyy-MM-dd HH:mm:ss")
F.date_format("ts", "yyyy-MM")
F.date_add("d", 7), F.date_sub("d", 7), F.add_months("d", 3)
F.datediff("a","b"), F.months_between("a","b")
F.trunc("d", "MM"), F.date_trunc("hour", "ts")
F.year, F.quarter, F.month, F.dayofmonth, F.dayofweek, F.dayofyear,
F.weekofyear, F.hour, F.minute, F.second
F.last_day("d"), F.next_day("d", "Mon")
F.unix_timestamp("ts"), F.from_unixtime("epoch")
F.from_utc_timestamp("ts","Asia/Ho_Chi_Minh"), F.to_utc_timestamp(...)
F.make_date("y","m","d"), F.make_timestamp(...)
F.timestampadd("HOUR", 3, "ts"), F.timestampdiff("DAY","a","b")   # 3.5+
```

`trunc` works on dates (`YEAR`/`MM`/`WEEK`); `date_trunc` handles time units too.

---

## 6. Arrays, maps, structs, JSON

```python
# arrays
F.array("a","b"), F.array_contains("arr", 1), F.size("arr")
F.array_distinct, F.array_sort, F.sort_array("arr", asc=False)
F.array_union, F.array_intersect, F.array_except, F.arrays_zip
F.array_min, F.array_max, F.array_position, F.array_remove, F.array_join("arr", ",")
F.element_at("arr", 1), F.slice("arr", 2, 3), F.flatten, F.sequence(F.lit(0), F.lit(9))
F.explode("arr"), F.explode_outer("arr"), F.posexplode("arr"), F.inline("arr_of_struct")

# maps
F.create_map(F.lit("k"), F.col("v")), F.map_keys, F.map_values,
F.map_entries, F.map_concat, F.map_from_arrays, F.map_from_entries

# structs & JSON
F.struct("a","b"), F.col("s.field"), F.col("s.*")
F.to_json("s"), F.from_json("j", schema), F.schema_of_json(...)
F.get_json_object("j", "$.a.b"), F.json_tuple("j", "a", "b")
```

`explode` vs `explode_outer`: **`explode` drops rows with empty/null arrays.**
Another silent-data-loss trap.

---

## 7. Higher-order functions — the UDF killers

Spark 3.x lambdas that run **inside the JVM** — no Python serialisation:

```python
F.transform("arr", lambda x: x * 2)
F.filter("arr", lambda x: x > 0)
F.exists("arr", lambda x: x > 100)
F.forall("arr", lambda x: x.isNotNull())
F.aggregate("arr", F.lit(0), lambda acc, x: acc + x)
F.zip_with("a", "b", lambda x, y: x + y)
F.transform_keys, F.transform_values, F.map_filter, F.map_zip_with
```

> **Reach for these before writing a Python UDF.** Same expressiveness, an order of
> magnitude faster, and visible to Catalyst.
>
> If you genuinely need Python: **pandas UDFs** (`@F.pandas_udf`) are vectorised via
> Arrow and far faster than row-at-a-time `@F.udf`.

---

## 8. Hashing, partitioning, utility

```python
F.hash("id"), F.xxhash64("id"), F.crc32, F.md5, F.sha1, F.sha2("id", 256)
F.pmod(F.hash("id"), F.lit(64))     # ← the salting idiom, notes/spark.md §8
F.lit(1), F.col("x"), F.expr("CASE WHEN x > 0 THEN 1 ELSE 0 END")
F.broadcast(small_df)               # force a broadcast join
F.monotonically_increasing_id()     # unique, NOT contiguous, NOT deterministic
F.spark_partition_id(), F.input_file_name()
F.rand(seed), F.randn(seed)
F.rand()                            # ⚠ non-deterministic across task retries
```

**Inspecting skew quickly:**
```python
df.groupBy(F.spark_partition_id()).count().orderBy(F.desc("count")).show()
```

---

## 9. Trap list

| Trap | Reality |
|---|---|
| `count("col")` | Skips nulls; `count("*")` doesn't |
| `rank()` for dedup | Emits ties → duplicate rows. Use `row_number()` |
| `orderBy` in a window | Silently changes the frame to a running aggregate |
| `Window` with no `partitionBy` | Entire dataset in one task |
| `explode` | Drops rows with null/empty arrays — use `explode_outer` |
| `collect_list` | No map-side combine; unordered; OOM on hot keys |
| `first`/`last` | Nondeterministic without an ordered frame |
| `rand()` for salting | Changes on retry — use `pmod(hash(col), N)` |
| `monotonically_increasing_id()` | Not sequential, not stable across runs |
| Python `@udf` | Row-at-a-time serialisation; use built-ins or `pandas_udf` |

---

## 10. If you only memorise twenty

`col` `lit` `when/otherwise` `coalesce` `expr`
`row_number` `rank` `dense_rank` `lag` `lead`
`sum` `count` `countDistinct` `collect_list` `approx_count_distinct`
`explode` `split` `regexp_extract` `date_trunc` `to_date`

Plus the two idioms: **`row_number` dedup** and **`lag` sessionization**.
