import fetch from "cross-fetch";
import {
	loadPackageFileFromDisk,
	parsePackageFileJSON,
	catalogSlugValid,
	packageSlugValid,
	PackageFile,
	validatePackageFile
} from "datapm-lib";
import fs from "fs";
import path from "path";
import url from "url";
import { Package, PackageIdentifier, PackageIdentifierInput } from "../generated/graphql";
import { getRegistryClientWithConfig, RegistryClient } from "./RegistryClient";

export interface PackageFileWithContext {
	package?: Package;
	packageFile: PackageFile;
	registryURL?: string;
	catalogSlug?: string;
	packageFileUrl: string;
}

async function fetchPackage(
	registryClient: RegistryClient,
	identifier: PackageIdentifierInput
): Promise<PackageFileWithContext> {
	const response = await registryClient.getPackage({
		packageSlug: identifier.packageSlug,
		catalogSlug: identifier.catalogSlug
	});

	if (response.errors) {
		throw new Error(response.errors[0].message); // TODO how to convert multiple errors?
	}

	const packageEntity = response.data.package;
	const version = packageEntity.latestVersion;

	if (version == null) {
		throw new Error("Found package, but it has no latest version");
	}

	validatePackageFile(version.packageFile);
	const packageFile = parsePackageFileJSON(version.packageFile);
	return {
		package: response.data?.package,
		packageFile,
		registryURL: registryClient.registryConfig.url,
		catalogSlug: identifier.catalogSlug,
		packageFileUrl: `${registryClient.registryConfig.url}/${identifier.catalogSlug}/${identifier.packageSlug}`
	};
}

export async function getPackage(identifier: string): Promise<PackageFileWithContext> {
	if (identifier.startsWith("http://") || identifier.startsWith("https://")) {
		const http = await fetch(identifier, {
			method: "GET"
		});

		if (http.headers.get("x-datapm-version") != null) {
			const parsedUrl = new url.URL(identifier);
			let serverUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}`;

			if (parsedUrl.port != null) serverUrl = `${serverUrl}:${parsedUrl.port}`;

			const registryClient = getRegistryClientWithConfig({ url: serverUrl });

			// TODO handle registries that are not hosted at the root path

			let path = parsedUrl.pathname;

			// const graphqlPath = http.headers.get("x-datapm-graphql-path");

			if (path?.startsWith("/")) {
				path = path.substr(1, path.length - 1);
			}
			const pathParts = path?.split("/") || [];

			// TODO support fetching specific package versions

			return fetchPackage(registryClient, {
				catalogSlug: pathParts[0],
				packageSlug: pathParts[1]
			});
		}
		if (!http.ok) throw new Error(`Failed to obtain ${http.status} ${http.statusText}`);

		return {
			packageFile: parsePackageFileJSON(await http.text()),
			packageFileUrl: identifier
		};
	} else if (fs.existsSync(identifier)) {
		const packageFile = loadPackageFileFromDisk(identifier);
		const pathToPackageFile = path.isAbsolute(identifier)
			? path.dirname(identifier)
			: process.cwd() + path.dirname(identifier);
		const packageFileName = path.basename(identifier);

		return {
			packageFile,
			packageFileUrl: `file://${pathToPackageFile}${path.sep}${packageFileName}`
		};
	} else if (isValidPackageIdentifier(identifier) !== false) {
		const registryClient = getRegistryClientWithConfig({ url: "https://datapm.io" });
		const packageIdentifier = parsePackageIdentifier(identifier);

		return fetchPackage(registryClient, packageIdentifier);
	} else {
		throw new Error(
			`Reference '${identifier}' is either not a valid package identifier, a valid package url, or url pointing to a valid package file.`
		);
	}
}

// TODO Move these functions to datapm-lib
/** After validating, parse the identifier string into a PackageIdentifier for the datapm.io domain */
export function parsePackageIdentifier(identifier: string): PackageIdentifier {
	const parts = identifier.split("/");

	return {
		registryURL: "https://datapm.io",
		catalogSlug: parts[0],
		packageSlug: parts[1]
	};
}

/** Whether a string is a valid identifier for a package on datapm.io */
function isValidPackageIdentifier(identifier: string): boolean {
	const parts = identifier.split("/");

	if (parts.length !== 2) return false;
	if (catalogSlugValid(parts[0]) !== true) return false;
	if (packageSlugValid(parts[1]) !== true) return false;

	return true;
}
