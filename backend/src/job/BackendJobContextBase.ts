import { CantSaveReasons, JobContext, MessageType, PackageFileWithContext, PackageIdentifier, parsePackageIdentifier, RegistryConfig, RepositoryConfig, Task, RepositoryCredentialsConfig } from "datapm-client-lib";
import { DPMConfiguration, Parameter, ParameterAnswer, PackageFile, } from "datapm-lib";
import { createOrUpdateVersion } from "../business/CreateVersion";
import { AuthenticatedContext } from "../context";
import { hasPackagePermissionOrFail, resolvePackagePermissions } from "../directive/hasPackagePermissionDirective";
import { PackageIdentifierInput, Permission } from "../generated/graphql";
import { CredentialRepository } from "../repository/CredentialRepository";
import { PackageRepository } from "../repository/PackageRepository";
import { RepositoryRepository } from "../repository/RepositoryRepository";
import { VersionRepository } from "../repository/VersionRepository";
import { PackageFileStorageService } from "../storage/packages/package-file-storage-service";
import { decryptValue, encryptValue } from "../util/EncryptionUtil";

export abstract class BackendJobContextBase extends JobContext {

    constructor(public jobId: string, private context: AuthenticatedContext) {
        super();
    }

    abstract useDefaults(): boolean;

    async getRepositoryConfigsByType(relatedPackage: PackageIdentifierInput, connectorType: string): Promise<RepositoryConfig[]> {
        
        await hasPackagePermissionOrFail(Permission.VIEW, this.context, relatedPackage);

        const repositoryEntities =  await this.context.connection.getCustomRepository(RepositoryRepository).findRepositoriesByConnectorType(relatedPackage, connectorType);

        return repositoryEntities.asyncMap<RepositoryConfig>(async r => {

            const credentials = await this.context.connection.getCustomRepository(CredentialRepository).repositoryCredentials({repositoryEntity: r});

            const credentialsReturn = credentials.map<RepositoryCredentialsConfig>( c => {
                return {
                    encryptedConfiguration: c.encryptedCredentials,
                    identifier: c.credentialIdentifier
                }
            });

            return {
                identifier: r.repositoryIdentifier,
                connectionConfiguration: JSON.parse(r.connectionConfiguration),
                credentials: credentialsReturn
            }
        });

    }

    async getRepositoryConfig(relatedPackage: PackageIdentifierInput, type: string, identifier: string): Promise<RepositoryConfig | undefined> {
        
        
        const repositoryEntity = await this.context.connection.getCustomRepository(RepositoryRepository).findRepository(relatedPackage, type, identifier, ["credentials"]);

        if(repositoryEntity == null)
            return undefined;

        return {
            identifier: repositoryEntity.repositoryIdentifier,
            connectionConfiguration: JSON.parse(repositoryEntity.connectionConfiguration),
            credentials: repositoryEntity.credentials.map<RepositoryCredentialsConfig>( c => {
                return {
                    encryptedConfiguration: c.encryptedCredentials,
                    identifier: c.credentialIdentifier
                }
            })
        }
    }

    async saveRepositoryCredential(packageIdentifier: PackageIdentifierInput | undefined, connectorType: string, repositoryIdentifier: string, credentialsIdentifier: string, credentials: DPMConfiguration): Promise<void> {
        
        if(packageIdentifier === undefined) 
            throw new Error("Saving repository credentials with an undefined packageIdentifier is not supported on the datapm server.");

        const packageEntity = await this.context.connection.getCustomRepository(PackageRepository).findPackage({identifier: packageIdentifier});

        if(packageEntity == null)
            throw new Error("PACKAGE_NOT_FOUND - " + JSON.stringify(packageIdentifier));

        await hasPackagePermissionOrFail(Permission.VIEW, this.context, packageIdentifier);

        const repositoryEntity = await this.context.connection.getCustomRepository(RepositoryRepository).findRepository(packageIdentifier, connectorType, repositoryIdentifier);

        if(repositoryEntity == null) 
            throw new Error("REPOSITORY_NOT_FOUND - " + repositoryIdentifier);

        const json = JSON.stringify(credentials);
        const encryptedValue = encryptValue(json);

        await this.context.connection.getCustomRepository(CredentialRepository).createOrUpdateCredential(
            repositoryEntity,
            connectorType,
            repositoryIdentifier,
            credentialsIdentifier,
            encryptedValue,
            this.context.me
        )
    }

    async saveRepositoryConfig(relatedPackage: PackageIdentifierInput | undefined, connectorType: string, repositoryConfig: RepositoryConfig): Promise<void> {
        
        if(relatedPackage === undefined)
            throw new Error("Backend does not support saving repository configs when packageIdentifier is undefined");

        const packageEntity = await this.context.connection.getCustomRepository(PackageRepository).findPackage({identifier: relatedPackage});

        if(packageEntity == null)
            throw new Error("PACKAGE_NOT_FOUND - " + JSON.stringify(relatedPackage));

        await hasPackagePermissionOrFail(Permission.VIEW, this.context, relatedPackage);

        await this.context.connection.getCustomRepository(RepositoryRepository).createOrUpdateRepository(packageEntity, connectorType, repositoryConfig.identifier,repositoryConfig.connectionConfiguration, this.context.me);
    }

