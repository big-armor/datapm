declare module "xml-streamer" {
    import { Readable, Transform } from "stream";

    interface Opts {
        resourcePath?: string;
        emitOnNodeName?: boolean;
        attrsKey?: string;
        textKey?: string;
        explicitArray?: boolean;
        verbatimText?: boolean;
    }
    class XmlParser extends Transform {
        constructor(opts: Opts);
    }

    export = XmlParser;
}
