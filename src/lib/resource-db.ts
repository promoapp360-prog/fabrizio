import { db } from "./db";
import { HttpError } from "./api";
import { RESOURCES, type ResourceName } from "./resources";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const model = (r: ResourceName) => (db as any)[RESOURCES[r].model];
export const getRes = (name: string) => { if (!(name in RESOURCES)) throw new HttpError(404, "Risorsa sconosciuta"); return name as ResourceName; };
