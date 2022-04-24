# DataPM

[DataPM.io](https://datapm.io) is a free, open-source, and easy-to-use data distribution platform. Use DataPM to quickly create data catalogs. The DataPM client can quickly ETL the cataloged data directly into many databases, file systems, cloud platforms, etc. 

See the [backend/README.md](backend/README.md) file for server side development instructions.

See the [client/README.md](client/README.md) file for client developer instructions.

# Full Project Build Instructions

Use npm in the top level directory to build all submodules and produce a docker image.

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
http://localhost:1080
```

## Report Security Vulnerabilities

View the [Security.MD](SECURITY.md) file for instructions on how to report vulnerabilities.

## License

See [https://datapm.io/docs/license](https://datapm.io/docs/license)
