```python
import logging
import os
import re
import random
import pandas as pd

from impala.dbapi import connect
from pyspark.sql import DataFrame, SparkSession
from pyspark.sql.functions import col, from_utc_timestamp, to_timestamp
from pyspark.sql.utils import AnalysisException




LOGGER = logging.getLogger(__name__)


class Impala:
    def __init__(self, bdp_impala_servers = 'worker01 worker02'):
#         --conf spark.yarn.appMasterEnv.BDP_IMPALA_SERVERS="${BDP_IMPALA_SERVERS}" \
#         self.workers = os.environ.get("BDP_IMPALA_SERVERS", "").split()
        self.workers = bdp_impala_servers.split()
        random.shuffle(self.workers)
        LOGGER.info(f"Impala workers: {self.workers}")

    def invalidate_metadata(self, schema_name: str, table_name: str):
        conn = self._connect()
        cursor = conn.cursor()
        sql_query = f"INVALIDATE METADATA {schema_name}.{table_name};"
        LOGGER.info(f"Executing Impala query: {sql_query}")
        try:
            cursor.execute(sql_query)
        except Exception as e:
            raise RuntimeError(f"Query execution failed with error: {e}")
        finally:
            cursor.close()
            conn.close()
            
    def refresh_table(self, schema_name: str, table_name: str):
        conn = self._connect()
        cursor = conn.cursor()
        sql_query = f"REFRESH {schema_name}.{table_name};"
        LOGGER.info(f"Executing Impala query: {sql_query}")
        try:
            cursor.execute(sql_query)
        except Exception as e:
            raise RuntimeError(f"Query execution failed with error: {e}")
        finally:
            cursor.close()
            conn.close()

    def _connect(self):
        for worker in self.workers:
            try:
                LOGGER.info(f"Attempting to connect to {worker}")
                conn = connect(host=worker,
                               port=21050,
                               auth_mechanism='GSSAPI',
                               use_ssl=True,
                               kerberos_service_name='impala')
                LOGGER.info(f"Successfully connected to {worker}")
                return conn
            except Exception as e:
                LOGGER.warning(f"Failed to connect to {worker} with error: {e}")
        raise RuntimeError("Failed to connect to Impala - no workers available")
```