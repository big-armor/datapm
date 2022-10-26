import "reflect-metadata";

import express from "express";
import helmet from "helmet";
import querystring from "querystring";
// eslint-disable-next-line camelcase
import express_enforces_ssl from "express-enforces-ssl";
import proxy from "express-http-proxy";
import { ApolloServer } from "apollo-server-express";

import { AuthenticatedHTTPContext, AuthenticatedSocketContext, HTTPContext, SocketContext } from "./context";
import { getMeFromAPIKey, getMeJwt, getMeRequest } from "./util/me";
import { makeSchema } from "./schema";
import path from "path";
import { getSecretVariable } from "./util/secrets";
import { GraphQLError } from "graphql";
import { superCreateConnection } from "./util/databaseCreation";
import { Readable } from "stream";
import fs from "fs";
import { ImageStorageService } from "./storage/images/image-storage-service";
import { UserRepository } from "./repository/UserRepository";
import { PackageRepository } from "./repository/PackageRepository";
import { CatalogRepository } from "./repository/CatalogRepository";
import { CollectionRepository } from "./repository/CollectionRepository";
import { LeaderElectionService } from "./service/leader-election-service";
import { DistributedLockingService } from "./service/distributed-locking-service";
import { SessionCache } from "./session-cache";
import socketio from "socket.io";
import http from "http";
import { SocketConnectionHandler } from "./socket/SocketHandler";
// eslint-disable-next-line node/no-deprecated-api
import { parse } from "url";
import { libPackageVersion } from "datapm-lib";
import {
    generateCatalogSiteMap,
    generateCollectionsSiteMap,
    generatePackageSiteMap,
    generateSiteMapIndex,
    generateStaticSiteMap
} from "./util/SiteMapUtil";
import * as SegfaultHandler from "segfault-raub";
import { GroupRepository } from "./repository/GroupRepository";
import { getEnvVariable } from "./util/getEnvVariable";
import { parseJwt } from "./util/jwt";

console.log("DataPM Registry Server Starting...");

const REGISTRY_API_VERSION = libPackageVersion();

const REFERER_REGEX = /\/graphql\/?$/;

const app = express();

