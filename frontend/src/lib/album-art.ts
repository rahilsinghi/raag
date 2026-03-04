/** Maps album slugs to their artwork filenames in /albums/ */
export const ALBUM_ART: Record<string, string> = {
  "2-ka-pahada": "2 Ka Pahada.jpg",
  "bayaan": "Bayaan - 2018.jpg",
  "na-mixtape": "न (Na) - 2021.jpg",
  "nayaab": "Nayaab - 2022.jpg",
  "lunch-break": "Lunch Break - 2023.jpg",
  "shakti": "SHAKTI - 2024.jpeg",
  "kshama": "Kshama -2024.jpeg",
  "dl91-fm": "DL91 FM - 2025.jpeg",
  "namuna": "NAMUNA - 2024.jpeg",
  // Singles
  "101": "101 - 2019.jpg",
  "11k": "11K - 2023.jpg",
  "ball": "Ball - 2020.jpg",
  "bure-din": "Bure Din - 2024.jpg",
  "class-sikh-vol-ii": "Class-Sikh, Vol II - 2018.jpg",
  "do-guna": "Do Guna - 2020.jpg",
  "dum-pishaach": "Dum Pishaach - 2020.jpg",
  "hausla": "Hausla - 2023.jpg",
  "joint-in-the-booth": "Joint in the Booth - 2023.jpg",
  "kaanch-ke-ghar": "Kaanch Ke Ghar - 2024.jpg",
  "kranti": "Kranti - 2018.jpg",
  "mmm": "MMM - 2020.jpg",
  "naamcheen": "Naamcheen - 2021.jpg",
  "namastute": "Namastute - 2021.jpg",
  "nanchaku": "Nanchaku.jpg",
  "no-enema": "No Enema - 2021.jpg",
  "saans-le": "Saans Le - 2019.jpg",
  "sar-utha": "Sar Utha - 2021.jpg",
  "shaktimaan": "Shaktimaan - 2018.jpg",
  "srk": "SRK - 2024.jpeg",
  "taakat": "Taakat - 2023.jpg",
  "tour-shit": "Tour Shit! - 2024.jpg",
  "tt-shutdown": "TT&SHUTDOWN - 2024.jpg",
  "w": "W - 2023.jpg",
  "yaad": "Yaad - 2020.jpg",
  "nalla-freestyle": "नalla Freestyle - 2022.jpg",
  "penthouse-tapes": "PentHouse Tapes, Vol. 1 - 2026.jpg",
};

/** Get album art URL by slug. Falls back to a title-based fuzzy match. */
export function getAlbumArt(albumSlugOrTitle: string): string | null {
  // Direct slug match
  const slug = albumSlugOrTitle.toLowerCase().replace(/\s+/g, "-");
  if (ALBUM_ART[slug]) return `/albums/${ALBUM_ART[slug]}`;

  // Fuzzy: check if any key is contained in the input or vice versa
  for (const [key, file] of Object.entries(ALBUM_ART)) {
    if (slug.includes(key) || key.includes(slug)) return `/albums/${file}`;
  }

  return null;
}

/** Featured albums for the empty state carousel */
export const FEATURED_ALBUMS = [
  { slug: "nayaab", title: "Nayaab", year: 2022 },
  { slug: "lunch-break", title: "Lunch Break", year: 2023 },
  { slug: "bayaan", title: "Bayaan", year: 2018 },
  { slug: "na-mixtape", title: "न Mixtape", year: 2021 },
  { slug: "kshama", title: "Kshama", year: 2024 },
  { slug: "dl91-fm", title: "DL91 FM", year: 2025 },
  { slug: "2-ka-pahada", title: "2 Ka Pahada", year: 2017 },
  { slug: "shakti", title: "Shakti", year: 2024 },
];