    async removeRepositoryConfig(relatedPackage: PackageIdentifierInput | undefined, connectorType: string, repositoryIdentifer: string): Promise<void> {

        if(relatedPackage === undefined)
            throw new Error("Backend does not support removing repository configs when packageIdentifier is undefined");

        const packageEntity = await this.context.connection.getCustomRepository(PackageRepository).findPackage({identifier: relatedPackage});

        if(packageEntity == null)
            throw new Error("PACKAGE_NOT_FOUND - " + JSON.stringify(relatedPackage));

        await hasPackagePermissionOrFail(Permission.VIEW, this.context, relatedPackage);

        await this.context.connection.getCustomRepository(RepositoryRepository).deleteRepository(relatedPackage, connectorType, repositoryIdentifer);

    }
    
    async getRepositoryCredential(packageIdentifier:PackageIdentifierInput | undefined, connectorType: string, repositoryIdentifier: string, credentialsIdentifier: string): Promise<DPMConfiguration> {

        if(packageIdentifier === undefined)
            throw new Error("Backend does not support retrieving credentials when packageIdentifier is undefined");

        const credentialEntity = await this.context.connection.getCustomRepository(CredentialRepository).findCredential(packageIdentifier, connectorType, repositoryIdentifier, credentialsIdentifier);

        if(credentialEntity == null)
            throw new Error("Credential not found");

        const decryptedValue = decryptValue(credentialEntity.encryptedCredentials);

        return JSON.parse(decryptedValue);
    }
    

    getRegistryConfigs(): RegistryConfig[] {

        if(!process.env["REGISTRY_URL"]) {
            // TODO - this should really be in an interface that has no undefined values
            throw new Error("Registry URL not defined")
        }

        return [{
            url: process.env["REGISTRY_URL"]
        }]
    }

    getRegistryConfig(url: string): RegistryConfig | undefined {

        if(process.env["REGISTRY_URL"] !== url)
            throw new Error("Server does not support getting other registry configs");

        return {
            url: process.env["REGISTRY_URL"]
        }
    }

    abstract _parameterPrompt<T extends string = string>(parameters: Parameter<T>[]): Promise<ParameterAnswer<T>>;
    abstract updateSteps(steps: string[]): void;
    abstract setCurrentStep(step: string): void;
    abstract print(type: MessageType, message: string): void;
    abstract startTask(message: string): Promise<Task>;

    log(level: "ERROR" | "WARN" | "INFO" | "DEBUG", message: string): void {
        console.log(this.jobId + " " + level + ": " + message);
    }

    async saveNewPackageFile(catalogSlug: string | undefined, packageFile: PackageFile): Promise<PackageFileWithContext> {

        if(catalogSlug === undefined)
            throw new Error("Catalog slug is undefined");

        const identifier = {
            catalogSlug,
            packageSlug: packageFile.packageSlug
        };

        await hasPackagePermissionOrFail(Permission.VIEW, this.context, identifier);

        const version = await createOrUpdateVersion(this.context, identifier, {
            packageFile
        },[] );

        return {
            hasPermissionToSave: true,
            contextType: "registry",
            cantSaveReason: false,
            packageFile: packageFile,
            permitsSaving: true,
            packageReference: catalogSlug + "/" + packageFile.packageSlug,
            readmeFileUrl: process.env["REGISTRY_URL"] + "/" + catalogSlug + "/" + packageFile.packageSlug,
            licenseFileUrl: process.env["REGISTRY_URL"] + "/" + catalogSlug + "/" + packageFile.packageSlug,
            save: async () => {
                throw new Error("Not implemented");
            }
        }
    }


    async getPackageFile(reference: string | PackageIdentifier, modifiedOrCanonical: "modified" | "canonicalIfAvailable"): Promise<PackageFileWithContext> {

        let identifier:PackageIdentifierInput;

        if(typeof reference === "string"){
            identifier = parsePackageIdentifier(reference);
        } else {
            identifier = reference;
        }

        const packageEntity = await this.context.connection.getCustomRepository(PackageRepository).findPackageOrFail({identifier});

        const latestVersion = await this.context.connection.getCustomRepository(VersionRepository).findLatestVersion({
            identifier
        });

        if(latestVersion == null) {
            throw new Error("VERSION_NOT_FOUND");
        }

        const latestPackageFile = await PackageFileStorageService.INSTANCE.readPackageFile(packageEntity.id, {
            ...identifier,
            versionMajor: latestVersion.majorVersion,
            versionMinor: latestVersion.minorVersion,
            versionPatch: latestVersion.patchVersion,
        });

        let editPermission = false;

        let cantSaveReason: CantSaveReasons | false = "NOT_AUTHORIZED"

        if((this.context as AuthenticatedContext).me != null) {
            const authenicatedContext = this.context as AuthenticatedContext;
            const permissions = await resolvePackagePermissions(this.context, identifier, authenicatedContext.me);
            editPermission = permissions.includes(Permission.EDIT);
            cantSaveReason = false;
        }

        return {
            contextType: "registry",
            hasPermissionToSave: editPermission,
            packageReference: process.env["REGISTRY_URL"] + "/" + identifier.catalogSlug + "/" + identifier.packageSlug,
            packageFile: latestPackageFile,
            permitsSaving: true,
            save: async (packageFile: PackageFile): Promise<void> => {

                await hasPackagePermissionOrFail(Permission.EDIT,this.context,identifier);        

                await createOrUpdateVersion(this.context as AuthenticatedContext, identifier, {
                    packageFile
                },[]);

            },
            licenseFileUrl: process.env["REGISTRY_URL"] + "/" + identifier.catalogSlug + "/" + identifier.packageSlug + "#license",
            readmeFileUrl: process.env["REGISTRY_URL"] + "/" + identifier.catalogSlug + "/" + identifier.packageSlug + "#readme",
            catalogSlug: identifier.catalogSlug,
            cantSaveReason
        }
    }

}