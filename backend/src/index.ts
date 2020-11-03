import "reflect-metadata";

import express from "express";
import helmet from "helmet";
import querystring from "querystring";
import express_enforces_ssl from "express-enforces-ssl";
import proxy from "express-http-proxy";
import { ApolloServer } from "apollo-server-express";

import { Context } from "./context";
import { getMeRequest, getMeSub } from "./util/me";
import { registerBucketHosting } from "./util/storage";
import { makeSchema } from "./schema";
import path from "path";
import { getSecretVariable, setAppEngineServiceAccountJson } from "./util/secrets";
import { createDataLoaders } from "./dataLoaders";
import { GraphQLError } from "graphql";
import { superCreateConnection } from "./util/databaseCreation";
import jwt from "express-jwt";
import { getEnvVariable } from "./util/getEnvVariable";
import fs from "fs";

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
        connection: connection,
        dataLoaders: createDataLoaders()
    });

    const schema = await makeSchema();

    const server = new ApolloServer({
        schema,
        context,
        introspection: true,
        playground: true,
        tracing: true,
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

    // when using FileSystemStorage for media files, sets up file hosting
    registerBucketHosting(app, "/bucket", port);

    // set express for the Apollo GraphQL server
    server.applyMiddleware({ app, bodyParserConfig: { limit: "1mb" } });

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
