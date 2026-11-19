// Permessi per ruolo. Verificati SEMPRE lato server (requirePermission).
export type Role = "SUPER_ADMIN" | "MANAGER" | "WAITER" | "KITCHEN";
export type Permission =
  | "dashboard" | "orders.view" | "orders.manage" | "orders.payments" | "kitchen"
  | "reservations" | "tables" | "menu" | "meat" | "content" | "customers"
  | "stock" | "promotions" | "stats" | "settings" | "users" | "audit";

const ALL: Permission[] = ["dashboard","orders.view","orders.manage","orders.payments","kitchen","reservations","tables","menu","meat","content","customers","stock","promotions","stats","settings","users","audit"];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: ALL,
  MANAGER: ["dashboard","orders.view","orders.manage","orders.payments","kitchen","reservations","tables","menu","meat","content","customers","stock","promotions","stats"],
  WAITER: ["dashboard","orders.view","orders.manage","orders.payments","reservations","tables"],
  KITCHEN: ["orders.view","kitchen"],
};

export const can = (role: Role, p: Permission) => ROLE_PERMISSIONS[role]?.includes(p) ?? false;
