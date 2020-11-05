import "reflect-metadata";

import express from "express";
import helmet from "helmet";
import querystring from "querystring";
import express_enforces_ssl from "express-enforces-ssl";
import proxy from "express-http-proxy";
import { ApolloServer } from "apollo-server-express";

import { Context } from "./context";
import { getMeRequest } from "./util/me";
import { makeSchema } from "./schema";
import path from "path";
import { getSecretVariable, setAppEngineServiceAccountJson } from "./util/secrets";
import { GraphQLError } from "graphql";
import { superCreateConnection } from "./util/databaseCreation";
import { getEnvVariable } from "./util/getEnvVariable";
import fs from "fs";
import { ImageStorageService } from "./storage/images/image-storage-service";
import { ImageType } from "./storage/images/image-type";

const nodeModulesDirectory = getEnvVariable("NODE_MODULES_DIRECTORY", "node_modules");
const dataLibPackageFile = fs.readFileSync(nodeModulesDirectory + "/datapm-lib/package.json");
const dataLibPackageJSON = JSON.parse(dataLibPackageFile.toString());
const REGISTRY_API_VERSION = dataLibPackageJSON.version;

const REFERER_REGEX = /\/graphql\/?$/;

const app = express();

async function main() {
    // get secrets from environment variable or from secret manager
    // NOTE: getSecretVariable does not throw/fail. If the secret is unable
    // to be retrieved, a warning message is logged. Let the system fail
    // normally as if the variable went unset. This is because certain secrets
    // (such as SMTP_SERVER) is not required.
    await getSecretVariable("TYPEORM_PASSWORD");
    await getSecretVariable("SMTP_SERVER");
    await getSecretVariable("SMTP_PORT");
    await getSecretVariable("SMTP_FROM_ADDRESS");
    await getSecretVariable("SMTP_FROM_NAME");
    await getSecretVariable("SMTP_SECURE");
    await getSecretVariable("SMTP_USER");
    await getSecretVariable("SMTP_PASSWORD");

    await setAppEngineServiceAccountJson();

    const connection = await superCreateConnection();

    const context = async ({ req }: { req: express.Request }): Promise<Context> => ({
        request: req,
        me: await getMeRequest(req, connection.manager),
        connection: connection
    });

    const schema = await makeSchema();

    const server = new ApolloServer({
        schema,
        context,
        introspection: true,
        playground: true,
        tracing: true,
        uploads: {
            maxFileSize: 10_000_000, // 10 MB
            maxFiles: 1
        },
        engine: {
            sendVariableValues: { none: true },
            rewriteError: (err: GraphQLError) => {
                // attempt to remove PII from certain error messages
                err.message = err.message.replace(
                    /^(Variable "\$\S+" got invalid value )(.*?)( at ".*")?(;.*\.)$/,
                    (_match, p1, _p2, p3, p4) => `${p1}"HIDDEN"${p3 || ""}${p4}`
                );

                return err;
            },
            generateClientInfo: ({ request }) => {
                let clientName: string | undefined = undefined;
                let clientVersion: string | undefined = undefined;

                const headers = request.http?.headers;
                if (headers) {
                    clientName = headers.get("apollographql-client-name") ?? undefined;
                    clientVersion = headers.get("apollographql-client-version") ?? undefined;

                    const referer = headers.get("referer");
                    if (!clientName && !clientVersion && REFERER_REGEX.test(referer ?? "")) {
                        clientName = "playground";
                    }
                }

                return {
                    clientName,
                    clientVersion
                };
            }
        }
    });

    // security middleware for headers. See https://helmetjs.github.io/
    app.use(helmet());
    app.disable("x-powered-by");

    console.log(`Running in ${app.get("env")} mode`);

    // these two lines force the user to connect using HTTPS
    // App Engine terminates https and connects to express
    // using http
    if (app.get("env") !== "development") {
        app.enable("trust proxy");
        app.use(express_enforces_ssl());
    }

    const hstsMiddleware = helmet.hsts({
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    });

    // App Engine defines PORT as an environment variable. Otherwise, use 4000
    const port = process.env.PORT ? Number(process.env.PORT) : 4000;

    app.use((req, res, next) => {
        if (req.secure) {
            hstsMiddleware(req, res, next);
        } else {
            next();
        }
    });

    // format is /_sentry/original-url/path?query
    app.use(
        "/_sentry",
        // extract original-url
        proxy((req) => req.path.split("/")[1], {
            https: true,
            proxyReqPathResolver: (req) => {
                // get everything after original-url
                return `/${req.path.split("/").slice(2).join("/")}?${querystring.stringify(
                    req.query as NodeJS.Dict<string>
                )}`;
            }
        })
    );

    app.use("/docs/schema.gql", function (req, res, next) {
        res.sendFile(path.join(__dirname, "node_modules/datapm-lib/schema.gql"));
    });

    app.use("/docs/datapm-package-file-schema-v1.json", function (req, res, next) {
        res.sendFile(path.join(__dirname, "node_modules/datapm-lib/packageFileSchema.json"));
    });

    app.use("/robots.txt", function (req, res, next) {
        switch (req.hostname) {
            case "datapm.io":
                res.sendFile(path.join(__dirname, "robots-production.txt"));
                break;
            default:
                res.sendFile(path.join(__dirname, "robots.txt"));
        }
    });

    // these three routes serve angular static content
    app.use(
        "/static",
        express.static(path.join(__dirname, "..", "static"), {
            setHeaders: (res, path) => {
                // set cache to 1 year for anything that includes a hash
                const maxAge = path.match(/\.[a-fA-F0-9]{20}\.[^\/]+$/) ? 31536000 : 0;
                res.setHeader("Cache-Control", `public, max-age=${maxAge}`);
            }
        })
    );

    app.use(
        "/docs",
        express.static(path.join(__dirname, "..", "static/docs"), {
            setHeaders: (res, path) => {
                // set cache to 1 year for anything that includes a hash
                const maxAge = path.match(/\.[a-fA-F0-9]{20}\.[^\/]+$/) ? 31536000 : 0;
                res.setHeader("Cache-Control", `public, max-age=${maxAge}`);
            }
        })
    );

    app.use("/assets", express.static(path.join(__dirname, "..", "static", "assets")));

    // set express for the Apollo GraphQL server
    server.applyMiddleware({ app, bodyParserConfig: { limit: "20mb" } });

    const imageService = new ImageStorageService();
    app.use("/images/user/:username/avatar", (req, res, next) => {
        try {
            const imageEntityAndStream = imageService.getImageTypeForUser(
                req.params.username,
                ImageType.USER_AVATAR_IMAGE,
                connection
            );
            imageEntityAndStream
                .then((img) => {
                    res.set("Content-Type", img.entity.mimeType);
                    img.stream.on("error", (e) => next("Could not read image stream"));
                    img.stream.pipe(res);
                })
                .catch((error) => next("Could not fetch image"));
        } catch (err) {
            res.status(404).send();
            return;
        }
    });

    app.use("/images/user/:username/cover", (req, res, next) => {
        try {
            const imageEntityAndStream = imageService.getImageTypeForUser(
                req.params.username,
                ImageType.USER_COVER_IMAGE,
                connection
            );
            imageEntityAndStream
                .then((img) => {
                    res.set("Content-Type", img.entity.mimeType);
                    img.stream.on("error", (e) => next("Could not read image stream"));
                    img.stream.pipe(res);
                })
                .catch((error) => next("Could not fetch image"));
        } catch (err) {
            res.status(404).send();
            return;
        }
    });

    // any route not yet defined goes to index.html
    app.use("*", (req, res, next) => {
        res.setHeader("x-datapm-version", REGISTRY_API_VERSION);
        res.setHeader("x-datapm-graphql-path", "/grahql");
        res.sendFile(path.join(__dirname, "..", "static", "index.html"));
    });

    app.listen({ port }, () => {
        console.log(`🚀 Server ready at http://localhost:${port}`);
    });
}
main().catch((error) => console.log(error));
