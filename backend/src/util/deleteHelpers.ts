import { mediaStorage } from "./storage";

export async function deleteNoThrow(path: string) {
  try {
    await mediaStorage.deleteObject(path);
  } catch (err) {
    console.warn(`Failed to delete '${path}' - ${err}`);
  }
}


