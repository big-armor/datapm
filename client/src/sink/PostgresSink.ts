import chalk from "chalk";
import { DPMConfiguration, PackageFile, Schema } from "datapm-lib";
import Knex, { Ref, Transaction } from "knex";
import { SemVer } from "semver";
import { Parameter, ParameterType } from "../util/ParameterUtils";
import { KnexSink } from "./KnexSink";
import { SinkErrors, WritableWithContext } from "./SinkUtil";

export class PostgresSink extends KnexSink {
	tableExists: boolean;

	async createClient(configuration: DPMConfiguration): Promise<Knex> {
		return Knex({
			client: "pg",
			connection: {
				host: configuration.host,
				port: configuration.port,
				user: configuration.username,
				password: configuration.password,
				database: configuration.database,
				connectTimeout: 3000
			} as Knex.PgConnectionConfig
		});
	}

	getOutputLocationString(schema: Schema, configuration: Record<string, string | number | boolean | null>): string {
		return `postgresql://${configuration.username}@${configuration.host}:${configuration.port}/${configuration.database}?currentSchema=${configuration.schema}`;
	}

	getType(): string {
		return "postgres";
	}

	getDisplayName(): string {
		return "PostgreSQL";
	}

	getDefaultParameterValues(
		catalogSlug: string | undefined,
		packageFile: PackageFile,
		configuration: DPMConfiguration
	): DPMConfiguration {
		return {
			host: configuration.host || "localhost",
			port: configuration.port || 5432,
			username: configuration.username || "postgres",
			password: configuration.password || "postgres",
			database: configuration.database || "postgres",
			schema:
				configuration.schema ||
				catalogSlug + "_" + packageFile.packageSlug + "-v" + new SemVer(packageFile.version).major
		};
	}

	filterDefaultConfigValues(
		_catalogSlug: string | undefined,
		_packageFile: PackageFile,
		_configuration: Record<string, string | number | boolean | null>
		// eslint-disable-next-line @typescript-eslint/no-empty-function
	): void {}

	async getParameters(
		catalogSlug: string,
		packageFile: PackageFile,
		configuration: DPMConfiguration
	): Promise<Parameter[]> {
		const parameters: Parameter[] = [];
		const defaultParameterValues: DPMConfiguration = this.getDefaultParameterValues(
			catalogSlug,
			packageFile,
			configuration
		);

		if (configuration.host == null) {
			parameters.push({
				configuration,
				type: ParameterType.Text,
				name: "host",
				message: "Hostname or IP?",
				defaultValue: defaultParameterValues.host as string
			});
		}

		if (configuration.port == null) {
			parameters.push({
				configuration,
				type: ParameterType.Number,
				name: "port",
				message: "Port?",
				defaultValue: defaultParameterValues.port as number
			});
		}

		if (configuration.username == null) {
			parameters.push({
				configuration,
				type: ParameterType.Text,
				name: "username",
				message: "Username?",
				defaultValue: defaultParameterValues.username as string
			});
		}

		if (configuration.password == null) {
			parameters.push({
				configuration,
				type: ParameterType.Password,
				name: "password",
				message: "Password?",
				defaultValue: defaultParameterValues.password as string
			});
		}

		if (configuration.database == null) {
			parameters.push({
				configuration,
				type: ParameterType.Text,
				name: "database",
				message: "Database?",
				defaultValue: defaultParameterValues.database as string
			});
		}

		if (configuration.schema == null) {
			parameters.push({
				configuration,
				type: ParameterType.Text,
				name: "schema",
				message: "Schema?",
				defaultValue: defaultParameterValues.schema as string
			});
		}
		return parameters;
	}

	getTableRef(tx: Transaction | Knex): Ref<string, { [x: string]: string }> {
		let tableName = this.getSafeTableName(this.schema.title as string);
		tableName = this.tableExists ? `${tableName}_new` : tableName;
		return tx.ref(tableName).withSchema(this.configuration.schema as string);
	}

