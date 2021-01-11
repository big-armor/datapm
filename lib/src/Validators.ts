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

    if (slug.length > 38) return `CATALOG_SLUG_TOO_LONG`;

    const regExp = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

    if (!slug.match(regExp)) return `CATALOG_SLUG_INVALID`;

    return true;
}

/** Validate package slug */
export function packageSlugValid(
    slug: string | undefined
): "PACKAGE_SLUG_REQUIRED" | "PACKAGE_SLUG_TOO_LONG" | "PACKAGE_SLUG_INVALID" | true {
    if (slug === undefined) return `PACKAGE_SLUG_REQUIRED`;

    if (slug.length === 0) return `PACKAGE_SLUG_REQUIRED`;

    if (slug.length > 38) return `PACKAGE_SLUG_TOO_LONG`;

    const regExp = /^[a-z0-9]+(?:(?:(?:[._]|__|[-]*)[a-z0-9]+)+)?$/;

    if (!slug.match(regExp)) return "PACKAGE_SLUG_INVALID";

    return true;
}
