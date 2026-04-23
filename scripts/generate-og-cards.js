"use strict";

/*
 * Placeholder OG card generator.
 *
 * Reads src/_data/types.json and emits a 1200x630 JPEG per type to
 * src/img/types/{CODE}.jpg using ImageMagick. Output is deliberately
 * minimal (brand mark + code + Korean name + domain) so real card
 * design can replace these later without repo surgery.
 *
 * Usage:
 *   node scripts/generate-og-cards.js
 *
 * Requires:
 *   - magick CLI (brew install imagemagick)
 *   - /System/Library/Fonts/AppleSDGothicNeo.ttc (macOS default)
 */

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const FONT = "/System/Library/Fonts/AppleSDGothicNeo.ttc";
const OUTPUT_DIR = path.join(__dirname, "..", "src", "img", "types");
const TYPES = require(path.join(__dirname, "..", "src", "_data", "types.json"));

const DEFAULT_DIR = path.join(__dirname, "..", "src", "img");

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(DEFAULT_DIR, { recursive: true });

function generateDefaultCard() {
  const outPath = path.join(DEFAULT_DIR, "og-default.jpg");
  const args = [
    "-size", "1200x630",
    "xc:#111111",
    "-font", FONT,

    "-gravity", "NorthWest",
    "-fill", "#888888",
    "-pointsize", "36",
    "-annotate", "+60+50", "SBTI",

    "-gravity", "Center",
    "-fill", "#ffffff",
    "-pointsize", "160",
    "-annotate", "+0-80", "SBTI 테스트",

    "-fill", "#ffe66d",
    "-pointsize", "54",
    "-annotate", "+0+60", "MBTI 패러디 성격 테스트",

    "-fill", "#aaaaaa",
    "-pointsize", "36",
    "-annotate", "+0+140", "30문항 · 27개 유형 · 5분",

    "-gravity", "SouthEast",
    "-fill", "#666666",
    "-pointsize", "26",
    "-annotate", "+60+50", "sbti.funhada.xyz",

    "-quality", "90",
    outPath
  ];

  console.log(`→ ${outPath}`);
  execFileSync("magick", args, { stdio: "inherit" });
}

function backgroundFor(rarity) {
  switch (rarity) {
    case "rare": return "#1e1a2d";
    case "special": return "#1a2019";
    default: return "#141414";
  }
}

function accentFor(rarity) {
  switch (rarity) {
    case "rare": return "#d4a437";
    case "special": return "#b190e0";
    default: return "#ffffff";
  }
}

generateDefaultCard();

// Strip URL-unsafe characters for filename. Must match thumbnailPath
// sanitization in src/_data/types.json (e.g. WOC! → WOC.jpg).
function sanitizeForFilename(code) {
  return code.replace(/[!?#%&]/g, "");
}

for (const type of TYPES) {
  const outPath = path.join(OUTPUT_DIR, `${sanitizeForFilename(type.code)}.jpg`);
  const bg = backgroundFor(type.rarity);
  const accent = accentFor(type.rarity);

  const args = [
    "-size", "1200x630",
    `xc:${bg}`,
    "-font", FONT,

    "-gravity", "NorthWest",
    "-fill", "#888888",
    "-pointsize", "32",
    "-annotate", "+60+50", "SBTI",

    "-gravity", "Center",
    "-fill", accent,
    "-pointsize", "220",
    "-annotate", "+0-60", type.code,

    "-fill", "#dddddd",
    "-pointsize", "84",
    "-annotate", "+0+110", type.nameKo,

    "-gravity", "SouthEast",
    "-fill", "#666666",
    "-pointsize", "26",
    "-annotate", "+60+50", "sbti.funhada.xyz",

    "-quality", "90",
    outPath
  ];

  console.log(`→ ${outPath}`);
  execFileSync("magick", args, { stdio: "inherit" });
}

console.log(`\n✓ Generated 1 default card + ${TYPES.length} type cards`);
