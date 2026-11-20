import { normalizeMessage, type Dictionary } from "./languages";

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Pure text translation: never changes identifiers, inputs, URLs or order data. */
export function makeTranslator(dictionary: Dictionary) {
  const hasMessages = Object.keys(dictionary).length > 0;
  const templates = Object.entries(dictionary)
    .filter(([source]) => /\{\d+\}/.test(source))
    .map(([source, translated]) => {
      const slots: string[] = [];
      const parts = source.split(/(\{\d+\})/).map(part => {
        if (/^\{\d+\}$/.test(part)) { slots.push(part); return "(.+?)"; }
        return escapeRegex(part);
      });
      return { regex: new RegExp(`^${parts.join("")}$`, "u"), slots, translated };
    });
  function translate(value: string, depth = 0): string {
    if (!value || !hasMessages || depth > 6) return value;
    if (value.includes("\n")) return value.split("\n").map(line => translate(line, depth + 1)).join("\n");
    const source = normalizeMessage(value);
    if (!source) return value;
    const leading = value.match(/^\s*/)?.[0] ?? "";
    const trailing = value.match(/\s*$/)?.[0] ?? "";
    const exact = dictionary[source];
    if (exact) return leading + exact + trailing;
    for (const template of templates) {
      const match = source.match(template.regex);
      if (match) {
        const values = Object.fromEntries(template.slots.map((slot, index) => [slot, translate(match[index + 1], depth + 1)]));
        return leading + template.translated.replace(/\{\d+\}/g, slot => values[slot] ?? slot) + trailing;
      }
    }
    // Lists, label punctuation and composite price labels retain their values.
    const parts = value.split(/(\s+[·—]\s+|,\s+|:\s+|\s*\|\s*)/u);
    if (parts.length > 1) return parts.map((part, i) => i % 2 ? part : translate(part, depth + 1)).join("");
    const punctuation = source.match(/^(.+?)([:.!?*])$/u);
    if (punctuation && dictionary[punctuation[1]]) return leading + dictionary[punctuation[1]] + punctuation[2] + trailing;
    return value;
  }
  return translate;
}
