"use strict";

/*
 * OG card generator.
 *
 * For each type in src/_data/types.json, composes a 1200x630 JPEG OG card:
 *   - If src/img/types-art/{CODE}-art.png exists → uses it as background
 *     with a solid cinema-bar at the bottom and Paperlogy-rendered text.
 *   - Otherwise → falls back to the minimal solid-color placeholder.
 *
 * Filename sanitizer strips URL-unsafe chars (e.g. WOC! → WOC.jpg).
 *
 * Usage:
 *   node scripts/generate-og-cards.js
 *
 * Requires:
 *   - magick CLI (brew install imagemagick)
 *   - fontforge CLI (brew install fontforge) — auto-converts woff2 to ttf on first run
 */

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const ROOT = path.join(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT, "src", "img", "types");
const DEFAULT_DIR = path.join(ROOT, "src", "img");
const ART_DIR = path.join(ROOT, "src", "img", "types-art");
const WOFF2_DIR = path.join(ROOT, "src", "fonts");
const FONT_CACHE = path.join(ROOT, ".cache", "fonts");
const TYPES = require(path.join(ROOT, "src", "_data", "types.json"));

const FALLBACK_FONT = "/System/Library/Fonts/AppleSDGothicNeo.ttc";

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(DEFAULT_DIR, { recursive: true });
fs.mkdirSync(FONT_CACHE, { recursive: true });

function sanitizeForFilename(code) {
  return code.replace(/[!?#%&]/g, "");
}

// Auto-convert woff2 → ttf on first run. Cached in .cache/fonts/.
function ensureTTF(weightName) {
  const ttfPath = path.join(FONT_CACHE, `Paperlogy-${weightName}.ttf`);
  if (fs.existsSync(ttfPath)) return ttfPath;

  const woff2Path = path.join(WOFF2_DIR, `Paperlogy-${weightName}.woff2`);
  if (!fs.existsSync(woff2Path)) {
    console.warn(`  (woff2 not found: ${woff2Path}, using system font)`);
    return FALLBACK_FONT;
  }

  try {
    execFileSync(
      "fontforge",
      ["-lang=ff", "-c", `Open("${woff2Path}"); Generate("${ttfPath}")`],
      { stdio: "ignore" }
    );
    return ttfPath;
  } catch (e) {
    console.warn(`  (fontforge conversion failed for ${weightName}, using system font)`);
    return FALLBACK_FONT;
  }
}

function generateDefaultCard() {
  const outPath = path.join(DEFAULT_DIR, "og-default.jpg");
  const headingFont = ensureTTF("9Black");
  const subFont = ensureTTF("6SemiBold");
  const args = [
    "-size", "1200x630",
    "xc:#111111",
    "-font", FALLBACK_FONT,

    "-gravity", "NorthWest",
    "-fill", "#888888",
    "-pointsize", "36",
    "-annotate", "+60+50", "SBTI",

    "-font", headingFont,
    "-gravity", "Center",
    "-fill", "#ffffff",
    "-pointsize", "160",
    "-annotate", "+0-80", "SBTI 테스트",

    "-font", subFont,
    "-fill", "#ffe66d",
    "-pointsize", "54",
    "-annotate", "+0+60", "MBTI 패러디 성격 테스트",

    "-fill", "#aaaaaa",
    "-pointsize", "36",
    "-annotate", "+0+140", "30문항 · 27개 유형 · 5분",

    "-font", FALLBACK_FONT,
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

// Composition A: art background + cinema bar + Paperlogy text.
function generateArtCard(type) {
  const safeCode = sanitizeForFilename(type.code);
  const artPath = path.join(ART_DIR, `${type.code}-art.png`);
  const outPath = path.join(OUTPUT_DIR, `${safeCode}.jpg`);
  const headingFont = ensureTTF("9Black");
  const subFont = ensureTTF("6SemiBold");

  const args = [
    artPath,
    "-resize", "1200x630^",
    "-gravity", "center",
    "-extent", "1200x630",

    // Fade transition above the cinema bar (soft edge)
    "(", "-size", "1200x40", "gradient:rgba(17,17,17,0)-rgba(17,17,17,1)", ")",
    "-gravity", "center",
    "-geometry", "+0+185",
    "-composite",

    // Solid cinema bar at bottom (170px)
    "(", "-size", "1200x170", "xc:#111111", ")",
    "-gravity", "south",
    "-composite",

    // Text layer
    "-fill", "white",
    "-gravity", "south",

    "-font", headingFont,
    "-pointsize", "88",
    "-annotate", "+0+68", type.code,

    "-font", subFont,
    "-pointsize", "34",
    "-annotate", "+0+25", type.nameKo,

    "-quality", "90",
    outPath
  ];

  console.log(`→ ${outPath} (art)`);
  execFileSync("magick", args, { stdio: "inherit" });
}

// Composition B: solid color placeholder (fallback when no art exists).
function generatePlaceholderCard(type) {
  const safeCode = sanitizeForFilename(type.code);
  const outPath = path.join(OUTPUT_DIR, `${safeCode}.jpg`);
  const bgMap = { rare: "#1e1a2d", special: "#1a2019" };
  const accentMap = { rare: "#d4a437", special: "#b190e0" };
  const bg = bgMap[type.rarity] || "#141414";
  const accent = accentMap[type.rarity] || "#ffffff";
  const headingFont = ensureTTF("9Black");
  const subFont = ensureTTF("6SemiBold");

  const args = [
    "-size", "1200x630",
    `xc:${bg}`,
    "-font", FALLBACK_FONT,

    "-gravity", "NorthWest",
    "-fill", "#888888",
    "-pointsize", "32",
    "-annotate", "+60+50", "SBTI",

    "-font", headingFont,
    "-gravity", "Center",
    "-fill", accent,
    "-pointsize", "220",
    "-annotate", "+0-60", type.code,

    "-font", subFont,
    "-fill", "#dddddd",
    "-pointsize", "84",
    "-annotate", "+0+110", type.nameKo,

    "-font", FALLBACK_FONT,
    "-gravity", "SouthEast",
    "-fill", "#666666",
    "-pointsize", "26",
    "-annotate", "+60+50", "sbti.funhada.xyz",

    "-quality", "90",
    outPath
  ];

  console.log(`→ ${outPath} (placeholder)`);
  execFileSync("magick", args, { stdio: "inherit" });
}

generateDefaultCard();

let art = 0, placeholder = 0;
for (const type of TYPES) {
  const artPath = path.join(ART_DIR, `${type.code}-art.png`);
  if (fs.existsSync(artPath)) {
    generateArtCard(type);
    art++;
  } else {
    generatePlaceholderCard(type);
    placeholder++;
  }
}

console.log(`\n✓ Generated 1 default card + ${art} art cards + ${placeholder} placeholders (${art + placeholder} total)`);
