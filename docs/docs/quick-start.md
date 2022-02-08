---
id: quick-start
title: Quick Start Guide
sidebar_label: Quick Start
---

DataPM helps you quickly publish and consume data. Let's start with some concepts.

## Quick Concepts

Visit [datapm.io](https://datapm.io) to search and discover packages of data. Then use the command line client to fetch those packages. You can publish your own data packages, and host your own private registry!

[View full concepts documentation](concepts.md)

## Install the DataPM Command Line Client

Download a DataPM Client Installer from the list below.

-   [Windows DataPM Client Installer](/client-installers/windows)
-   [MacOS DataPM Client Installer](/client-installers/macos)
-   [Debian & Ubuntu DataPM Client Package](/client-installers/debian)

Run the installer by double clicking on it. Follow the instructions.

[View full install instructions](command-line-client.md)

## Search, Consume, and Publish Data Packages

You can search the public [datapm.io](https://datapm.io) registry using a modern web browser. Or use the following command to search via the command line client.

```text
datapm search "example search"
```

Then fetch a specific data package.

```text
datapm fetch datapm/example
```

Generate your own packages from a publicly available data set.

```text
datapm package https://some-web-server.com/path/to/data.csv
```

You can also create packages of data from databases, cloud systems, and many other sources. Use the following command to see all available sources.

```text
datapm package
```

You can update the schema and statistics in the package file using the following command.

```text
datapm update my-package-file.datapm.json
```

You can edit properties and descriptions of a package using the edit command.

```text
datapm edit my-package-file.datapm.json
```

Finally, you can publish your package to a registry with the following command.

```text
datapm publish my-package-file.datapm.json
```

And then you can re-publish the updates using the same publish command above. Or using the update command directly on the registry.

```text
datapm update my-catalog/my-package
```

[View full command line documentation](command-line-client.md)

## Host A Private Registry

DataPM offers the Registry as a free Docker image. [View full private registry documentation](private-registry.md) for a detailed description of how to host your own registry.
