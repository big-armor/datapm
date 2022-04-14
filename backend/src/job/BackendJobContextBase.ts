import { CantSaveReasons, JobContext, MessageType, PackageFileWithContext, PackageIdentifier, parsePackageIdentifier, RegistryConfig, RepositoryConfig, Task } from "datapm-client-lib";
import { DPMConfiguration, Parameter, ParameterAnswer, PackageFile } from "datapm-lib";
import { SemVer } from "semver";
import { Writable } from "stream";
import { createOrUpdateVersion } from "../business/CreateVersion";
import { AuthenticatedContext, Context } from "../context";
import { hasPermission, resolvePackagePermissions } from "../directive/hasPackagePermissionDirective";
import { PackageIdentifierInput, Permission } from "../generated/graphql";
import { PackageRepository } from "../repository/PackageRepository";
import { VersionRepository } from "../repository/VersionRepository";
import { PackageFileStorageService } from "../storage/packages/package-file-storage-service";

export abstract class BackendJobContextBase implements JobContext {

    constructor(public jobId: string, private context: Context) {
    }

    abstract useDefaults(): boolean;

    getRepositoryConfigsByType(type: string): RepositoryConfig[] {
        return [];
    }

    getRepositoryConfig(type: string, identifier: string): RepositoryConfig | undefined {
        throw new Error("Method not implemented.");
    }

    saveRepositoryCredential(connectorType: string, repositoryIdentifier: string, credentialsIdentifier: string, credentials: DPMConfiguration): Promise<void> {
        throw new Error("Method not implemented.");
    }

    saveRepositoryConfig(type: string, repositoryConfig: RepositoryConfig): void {
        throw new Error("Method not implemented.");
    }

    removeRepositoryConfig(type: string, repositoryIdentifer: string): void {
        throw new Error("Method not implemented.");
    }
    
    getRepositoryCredential(connectorType: string, repositoryIdentifier: string, credentialsIdentifier: string): Promise<DPMConfiguration> {
        throw new Error("Method not implemented.");
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
        throw new Error("Method not implemented.");
    }

    abstract parameterPrompt<T extends string = string>(parameters: Parameter<T>[]): Promise<ParameterAnswer<T>>;
    abstract updateSteps(steps: string[]): void;
    abstract setCurrentStep(step: string): void;
    abstract print(type: MessageType, message: string): void;
    abstract startTask(message: string): Promise<Task>;

    log(level: "ERROR" | "WARN" | "INFO" | "DEBUG", message: string): void {
        console.log(this.jobId + " " + level + ": " + message);
    }

    saveNewPackageFile(catalogSlug: string | undefined, packagefile: PackageFile): Promise<PackageFileWithContext> {
        throw new Error("Method not implemented.");
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
            packageFileUrl: process.env["REGISTRY_URL"] + "/" + identifier.catalogSlug + "/" + identifier.packageSlug,
            packageFile: latestPackageFile,
            permitsSaving: true,
            save: async (packageFile: PackageFile): Promise<void> => {

                await hasPermission(Permission.EDIT,this.context,identifier);        

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



    getPackageFileWritable(
        catalogSlug: string | undefined,
        packageSlug: string,
        _version: SemVer
    ): Promise<{ writable: Writable; location: string }> {
        throw new Error("Method not implemented.");
    }

    getReadMeFileWritable(
        catalogSlug: string | undefined,
        packageSlug: string,
        _version: SemVer
    ): Promise<{ writable: Writable; location: string }>{
        throw new Error("Method not implemented.");
    }

    getLicenseFileWritable(
        catalogSlug: string | undefined,
        packageSlug: string,
        _version: SemVer
    ): Promise<{ writable: Writable; location: string }>{
        throw new Error("Method not implemented.");
    }

}