declare module "stream-fs-cache" {
	import { Duplex, DuplexOptions } from "stream";

	class StreamFsCache extends Duplex {
		constructor(path: string, opts?: DuplexOptions);
	}

	export = StreamFsCache;
}
