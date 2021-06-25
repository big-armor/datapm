import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";

import execa from "execa";
import pidtree from "pidtree";
import { Observable } from "@apollo/client/core";
import fs from "fs";
import { before } from "mocha";
import { RandomUuid } from "testcontainers/dist/uuid";
import { createTestClient, createUser } from "./test-utils";
import { RegistryStatusDocument } from "./registry-client";
import { expect } from "chai";
import { AdminHolder } from "./admin-holder";
const maildev = require("maildev");

let container: StartedTestContainer;
let serverProcess: execa.ExecaChildProcess;
let mailServer: any;
export let mailObservable: Observable<any>;

export const TEMP_STORAGE_PATH = "tmp-registry-server-storage-" + new RandomUuid().nextUuid();
export const TEMP_STORAGE_URL = "file://" + TEMP_STORAGE_PATH;

// These hold the standard out log lines from the datapm server
export let serverLogLines: string[] = [];
export let serverErrorLogLines: string[] = [];
const MAX_SERVER_LOG_LINES = 25;

before(async function () {
    console.log("Starting postgres temporary container");

    this.timeout(120000);

    container = await new GenericContainer("postgres", "13.3")
        .withEnv("POSTGRES_PASSWORD", "postgres")
        .withEnv("POSTGRES_DB", "datapm")
        .withTmpFs({ "/temp_pgdata": "rw,noexec,nosuid,size=65536k" })
        .withExposedPorts(5432)
        .start();

    const postgresPortNumber = container.getMappedPort(5432);

    console.log("Postgres started");

    // star the maildev server
    mailServer = new maildev({
        smtp: 1025,
        web: 1081,
        ignoreTLS: true
    });

    let mailObserver: ZenObservable.SubscriptionObserver<any>;

    mailServer.listen((err: any) => {
        mailObservable = new Observable<any>((observer) => {
            mailObserver = observer;
        });
    });

    mailServer.on("new", function (email: any) {
        mailObserver.next(email);
    });

    serverProcess = execa("npm", ["run", "start-nowatch"], {
        env: {
            TYPEORM_PORT: postgresPortNumber.toString(),
            SMTP_PORT: "1025",
            SMTP_SERVER: "localhost",
            SMTP_USER: "",
            SMTP_PASSWORD: "",
            SMTP_SECURE: "false",
            SMTP_FROM_ADDRESS: "test@localhost",
            SMTP_FROM_NAME: "local-test",
            STORAGE_URL: TEMP_STORAGE_URL,
            ACTIVITY_LOG: "false",
            LEADER_ELECTION_DISABLED: "true",
            SCHEDULER_KEY: "TEST_JOB_KEY"
        }
    });

    serverProcess.stdout!.addListener("data", (chunk: Buffer) => {
        const line = chunk.toString();

        serverLogLines.push(line);

        if (serverLogLines.length > MAX_SERVER_LOG_LINES) serverLogLines.shift();

        if (line.startsWith("{")) return;
        console.log(line);
    });

    serverProcess.stderr!.addListener("data", (chunk: Buffer) => {
        const line = chunk.toString();

        serverErrorLogLines.push(line);

        if (serverErrorLogLines.length > MAX_SERVER_LOG_LINES) serverErrorLogLines.shift();

        if (line.startsWith("{")) return;
        console.error(line);
    });

    serverProcess.addListener("error", (err) => {
        console.error("Registry server process error");
        console.error(JSON.stringify(err));
    });

    serverProcess.addListener("exit", (code, signal) => {
        console.log("Registry server exited with code " + code + " and signal " + signal);
    });

    // Wait for the server to start
    await new Promise<void>(async (r) => {
        let serverReady = false;

        console.log("Waiting for server to start");
        serverProcess.stdout!.on("data", async (buffer: Buffer) => {
            const line = buffer.toString();
            //console.log(line);
            if (line.indexOf("🚀") != -1) {
                console.log("Server started!");
                serverReady = true;

                AdminHolder.adminClient = await createUser(
                    "admin",
                    "user",
                    "admin-user",
                    "admin@test.comc",
                    "admin1234",
                    false
                );
                AdminHolder.adminUsername = "admin-user";

                r();
            }
        });

        serverProcess.stdout!.on("error", (err: Error) => {
            console.error(JSON.stringify(err, null, 1));
        });

        serverProcess.stdout!.on("close", () => {
            if (!serverReady) throw new Error("Registry server exited before becoming ready");
        });
    });
});

describe("Server should start", async function () {
    it("Should return running status", async function () {
        const client = createTestClient({});
        const response = await client.query({
            query: RegistryStatusDocument
        });

        expect(response.errors == null).equal(true);
    });
});

after(async function () {
    this.timeout(30000);

    fs.rmdirSync(TEMP_STORAGE_URL.replace("file://", ""), { recursive: true });

    serverProcess.stdout!.destroy();
    serverProcess.stderr!.destroy();

    try {
        let pids = pidtree(serverProcess.pid, { root: true });

        // recursively kill all child processes
        (await pids).forEach((p) => {
            console.log("Killing process " + p);
            try {
                process.kill(p);
            } catch (error) {
                console.error("Error killing process " + p);
                console.error(error);
            }
        });
    } catch (error) {
        console.log("error stopping processes " + error.message);
    }

    if (container) {
        await container.stop();
        console.log("postgres container stopped normally");
    }

    mailServer.close();
});
