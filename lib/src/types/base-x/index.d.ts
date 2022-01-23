declare module "base-x" {
    class BaseX {
        constructor(alphabet: string);
        encode(value: Buffer): string;
        decode(value: string): Buffer;
    }
    export default BaseX;
}
