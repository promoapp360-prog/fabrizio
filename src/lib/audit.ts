import { db } from "./db";
export async function audit(userId: string | null, action: string, entity: string, entityId?: string, data?: unknown) {
  return db.auditLog.create({ data: { userId, action, entity, entityId, data: data as object | undefined } });
}
