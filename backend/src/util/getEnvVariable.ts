export function getEnvVariable(name: string, defaultValue: string | undefined = undefined): string {
    let environmentVariable = process.env[name];
    if (environmentVariable == null && defaultValue !== undefined) {
        environmentVariable = defaultValue;
    } else if (environmentVariable === undefined) {
        throw new Error(`The environment variable '${name}' must be set`);
    }
    return environmentVariable;
}
