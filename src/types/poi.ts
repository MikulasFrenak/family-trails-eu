export type LocalizedText = Partial<Record<"en" | "cz" | "sk", string>>;

export interface Poi {
  id: string;
  category: string;
  country: "CZ" | "SK";
  region: string;
  coordinates: { lat: number; lng: number };
  name: LocalizedText;
  description: LocalizedText;
  kidFriendly?: { minAge: number; notes: LocalizedText };
  tags?: string[];
  image?: string;
  externalUrl?: string;
}

export interface Category {
  id: string;
  label: LocalizedText;
  color: string;
  emoji: string;
  icon: string;
}
