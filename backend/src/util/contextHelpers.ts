import { Context, AuthenticatedContext } from "../context";

export function isAuthenticatedContext(context: Context): boolean {
    return context.me !== undefined;
}
