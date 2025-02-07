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
1. [hdfs](../de-notes/spark/modules/hdfs)
2. [impala](../de-notes/spark/modules/impala)
3. [write](../de-notes/spark/modules/write)
4. [json](../de-notes/spark/modules/json)
5. [xml](../de-notes/spark/modules/xml)

### Table Format
1. [iceberg](../de-notes/spark/table-format/iceberg)

## CONTAINERIZATION
1. [mac-setup](../de-notes/containerization/mac-setup)

## LLMs
1. [deepseek](../de-notes/llms/deepseek)

## Test Contents
Following are the blogs that I compiled from my learnings on Spark:
- [Where does Spark fit in Hadoop ecosystem?](https://spoddutur.github.io/de-notes/hadoop-map-reduce-vs-spark)
- [How to Size Executors, Cores and Memory for a Spark application running in memory](https://spoddutur.github.io/de-notes/distribution_of_executors_cores_and_memory_for_spark_application)