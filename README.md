# DataPM

[DataPM.io](https://datapm.io) is a free, open-source, and easy-to-use data distribution platform. Use DataPM to quickly create data catalogs. The DataPM client can ETL the cataloged data directly into many databases, file systems, cloud platforms, etc.

See the [backend/README.md](backend/README.md) file for server side development instructions.

See the [client/README.md](client/README.md) file for client developer instructions.

# Join Our Slack Community

Use the link below to join our Slack community, where we chat about DataPM, data engineering, interesting data packages, and code.

https://communityinviter.com/apps/datapm-io/datapm

# Developer Guides

See the [client-lib/CONNECTORS.md](client-lib/CONNECTORS.md) file for creating source and sink connectors.

See the [client/README.md](client/README.md) file for client developer instructions.

See the [backend/README.md](backend/README.md) file for server side development instructions.

See the [frontend/README.md](frontend/README.md) file for frontend developer instructions.

# Full Project Build Instructions

To build the entire project, use the following commands. This will produce a docker image.

Note: If you want to develop or run tests in the client or server, see the [client/README.md](client/README.md) and [backend/README.md](backend/README.md) files for instructions. The commands below are for final project builds, and not for development or testing purposes.

```

npm ci
npm run build

```

This produces a docker image labeled datapm-registry. You can then use the following command to run the locally built docker image and all of it's supporting services.

```

npm run start

```

This "local-build" of docker provides a [maildev] SMTP server - which does not forward mail! To view any email sent by the registry server, simply open the maildev web interface on port 1080.

```
# MailDev UI
http://localhost:1080

```

## Report Security Vulnerabilities

View the [Security.MD](SECURITY.md) file for instructions on how to report vulnerabilities.

## License

See [https://datapm.io/docs/license](https://datapm.io/docs/license)

```

```
