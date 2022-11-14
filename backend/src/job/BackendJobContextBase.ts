import { ApolloError } from "apollo-server";
import {
    CantSaveReasons,
    JobContext,
    MessageType,
    PackageFileWithContext,
    PackageIdentifier,
    parsePackageIdentifier,
    RegistryConfig,
    RepositoryConfig,
    Task,
    RepositoryCredentialsConfig,
    VersionConflict
} from "datapm-client-lib";
import { DPMConfiguration, Parameter, ParameterAnswer, PackageFile, comparePackages } from "datapm-lib";
import { createOrUpdateVersion } from "../business/CreateVersion";
import { AuthenticatedContext } from "../context";
import { hasCatalogPermissionOrFail } from "../directive/hasCatalogPermissionDirective";
import { hasPackagePermissionOrFail, resolvePackagePermissions } from "../directive/hasPackagePermissionDirective";
import { PackageIdentifierInput, Permission } from "../generated/graphql";
import { CredentialRepository } from "../repository/CredentialRepository";
import { PackageRepository } from "../repository/PackageRepository";
import { RepositoryRepository } from "../repository/RepositoryRepository";
import { VersionRepository } from "../repository/VersionRepository";
import { PackageFileStorageService } from "../storage/packages/package-file-storage-service";
import { decryptValue, encryptValue } from "../util/EncryptionUtil";
import { getEnvVariable } from "../util/getEnvVariable";

export abstract class BackendJobContextBase extends JobContext {
    constructor(public jobId: string, private context: AuthenticatedContext) {
        super();
    }

    abstract useDefaults(): boolean;

    async getRepositoryConfigsByType(
        relatedPackage: PackageIdentifierInput | undefined,
        connectorType: string
    ): Promise<RepositoryConfig[]> {
        if (relatedPackage === undefined) return [];

        await hasPackagePermissionOrFail(Permission.VIEW, this.context, relatedPackage);

        const repositoryEntities = await this.context.connection
            .getCustomRepository(RepositoryRepository)
            .findRepositoriesByConnectorType(relatedPackage, connectorType);

        return repositoryEntities.asyncMap<RepositoryConfig>(async (r) => {
            const credentials = await this.context.connection
                .getCustomRepository(CredentialRepository)
                .repositoryCredentials({ repositoryEntity: r });

            const credentialsReturn = credentials.map<RepositoryCredentialsConfig>((c) => {
                return {
                    encryptedConfiguration: c.encryptedCredentials,
                    identifier: c.credentialIdentifier
                };
            });

            return {
                identifier: r.repositoryIdentifier,
                connectionConfiguration: JSON.parse(r.connectionConfiguration),
                credentials: credentialsReturn
            };
        });
    }

    async getRepositoryConfig(
        relatedPackage: PackageIdentifierInput,
        type: string,
        identifier: string
    ): Promise<RepositoryConfig | undefined> {
        const repositoryEntity = await this.context.connection
            .getCustomRepository(RepositoryRepository)
            .findRepository(relatedPackage, type, identifier, ["credentials"]);

        if (repositoryEntity == null) return undefined;

        return {
            identifier: repositoryEntity.repositoryIdentifier,
            connectionConfiguration: JSON.parse(repositoryEntity.connectionConfiguration),
            credentials: repositoryEntity.credentials.map<RepositoryCredentialsConfig>((c) => {
                return {
                    encryptedConfiguration: c.encryptedCredentials,
                    identifier: c.credentialIdentifier
                };
            })
        };
    }

    async saveRepositoryCredential(
        packageIdentifier: PackageIdentifierInput | undefined,
        connectorType: string,
        repositoryIdentifier: string,
        credentialsIdentifier: string,
        credentials: DPMConfiguration
    ): Promise<void> {
        if (packageIdentifier === undefined)
            throw new Error(
                "Saving repository credentials with an undefined packageIdentifier is not supported on the datapm server."
            );

        const packageEntity = await this.context.connection
            .getCustomRepository(PackageRepository)
            .findPackage({ identifier: packageIdentifier });

        if (packageEntity == null) throw new Error("PACKAGE_NOT_FOUND - " + JSON.stringify(packageIdentifier));

        await hasPackagePermissionOrFail(Permission.VIEW, this.context, packageIdentifier);

        const repositoryEntity = await this.context.connection
            .getCustomRepository(RepositoryRepository)
            .findRepository(packageIdentifier, connectorType, repositoryIdentifier);

        if (repositoryEntity == null) throw new Error("REPOSITORY_NOT_FOUND - " + repositoryIdentifier);

        const json = JSON.stringify(credentials);
        const encryptedValue = encryptValue(json);

        await this.context.connection
            .getCustomRepository(CredentialRepository)
            .createOrUpdateCredential(
                repositoryEntity,
                connectorType,
                repositoryIdentifier,
                credentialsIdentifier,
                encryptedValue,
                this.context.me
            );
    }

