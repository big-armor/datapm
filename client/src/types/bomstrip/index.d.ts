declare module "bomstrip" {
	import { Readable, Transform } from "stream";

	class BomStrippingStream extends Transform {}

	export = BomStrippingStream;
}
