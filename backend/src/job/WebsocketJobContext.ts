import { JobContext, Task, RepositoryConfig, RegistryConfig, MessageType, PackageFileWithContext, PackageIdentifier, Permission, PackageIdentifierInput, parsePackageIdentifier, TaskStatus } from "datapm-client-lib";
import { DPMConfiguration, JobMessageRequest, JobMessageResponse, JobRequestType, PackageFile, Parameter, ParameterAnswer } from "datapm-lib";
import { SemVer } from "semver";
import { Writable } from "stream";
import { AuthenticatedContext, SocketContext } from "../context";
import SocketIO from 'socket.io';
import { resolvePackagePermissions } from "../directive/hasPackagePermissionDirective";
import { VersionRepository } from "../repository/VersionRepository";
import { PackageFileStorageService } from "../storage/packages/package-file-storage-service";
import { PackageRepository } from "../repository/PackageRepository";

export class WebsocketJobContext implements JobContext {

    constructor(private socketContext:SocketContext, private socket: SocketIO.Socket, private channelName: string) {
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

    getRepositoryConfigsByType(type: string): RepositoryConfig[] {
        throw new Error("Method not implemented.");
    }

    parameterPrompt<T extends string = string>(parameters: Parameter<T>[]): Promise<ParameterAnswer<T>> {
        
        const request = new JobMessageRequest(JobRequestType.PROMPT);
        request.prompts = parameters;

        return new Promise<ParameterAnswer<T>>((resolve, reject) => {
            this.socket.emit(this.channelName, request, (response: JobMessageResponse) => {
                if(response.responseType === JobRequestType.ERROR){
                    reject(response.message);
                }else{
                    if(!response.answers) {
                        throw new Error("No answers received"); 
                    }

                    resolve(response.answers);
                }
            });
        });


    }

    updateSteps(steps: string[]): void {
        const request = new JobMessageRequest(JobRequestType.SET_STEPS);
        request.steps = steps;
        this.socket.emit(this.channelName, request);    }

    setCurrentStep(step: string): void {
        const request = new JobMessageRequest(JobRequestType.SET_CURRENT_STEP);
        request.message = step;
        this.socket.emit(this.channelName, request);
    }

    print(type: MessageType, message: string): void {
        const request = new JobMessageRequest(JobRequestType.PRINT);
        request.message = message;
        request.messageType = type;

        this.socket.emit(this.channelName, request);
    }

    async startTask(message: string): Promise<Task> {
        const request = new JobMessageRequest(JobRequestType.START_TASK);
        request.message = message;

        const task: Task = {
            end: (status: TaskStatus, message?: string) => {

                const endTaskMessage = new JobMessageRequest(JobRequestType.END_TASK);
                endTaskMessage.taskStatus = status;
                endTaskMessage.message = message;

                return new Promise<void>((resolve, reject) => {
                    this.socket.emit(this.channelName, endTaskMessage,(response: JobMessageResponse) => {
                        if(response.responseType === JobRequestType.ERROR){
                            reject(response.message);
                        }else{
                            resolve();
                        }

                    });
                });
            },
            setMessage: (message: string) => {

                const request = new JobMessageRequest(JobRequestType.TASK_UPDATE);
                request.message = message;

                this.socket.emit(this.channelName, request);
            }
        }

        this.socket.emit(this.channelName, request);

        return task;

    }

    log(level: "ERROR" | "WARN" | "INFO" | "DEBUG", message: string): void {
        console.log(level + ": " + message);
    }

    async getPackageFile(reference: string | PackageIdentifier, modifiedOrCanonical: "modified" | "canonicalIfAvailable"): Promise<PackageFileWithContext> {

        let identifier:PackageIdentifierInput;

        if(typeof reference === "string"){
            identifier = parsePackageIdentifier(reference);
        } else {
            identifier = reference;
        }

        const packageEntity = await this.socketContext.connection.getCustomRepository(PackageRepository).findPackageOrFail({identifier});

        const latestVersion = await this.socketContext.connection.getCustomRepository(VersionRepository).findLatestVersion({
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

        let cantSaveReason: string | undefined = "You do not have edit permission on the pacakge";

        if((this.socketContext as AuthenticatedContext).me != null) {
            const authenicatedContext = this.socketContext as AuthenticatedContext;
            const permissions = await resolvePackagePermissions(this.socketContext, identifier, authenicatedContext.me);
            editPermission = permissions.includes(Permission.EDIT);
            cantSaveReason = undefined;
        }

        return {
            contextType: "registry",
            hasPermissionToSave: editPermission,
            packageFileUrl: process.env["REGISTRY_URL"] + "/" + identifier.catalogSlug + "/" + identifier.packageSlug,
            packageFile: latestPackageFile,
            permitsSaving: true,
            save: async (packageFile: PackageFile): Promise<void> => {
                throw new Error("Saving package files in web socket is not yet implemented");
            },
            licenseFileUrl: process.env["REGISTRY_URL"] + "/" + identifier.catalogSlug + "/" + identifier.packageSlug + "#license",
            readmeFileUrl: process.env["REGISTRY_URL"] + "/" + identifier.catalogSlug + "/" + identifier.packageSlug + "#readme",
            catalogSlug: identifier.catalogSlug,
            cantSaveReason
        }
    }

    async saveNewPackageFile(catalogSlug: string | undefined, packageFile:PackageFile): Promise<PackageFileWithContext> {

        throw new Error("savePackageFile Not yet implemented");
        
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