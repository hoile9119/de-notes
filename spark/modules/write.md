# PYSPARK MODULES - WRITE TABLE

## CODE

```python
import math
from typing import Dict
from pyspark.sql import DataFrame, SparkSession
from pyspark.sql.functions import rand, col, hash
from hdfs import HDFS


class WriteTable:
    def __init__(self, spark: SparkSession, table_config: Dict):
        """
        Initializes WriteTable with SparkSession and table configuration.

        Args:
            spark (SparkSession): The SparkSession instance.
            table_config (Dict): Table configuration containing 'schema_name', 'table_name', and 'partition_cols'.
        """
        self.spark = spark
        self.table_config = table_config
        self.hdfs = HDFS(self.spark)
        self.hdfs_path = f"/user/hive/warehouse/{self.table_config['schema_name']}.db/{self.table_config['table_name']}"

    def _clean_hdfs_path(self, path: str):
        """
        Removes a specified HDFS path if it exists.

        Args:
            path (str): The HDFS path to clean.
        """
        hdfs_path = self.hdfs.get_path(path)
        if self.hdfs.fs.exists(hdfs_path):
            self.hdfs.fs.delete(hdfs_path)

    def _calculate_compaction_params(self, tmp_path: str) -> int:
        """
        Calculates the optimal number of partitions for compaction.

        Args:
            tmp_path (str): Temporary HDFS path for calculation.

        Returns:
            int: The number of partitions to compact to.
        """
        hdfs_block_size_bytes = int(self.hdfs.hadoop_conf.get("dfs.blocksize"))
        tmp_path_size_bytes = self.hdfs.fs.getContentSummary(self.hdfs.get_path(tmp_path)).getLength()
        tmp_path_partitions = len(self.hdfs.fs.listStatus(self.hdfs.get_path(tmp_path))) - 1

        compact_to_per_partition = math.ceil(tmp_path_size_bytes / hdfs_block_size_bytes / tmp_path_partitions)
        return compact_to_per_partition * tmp_path_partitions

    def _write_with_compaction(self, df: DataFrame):
        """
        Writes the DataFrame to HDFS with compaction enabled.

        Args:
            df (DataFrame): The DataFrame to write.
        """
        tmp_hdfs_path = f"{self.hdfs_path}_tmp"
        self._clean_hdfs_path(tmp_hdfs_path)

        # Initial write to temporary path
        df.write \
            .partitionBy(*self.table_config['partition_cols']) \
            .option("compression", "snappy") \
            .parquet(tmp_hdfs_path)

        # Calculate optimal compaction parameters
        compact_to = self._calculate_compaction_params(tmp_hdfs_path)

        # Perform compaction
        compacted_df = df.withColumn("bdp_hash", hash(*self.table_config['partition_cols'])) \
            .withColumn("bdp_rand", rand()) \
            .repartitionByRange(compact_to, col("bdp_hash"), col("bdp_rand")) \
            .drop("bdp_hash", "bdp_rand")

        compacted_df.write \
            .format("parquet") \
            .option("compression", "snappy") \
            .option("path", self.hdfs_path) \
            .partitionBy(*self.table_config['partition_cols']) \
            .saveAsTable(f"{self.table_config['schema_name']}.{self.table_config['table_name']}", mode = "overwrite")

        # Clean up temporary path
        self._clean_hdfs_path(tmp_hdfs_path)

    def _write_without_compaction(self, df: DataFrame):
        """
        Writes the DataFrame to HDFS without compaction.

        Args:
            df (DataFrame): The DataFrame to write.
        """
        df.write \
            .format("parquet") \
            .option("compression", "snappy") \
            .option("path", self.hdfs_path) \
            .partitionBy(*self.table_config['partition_cols']) \
            .saveAsTable(f"{self.table_config['schema_name']}.{self.table_config['table_name']}", mode = "overwrite")

    def write_data(self, df: DataFrame, with_compaction: bool = False):
        """
        Writes the DataFrame to the specified table with optional compaction.

        Args:
            df (DataFrame): The DataFrame to write.
            with_compaction (bool): Whether to enable compaction.
        """
        if with_compaction:
            self._write_with_compaction(df)
        else:
            self._write_without_compaction(df)
```

## APPLY
```python
from pyspark.sql import SparkSession
from pyspark.conf import SparkConf
from pyspark.context import SparkContext
from pyspark.sql.functions import col, expr, udf, posexplode, explode
from pyspark.sql.types import (
    ArrayType,
    BooleanType,
    LongType,
    StringType,
    StructField,
    StructType,
)
sparkProps = {
"spark.master": "yarn",
"spark.port.maxRetries":100,
"spark.driver.cores": 1,
"spark.driver.memory": "2g",
"spark.driver.maxResultSize": "2g",    
"spark.executor.instances":"2",
"spark.executor.cores": 2,
"spark.executor.memory": "4g",
"spark.sql.sources.partitionOverwriteMode": "dynamic", 
"spark.hadoop.hive.exec.dynamic.partition":True,
"spark.hadoop.hive.exec.dynamic.partition.mode":"nonstrict",
"spark.sql.session.timeZone":"Asia/Ho_Chi_Minh",
"spark.dynamicAllocation.enabled": False
}


conf = SparkConf().setAll(list(sparkProps.items()))
spark = (
        SparkSession.builder
                    .appName("spark-modules-write-table")
                    .config(conf=conf)
                    .enableHiveSupport()
                    .getOrCreate()
)

sc = spark.sparkContext

sc.addPyFile('hdfs://nameservice1/user/username/utils/hdfs.py')
sc.addPyFile('hdfs://nameservice1/user/username/utils/write_table.py')

from hdfs import HDFS
from write_table import WriteTable


tbl_conf = {
    'schema_name': "sink_schema_name",
    'table_name': "sink_table_name",
    'partition_cols': ["part_date"]
}
write_table = WriteTable(spark, table_config = tbl_conf)

df = spark.sql("select * from source_schema_name.source_table_name where part_date = '20220104' or part_date='20220103'")

write_table.write_data(df, with_compaction = True)

```