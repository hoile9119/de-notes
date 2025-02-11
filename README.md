# Welcome to Data Engineer Notes
## GitHub Pages site locally with Jekyll
1. Prerequisites
    - Install [Ruby](https://www.ruby-lang.org/en/documentation/installation/)
    - Install [Bundler](https://bundler.io/)
    - Install [Jekyll](https://jekyllrb.com/docs/installation/)
2. Run
    ```bash
    # use --baseurl="/${repo_name} for dealing with url reference in local mode and production mode
    bundle exec jekyll serve --baseurl="/de-notes"
    ```
3. To preview your site, in your web browser, navigate to [http://localhost:4000](http://localhost:4000)

## SPARK
### [Config Generator](../de-notes/spark/config-generator)
### Spark Modules
-  [hdfs](../de-notes/spark/modules/hdfs)
-  [impala](../de-notes/spark/modules/impala)
-  [write](../de-notes/spark/modules/write)
-  [json](../de-notes/spark/modules/json)
-  [xml](../de-notes/spark/modules/xml)
-  [webhook](../de-notes/spark/modules/webhook)

### Table Format
- [iceberg](../de-notes/spark/table-format/iceberg)

## CONTAINERIZATION
- [setup](../de-notes/containerization/mac-setup)

## LLMs
- [deepseek](../de-notes/llms/deepseek)

## Test Contents
Following are the blogs that I compiled from my learnings on Spark:
- [Where does Spark fit in Hadoop ecosystem?](https://spoddutur.github.io/de-notes/hadoop-map-reduce-vs-spark)
- [How to Size Executors, Cores and Memory for a Spark application running in memory](https://spoddutur.github.io/de-notes/distribution_of_executors_cores_and_memory_for_spark_application)