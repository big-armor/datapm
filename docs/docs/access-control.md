---
id: access-control
title: DataPM Access Control
sidebar_label: Access Control
---

DataPM provides simple but powerful access controls.

# Quick Summary

DataPM provides Public, View, Edit, and Manage roles on Packages, Catalogs, and Collections. Packages belong to one and only one Catalog, and may be grouped by Collections for convenience. Making a resource public gives everyone view access. View access allows fetching data. Edit access is for schema and description updates. Manage access provides full control, including deleting resources and setting access permissions.

# Catalogs and Collections

All packages belong to one and only one Catalog. Catalogs represent a person, organization, or a team. Typically there should be a few "administrative" level users with the Manage role on a catalog. And then many users that create packages in that catalog.

Packages may belong to zero or more Collections. Collections represent a topic or logical convenient grouping of packages. A user must have view access to a package to see it in a collection, even if they have view access to the collection.

# Public Access Control

Public access provides view level access to all users - including unauthenticated users. Packages can not be made public until their parent catalog is also made public. Setting a catalog not public, removes public access from all packages in that catalog.

Collections may be made public, but this does not change the access control of the packages in the collection.

# View Access

View access gives the user the right to view, but not edit resources.

For packages, this means that the user can view the schema, description, preview data, and fetch (download) the package file. If the packageFile includes a source that requires credentials (for example, a database), the user must supply those credentials to access the data. DataPM does not transfer credentials to the user.

For package issues, the user can view all package issues. And the user can create their own issues. They can edit issues and comments that they created.

For catalogs, view access allows the user to view description of the catalog. Separately, users can be assigned the "All catalog packages" access to view all packages in the catalog.

For collections, the user can view the description of the collection. But the user must have separately assigned access to each package in the collection.

# Edit Access

Edit access gives the user the right to view and edit resources.

For packages, edit access allows the user to update the package description, and upload new versions of package files.

For catalogs, edit access allows the user to update the catalog description. To edit or delete packages, the user must have the edit permission in the "all catalog packages" setting.

For collections, edit access allows the user to update the description of the collection, and to add or remove packages from the collection. This does not convey any permissions on the packages in the collection.

# Manage Access

Manage access gives the user view and edit permissions. Manage also gives the user the right to change all aspects of resources - including setting access permissions for other users, and deleting the resource.

For packages, gives the user the right to delete the package and share it with others.

For catalogs, manage access gives the user the right to delete the catalog, and to set permissions for other users. Catalog managers can also give users for "all catalog packages".

For collections, manage access gives the user the right to delete the collection, and to set permissions for other users. This does not convey to the packages in the collection.
