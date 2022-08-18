import { ActivityLogEntity } from "./entity/ActivityLogEntity";
import { CatalogEntity } from "./entity/CatalogEntity";
import { CollectionEntity } from "./entity/CollectionEntity";
import { GroupEntity } from "./entity/GroupEntity";
import { PackageEntity } from "./entity/PackageEntity";
import { UserCatalogPermissionEntity } from "./entity/UserCatalogPermissionEntity";
import { UserEntity } from "./entity/UserEntity";
import { UserPackagePermissionEntity } from "./entity/UserPackagePermissionEntity";
import { VersionEntity } from "./entity/VersionEntity";
import { PackageIdentifier, PackageIdentifierInput, Permission, VersionIdentifierInput } from "./generated/graphql";

export class SessionCache {
    private readonly cache = new Map<string, Promise<any>>();

    public clear(): void {
        this.cache.clear();
    }

    public storePackageToCache(packageEntity: PackageEntity): void {
        const cacheId = this.buildDataKeyForPackageId(packageEntity.id);
        this.storeToCache(cacheId, packageEntity);
    }

    public storeCatalogToCache(catalogEntity: CatalogEntity): void {
        const cacheId = this.buildDataKeyForCatalogSlug(catalogEntity.slug);
        this.storeToCache(cacheId, catalogEntity);
    }

    public storeToCache(key: string, data: any): void {
        this.cache.set(key, Promise.resolve(data));
    }

    public async loadUser(
        id: number,
        userPromise: () => Promise<UserEntity>,
        forceReload?: boolean
    ): Promise<UserEntity> {
        const cacheId = this.buildDataKeyForUserId(id);
        return this.loadDataAsync(cacheId, userPromise, forceReload);
    }

    public async loadUserByUsername(
        username: string,
        userPromise: () => Promise<UserEntity>,
        forceReload?: boolean
    ): Promise<UserEntity> {
        const cacheId = this.buildDataKeyForUserByUsername(username);
        return this.loadDataAsync(cacheId, userPromise, forceReload);
    }

    public async loadPackage(
        id: number,
        packagePromise: () => Promise<PackageEntity>,
        forceReload?: boolean
    ): Promise<PackageEntity> {
        const cacheId = this.buildDataKeyForPackageId(id);
        return this.loadDataAsync(cacheId, packagePromise, forceReload);
    }

    public async loadPackageByIdentifier(
        identifier: PackageIdentifier | PackageIdentifierInput,
        packagePromise: () => Promise<PackageEntity>
    ): Promise<PackageEntity> {
        const cacheId = this.buildDataKeyForPackageIdentifier(identifier);
        return this.loadDataAsync(cacheId, packagePromise);
    }

    public async loadLatestPackageVersion(
        packageId: number,
        versionPromise: () => Promise<VersionEntity>,
        forceReload?: boolean
    ): Promise<VersionEntity> {
        const cacheId = this.buildDataKeyForLatestPackageVersionId(packageId);
        return this.loadDataAsync(cacheId, versionPromise, forceReload);
    }

    public async loadPackageVersion(
        identifier: VersionIdentifierInput,
        versionPromise: () => Promise<VersionEntity>,
        forceReload?: boolean
    ): Promise<VersionEntity> {
        const cacheId = this.buildDataKeyForVersionIdentifier(identifier);
        return this.loadDataAsync(cacheId, versionPromise, forceReload);
    }

    public async loadPackageVersions(
        packageId: number,
        versionsPromise: () => Promise<VersionEntity[]>,
        forceReload?: boolean
    ): Promise<VersionEntity[]> {
        const cacheId = this.buildDataKeyForPackageVersionId(packageId);
        return this.loadDataAsync(cacheId, versionsPromise, forceReload);
    }

    public async loadCatalog(id: number, catalogPromise: () => Promise<CatalogEntity>): Promise<CatalogEntity> {
        const cacheId = this.buildDataKeyForCatalogId(id);
        return this.loadDataAsync(cacheId, catalogPromise);
    }

    public async loadCatalogBySlug(
        slug: string,
        catalogPromise: () => Promise<CatalogEntity>,
        forceReload?: boolean
    ): Promise<CatalogEntity> {
        const cacheId = this.buildDataKeyForCatalogSlug(slug);
        return this.loadDataAsync(cacheId, catalogPromise, forceReload);
    }

    public async loadCollection(
        id: number,
        collectionPromise: () => Promise<CollectionEntity>
    ): Promise<CollectionEntity> {
        const cacheId = this.buildDataKeyForCollectionId(id);
        return this.loadDataAsync(cacheId, collectionPromise);
    }

    public async loadCollectionBySlug(
        slug: string,
        collectionPromise: () => Promise<CollectionEntity>
    ): Promise<CollectionEntity> {
        const cacheId = this.buildDataKeyForCollectionSlug(slug);
        return this.loadDataAsync(cacheId, collectionPromise);
    }

    public async loadPackagePermissionsById(
        id: number,
        permissionPromise: () => Promise<Permission[]>
    ): Promise<Permission[]> {
        const cacheId = this.buildDataKeyForPackagePermissions(id);
        return this.loadDataAsync(cacheId, permissionPromise);
    }

    public async loadPackagePermissionsStatusById(
        id: number,
        permission: Permission,
        permissionPromise: () => Promise<Boolean>
    ): Promise<Boolean> {
        const cacheId = this.buildDataKeyForPackagePermission(id, permission);
        return this.loadDataAsync(cacheId, permissionPromise);
    }

