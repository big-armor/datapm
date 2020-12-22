export enum ActivityLogEventType {
    PackagePatchChanged = "PACKAGE_PATCH_CHANGE",
    PackageMinorChange = "PACKAGE_MINOR_CHANGE",
    PackageMajorChange = "PACKAGE_MAJOR_CHANGE",
    PackageCreated = "PACKAGE_CREATED",
    PackageDeleted = "PACKAGE_DELETED",
    PackageViewed = "PACKAGE_VIEWED",
    CollectionPackageAdded = "COLLECTION_PACKAGE_ADDED",
    CollectionPackageRemoved = "COLLECTION_PACKAGE_REMOVED"
}
