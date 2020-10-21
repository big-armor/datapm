import * as path from "path";
import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";
import { expect } from "chai";
import { ApolloClient, NormalizedCacheObject, ServerError } from "@apollo/client/core";
import { MyCatalogsQuery, MyCatalogsDocument, LoginDocument, MyCatalogsQueryVariables } from "./registry-client";

import execa from "execa";
import { Stream } from "stream";
import * as readline from "readline";
import { ErrorResponse } from "apollo-link-error";
import pidtree from "pidtree";
import { createAnonymousClient, createUser } from "./test-utils";

let container: StartedTestContainer;
let serverProcess: execa.ExecaChildProcess;

function readLines(stream: NodeJS.ReadableStream) {
    const output = new Stream.PassThrough({ objectMode: true });
    console.log("output created");
    const rl = readline.createInterface({ input: stream });
    console.log("readline created");
    rl.on("line", (line) => {
        output.write(line);
    });
    rl.on("close", () => {
        output.push(null);
    });
    return output;
}

before(async function () {
    console.log("Starting postgres temporary container");

    this.timeout(50000);
    container = await new GenericContainer("postgres")
        .withEnv("POSTGRES_PASSWORD", "postgres")
        .withEnv("POSTGRES_DB", "datapm")
        .withTmpFs({ "/temp_pgdata": "rw,noexec,nosuid,size=65536k" })
        .withExposedPorts(5432)
        .start();

    const postgresPortNumber = container.getMappedPort(5432);

    console.log("Postgres started");

    serverProcess = execa("npm", ["run", "start-nowatch"], {
        env: {
            TYPEORM_PORT: postgresPortNumber.toString()
        }
    });

    serverProcess.stdout!.pipe(process.stdout);
    serverProcess.stderr!.pipe(process.stderr);

    // Wait for the server to start
    await new Promise(async (r) => {
        let serverReady = false;

        console.log("Waiting for server to start");
        serverProcess.stdout!.on("data", (buffer: Buffer) => {
            const line = buffer.toString();
            //console.log(line);
            if (line.indexOf("🚀") != -1) {
                console.log("Server started!");
                serverReady = true;
                r();
            }
        });

        serverProcess.stdout!.on("error", (err: Error) => {
            console.error(JSON.stringify(err, null, 1));
        });

        serverProcess.stdout!.on("close", () => {
            if (!serverReady) throw new Error("Registry server exited before becoming ready");
        });

        setTimeout(function () {
            if (!serverReady) throw new Error("Timedout waiting for registry server to start");
        }, 30000);
    });
});

after(async function () {
    this.timeout(30000);

    if (container) await container.stop();

    console.log("postgres container stopped normally");

    serverProcess.stdout!.destroy();
    serverProcess.stderr!.destroy();

    let pids = pidtree(serverProcess.pid, { root: true });

    // recursively kill all child processes
    (await pids).map((p) => {
        console.log("Killing process " + p);
        try {
            process.kill(p);
        } catch (error) {
            console.error("Error killing process " + p);
            console.error(error);
        }
    });
});
