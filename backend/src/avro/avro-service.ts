import avro from "avsc";
import { Readable } from "stream";
const peek = require("buffer-peek-stream").promise;

export class AvroService {
    public static readonly INSTANCE = new AvroService();
}
