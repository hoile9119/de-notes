```python

from pyspark.sql import SparkSession

class HDFS:
    def __init__(self, spark: SparkSession):
        self.spark = spark
        self.hadoop_conf = spark.sparkContext._jsc.hadoopConfiguration()
        self.hadoop_conf.set("fs.trash.interval", "0")  # Disable trash
        self.fs = spark._jvm.org.apache.hadoop.fs.FileSystem.get(self.hadoop_conf)

    def get_path(self, path_parent: str, child: str = None):
        if child:
            return self.spark._jvm.org.apache.hadoop.fs.Path(path_parent, child)
        else:
            return self.spark._jvm.org.apache.hadoop.fs.Path(path_parent)
```