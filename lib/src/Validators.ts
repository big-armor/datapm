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
