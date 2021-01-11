import "reflect-metadata";

import express from "express";

import path from "path";

console.log("DataPM Registry Server Starting...");

const app = express();

async function main() {
    console.log(`Running in ${app.get("env")} mode`);

    // App Engine defines PORT as an environment variable. Otherwise, use 4000
    const port = process.env.PORT ? Number(process.env.PORT) : 4000;

    // any route not yet defined goes to index.html
    app.use("*", (req, res, next) => {
        res.sendFile(path.join(__dirname, "..", "static", "index2.html"));
    });

    app.listen({ port }, () => {
        console.log(`🚀 Server index2 ready at http://localhost:${port}`);
    });
}
main().catch((error) => console.log(error));
