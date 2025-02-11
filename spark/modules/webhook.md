# PYSPARK MODULES - WEBHOOK

## CODE
```python
import abc
import os
import datetime
import requests
import json

class WebhookNotifier(abc.ABC):
    def __init__(self):
        pass
    
    @abc.abstractmethod
    def send_alerts(self):
        pass
    
class TeamsWebhookNotifier(WebhookNotifier):
    def __init__(self, teams_webhook_url):
        super().__init__()
        self.TEAMS_WEBHOOK_URL = teams_webhook_url
        
    def send_alerts(self, job_name, job_id, error_message, log_url):
        # pyspark job failure
        start_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        end_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
        adaptive_card_template =  {
        "type": "message",
        "attachments": [
            {
                "contentType": "application/vnd.microsoft.card.adaptive",
                "content": {
                    "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                    "type": "AdaptiveCard",
                    "version": "1.4",
                    "body": [
                        {
                            "type": "TextBlock",
                            "text": "🔥 PySpark Job Failure Alert",
                            "weight": "Bolder",
                            "size": "Medium",
                            "color": "Attention"
                        },
                        {
                            "type": "FactSet",
                            "facts": [
                                {"title": "Job Name:", "value": f"**{job_name}**"},
                                {"title": "Job ID:", "value": job_id},
                                {"title": "Status:", "value": "❌ Failed"},
                                {"title": "Error Message:", "value": error_message},
                                {"title": "Start Time:", "value": start_time},
                                {"title": "End Time:", "value": end_time}
                            ]
                        },
                        {
                            "type": "TextBlock",
                            "text": "Check the logs for more details:",
                            "weight": "Bolder"
                        },
                        {
                            "type": "ActionSet",
                            "actions": [
                                {
                                    "type": "Action.OpenUrl",
                                    "title": "View Logs",
                                    "url": log_url
                                }
                            ]
                        }
                    ]
                }
            }
        ]
    }
        # Send request to Microsoft Teams
        headers = {"Content-Type": "application/json"}
        response = requests.post(self.TEAMS_WEBHOOK_URL, headers=headers, data=json.dumps(adaptive_card_template))

        # Print response status
        if response.status_code == 200 or response.status_code == 201:
            print("✅ Notification sent successfully!")
        else:
            print(f"❌ Failed to send notification: {response.status_code}, {response.text}")
```

## APPLY
```python
# note: remember to set --conf spark.yarn.appMasterEnv.proxy="${proxy}" in spark-submit.sh to be able to send request out side the cluster`

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
                    .appName("spark-modules-webhook-notifier")
                    .config(conf=conf)
                    .enableHiveSupport()
                    .getOrCreate()
)

sc = spark.sparkContext

sc.addPyFile("hdfs://nameservice1/user/username/utils/webhook_notifier.py")

from webhook_notifier import TeamsWebhookNotifier

webhook = TeamsWebhookNotifier(webhook_url)

webhook.send_alerts(
        job_name="Test Module Webhook Processing Job",
        job_id="12345",
        error_message="SparkOutOfMemoryError: GC overhead limit exceeded",
        log_url="https://your-log-url"
    )
```