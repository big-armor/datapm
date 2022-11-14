---
id: connectors
title: DataPM Connectors
sidebar_label: Connectors
---

DataPM supports many popular data repositories (file systems, databases, cloud services), and in the future will feature a developer kit to enable creating your own custom data connectors.

# Concepts

The datapm command line tool makes moving data between systems seamless and easily repeatable. For example, datapm can pull multiple schemas from Gzipped XML files on a web server, and write that data into a cloud database or your local file system. And the datapm client can help you automate these processes. The command line tool currently supports the following systems for reading and writing data.

# File Repositories

DataPM supports reading and writing files of specific formats (below) to the following file repositories.

| Name                           | Read Data |          Write Data          |
| :----------------------------- | :-------: | :--------------------------: |
| Standard Out/In (stdout/stdin) |   Read    |            Write             |
| Local File System              |   Read    |            Write             |
| HTTP                           |   Read    | (future POST/PUT operations) |
| SFTP                           | (future)  |           (future)           |
| FTP                            | (future)  |           (future)           |
| Azure Blob Storage             | (future)  |           (future)           |
| AWS S3                         |   Read    |            Write             |
| Google Cloud Storage           | (future)  |           (future)           |
| Azure Blob Storage             | (future)  |           (future)           |

## File Formats

DataPM can read and write records in the following file formats.

| Name  | Read Data | Write Data |
| :---- | :-------: | :--------: |
| CSV   |   Read    |   Write    |
| XML   |   Read    |  (future)  |
| JSON  |   Read    |   Write    |
| Avro  |   Read    |  (future)  |
| Excel |   Read    |  (future)  |

## File Archive Formats

DataPM can unwrap and read files from within the following archive file formats.

| Name  | Read Data | Write Data |
| :---- | :-------: | :--------: |
| GZip  |   Read    |  (future)  |
| BZip2 |   Read    |  (future)  |
| Zip   |   Read    |  (future)  |
| Tar   |   Read    |  (future)  |

# Databases

DataPM supports reading and writing records for the following databases.

| Name              |    Read Data    |    Write Data    |
| :---------------- | :-------------: | :--------------: |
| Google Big Query  |      Read       |      Write       |
| PostgreSQL        |      Read       |      Write       |
| MariaDB           |    (future)     | Write (untested) |
| MySQL             |    (future)     |      Write       |
| MongoDB           |    (future)     |      Write       |
| Oracle            |    (future)     |     (future)     |
| GCP Cloud Spanner |    (future)     |     (future)     |
| Snowflake         |    (future)     |     (future)     |