    async saveRepositoryConfig(
        relatedPackage: PackageIdentifierInput | undefined,
        connectorType: string,
        repositoryConfig: RepositoryConfig
    ): Promise<void> {
        if (relatedPackage === undefined)
            throw new Error("Backend does not support saving repository configs when packageIdentifier is undefined");

        const packageEntity = await this.context.connection
            .getCustomRepository(PackageRepository)
            .findPackage({ identifier: relatedPackage });

        if (packageEntity == null) throw new Error("PACKAGE_NOT_FOUND - " + JSON.stringify(relatedPackage));

        await hasPackagePermissionOrFail(Permission.VIEW, this.context, relatedPackage);

        await this.context.connection
            .getCustomRepository(RepositoryRepository)
            .createOrUpdateRepository(
                packageEntity,
                connectorType,
                repositoryConfig.identifier,
                repositoryConfig.connectionConfiguration,
                this.context.me
            );
    }

    async removeRepositoryConfig(
        relatedPackage: PackageIdentifierInput | undefined,
        connectorType: string,
        repositoryIdentifer: string
    ): Promise<void> {
        if (relatedPackage === undefined)
            throw new Error("Backend does not support removing repository configs when packageIdentifier is undefined");

        const packageEntity = await this.context.connection
            .getCustomRepository(PackageRepository)
            .findPackage({ identifier: relatedPackage });

        if (packageEntity == null) throw new Error("PACKAGE_NOT_FOUND - " + JSON.stringify(relatedPackage));

        await hasPackagePermissionOrFail(Permission.VIEW, this.context, relatedPackage);

        await this.context.connection
            .getCustomRepository(RepositoryRepository)
            .deleteRepository(relatedPackage, connectorType, repositoryIdentifer);
    }

    async getRepositoryCredential(
        packageIdentifier: PackageIdentifierInput | undefined,
        connectorType: string,
        repositoryIdentifier: string,
        credentialsIdentifier: string
    ): Promise<DPMConfiguration | undefined> {
        if (packageIdentifier === undefined) return undefined;

        const credentialEntity = await this.context.connection
            .getCustomRepository(CredentialRepository)
            .findCredential(packageIdentifier, connectorType, repositoryIdentifier, credentialsIdentifier);

        if (credentialEntity == null) return undefined;

        const decryptedValue = decryptValue(credentialEntity.encryptedCredentials);

        return JSON.parse(decryptedValue);
    }

    getRegistryConfigs(): RegistryConfig[] {
        return [
            {
                url: getEnvVariable("REGISTRY_URL")
            }
        ];
    }

    getRegistryConfig(url: string): RegistryConfig | undefined {
        if (getEnvVariable("REGISTRY_URL") !== url)
            throw new Error("Server does not support getting other registry configs");

        return {
            url: getEnvVariable("REGISTRY_URL")
        };
    }

    abstract _parameterPrompt<T extends string = string>(parameters: Parameter<T>[]): Promise<ParameterAnswer<T>>;
    abstract updateSteps(steps: string[]): void;
    abstract setCurrentStep(step: string): void;
    abstract print(type: MessageType, message: string): void;
    abstract startTask(message: string): Promise<Task>;

    log(level: "ERROR" | "WARN" | "INFO" | "DEBUG", message: string): void {
        console.log(this.jobId + " " + level + ": " + message);
    }

