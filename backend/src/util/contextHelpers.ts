import { Context } from "../context";

export function isRequestingUserOrAdmin(context: Context, username: string): boolean {
    if (context.me == null) {
        return false;
    }

    return context.me.isAdmin || context.me.username === username;
}

export function isAuthenticatedAsAdmin(context: Context): boolean {
    return isAuthenticatedContext(context) && context.me?.isAdmin === true;
}

export function isUserWithUsername(context: Context, username: string): boolean {
    return isAuthenticatedContext(context) && context.me?.username === username;
}

export function isAuthenticatedContext(context: Context): boolean {
    return context.me != null;
}
