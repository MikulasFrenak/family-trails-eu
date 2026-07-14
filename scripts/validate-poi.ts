import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const POI_DIR = join(import.meta.dirname, "..", "data", "poi");
const CATEGORIES_PATH = join(import.meta.dirname, "..", "data", "categories.json");
const REQUIRED_LANGS = ["en", "cz", "sk"] as const;

type LocalizedText = Partial<Record<(typeof REQUIRED_LANGS)[number], string>>;

interface PoiEntry {
  id: string;
  category: string;
  country: string;
  coordinates: { lat: number; lng: number };
  name: LocalizedText;
  description: LocalizedText;
  kidFriendly?: { notes?: { en?: string } };
}

function fail(errors: string[]): never {
  console.error(`✗ POI validation failed with ${errors.length} error(s):\n`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

const categoryIds = new Set(
  (JSON.parse(readFileSync(CATEGORIES_PATH, "utf-8")) as Array<{ id: string }>).map((c) => c.id),
);

const errors: string[] = [];
const seenIds = new Set<string>();

for (const file of readdirSync(POI_DIR)) {
  if (!file.endsWith(".json")) continue;
  const expectedCountry = file.replace(".json", "").toUpperCase();
  const entries = JSON.parse(readFileSync(join(POI_DIR, file), "utf-8")) as PoiEntry[];

  for (const entry of entries) {
    const label = entry.id ?? "<missing id>";

    if (!entry.id) errors.push(`${file}: entry missing "id"`);
    else if (seenIds.has(entry.id)) errors.push(`${file}: duplicate id "${entry.id}"`);
    else seenIds.add(entry.id);

    if (!categoryIds.has(entry.category)) {
      errors.push(`${label}: unknown category "${entry.category}"`);
    }

    if (entry.country !== expectedCountry) {
      errors.push(`${label}: country "${entry.country}" doesn't match file ${file} (expected ${expectedCountry})`);
    }

    const { lat, lng } = entry.coordinates ?? {};
    if (typeof lat !== "number" || lat < -90 || lat > 90) {
      errors.push(`${label}: invalid latitude "${lat}"`);
    }
    if (typeof lng !== "number" || lng < -180 || lng > 180) {
      errors.push(`${label}: invalid longitude "${lng}"`);
    }

    for (const lang of REQUIRED_LANGS) {
      if (!entry.name?.[lang]) errors.push(`${label}: missing name.${lang}`);
      if (!entry.description?.[lang]) errors.push(`${label}: missing description.${lang}`);
    }

    if (entry.kidFriendly && !entry.kidFriendly.notes?.en) {
      errors.push(`${label}: kidFriendly.notes.en is required when kidFriendly is present`);
    }
  }
}

if (errors.length > 0) fail(errors);

console.log(`✓ POI validation passed (${seenIds.size} entries checked)`);
