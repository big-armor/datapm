import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";

import execa from "execa";
import { Stream } from "stream";
import * as readline from "readline";
import pidtree from "pidtree";
import { Observable } from "@apollo/client/core";
import { before } from "mocha";

const maildev = require("maildev");

let container: StartedTestContainer;
let serverProcess: execa.ExecaChildProcess;
let mailServer: any;
export let mailObservable: Observable<any>;

before(async function () {
    console.log("Starting postgres temporary container");

    this.timeout(1200000);
    container = await new GenericContainer("postgres")
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
            REQUIRE_EMAIL_VERIFICATION: "true",
            SMTP_PORT: "1025",
            SMTP_SERVER: "localhost",
            SMTP_USER: "",
            SMTP_PASSWORD: "",
            SMTP_SECURE: "false",
            SMTP_FROM_ADDRESS: "test@localhost",
            SMTP_FROM_NAME: "local-test"
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

        serverProcess.stderr!.on("data", (buffer: Buffer) => {
            const line = buffer.toString();
            console.error(line);
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

    mailServer.close();
});
