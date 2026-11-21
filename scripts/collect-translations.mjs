import fs from "node:fs/promises";
import path from "node:path";
import ts from "typescript";
import { PrismaClient } from "@prisma/client";

const root = process.cwd();
const messages = new Set();
const normalize = value => value.replace(/\s+/g, " ").trim();
const decode = value => value.replace(/&(?:apos|quot|amp|lt|gt|nbsp);/g, entity =>
  ({ "&apos;": "'", "&quot;": '"', "&amp;": "&", "&lt;": "<", "&gt;": ">", "&nbsp;": " " })[entity]);
function add(value) {
  if (typeof value !== "string") return;
  const normalized = normalize(decode(value));
  if (/^(?:Bearer |checkout(?:-cancel)?:)/.test(normalized)) return;
  if (/^(?:\?pay=online|(?:vecciari-party|party):\{0\})$/.test(normalized)) return;
  if (!normalized || !/\p{L}/u.test(normalized) || /^(?:https?:|\/|@|#[a-fA-F0-9]{3,8}$)/.test(normalized)) return;
  if (/^(?:mailto:|tel:|url\(|rgb\(|\(min-width:|a\[href\]|;\s*Secure|Cache-Control$|Serializable$|Restaurant$|(?:online|order|ordine|res|res-receipt|res-slots|reservation):\{|c-\{)/.test(normalized) ||
      /^\{[0-9]+\}(?:=|T[0-9{]|\/menu$)/.test(normalized) || /^-\{[0-9]+\}px$/.test(normalized)) return;
  messages.add(normalized);
}
function content(value, key = "") {
  if (typeof value === "string") {
    if (/^(?:id|slug|url|image|images|mobileImage|video|mark|logo|favicon|phone|email|whatsapp|instagram|facebook|mapsUrl|code|icon|zone|type|gallery|channels|payment|status)$/i.test(key) || /(?:Id|Ids|Url)$/.test(key)) return;
    value.split(/\n+/).forEach(add);
  } else if (Array.isArray(value)) value.forEach(item => content(item, key));
  else if (value && typeof value === "object") for (const [name, item] of Object.entries(value)) content(item, name);
}
const allowedAttrs = new Set(["title", "alt", "placeholder", "aria-label", "aria-description", "aria-valuetext"]);
async function scan(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) { await scan(file); continue; }
    if (!/\.[jt]sx?$/.test(entry.name)) continue;
    const source = ts.createSourceFile(file, await fs.readFile(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function visit(node) {
      let attribute = node.parent;
      while (attribute && !ts.isJsxAttribute(attribute) && !ts.isSourceFile(attribute)) attribute = attribute.parent;
      const inClassName = attribute && ts.isJsxAttribute(attribute) && attribute.name.getText(source) === "className";
      if (ts.isJsxText(node)) add(node.text);
      if (ts.isStringLiteralLike(node)) {
        const parent = node.parent;
        if (ts.isJsxAttribute(parent)) { if (allowedAttrs.has(parent.name.getText(source))) add(node.text); }
        else if (!inClassName && !ts.isImportDeclaration(parent) && !ts.isExportDeclaration(parent) && !ts.isExpressionStatement(parent) &&
          /\p{L}/u.test(node.text) && (/[À-ÿ’…?]/u.test(node.text) || /\s/u.test(node.text.trim()) || /^[A-ZÀ-Ý][a-zà-ÿ]/u.test(node.text)) &&
          !["Escape", "Enter", "Tab"].includes(node.text) &&
          !/^(?:GET|POST|PATCH|DELETE|Content-Type|application\/|[A-Za-z]+\/)/.test(node.text)) add(node.text);
      }
      if (ts.isTemplateExpression(node)) {
        let template = node.head.text;
        node.templateSpans.forEach((span, i) => { template += `{${i}}${span.literal.text}`; });
        if (!inClassName && /\p{L}/u.test(template) && !template.includes("://") && !template.includes("class=")) add(template);
      }
      if (ts.isJsxElement(node) || ts.isJsxFragment(node)) {
        let template = "", slot = 0;
        for (const child of node.children) {
          if (ts.isJsxText(child)) template += child.text;
          else if (ts.isJsxExpression(child) && child.expression) {
            template += ts.isStringLiteralLike(child.expression) ? child.expression.text : `{${slot++}}`;
          } else template += `{${slot++}}`;
        }
        if (slot && /\p{L}/u.test(template)) add(template);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
}
await scan(path.join(root, "src/components/public"));
await scan(path.join(root, "src/app/(site)"));
await scan(path.join(root, "src/app/t"));
for (const relative of ["src/app/api/reservations", "src/app/api/online-order", "src/app/api/table", "src/app/api/order"]) await scan(path.join(root, relative));
for (const relative of ["src/lib/reservation-input.ts", "src/lib/checkout.ts", "src/lib/ordering.ts", "src/lib/pricing.ts", "src/lib/availability.ts", "src/lib/meat-zones.ts", "src/lib/stripe-api.ts", "src/lib/stripe-payments.ts", "src/lib/portions.ts"]) {
  const full = path.join(root, relative);
  try {
    const body = await fs.readFile(full, "utf8");
    const source = ts.createSourceFile(full, body, ts.ScriptTarget.Latest, true);
    function strings(node) {
      if (ts.isStringLiteralLike(node) && /^[A-ZÀ-Ý]/u.test(node.text) && (/\s/.test(node.text) || ts.isPropertyAssignment(node.parent) && node.parent.name.getText(source) === "label")) add(node.text);
      if (ts.isTemplateExpression(node)) {
        let template = node.head.text;
        node.templateSpans.forEach((span, i) => { template += `{${i}}${span.literal.text}`; });
        if (/\p{L}/u.test(template) && !/[<>]|:\/\//.test(template) && (/^[A-ZÀ-Ý]/u.test(template) || /[\sà-ÿ]/u.test(template))) add(template);
      }
      ts.forEachChild(node, strings);
    }
    strings(source);
  } catch (error) { if (error.code !== "ENOENT") throw error; }
}
const db = new PrismaClient();
try {
  for (const table of ["allergen", "farmingMethod", "cut", "breed", "category", "product", "optionGroup", "option", "promotion", "shift", "closure"]) {
    if (!db[table]) continue;
    const where = ["cut", "breed"].includes(table) ? { published: true }
      : ["product", "category", "promotion", "shift"].includes(table) ? { active: true }
      : table === "optionGroup" ? { product: { active: true } }
      : table === "option" ? { group: { product: { active: true } } } : undefined;
    content(await db[table].findMany({ where }));
  }
  const pages = await db.page.findMany({ include: { sections: { where: { enabled: true } } } });
  for (const page of pages) { add(page.title); for (const section of page.sections) content(section.content); }
  const settings = await db.setting.findMany({ where: { key: { in: ["brand", "contacts", "ordering", "reservations", "seo", "cooking"] } } });
  for (const setting of settings) content(setting.value);
} finally { await db.$disconnect(); }
["Scegli la lingua", "Lingua", "Contenuto originale in italiano", "Lingua del sito", "Caricamento…", "(tracce)", "{0} (tracce)"].forEach(add);
const sorted = [...messages].sort((a, b) => a.localeCompare(b, "it"));
const output = path.join(root, "src/lib/i18n/source.json");
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, JSON.stringify(sorted, null, 2) + "\n");
console.log(`Catalogo estratto: ${sorted.length} testi pubblici, ${JSON.stringify(sorted).length} caratteri. Nessun cliente, ordine, utente o credenziale letto.`);
