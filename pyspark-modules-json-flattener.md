# PYSPARK MODULES - JSON FLATTENER

## CODE
```python
from pyspark.sql import DataFrame
from pyspark.sql.functions import col, explode_outer
from pyspark.sql.types import StructType, ArrayType
from typing import Dict
import re

class JSONFlattener:
    """
    A utility class to recursively flatten nested JSON structures in a Spark DataFrame.
    """
    def __init__(self):
        pass
    
    @staticmethod
    def rename_dataframe_cols(df: DataFrame, cols_mapping: Dict[str, str]) -> DataFrame:
        """
        Rename columns in a Spark DataFrame based on a given dictionary mapping.

        Args:
            df (DataFrame): Input Spark DataFrame.
            cols_mapping (Dict[str, str]): Dictionary mapping old column names to new ones.

        Returns:
            DataFrame: Spark DataFrame with renamed columns.
        """
        return df.select([col(c).alias(cols_mapping.get(c, c)) for c in df.columns])
    
    @staticmethod
    def update_column_names(df: DataFrame, index: int) -> DataFrame:
        """
        Append an index suffix to all column names to maintain uniqueness.

        Args:
            df (DataFrame): Input Spark DataFrame.
            index (int): Level index to append.

        Returns:
            DataFrame: DataFrame with updated column names.
        """
        return JSONFlattener.rename_dataframe_cols(df, {c: f"{c}*{index}" for c in df.columns})
    
    def flatten(self, df: DataFrame, index:int = 1) -> DataFrame:
        """
        Recursively flatten a nested JSON structure in a Spark DataFrame.

        Args:
            df (DataFrame): Spark DataFrame containing nested JSON.
            index (int, optional): Initial level index. Defaults to 1.

        Returns:
            DataFrame: Flattened DataFrame.
        """
        df = self.update_column_names(df, index) if index == 1 else df

        for field in df.schema.fields:
            col_name = field.name
            col_type = str(field.dataType)

            if col_type.startswith("ArrayType"):
                return self.flatten(df.withColumn(col_name, explode_outer(col(col_name))), index + 1)

            if col_type.startswith("StructType"):
                df_temp = df.withColumnRenamed(col_name, f"{col_name}#1") if col_name in col_type else df

                # Extract the current nested level using regex
                nested_level = int(re.findall(r"\*(\d+)", col_name)[-1])

                new_cols_mapping = {nested_col_name: f"{col_name}->{nested_col_name}*{nested_level + 1}" for nested_col_name in df_temp.select(f"{col_name}.*").columns}
                df_expanded = df_temp.select("*", f"{col_name}.*").drop(col_name)
                df_renamed = self.rename_dataframe_cols(df_expanded, new_cols_mapping)

                return self.flatten(df_renamed, index + 1)

        return df
```
## APPLY
```python
from pyspark.sql import SparkSession
from pyspark.conf import SparkConf

# Spark configuration
SPARK_PROPS = {
    "spark.master": "yarn",
}

# Initialize Spark session
conf = SparkConf().setAll(SPARK_PROPS.items())
spark = (
    SparkSession.builder
    .appName("json-flattener")
    .config(conf=conf)
    .enableHiveSupport()
    .getOrCreate()
)
sc = spark.sparkContext
sc.addPyFile('hdfs://nameservice1/user/username/utils/json_flattener.py')

from json_flattener import JSONFlattener
flattener = JSONFlattener()

df = flattener.flatten(json_df)
```