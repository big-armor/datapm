import DataLoader from "dataloader";
import { mediaStorage } from "./util/storage";

function signUrls(paths: readonly string[]): Promise<string[]> {
  const promises = paths.map((path) => mediaStorage.signUrl(path));
  return Promise.all(promises);
}

function signUrlsWeek(paths: readonly string[]): Promise<string[]> {
  const promises = paths.map((path) => mediaStorage.signUrlWeek(path));
  return Promise.all(promises);
}

export interface DataLoaders {
  signUrl: DataLoader<string, string>;
  signUrlWeek: DataLoader<string, string>;
}

export function createDataLoaders() {
  return {
    signUrl: new DataLoader<string, string>((paths) => signUrls(paths)),
    signUrlWeek: new DataLoader<string, string>((paths) => signUrlsWeek(paths)),
  };
}
