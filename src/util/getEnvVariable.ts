export function getEnvVariable(name: string): string {
  const environmentVariable = process.env[name];
  if (environmentVariable === undefined) {
    throw new Error(`The environment variable '${name}' must be set`);
  }

  return environmentVariable;
}