    public async loadCatalogPackagePermissionsById(
        id: number,
        permissionPromise: () => Promise<Permission[]>
    ): Promise<Permission[]> {
        const cacheId = this.buildDataKeyForCatalogPackagePermissions(id);
        return this.loadDataAsync(cacheId, permissionPromise);
    }

    public async loadCatalogPermissionsById(
        id: number,
        permissionPromise: () => Promise<Permission[]>
    ): Promise<Permission[]> {
        const cacheId = this.buildDataKeyForCatalogPermissions(id);
        return this.loadDataAsync(cacheId, permissionPromise);
    }

    public async loadCollectionPermissionsById(
        id: number,
        permissionPromise: () => Promise<Permission[]>
    ): Promise<Permission[]> {
        const cacheId = this.buildDataKeyForCollection(id);
        return this.loadDataAsync(cacheId, permissionPromise);
    }

    public async loadCollectionPermissionsStatusById(
        id: number,
        permission: Permission,
        permissionPromise: () => Promise<Boolean>
    ): Promise<Boolean> {
        const cacheId = this.buildDataKeyForCollectionPermission(id, permission);
        return this.loadDataAsync(cacheId, permissionPromise);
    }

    public async loadActivityLog(
        id: number,
        logPromise: () => Promise<ActivityLogEntity>,
        forceReload?: boolean
    ): Promise<ActivityLogEntity> {
        const cacheId = this.buildDataKeyForActivityLogId(id);
        return this.loadDataAsync(cacheId, logPromise, forceReload);
    }

    public async loadDataAsync(
        dataKey: string,
        dataPromiseFunction: () => Promise<any>,
        forceReload?: boolean
    ): Promise<any> {
        if (dataKey == null) return null;

        const cachedData = this.cache.get(dataKey);
        if (cachedData && !forceReload) {
            return cachedData;
        }

        const resolvedDataPromise = new Promise(async (res, rej) => {
            dataPromiseFunction()
                .then((data) => res(data))
                .catch((error) => rej(error));
        });
        this.cache.set(dataKey, resolvedDataPromise);
        return resolvedDataPromise;
    }

    public async loadGroup(
        id: number,
        groupPromise: () => Promise<GroupEntity>,
        forceReload?: boolean
    ): Promise<GroupEntity> {
        const cacheId = this.buildDataKeyForGroupId(id);
        return this.loadDataAsync(cacheId, groupPromise, forceReload);
    }

    public async loadGroupBySlug(
        groupSlug: string,
        groupPromise: () => Promise<GroupEntity>,
        forceReload?: boolean
    ): Promise<GroupEntity> {
        const cacheId = this.buildDataKeyForGroupSlug(groupSlug);
        return this.loadDataAsync(cacheId, groupPromise, forceReload);
    }

    public async loadGroupPermissionsById(
        groupId: number,
        groupPromise: () => Promise<Permission[]>,
        forceReload?: boolean
    ): Promise<Permission[]> {
        const cacheId = this.buildDataKeyForGroupPermissionsId(groupId);
        return this.loadDataAsync(cacheId, groupPromise, forceReload);
    }

    private buildDataKeyForUserId(id: number): string {
        return "USER_ID-" + id;
    }

    private buildDataKeyForUserByUsername(username: string): string {
        return "USER_USERNAME-" + username;
    }

    private buildDataKeyForPackageId(id: number): string {
        return "PACKAGE_ID-" + id;
    }

    private buildDataKeyForActivityLogId(id: number): string {
        return "ACTIVITY_LOG_ID-" + id;
    }

    private buildDataKeyForPackageIdentifier(identifier: PackageIdentifier | PackageIdentifierInput): string {
        return "PACKAGE_ID-" + identifier.catalogSlug + "/" + identifier.packageSlug;
    }

    private buildDataKeyForVersionIdentifier(identifier: VersionIdentifierInput): string {
        return (
            "VERSION_ID-" +
            identifier.catalogSlug +
            "/" +
            identifier.packageSlug +
            "/" +
            identifier.versionMajor +
            "." +
            identifier.versionMinor +
            "." +
            identifier.versionPatch
        );
    }

    private buildDataKeyForLatestPackageVersionId(id: number): string {
        return "PACKAGE_LATEST_VERSION_ID-" + id;
    }

    private buildDataKeyForPackageVersionId(id: number): string {
        return "PACKAGE_VERSION_ID-" + id;
    }

    private buildDataKeyForPackagePermissions(id: number): string {
        return "PACKAGE_PERMISSIONS_ID-" + id;
    }

    private buildDataKeyForCatalogPermissions(id: number): string {
        return "CATALOG_PERMISSIONS_ID-" + id;
    }

    private buildDataKeyForCatalogPackagePermissions(id: number): string {
        return "CATALOG_PACKAGE_PERMISSIONS_ID-" + id;
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

    private buildDataKeyForCollection(id: number): string {
        return "COLLECTION_PERMISSION_ID-" + id;
    }

    private buildDataKeyForGroups(): string {
        return "GROUPS";
    }

    private buildDataKeyForGroupId(id: number): string {
        return "GROUP_ID-" + id;
    }

    private buildDataKeyForGroupSlug(slug: string): string {
        return "GROUP_SLUG-" + slug;
    }

    private buildDataKeyForGroupPermissionsId(id: number): string {
        return "GROUP_PERMISSIONS_ID-" + id;
    }
}
