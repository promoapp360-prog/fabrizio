import fs from "node:fs/promises";

const directory = new URL("../src/lib/i18n/", import.meta.url);
const sources = JSON.parse(await fs.readFile(new URL("source.json", directory), "utf8"));
const codes = ["en", "fr", "es", "pt", "ru", "uk", "ko", "zh", "el", "nl", "hr", "sr", "sl", "mk", "bs", "ro", "pl", "cs", "sq", "he", "bg"];
const placeholders = value => (value.match(/\{\d+\}/g) || []).sort().join(",");
let failures = 0;
for (const code of codes) {
  let dictionary;
  try { dictionary = JSON.parse(await fs.readFile(new URL(`dictionaries/${code}.json`, directory), "utf8")); }
  catch { console.error(`${code}: dizionario assente o non valido`); failures++; continue; }
  const missing = sources.filter(source => !dictionary[source]?.trim());
  const invalid = sources.filter(source => dictionary[source] && placeholders(source) !== placeholders(dictionary[source]));
  const unsafe = Object.values(dictionary).filter(text => /<\/?[a-z][^>]*>/i.test(text));
  if (missing.length || invalid.length || unsafe.length) {
    failures++;
    console.error(`${code}: ${missing.length} testi mancanti, ${invalid.length} segnaposti errati, ${unsafe.length} testi HTML non ammessi.`);
  } else console.log(`${code}: ${sources.length}/${sources.length} testi validi.`);
}
if (failures) process.exitCode = 1;
else console.log(`Copertura completa: ${sources.length} testi × ${codes.length} lingue, oltre all'italiano.`);
