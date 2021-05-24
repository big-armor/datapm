import { CatalogEntity } from "./entity/CatalogEntity";
import { CollectionEntity } from "./entity/CollectionEntity";
import { PackageEntity } from "./entity/PackageEntity";
import { PackageIdentifier, PackageIdentifierInput, Permission } from "./generated/graphql";

export class SessionCache {
    private readonly loadedData = new Map<string, Promise<any>>();

    public async loadPackage(id: number, packagePromise: Promise<PackageEntity>): Promise<PackageEntity> {
        const cacheId = this.buildDataKeyForPackageId(id);
        return this.loadDataAsync(cacheId, packagePromise);
    }

    public async loadPackageByIdentifier(identifier: PackageIdentifier | PackageIdentifierInput, packagePromise: Promise<PackageEntity>): Promise<PackageEntity> {
        const cacheId = this.buildDataKeyForPackageIdentifier(identifier);
        return this.loadDataAsync(cacheId, packagePromise);
    }

    public async loadCatalog(id: number, catalogPromise: Promise<CatalogEntity>): Promise<CatalogEntity> {
        const cacheId = this.buildDataKeyForCatalogId(id);
        return this.loadDataAsync(cacheId, catalogPromise);
    }

    public async loadCatalogBySlug(slug: string, catalogPromise: Promise<CatalogEntity>): Promise<CatalogEntity> {
        const cacheId = this.buildDataKeyForCatalogSlug(slug);
        return this.loadDataAsync(cacheId, catalogPromise);
    }

    public async loadCollection(id: number, collectionPromise: Promise<CollectionEntity>): Promise<CollectionEntity> {
        const cacheId = this.buildDataKeyForCollectionId(id);
        return this.loadDataAsync(cacheId, collectionPromise);
    }

    public async loadCollectionBySlug(slug: string, collectionPromise: Promise<CollectionEntity>): Promise<CollectionEntity> {
        const cacheId = this.buildDataKeyForCollectionSlug(slug);
        return this.loadDataAsync(cacheId, collectionPromise);
    }

    public async loadPackagePermissionsStatusById(id: number, permission: Permission, permissionPromise: Promise<Boolean>): Promise<Boolean> {
        const cacheId = this.buildDataKeyForPackagePermission(id, permission);
        return this.loadDataAsync(cacheId, permissionPromise);
    }

    public async loadCollectionPermissionsStatusById(id: number, permission: Permission, permissionPromise: Promise<Boolean>): Promise<Boolean> {
        const cacheId = this.buildDataKeyForCollectionPermission(id, permission);
        return this.loadDataAsync(cacheId, permissionPromise);
    }

    public async loadDataAsync(dataKey: string, dataPromise: Promise<any>): Promise<any> {
        const cachedData = this.loadedData.get(dataKey);
        if (cachedData) {
            return cachedData;
        }

        const resolvedDataPRomise = new Promise(async (res, rej) => {
            dataPromise
                .then((data) => {
                    console.log("Doing things for " + dataKey);
                    res(data);
                })
                .catch((error) => rej(error));
        });
        this.loadedData.set(dataKey, resolvedDataPRomise);
        // console.log("Couldn't find cache for ", dataKey);
        return resolvedDataPRomise;
    }

    private buildDataKeyForPackageId(id: number): string {
        return "PACKAGE_ID-" + id;
    }

    private buildDataKeyForPackageIdentifier(identifier: PackageIdentifier | PackageIdentifierInput): string {
        return "PACKAGE_ID-" + identifier.catalogSlug + "/" + identifier.packageSlug;
    }

    private buildDataKeyForPackagePermission(id: number, permission: Permission): string {
        return "PACKAGE_PERMISSION_ID-" + id + "_" + permission;
    }

    private buildDataKeyForCatalogId(id: number): string {
        return "CATALOG_ID-" + id;
    }

    private buildDataKeyForCatalogSlug(slug: string): string {
        return "CATALOG_SLUG-" + slug;
    }

    private buildDataKeyForCollectionId(id: number): string {
        return "COLLECTION_ID-" + id;
    }

    private buildDataKeyForCollectionSlug(slug: string): string {
        return "COLLECTION_SLUG-" + slug;
    }

    private buildDataKeyForCollectionPermission(id: number, permission: Permission): string {
        return "COLLECTION_PERMISSION_ID-" + id + "_" + permission;
    }
}
