import { FileStorageNameSpace, FileStorageService } from "../files/file-storage-service";
import { PackageIdentifierInput, VersionIdentifierInput } from "../../generated/graphql";
import { PackageFile } from "datapm-lib";
import { Readable, Stream } from "stream";

export class PackageFileStorageService {
    public static readonly INSTANCE = new PackageFileStorageService();
    private fileStorageService = FileStorageService.INSTANCE;

    public async readLicenseFile(identifier: VersionIdentifierInput): Promise<string> {
        const stream = await this.fileStorageService.readFile(
            FileStorageNameSpace.LICENSE_FILE,
            this.versionIdentifierPath(identifier)
        );

        const stringValue = await this.streamToString(stream);
        return stringValue;
    }

    public async readReadmeFile(identifier: VersionIdentifierInput): Promise<string> {
        const stream = await this.fileStorageService.readFile(
            FileStorageNameSpace.README_FILE,
            this.versionIdentifierPath(identifier)
        );

        const stringValue = await this.streamToString(stream);
        return stringValue;
    }

    public async readPackageFile(identifier: VersionIdentifierInput): Promise<PackageFile> {
        const stream = await this.fileStorageService.readFile(
            FileStorageNameSpace.PACKAGE_FILE,
            this.versionIdentifierPath(identifier)
        );

        const stringValue = await this.streamToString(stream);

        const packageFile = JSON.parse(stringValue) as PackageFile;
        return packageFile;
    }

    public writeReadmeFile(identifier: VersionIdentifierInput, contents: string): Promise<void> {
        return this.fileStorageService.writeFileFromString(
            FileStorageNameSpace.README_FILE,
            this.versionIdentifierPath(identifier),
            contents
        );
    }

    public writeLicenseFile(identifier: VersionIdentifierInput, contents: string): Promise<void> {
        return this.fileStorageService.writeFileFromString(
            FileStorageNameSpace.LICENSE_FILE,
            this.versionIdentifierPath(identifier),
            contents
        );
    }

    public writePackageFile(identifier: VersionIdentifierInput, packageFile: PackageFile): Promise<void> {
        const valueString = JSON.stringify(packageFile);

        return this.fileStorageService.writeFileFromString(
            FileStorageNameSpace.PACKAGE_FILE,
            this.versionIdentifierPath(identifier),
            valueString
        );
    }

    deleteLicenseFile(identifier: VersionIdentifierInput) {
        return this.fileStorageService.deleteFile(
            FileStorageNameSpace.LICENSE_FILE,
            this.versionIdentifierPath(identifier)
        );
    }

    deleteReadmeFile(identifier: VersionIdentifierInput) {
        return this.fileStorageService.deleteFile(
            FileStorageNameSpace.README_FILE,
            this.versionIdentifierPath(identifier)
        );
    }

    deletePackageFile(identifier: VersionIdentifierInput) {
        return this.fileStorageService.deleteFile(
            FileStorageNameSpace.PACKAGE_FILE,
            this.versionIdentifierPath(identifier)
        );
    }

    private async streamToString(stream: Stream): Promise<string> {
        return new Promise((r) => {
            var tempBuffer: any[] = [];
            stream.on("data", function (d) {
                tempBuffer.push(d);
            });
            stream.on("end", function () {
                var buffer = Buffer.concat(tempBuffer).toString();
                r(buffer);
            });
        });
    }

    private versionIdentifierPath(identifier: VersionIdentifierInput): string {
        return (
            identifier.catalogSlug +
            "_" +
            identifier.packageSlug +
            "_" +
            identifier.versionMajor +
            "." +
            identifier.versionMinor +
            "." +
            identifier.versionPatch
        );
    }
}
