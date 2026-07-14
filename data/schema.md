# POI data schema

Each file in `/data/poi/*.json` is a JSON array of POI entries with this shape:

```json
{
  "id": "cz-krivoklat",
  "category": "castle",
  "country": "CZ",
  "region": "Central Bohemia",
  "coordinates": { "lat": 50.0356, "lng": 13.8656 },
  "name": { "en": "Křivoklát Castle", "cz": "Hrad Křivoklát", "sk": "Hrad Křivoklát" },
  "description": { "en": "...", "cz": "...", "sk": "..." },
  "kidFriendly": { "minAge": 4, "notes": { "en": "Short tour route, dragon-themed kids trail" } },
  "tags": ["indoor", "guided-tour", "playground-nearby"],
  "image": "/assets/poi/cz-krivoklat.jpg",
  "externalUrl": "https://www.krivoklat.cz"
}
```

## Field rules

- `id`: unique across all countries, `<country-lowercase>-<slug>`.
- `category`: must match an `id` in `data/categories.json`.
- `country`: `"CZ"` or `"SK"` (matches the filename it lives in).
- `coordinates`: `lat` in `[-90, 90]`, `lng` in `[-180, 180]`.
- `name` / `description`: require `en`, `cz`, `sk` keys — no missing translations.
- `kidFriendly.notes`: at minimum an `en` key; other languages optional.
- `image`: optional, path relative to `/public`.
- `externalUrl`: optional.

Enforced by `scripts/validate-poi.ts` (`npm run validate-poi`).
