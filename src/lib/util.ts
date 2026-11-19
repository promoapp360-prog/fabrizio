import { randomBytes } from "crypto";
export const slugify = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
export const secureToken = (bytes = 18) => randomBytes(bytes).toString("base64url");
export const resCode = () => randomBytes(4).toString("hex").toUpperCase();