    async saveNewPackageFile(
        catalogSlug: string | undefined,
        packageFile: PackageFile
    ): Promise<PackageFileWithContext> {
        if (catalogSlug === undefined) throw new Error("Catalog slug is undefined");

        const identifier = {
            catalogSlug,
            packageSlug: packageFile.packageSlug
        };

        const packageEntity = await this.context.connection
            .getCustomRepository(PackageRepository)
            .findPackage({ identifier });

        if (!packageEntity) {
            await hasCatalogPermissionOrFail(Permission.EDIT, this.context, identifier);

            const newPackageEntity = await this.context.connection
                .getCustomRepository(PackageRepository)
                .createPackage({
                    userId: this.context.me.id,
                    packageInput: {
                        catalogSlug: identifier.catalogSlug,
                        packageSlug: identifier.packageSlug,
                        displayName: packageFile.displayName,
                        description: packageFile.description
                    }
                });
        } else {
            await hasPackagePermissionOrFail(Permission.EDIT, this.context, identifier);
        }

        try {
            await createOrUpdateVersion(
                this.context,
                identifier,
                {
                    packageFile
                },
                []
            );
        } catch (e) {
            const appolloError = e as ApolloError;
            if (appolloError.extensions.code === VersionConflict.HIGHER_VERSION_REQUIRED) {
                packageFile.version = appolloError.extensions.minNextVersion;

                await createOrUpdateVersion(
                    this.context,
                    identifier,
                    {
                        packageFile
                    },
                    []
                );
            } else throw e;
        }

        const registryUrl = getEnvVariable("REGISTRY_URL");

        return {
            hasPermissionToSave: true,
            contextType: "registry",
            cantSaveReason: false,
            packageFile: packageFile,
            permitsSaving: true,
            packageReference: catalogSlug + "/" + packageFile.packageSlug,
            readmeFileUrl: registryUrl + "/" + catalogSlug + "/" + packageFile.packageSlug,
            licenseFileUrl: registryUrl + "/" + catalogSlug + "/" + packageFile.packageSlug,
            save: async () => {
                throw new Error("Not implemented");
            }
        };
    }

    async getPackageFile(
        reference: string | PackageIdentifier,
        modifiedOrCanonical: "modified" | "canonicalIfAvailable"
    ): Promise<PackageFileWithContext> {
        let identifier: PackageIdentifierInput;

        if (typeof reference === "string") {
            identifier = parsePackageIdentifier(reference);
        } else {
            identifier = reference;
        }

        const packageEntity = await this.context.connection
            .getCustomRepository(PackageRepository)
            .findPackageOrFail({ identifier });

        const latestVersion = await this.context.connection.getCustomRepository(VersionRepository).findLatestVersion({
            identifier
        });

        if (latestVersion == null) {
            throw new Error("VERSION_NOT_FOUND");
        }

        const latestPackageFile = await PackageFileStorageService.INSTANCE.readPackageFile(packageEntity.id, {
            ...identifier,
            versionMajor: latestVersion.majorVersion,
            versionMinor: latestVersion.minorVersion,
            versionPatch: latestVersion.patchVersion
        });

        let editPermission = false;

        let cantSaveReason: CantSaveReasons | false = "NOT_AUTHORIZED";

        if ((this.context as AuthenticatedContext).me != null) {
            const authenicatedContext = this.context as AuthenticatedContext;
            const permissions = await resolvePackagePermissions(this.context, identifier, authenicatedContext.me);
            editPermission = permissions.includes(Permission.EDIT);
            cantSaveReason = false;
        }

        return {
            contextType: "registry",
            hasPermissionToSave: editPermission,
            packageReference:
                getEnvVariable("REGISTRY_URL") + "/" + identifier.catalogSlug + "/" + identifier.packageSlug,
            packageFile: latestPackageFile,
            permitsSaving: true,
            save: async (packageFile: PackageFile): Promise<void> => {
                const task = await this.startTask("Checking package permissions...");

                try {
                    await hasPackagePermissionOrFail(Permission.EDIT, this.context, identifier);
                } catch (error) {
                    task.end("ERROR", "You do not have permission to edit this package");
                    throw error;
                }

                task.end("SUCCESS", "Edit permission granted");

                const task2 = await this.startTask("Saving package file...");

                try {
                    const version = await createOrUpdateVersion(
                        this.context as AuthenticatedContext,
                        identifier,
                        {
                            packageFile
                        },
                        []
                    );

                    const versionString =
                        version.identifier.versionMajor +
                        "." +
                        version.identifier.versionMinor +
                        "." +
                        version.identifier.versionPatch;

                    task2.end("SUCCESS", "Saved version " + versionString);
                } catch (error) {
                    task2.end("ERROR", "Failed to save package file: " + error.message);
                    throw error;
                }
            },
            licenseFileUrl:
                getEnvVariable("REGISTRY_URL") +
                "/" +
                identifier.catalogSlug +
                "/" +
                identifier.packageSlug +
                "#license",
            readmeFileUrl:
                getEnvVariable("REGISTRY_URL") +
                "/" +
                identifier.catalogSlug +
                "/" +
                identifier.packageSlug +
                "#readme",
            catalogSlug: identifier.catalogSlug,
            cantSaveReason
        };
    }
}