	getStateTableRef(tx: Transaction | Knex, configuration: DPMConfiguration): Ref<string, { [x: string]: string }> {
		return tx.ref(this.stateTableName).withSchema(configuration.schema as string);
	}

	getSchemaBuilder(tx: Transaction | Knex, configuration: DPMConfiguration): Knex.SchemaBuilder {
		return tx.schema.withSchema(configuration.schema as string);
	}

	async getWriteable(schema: Schema, configuration: DPMConfiguration): Promise<WritableWithContext> {
		if (configuration.host == null) throw new Error("'host' is a required configuration value for postgresql");
		if (configuration.port == null) throw new Error("'port' is a required configuration value for postgresql");
		if (configuration.username == null)
			throw new Error("'username' is a required configuration value for postgresql");
		if (configuration.password == null)
			throw new Error("'password' is a required configuration value for postgresql");
		if (configuration.database == null)
			throw new Error("'database' is a required configuration value for postgresql");
		if (configuration.schema == null) throw new Error("'schema' is a required configuration value for postgresql");
		if (schema.title == null) throw new Error("Schema name in configuration not definied, and are required");

		// Open a connection to the database
		this.client = await this.createClient(configuration);

		// Check DB Existence
		await this.checkDBExistence(this.client, configuration);

		const writable = super.getWriteable(schema, configuration);

		await this.client.transaction(async (tx) => {
			await tx.raw(`CREATE SCHEMA IF NOT EXISTS "${configuration.schema}"`);
			await this.createTableFromSchema(tx, configuration, schema);
		});

		return writable;
	}

	async checkDBExistence(client: Knex, configuration: DPMConfiguration): Promise<void> {
		try {
			await client.raw("SELECT 1 + 1 as result");
		} catch (error) {
			if (error.message.includes("ENOTFOUND")) {
				throw new Error(SinkErrors.CONNECTION_FAILED);
			}
			if (error.message.includes("EAI_AGAIN")) {
				throw new Error(SinkErrors.CONNECTION_FAILED);
			}
			if (error.message.includes("password authentication")) {
				throw new Error(SinkErrors.AUTHENTICATION_FAILED);
			}
			if (error.message.includes("does not exist")) {
				console.log(
					chalk.yellow(`\nDatabase ${configuration.database} does not yet exists. Attempting to create it.\n`)
				);
				await this.createDatabase(configuration);
			} else {
				throw error;
			}
		}
	}

	async complete(): Promise<void> {
		if (this.tableExists) {
			const tableName = this.getSafeTableName(this.schema.title as string);
			await this.client.schema.withSchema(this.configuration.schema as string).dropTable(tableName);
			await this.client.schema
				.withSchema(this.configuration.schema as string)
				.renameTable(`${tableName}_new`, tableName);
		}

		return new Promise((resolve) => {
			// Close the database connection
			this.client.destroy(resolve);
		});
	}

	async createDatabase(configuration: DPMConfiguration): Promise<void> {
		const client = Knex({
			client: "pg",
			connection: {
				host: configuration.host,
				port: configuration.port,
				user: configuration.username,
				password: configuration.password,
				database: "postgres"
			} as Knex.PgConnectionConfig
		});
		await client.raw(`CREATE DATABASE ${configuration.database}`);
		client.destroy();
	}

	async createTableFromSchema(transaction: Knex, configuration: DPMConfiguration, schema: Schema): Promise<void> {
		let tableName = this.getSafeTableName(schema.title as string);
		this.tableExists = await transaction.schema.withSchema(configuration.schema as string).hasTable(tableName);
		tableName = this.tableExists ? `${tableName}_new` : tableName;

		await transaction.schema.withSchema(configuration.schema as string).createTable(tableName, (tableBuilder) => {
			this.buildTableFromSchema(tableBuilder, schema);
		});
	}
}
