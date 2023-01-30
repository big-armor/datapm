export const PACKAGE_SLUG_REGEX = /^[a-z0-9]+(?:(?:(?:[._]|__|[-]*)[a-z0-9]+)+)?$/;
export const COLLECTION_SLUG_REGEX = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
export const CATALOG_SLUG_REGEX = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

export const PACKAGE_SLUG_MAX_LENGTH = 38;
export const CATALOG_SLUG_MAX_LENGTH = 38;

export const PACKAGE_DESCRIPTION_MAX_LENGTH = 256;
export const PACKAGE_DESCRIPTION_MIN_LENGTH = 3;

export const PACKAGE_DISPLAY_NAME_MIN_LENGTH = 3;
export const PACKAGE_DISPLAY_NAME_MAX_LENGTH = 128;

export function usernameValid(
    username: string | undefined
): "USERNAME_REQUIRED" | "USERNAME_TOO_LONG" | "INVALID_CHARACTERS" | true {
    const regex = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/;

    if (username === undefined) {
        return "USERNAME_REQUIRED";
    }

    if (username.length === 0) {
        return "USERNAME_REQUIRED";
    }

    if (username.length > 39) {
        return "USERNAME_TOO_LONG";
    }

    if (username.toLowerCase().match(regex) == null) {
        return "INVALID_CHARACTERS";
    }

    return true;
}

export function catalogSlugValid(
    slug: string | undefined
): "CATALOG_SLUG_REQUIRED" | "CATALOG_SLUG_TOO_LONG" | "CATALOG_SLUG_INVALID" | true {
    if (slug === undefined) return `CATALOG_SLUG_REQUIRED`;

    if (slug.length === 0) return `CATALOG_SLUG_REQUIRED`;

    if (slug.length > CATALOG_SLUG_MAX_LENGTH) return `CATALOG_SLUG_TOO_LONG`;

    if (!slug.match(CATALOG_SLUG_REGEX)) return `CATALOG_SLUG_INVALID`;

    return true;
}

/** Validate package slug */
export function packageSlugValid(
    slug: string | undefined
): "PACKAGE_SLUG_REQUIRED" | "PACKAGE_SLUG_TOO_LONG" | "PACKAGE_SLUG_INVALID" | true {
    if (slug === undefined) return `PACKAGE_SLUG_REQUIRED`;

    if (slug.length === 0) return `PACKAGE_SLUG_REQUIRED`;

    if (slug.length > PACKAGE_SLUG_MAX_LENGTH) return `PACKAGE_SLUG_TOO_LONG`;

    if (!slug.match(PACKAGE_SLUG_REGEX)) return "PACKAGE_SLUG_INVALID";

    return true;
}

export function collectionSlugValid(
    slug: string | undefined
): "COLLECTION_SLUG_REQUIRED" | "COLLECTION_SLUG_TOO_LONG" | "COLLECTION_SLUG_INVALID" | true {
    if (slug === undefined) return `COLLECTION_SLUG_REQUIRED`;

    if (slug.length === 0) return `COLLECTION_SLUG_REQUIRED`;

    if (slug.length > 100) return `COLLECTION_SLUG_TOO_LONG`;

    if (!slug.match(COLLECTION_SLUG_REGEX)) return `COLLECTION_SLUG_INVALID`;

    return true;
}

export function passwordValid(
    password: string | undefined
): "PASSWORD_REQUIRED" | "PASSWORD_TOO_LONG" | "INVALID_CHARACTERS" | "PASSWORD_TOO_SHORT" | true {
    const regex = /[0-9@#$%!]/;

    if (password === undefined || password.length === 0) {
        return "PASSWORD_REQUIRED";
    }
    if (password.length > 99) {
        return "PASSWORD_TOO_LONG";
    }

    if (password.length < 8) {
        return "PASSWORD_TOO_SHORT";
    }

    if (password.length < 16 && password.match(regex) == null) {
        return "INVALID_CHARACTERS";
    }

    return true;
}

export function emailAddressValid(
    emailAddress: string | undefined
): true | "REQUIRED" | "TOO_LONG" | "INVALID_EMAIL_ADDRESS_FORMAT" {
    const regex = /^(?=[A-Z0-9][A-Z0-9@._%+-]{5,253}$)[A-Z0-9._%+-]{1,64}@(?:(?=[A-Z0-9-]{1,63}\.)[A-Z0-9]+(?:-[A-Z0-9]+)*\.){1,8}[A-Z]{2,63}$/i;

    if (emailAddress == null) return `REQUIRED`;

    if (emailAddress.trim().length === 0) return `REQUIRED`;

    if (emailAddress.length > 254) return `TOO_LONG`;

    if (emailAddress.match(regex) == null) return "INVALID_EMAIL_ADDRESS_FORMAT";

    return true;
}

export function validateUsernameOrEmail(
    value: string | undefined
):
    | true
    | "REQUIRED"
    | "TOO_LONG"
    | "INVALID_EMAIL_ADDRESS_FORMAT"
    | "USERNAME_REQUIRED"
    | "USERNAME_TOO_LONG"
    | "INVALID_CHARACTERS" {
    if (value?.indexOf("@") !== -1) {
        return emailAddressValid(value);
    } else {
        return usernameValid(value);
    }
}

export function validPackageDescription(
    value: string
): true | "REQUIRED" | "MUST_BE_STRING" | "TOO_LONG" | "TOO_SHORT" {
    if (value == null) return "REQUIRED";

    if (typeof value !== "string") return "MUST_BE_STRING";

    if (value.length < PACKAGE_DESCRIPTION_MIN_LENGTH) return "TOO_SHORT";

    if (value.length > PACKAGE_DESCRIPTION_MAX_LENGTH) return "TOO_LONG";

    return true;
}

export function validPackageDisplayName(
    value: string
): true | "REQUIRED" | "INVALID_CHARACTERS" | "MUST_BE_STRING" | "TOO_LONG" | "TOO_SHORT" {
    if (value == null) return "REQUIRED";

    if (typeof value !== "string") return "MUST_BE_STRING";

    if (!value.match(/^[a-zA-Z][a-zA-z0-9 _\-%*\\+]+$/)) return "INVALID_CHARACTERS";

    if (value.length < PACKAGE_DISPLAY_NAME_MIN_LENGTH) return "TOO_SHORT";

    if (value.length > PACKAGE_DISPLAY_NAME_MAX_LENGTH) return "TOO_LONG";

    return true;
}