async function main() {
    process.title = "DataPM Registry Server";

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

    // Create Database Connection
    const connection = await superCreateConnection();

    const distributedLockingService = new DistributedLockingService();

    const leaderElectionService = new LeaderElectionService(distributedLockingService, connection);

    // Do not await the next line, as it is a long running operation
    leaderElectionService.start();

    process.on("exit", async () => {
        console.log("DataPM Registry Server Stoping... ");
        await leaderElectionService.stop();
        await distributedLockingService.stop();
    });

    const context = async ({ req }: { req: express.Request }): Promise<HTTPContext | AuthenticatedHTTPContext> => {
        const me = await getMeRequest(req, connection.manager);

        if (!me) {
            return {
                request: req,
                connection: connection,
                cache: new SessionCache()
            };
        }

        let isAdmin = me.isAdmin;

        if (!isAdmin) {
            isAdmin = await connection.getCustomRepository(GroupRepository).userIsMemberOfAdminGroup(me);
        }

        return {
            request: req,
            me,
            isAdmin,
            connection: connection,
            cache: new SessionCache()
        };
    };

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
                let clientName: string | undefined;
                let clientVersion: string | undefined;

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

    app.use("/static/schema.gql", function (req, res, next) {
        res.set("content-type", "application/graphql");
        res.send(fs.readFileSync("node_modules/datapm-lib/schema.gql"));
    });

    app.use("/static/datapm-package-file-schema-v1.json", function (req, res, next) {
        res.set("content-type", "application/json");
        res.send(fs.readFileSync("node_modules/datapm-lib/packageFileSchema-v0.1.0.json"));
    });

    app.use("/static/datapm-package-file-schema-current.json", function (req, res, next) {
        res.set("content-type", "application/json");

        const files = fs.readdirSync("node_modules/datapm-lib/");
        const packageFiles = files.filter((f) => f.startsWith("packageFileSchema-")).sort();

        res.send(fs.readFileSync("node_modules/datapm-lib/" + packageFiles[packageFiles.length - 1]));
    });

    app.use("/static/datapm-package-file-schema-*", function (req, res, next) {
        const version = req.baseUrl.match(/^\/static\/datapm-package-file-schema-v(.*)\.json$/i);
        if (version == null) {
            res.sendStatus(404);
            return;
        }

        res.send(fs.readFileSync("node_modules/datapm-lib/packageFileSchema-v" + version[1] + ".json"));
    });

    app.use("/robots.txt", function (req, res, next) {
        if (
            process.env.ALLOW_WEB_CRAWLERS === "true" ||
            process.env.ALLOW_WEB_CRAWLERS === "1" ||
            process.env.ALLOW_WEB_CRAWLERS === "yes"
        ) {
            const localRobotsTxt = path.join(__dirname, "robots-production.txt");
            const staticRobotsTxt = path.join(__dirname, "..", "static", "robots-production.txt");
            let content = "";
            if (fs.existsSync(localRobotsTxt)) content = fs.readFileSync(localRobotsTxt, "utf-8").toString();
            else if (fs.existsSync(staticRobotsTxt)) content = fs.readFileSync(staticRobotsTxt, "utf-8").toString();
            else {
                res.sendStatus(404);
                return;
            }

            // eslint-disable-next-line no-template-curly-in-string
            content = content.replace("${REGISTRY_URL}", getEnvVariable("REGISTRY_URL") as string);

            res.header("Content-Type", "text/plain").send(content);
            return;
        }

        const localRobotsTxt2 = path.join(__dirname, "robots.txt");
        const staticRobotsTxt2 = path.join(__dirname, "..", "static", "robots.txt");

        if (fs.existsSync(localRobotsTxt2)) res.header("Content-Type", "text/plain").sendFile(localRobotsTxt2);
        else if (fs.existsSync(staticRobotsTxt2)) res.header("Content-Type", "text/plain").sendFile(staticRobotsTxt2);
    });

    /** Terraform script Downloads */
    app.use("/static/terraform-scripts/:type", async (req, res, next) => {
        const terraFormScriptsDirectory = path.join(__dirname, "static", "terraform-scripts");

        if (!fs.existsSync(terraFormScriptsDirectory)) {
            res.sendStatus(404);
            return;
        }

        const files = fs.readdirSync(terraFormScriptsDirectory);

        let startsWith: string | undefined;

        if (req.params.type === "gcp") {
            startsWith = "datapm-gcp-terraform-";
        }

        if (startsWith === undefined) {
            res.sendStatus(403);
            return;
        }

        const file = files.find((f) => f.startsWith(startsWith as string) && f.endsWith(".zip"));

        if (file == null) {
            res.sendStatus(404);
            return;
        }

        res.setHeader("Content-Type", "application/zip");
        res.setHeader("Transfer-Encoding", "chunked");
        res.setHeader("Content-Disposition", `attachment; filename="${file}"`);

        const filePath = path.join(terraFormScriptsDirectory, file);

        const reader = fs.createReadStream(filePath);

        reader.once("close", () => {
            res.end();
        });

        reader.once("open", () => {
            reader.pipe(res);
        });
    });

    // These three routes serve angular static content
    app.use(
        "/static",
        express.static(path.join(__dirname, "..", "static"), {
            setHeaders: (res, path) => {
                // set cache to 1 year for anything that includes a hash
                const maxAge = path.match(/\.[a-fA-F0-9]{20}\.[^\\/]+$/) ? 31536000 : 0;
                res.setHeader("Cache-Control", `public, max-age=${maxAge}`);
            }
        })
    );

    app.use(
        "/docs",
        express.static(path.join(__dirname, "..", "static/docs"), {
            setHeaders: (res, path) => {
                // set cache to 1 year for anything that includes a hash
                const maxAge = path.match(/\.[a-fA-F0-9]{20}\.[^\\/]+$/) ? 31536000 : 0;
                res.setHeader("Cache-Control", `public, max-age=${maxAge}`);
            }
        })
    );

    app.use("/assets", express.static(path.join(__dirname, "..", "static", "assets")));
    app.use("/favicon.ico", express.static(path.join(__dirname, "favicon.ico")));

    // Set express for the Apollo GraphQL server
    server.applyMiddleware({ app, bodyParserConfig: { limit: "20mb" } });

    const respondWithReadable = async (readable: Readable, response: express.Response) => {
        const imageBuffer = await new Promise<Buffer>((resolve) => {
            const bufferedData: Array<Uint8Array> = [];
            readable.on("data", (d) => {
                bufferedData.push(d);
            });
            readable.on("end", () => {
                const buffer = Buffer.concat(bufferedData);
                resolve(buffer);
            });
        });

        response.set("content-type", "image/jpeg");
        response.set("content-length", imageBuffer.length.toString());
        response.end(imageBuffer);
    };

    const imageService = ImageStorageService.INSTANCE;

    app.use("/images/user/:username/avatar", async (req, res, next) => {
        try {
            const contextObject = context({ req });
            const user = await (await contextObject).connection
                .getCustomRepository(UserRepository)
                .findUserByUserName({ username: req.params.username });

            if (user == null) {
                res.sendStatus(404);
                return;
            }

            await respondWithReadable(await imageService.readUserAvatarImage(user.id), res);
        } catch (err) {
            res.status(404).send();
        }
    });

    app.use("/images/user/:username/cover", async (req, res, next) => {
        try {
            const contextObject = context({ req });
            const user = await (await contextObject).connection
                .getCustomRepository(UserRepository)
                .findUserByUserName({ username: req.params.username });

            if (user == null) {
                res.sendStatus(404);
                return;
            }

            await respondWithReadable(await imageService.readUserCoverImage(user.id), res);
        } catch (err) {
            res.status(404).send();
        }
    });

    app.use("/images/package/:catalogSlug/:packageSlug/cover", async (req, res, next) => {
        try {
            const contextObject = context({ req });
            const user = await (await contextObject).connection
                .getCustomRepository(PackageRepository)
                .findPackageOrFail({
                    identifier: { catalogSlug: req.params.catalogSlug, packageSlug: req.params.packageSlug }
                });
            await respondWithReadable(await imageService.readPackageCoverImage(user.id), res);
        } catch (err) {
            res.status(404).send();
        }
    });

    app.use("/images/catalog/:catalogSlug/avatar", async (req, res, next) => {
        try {
            const contextObject = context({ req });
            const user = await (await contextObject).connection
                .getCustomRepository(CatalogRepository)
                .findCatalogBySlugOrFail(req.params.catalogSlug);
            await respondWithReadable(await imageService.readCatalogAvatarImage(user.id), res);
        } catch (err) {
            res.status(404).send();
        }
    });

    app.use("/images/catalog/:catalogSlug/cover", async (req, res, next) => {
        try {
            const contextObject = context({ req });
            const user = await (await contextObject).connection
                .getCustomRepository(CatalogRepository)
                .findCatalogBySlugOrFail(req.params.catalogSlug);
            await respondWithReadable(await imageService.readCatalogCoverImage(user.id), res);
        } catch (err) {
            res.status(404).send();
        }
    });

    app.use("/images/collection/:collectionSlug/cover", async (req, res, next) => {
        try {
            const contextObject = context({ req });
            const collection = await (await contextObject).connection
                .getCustomRepository(CollectionRepository)
                .findCollectionBySlugOrFail(req.params.collectionSlug);
            await respondWithReadable(await imageService.readCollectionCoverImage(collection.id), res);
        } catch (err) {
            res.status(404).send();
        }
    });

    /** Client Installer Downloads */
    app.use("/client-installers/:type", async (req, res, next) => {
        let installerFileNameEndsWith = "not-found.something";

        switch (req.params.type) {
            case "windows": {
                installerFileNameEndsWith = ".msixbundle";
                break;
            }
            case "macos": {
                installerFileNameEndsWith = ".pkg";
                break;
            }
            case "debian": {
                installerFileNameEndsWith = ".deb";
                break;
            }
            case "redhat": {
                installerFileNameEndsWith = ".rpm";
                break;
            }
            default: {
                res.sendStatus(404);
                return;
            }
        }

        const clientInstallersPath = path.join(__dirname, "client-installers");

        if (!fs.existsSync(clientInstallersPath)) {
            res.sendStatus(404);
            return;
        }

        const installerFiles = fs.readdirSync(clientInstallersPath);

        const installerFile = installerFiles.find((file) => file.endsWith(installerFileNameEndsWith));

        if (!installerFile) {
            res.sendStatus(404);
            return;
        }

        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader("Transfer-Encoding", "chunked");
        res.setHeader("Content-Disposition", `attachment; filename="${installerFile}"`);

        const filePath = path.join(__dirname, "client-installers", installerFile);

        const reader = fs.createReadStream(filePath);

        reader.once("close", () => {
            res.end();
        });

        reader.once("open", () => {
            reader.pipe(res);
        });
    });

    app.use("/sitemap.xml", async (req, res, next) => {
        const contextObject = await context({ req });

        const siteMapContents = await generateSiteMapIndex(contextObject);
        res.setHeader("Content-Type", "application/xml");
        res.setHeader("Content-Length", siteMapContents.length);

        res.send(siteMapContents);
    });

    app.use("/sitemap_static.xml", async (req, res, next) => {
        const siteMapContents = await generateStaticSiteMap();
        res.setHeader("Content-Type", "application/xml");
        res.setHeader("Content-Length", siteMapContents.length);

        res.send(siteMapContents);
    });

    app.use("/sitemap_collections_:mapNumber.xml", async (req, res, next) => {
        const contextObject = await context({ req });

        const mapNumber = parseInt(req.params.mapNumber);

        const siteMapContents = await generateCollectionsSiteMap(mapNumber, contextObject);
        res.setHeader("Content-Type", "application/xml");
        res.setHeader("Content-Length", siteMapContents.length);

        res.send(siteMapContents);
    });

    app.use("/sitemap_catalogs_:mapNumber.xml", async (req, res, next) => {
        const contextObject = await context({ req });

        const mapNumber = parseInt(req.params.mapNumber);

        const siteMapContents = await generateCatalogSiteMap(mapNumber, contextObject);
        res.setHeader("Content-Type", "application/xml");
        res.setHeader("Content-Length", siteMapContents.length);

        res.send(siteMapContents);
    });

    app.use("/sitemap_packages_:mapNumber.xml", async (req, res, next) => {
        const contextObject = await context({ req });

        const mapNumber = parseInt(req.params.mapNumber);

        const siteMapContents = await generatePackageSiteMap(mapNumber, contextObject);
        res.setHeader("Content-Type", "application/xml");
        res.setHeader("Content-Length", siteMapContents.length);

        res.send(siteMapContents);
    });

    /** Data Web Socket Server */

    const httpServer = http.createServer(app); // TODO https?
    const io = new socketio.Server(httpServer, {
        httpCompression: true,
        maxHttpBufferSize: 1e8,
        path: "/ws/",
        parser: require("socket.io-msgpack-parser")
    });

    io.on("connection", async (socket) => {
        const contextObject: SocketContext | AuthenticatedSocketContext = {
            connection,
            cache: new SessionCache()
        };

        if (socket.handshake.auth.token != null) {
            if (Array.isArray(socket.handshake.auth.token)) {
                throw new Error("TOKEN_MUST_BE_SINGLE_VALUE");
            }

            const token = socket.handshake.auth.token;

            const user = await getMeFromAPIKey(token, connection.manager);

            (contextObject as AuthenticatedSocketContext).me = user;
        } else if (socket.handshake.auth.bearer != null) {
            if (Array.isArray(socket.handshake.auth.bearer)) {
                throw new Error("BEARER_MUST_BE_SINGLE_VALUE");
            }

            const bearer = socket.handshake.auth.bearer;

            try {
                const jwt = await parseJwt(bearer);

                const user = await getMeJwt(jwt, connection.manager);

                if (user == null) {
                    socket.disconnect();
                    return;
                }

                (contextObject as AuthenticatedSocketContext).me = user;
            } catch (error) {
                console.error(error.message);
                socket.disconnect();
                return;
            }
        }

        // TODO handle server shutdowns by disconnecting sockets
        // eslint-disable-next-line no-new
        new SocketConnectionHandler(socket, contextObject, distributedLockingService);
    });

    // any route not yet defined goes to index.html
    app.use("*", (req, res, next) => {
        const registryHostName = parse(getEnvVariable("REGISTRY_URL") as string).hostname;

        // If the request was to a hostname other than the
        // hostname in hte registry_url environment variable,
        // redirect to the equivalent url on the correct name
        if (req.hostname !== registryHostName) {
            const redirectDestination = `${getEnvVariable("REGISTRY_URL")}${req.originalUrl}`;
            res.redirect(301, redirectDestination);
            return;
        }

        res.setHeader("x-datapm-version", REGISTRY_API_VERSION);
        res.setHeader("x-datapm-registry-url", getEnvVariable("REGISTRY_URL") as string); // TODO support other paths
        res.sendFile(path.join(__dirname, "..", "static", "index.html"));
    });

    httpServer.listen(port, () => {
        console.log(`🚀 Server ready at http://localhost:${port}`);
    });
}
main().catch((error) => console.log(error));
