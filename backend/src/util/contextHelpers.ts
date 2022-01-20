import { AuthenticatedContext, Context } from "../context";

export function isRequestingUserOrAdmin(context: Context, username: string): boolean {

    if(!isAuthenticatedContext(context))
        return false;

    const authenticatedContext = context as AuthenticatedContext;

    return authenticatedContext.me.isAdmin || authenticatedContext.me.username === username;
}

export function isAuthenticatedAsAdmin(context: Context): boolean {

    if(!isAuthenticatedContext(context))
        return false;
    
    const authenicatedContext = context as AuthenticatedContext;

    return authenicatedContext.me.isAdmin === true;
}

export function isUserWithUsername(context: AuthenticatedContext, username: string): boolean {
    return isAuthenticatedContext(context) && context.me?.username === username;
}

export function isAuthenticatedContext(context: Context): boolean {
    return Object.keys(context).includes("me");
}
