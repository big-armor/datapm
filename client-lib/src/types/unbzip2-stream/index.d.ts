declare module "unbzip2-stream" {
    import { Readable, Transform } from "stream";
    import through from "through";

    function unbzip2Stream(): through.ThroughStream;
    export = unbzip2Stream;
}
