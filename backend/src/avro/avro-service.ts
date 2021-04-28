import { DataStorageService } from "../storage/data/data-storage-service";

const avro = require("avsc");

const writePackageData = (packageId, sourceSlug, req, res) => {
    const value = req.body.messageBuffer.data;

    const typeTask = avro.Type.forSchema(value); // How do we get schema

    var buf = new Buffer(value, "binary");
    var decodedMessage = typeTask.fromBuffer(buf.slice(0));
    DataStorageService.INSTANCE.writeFileFromStream(packageId, sourceSlug, value);
    res.json({ messageBuffer: decodedMessage });
};
