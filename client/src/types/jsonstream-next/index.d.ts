declare module "jsonstream-next" {
	import { Transform } from "stream";

	export function parse(
		path: string,
		map?: (value: { [key: string]: unknown }) => { [key: string]: unknown }
	): Transform;
}
