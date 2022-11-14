import { PackageDifference, PackageDifferenceType } from "src/generated/graphql";

export interface Change {
    changeLabel?: string;
    changeFieldName?: string;
}

export function getReadableChangeFromDifference(difference: PackageDifference): Change {
    let changeLabel: string;
    switch (difference.type) {
        case PackageDifferenceType.REMOVE_SCHEMA:
            changeLabel = "Removed schema";
            break;
        case PackageDifferenceType.REMOVE_HIDDEN_SCHEMA:
            changeLabel = "Removed hidden schema";
            break;
        case PackageDifferenceType.ADD_SCHEMA:
            changeLabel = "Added schema";
            break;
        case PackageDifferenceType.REMOVE_SOURCE:
            changeLabel = "Removed source";
            break;
        case PackageDifferenceType.CHANGE_PACKAGE_DISPLAY_NAME:
            changeLabel = "Changed package display name";
            break;
        case PackageDifferenceType.CHANGE_PACKAGE_DESCRIPTION:
            changeLabel = "Changed package description";
            break;
        case PackageDifferenceType.CHANGE_SOURCE:
            changeLabel = "Changed source";
            break;
        case PackageDifferenceType.CHANGE_SOURCE_URIS:
            changeLabel = "Changed source URIs";
            break;
        case PackageDifferenceType.CHANGE_SOURCE_CONFIGURATION:
            changeLabel = "Changed source configuration";
            break;
        case PackageDifferenceType.CHANGE_STREAM_STATS:
            changeLabel = "Changed stream stats";
            break;
        case PackageDifferenceType.CHANGE_STREAM_UPDATE_HASH:
            changeLabel = "Updated stream hash";
            break;
        case PackageDifferenceType.ADD_PROPERTY:
            changeLabel = "Added property";
            break;
        case PackageDifferenceType.HIDE_PROPERTY:
            changeLabel = "Hid property";
            break;
        case PackageDifferenceType.UNHIDE_PROPERTY:
            changeLabel = "Unhid property";
            break;
        case PackageDifferenceType.REMOVE_PROPERTY:
            changeLabel = "Removed property";
            break;
        case PackageDifferenceType.REMOVE_HIDDEN_PROPERTY:
            changeLabel = "Removed hidden property";
            break;
        case PackageDifferenceType.CHANGE_PROPERTY_TYPE:
            changeLabel = "Changed property type";
            break;
        case PackageDifferenceType.CHANGE_PROPERTY_FORMAT:
            changeLabel = "Changed property format";
            break;
        case PackageDifferenceType.CHANGE_PROPERTY_DESCRIPTION:
            changeLabel = "Changed property description";
            break;
        case PackageDifferenceType.CHANGE_GENERATED_BY:
            changeLabel = "Changed author";
            break;
        case PackageDifferenceType.CHANGE_UPDATED_DATE:
            changeLabel = "Changed updated date";
            break;
        case PackageDifferenceType.CHANGE_README_MARKDOWN:
            changeLabel = "Changed README text";
            break;
        case PackageDifferenceType.CHANGE_LICENSE_MARKDOWN:
            changeLabel = "Changed license text";
            break;
        case PackageDifferenceType.CHANGE_README_FILE:
            changeLabel = "Changed README text";
            break;
        case PackageDifferenceType.CHANGE_LICENSE_FILE:
            changeLabel = "Changed LICENSE text";
            break;
        case PackageDifferenceType.CHANGE_WEBSITE:
            changeLabel = "Changed website";
            break;
        case PackageDifferenceType.CHANGE_CONTACT_EMAIL:
            changeLabel = "Changed contact email";
            break;
        case PackageDifferenceType.REMOVE_STREAM_SET:
            changeLabel = "Removed stream set";
            break;
        case PackageDifferenceType.CHANGE_VERSION:
            return null;
        case PackageDifferenceType.CHANGE_PROPERTY_UNIT:
            changeLabel = "Changed property units";
            break;
        case PackageDifferenceType.CHANGE_SOURCE_CREDENTIALS:
            changeLabel = "Changed source credentials";
            break;
        case PackageDifferenceType.CHANGE_STREAM_UPDATE_METHOD:
            changeLabel = "Changed update method";
            break;
        case PackageDifferenceType.CHANGE_SOURCE_CONNECTION:
            changeLabel = "Changed source connection";
            break;
        default:
            changeLabel = "Unknown change";
            break;
    }

    let changeFieldName = difference.pointer === "#" ? "" : difference.pointer;
    if (changeFieldName) {
        const pointerParts = changeFieldName.split("/");
        changeFieldName = pointerParts[pointerParts.length - 1];
    }

    return {
        changeLabel,
        changeFieldName
    };
}
