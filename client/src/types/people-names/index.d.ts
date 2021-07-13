declare module "people-names" {
	export function parseNames(value: string): string[];
	export function isPersonName(value: string): boolean;
}
