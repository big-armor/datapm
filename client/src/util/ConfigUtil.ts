import Conf from "conf";

const configSchema = {
	registries: {
		type: "array",
		items: {
			type: "object",
			properties: {
				apiKey: { type: "string" },
				url: { type: "string" }
			}
		}
	}
} as const; // https://github.com/sindresorhus/conf/pull/121#issuecomment-672139929

const config = new Conf({
	projectName: "datapm-client",
	projectVersion: "1.0.2",
	schema: configSchema,
	migrations: {},
	defaults: {
		registries: []
	}
});

export interface RegistryConfig {
	url: string;
	apiPath?: string;
	apiKey?: string;
}

export function getConfigurationPath(): string {
	return config.path;
}

export function getConfiguration(): typeof configSchema | unknown {
	return config.store;
}

export function resetConfiguration(): void {
	config.store = { registries: [] };
}

export function getRegistryConfigs(): RegistryConfig[] {
	return config.get("registries") as RegistryConfig[];
}

export function getRegistryConfig(url: string): RegistryConfig | undefined {
	return getRegistryConfigs().find((registry) => url.startsWith(registry.url));
}

export function addRegistry(registry: RegistryConfig): void {
	const filteredRegistries = getRegistryConfigs().filter((_registry) => _registry.url !== registry.url);

	filteredRegistries.push(registry);

	config.set("registries", filteredRegistries);
}

export function removeRegistry(url: string): void {
	if (config.has("registries")) {
		let registries = config.get("registries") as RegistryConfig[];

		const registryCount = registries.length;

		registries = registries.filter((registry) => {
			return registry.url !== url;
		});

		if (registries.length < registryCount) {
			console.log(`Removing registry ${url} from local configuration`);
		} else {
			console.log(`Did not find ${url} in the local configuration `);
		}

		config.set("registries", registries);
	} else {
		console.log(`There are no registries in the local configuration`);
	}
}
