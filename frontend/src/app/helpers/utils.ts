export function extractErrorMsg(error: any) {
    if (error.networkError?.error.errors) {
        return error.networkError?.error.errors[0].message;
    } else if (error.errors) {
        return error.errors[0].message;
    }

    return "Unknown error occured";
}
