import { z } from "zod";
import type { Permission } from "./rbac";

const str = z.string().trim();
const opt = str.max(5000).optional().nullable();
const imgs = z.array(z.string().url().or(z.string().startsWith("/"))).max(30).default([]);
const priceMode = z.enum(["FIXED", "PER_KG", "PER_HG", "PER_PORTION"]);
const channel = z.enum(["TABLE", "TAKEAWAY", "DELIVERY"]);

/**
 * Registro risorse CRUD dell'admin. Ogni risorsa: modello Prisma, permesso, schema di validazione,
 * ordinamento e include. Aggiungere una risorsa = aggiungere una voce qui.
 */
export const RESOURCES = {
  categories: { model: "category", perm: "menu", orderBy: { position: "asc" }, schema: z.object({ name: str.min(1), slug: str.min(1), description: opt, images: imgs, parentId: str.nullable().optional(), position: z.number().int().default(0), active: z.boolean().default(true) }) },
  products: { model: "product", perm: "menu", orderBy: [{ categoryId: "asc" }, { position: "asc" }], include: { category: true, allergens: true, optionGroups: { include: { options: true } } },
    schema: z.object({ name: str.min(1), slug: str.min(1), description: opt, ingredients: opt, categoryId: str, priceMode, priceCents: z.number().int().min(0),
      takeawayPriceCents: z.number().int().min(0).nullable().optional(), estWeightGrams: z.number().int().min(0).nullable().optional(), hasCooking: z.boolean().default(false),
      images: imgs, available: z.boolean().default(true), active: z.boolean().default(true), dailySpecial: z.boolean().default(false), offMenu: z.boolean().default(false),
      seasonal: z.boolean().default(false), specialty: z.boolean().default(false), recommended: z.boolean().default(false), channels: z.array(channel).default(["TABLE", "TAKEAWAY", "DELIVERY"]), breedId: str.nullable().optional(), cutId: str.nullable().optional(),
      origin: opt, cutName: opt, breedName: opt, farming: opt, ageing: opt, cookingNotes: opt, meatCharacteristics: opt,
      pricePending: z.boolean().default(false), pairing: opt, isDemo: z.boolean().default(false), position: z.number().int().default(0),
      allergenIds: z.array(str).optional(), traceIds: z.array(str).optional(),
      optionGroups: z.array(z.object({ name: str.min(1), minSelect: z.number().int().min(0), maxSelect: z.number().int().min(1), options: z.array(z.object({ name: str.min(1), priceCents: z.number().int().min(0), available: z.boolean().default(true) })) })).optional() }) },
  allergens: { model: "allergen", perm: "menu", orderBy: { name: "asc" }, schema: z.object({ code: str.min(1), name: str.min(1) }) },
  breeds: { model: "breed", perm: "meat", orderBy: { position: "asc" }, include: { cuts: true },
    schema: z.object({ slug: str.min(1), name: str.min(1), type: opt, country: opt, region: opt, farmingMethodId: str.nullable().optional(), feeding: opt, tasting: opt,
      marbling: z.number().int().min(1).max(5).nullable().optional(), tenderness: z.number().int().min(1).max(5).nullable().optional(), flavour: z.number().int().min(1).max(5).nullable().optional(),
      ageing: opt, certifications: opt, certVerified: z.boolean().default(false), body: opt, images: imgs, videoUrl: opt, available: z.boolean().default(false),
      isDemo: z.boolean().default(false), published: z.boolean().default(true), position: z.number().int().default(0), cutIds: z.array(str).optional() }) },
  cuts: { model: "cut", perm: "meat", orderBy: { position: "asc" },
    schema: z.object({ slug: str.min(1), name: str.min(1), altNames: opt, anatomy: opt, zone: opt, description: opt, flavour: opt, texture: opt, cooking: opt, ageing: opt,
      images: imgs, isDemo: z.boolean().default(false), published: z.boolean().default(true), position: z.number().int().default(0) }) },
  farming: { model: "farmingMethod", perm: "meat", orderBy: { name: "asc" }, schema: z.object({ slug: str.min(1), name: str.min(1), description: str }) },
  tables: { model: "table", perm: "tables", orderBy: { number: "asc" }, include: { qrCodes: { where: { active: true } } },
    schema: z.object({ number: z.number().int().min(1), label: opt, seats: z.number().int().min(1).max(40), area: str.default("Sala"), posX: z.number().int().default(0), posY: z.number().int().default(0), active: z.boolean().default(true), reservable: z.boolean().default(true) }) },
  shifts: { model: "shift", perm: "settings", orderBy: { start: "asc" }, schema: z.object({ name: str.min(1), weekdays: z.array(z.number().int().min(0).max(6)), start: str.regex(/^\d{2}:\d{2}$/), end: str.regex(/^\d{2}:\d{2}$/), slotMinutes: z.number().int().min(15).max(120), maxCovers: z.number().int().min(1), active: z.boolean().default(true) }) },
  closures: { model: "closure", perm: "settings", orderBy: { date: "asc" }, schema: z.object({ date: z.coerce.date(), reason: opt }) },
  promotions: { model: "promotion", perm: "promotions", orderBy: { startsAt: "desc" }, schema: z.object({ title: str.min(1), description: opt, kind: z.enum(["banner", "special", "tasting", "offer"]), image: opt, startsAt: z.coerce.date(), endsAt: z.coerce.date(), active: z.boolean().default(true), productIds: z.array(str).default([]) }) },
  sections: { model: "section", perm: "content", orderBy: [{ pageId: "asc" }, { position: "asc" }], schema: z.object({ pageId: str, type: str, position: z.number().int(), enabled: z.boolean(), content: z.record(z.any()).optional(), draft: z.record(z.any()).nullable().optional() }) },
  pages: { model: "page", perm: "content", orderBy: { slug: "asc" }, schema: z.object({ slug: str.min(1), title: str.min(1), seoTitle: opt, seoDesc: opt }) },
  customers: { model: "customer", perm: "customers", orderBy: { createdAt: "desc" }, include: { consents: { orderBy: { createdAt: "desc" } }, reservations: { orderBy: { startsAt: "desc" }, take: 20 }, messages: { orderBy: { createdAt: "desc" }, take: 20 } },
    schema: z.object({ name: str.min(1), email: z.string().email().nullable().optional(), phone: opt, preferences: opt, privateNotes: opt }) },
  media: { model: "media", perm: "content", orderBy: [{ gallery: "asc" }, { position: "asc" }], schema: z.object({ url: str, key: opt, alt: str.default(""), mime: str, gallery: opt, position: z.number().int().default(0) }) },
} satisfies Record<string, { model: string; perm: Permission; schema: z.ZodTypeAny; orderBy?: unknown; include?: unknown }>;

export type ResourceName = keyof typeof RESOURCES;
