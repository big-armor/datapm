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
import { Readable, Stream } from "stream";
import fs from "fs";
import { ImageStorageService } from "./storage/images/image-storage-service";

const dataLibPackageFile = fs.readFileSync("node_modules/datapm-lib/package.json");
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

    const respondWithImage = async function (imageStream: Readable, response: express.Response) {
        const imageBuffer = await new Promise<Buffer>((res) => {
            var bufs: any[] = [];
            imageStream.on("data", function (d) {
                bufs.push(d);
            });
            imageStream.on("end", function () {
                var buf = Buffer.concat(bufs);
                res(buf);
            });
        });

        response.set("content-type", "image/jpeg");
        response.set("content-length", imageBuffer.length.toString());

        response.end(imageBuffer);
    };

    const imageService = ImageStorageService.INSTANCE;
    app.use("/images/user/:username/avatar", async (req, res, next) => {
        try {
            await respondWithImage(await imageService.readUserAvatarImage(req.params.username), res);
        } catch (err) {
            res.status(404).send();
            return;
        }
    });

    app.use("/images/user/:username/cover", async (req, res, next) => {
        try {
            await respondWithImage(await imageService.readUserCoverImage(req.params.username), res);
        } catch (err) {
            res.status(404).send();
            return;
        }
    });

    // any route not yet defined goes to index.html
    app.use("*", (req, res, next) => {
        res.setHeader("x-datapm-version", REGISTRY_API_VERSION);
        res.setHeader("x-datapm-graphql-path", "/graphql"); // TODO support other paths
        res.sendFile(path.join(__dirname, "..", "static", "index.html"));
    });

    app.listen({ port }, () => {
        console.log(`🚀 Server ready at http://localhost:${port}`);
    });
}
main().catch((error) => console.log(error));
