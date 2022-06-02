---
id: command-line-client
title: DataPM Command Line Client
sidebar_label: Command Line Client
---

DataPM's mission is to make the world's data more accessible. This command line client helps you...

-   [Install the DataPM Command Line Client](#install-the-datapm-command-line-client)
-   [View Help Options](#view-help-options)
-   [Authenticate The Client](#authenticate-the-client)
-   [Search Registries](#search-registries)
-   [Consume Data](#consume-data)
-   [Publish Data](#publish-data)
-   [Add Registries](#add-registries)
-   [Manage Configuration](#manage-configuration)

The DataPM client is easily installed, and almost every task is a self explanatory single command execution. The DataPM client features an easy to use prompts system, and always gives you easy to copy next steps after each command.

## Install the DataPM Command Line Client

Download a DataPM Client Installer from the list below.

-   [Windows DataPM Client Installer](/client-installers/windows)
-   [MacOS DataPM Client Installer](/client-installers/macos)
-   [Debian & Ubuntu DataPM Client Package](/client-installers/debian)
-   [Redhat & Centos DataPM Client Package](/client-installers/redhat)

For Windows and MacOS installation, double click on the file and follow the onscreen instructions.

### Debian & Ubuntu Installation

If you are using the GUI, double click on the file and follow the onscreen instructions.

If you are using the command line, run the following command, replacing the last argument with a path to the downloaded file. The file name must end in ".deb"

```text
sudo apt install ./datapm-client-x.x.x-y.deb;
```

### Redhat & Centos Installation

If you are using the GUI, double click on the file and follow the onscreen instructions.

If you are using the command line, run the following command, replacing the last argument with a path to the downloaded file.

```text
sudo yum localinstall datapm-client-x.x.x-y.rpm;
```

## View Help Options

The command line client has a standard "--help" option that shows the available commands, and outputs help when you enter an unrecognized command option. Just append "--help" to any command to view more information.

```text
datapm --help

datapm publish --help
```

## Authenticate The Client

To publish packages or perform any authenticated tasks, you'll need to add an API key to your command line client. Here are the instructions to generate an API Key.

Use the following command to login directly from the command line client.

```
datapm registry login
```

### Alternatively, set an API key

If your user account requires SSO, you can manually create an API and apply it to your command line client.

1. Login to the registry you wish to use.
2. Click on your user icon at the top right.
3. Click on "My Profile"
4. Scroll down to "API Keys".
5. Enter a new API key name, such as your machine name.
6. Click "Create API Key".
7. Copy the API key and paste it into the command line client.

## Search Registries

You can [search the registry](/) registry using a modern web browser. Or use the following command to search via the command line client.

```text
datapm search "example search terms"
```

Your search result will include packages with titles, descriptions, or keywords that match your search terms.

## Consume Data

Use the datapm fetch command without any options to see all the source connectors and to quickly search packages on registries.

```text
datapm fetch
```

Use the following command to retrieve a data package from the datapm.io public registry.

```text
datapm fetch datapm/example
```

You can also fetch packages from other registries by specifying the package URL.

```text
datapm fetch https://datapm-example.company.com/catalog/package
```

You can also use the datapm fetch command to download data directly from source files, and other supported sources.

```text
datapm fetch ./data/example.csv
datapm fetch http://my-web-server.com/data/example-data.zip
```

## Publish Data

Use the command line client to create a data package file.

```text
datapm package
```

Follow the prompts to complete the package file. Then use the following command to publish the package.

```text
datapm publish my-package-file.datapm.json
```

You can update the schema and statistics in the package file using the following command.

```text
datapm update my-package-file.datapm.json
```

And then you can re-publish the updates using the same publish command above.

## Add Registries

By default the command line client only interacts with the the [datapm.io](https://datapm.io) registry. You can host your own private or public registries, and you will want to add those registries to your command line client.

```text
datapm registry add https://hostname.td
datapm registry login https://my.private.registry.com
```

You can also remove a registry with the following command

```text
datapm registry remove https://hostname.tld
```

## Manage Configuration

You can view the local client configuration using the following commands.

```text
datapm configuration show
```

Use the following command to reset the configuration to the default.

```text
datapm configuration reset
```
