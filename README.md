## Testing GitHub Pages site locally with Jekyll
1. Prerequisites
    - Install [Ruby](https://www.ruby-lang.org/en/documentation/installation/)
    - Install [Bundler](https://bundler.io/)
    - Install [Jekyll](https://jekyllrb.com/docs/installation/)
2. Run
    ```bash
    # use --baseurl="/${repo_name} for dealing with url reference in local mode and production mode
    bundle exec jekyll serve --baseurl="/spark-notes"
    ```
3. To preview your site, in your web browser, navigate to [http://localhost:4000](http://localhost:4000)

## Spark Config Generator
- [Spark Conf Generator](../spark-notes/spark-conf-generator)

## Deepseek with VSCode
- [Deepseek with VSCode](../spark-notes/deepseek-with-vscode)

## Parsing nested XML using XSD structure -> ON HOLD
- [Parsing nested XML](../spark-notes/parsing-nested-xml)

## Apache Iceberg guide
- [Apache Iceberg Guide](../spark-notes/apache-iceberg-guide)
- [Iceberg 101](https://www.dremio.com/blog/apache-iceberg-101-your-guide-to-learning-apache-iceberg-concepts-and-practices/)
- [Architecture](https://www.dremio.com/resources/guides/apache-iceberg-an-architectural-look-under-the-covers/)

## Pyspark Modules
- [hdfs](../spark-notes/pyspark-modules-hdfs)
- [impala](../spark-notes/pyspark-modules-impala)
- [write-table](../spark-notes/pyspark-modules-write-table)
- [json-flattener](../spark-notes/pyspark-modules-json-flattener)

## Containerization
- [Containerization](../spark-notes/containerization)

### TO DO

## Poetry with Conda
- [Poetry with Conda](https://michhar.github.io/2023-07-poetry-with-conda/)

## Spark streaming

## References Contents
- [Spark Conf Optimizer](https://sparkconfigoptimizer.com/)

## Test Contents
Following are the blogs that I compiled from my learnings on Spark:
- [Where does Spark fit in Hadoop ecosystem?](https://spoddutur.github.io/spark-notes/hadoop-map-reduce-vs-spark)
- [How to Size Executors, Cores and Memory for a Spark application running in memory](https://spoddutur.github.io/spark-notes/distribution_of_executors_cores_and_memory_for_spark_application)
- [Deep dive into Spark Data Layout](https://spoddutur.github.io/spark-notes/deep_dive_into_storage_formats)
- [Evolution of Second generation Tungsten Engine](https://spoddutur.github.io/spark-notes/second_generation_tungsten_engine)
- [Task Memory Management in ApacheSpark](https://spoddutur.github.io/spark-notes/task_memory_management_in_spark)
- [Spark as cloud-based SQL Engine for BigData via ThriftServer](https://spoddutur.github.io/spark-notes/spark-as-cloud-based-sql-engine-via-thrift-server)
- [Building real-time interactive applications with Spark](https://spoddutur.github.io/spark-notes/build-real-time-interations-with-spark)
- [Spark as Knowledge Browser and the impact of DataSchema on performance](https://spoddutur.github.io/spark-notes/knowledge-browser)
- [Rebroadcasting a Broadcast Variable](https://spoddutur.github.io/spark-notes/rebroadcast_a_broadcast_variable)
- [How to weave a periodically changing cached-data with your streaming application?](https://spoddutur.github.io/spark-notes/weaving_a_changing_broadcast_variable)
- [Spark-Scala Setup in Jupyter](https://spoddutur.github.io/spark-notes/jupyter-spark-setup)
- [Troubles of using filesystem (S3/HDFS) as data source in Spark](https://spoddutur.github.io/spark-notes/s3-filesystem-as-datasource-in-spark)