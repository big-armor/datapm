/** A small test server for http request testing  */
import express from "express";
import fs from "fs";
import path from "path";
import { TEMP_STORAGE_PATH } from "../integration/constants";

const app = express();

const port = process.env.PORT || 2999;

app.use("/state-codes.csv", function (req, res) {
    res.set("content-type", "text/csv");
    res.send(fs.readFileSync("test/sources/state-codes.csv"));
});

app.use("/update-test.csv", function (req, res) {
    res.set("content-type", "text/csv");
    res.send(fs.readFileSync(path.join("test", "sources", "update-test-changes.csv")));
});

app.listen({ port }, () => {
    console.log(`🚀 Test Data Server ready at http://localhost:${port}`);
});
