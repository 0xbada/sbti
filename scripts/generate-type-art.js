#!/usr/bin/env node
"use strict";
/**
 * Generate SBTI type artwork via Google Gemini Imagen API.
 *
 * Usage:
 *   node scripts/generate-type-art.js <CODE> [<CODE>...]
 *   node scripts/generate-type-art.js FUCK Dior-s
 *   node scripts/generate-type-art.js --all
 *
 * Env:
 *   GEMINI_API_KEY (required)
 *
 * Output:
 *   src/img/types-art/{CODE}-art.png (raw 16:9 Imagen output)
 *
 * Text overlay is handled separately by scripts/generate-og-cards.js which
 * composes {CODE}-art.png + typography into the final 1200x630 JPG.
 */

const fs = require("node:fs");
const path = require("node:path");

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("GEMINI_API_KEY not set");
  process.exit(1);
}

const MODEL = "imagen-4.0-generate-001";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:predict`;
const OUTPUT_DIR = path.join(__dirname, "..", "src", "img", "types-art");
const TYPES = require(path.join(__dirname, "..", "src", "_data", "types.json"));

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Family-level mood/palette guidance. Tuned for minimal flat vector style.
const FAMILY_STYLE = {
  "직설 팩폭": {
    palette: "bold red, hot orange, deep charcoal accent",
    mood: "kinetic, reactive, confrontational energy"
  },
  "자조 루저": {
    palette: "muted slate blue, soft gray, pale cream accent",
    mood: "dejected, self-aware melancholy, gentle resignation"
  },
  "허세 과시": {
    palette: "rich gold, royal purple, ivory accent",
    mood: "confident flex, slightly exaggerated bravado"
  },
  "따뜻함": {
    palette: "warm peach, soft coral, butter yellow accent",
    mood: "nurturing warmth, gentle care, soft empathy"
  },
  "사색 관찰": {
    palette: "muted sage green, dusty teal, bone white accent",
    mood: "detached observer, contemplative distance, cool calm"
  }
};

// Per-type visual metaphor. Hand-crafted for clarity and meme resonance.
const VISUAL_METAPHORS = {
  // 직설 팩폭
  FUCK: "a stylized figure with speed lines and a burst symbol above their head, mouth open mid-shout, steam coming from ears, cartoon-like fury but minimal, one dominant exclamation shape",
  SHIT: "a tired figure at a keyboard with a spreadsheet icon on the screen, a small grumble cloud above their head, but fingers still typing, a completed checkmark floating nearby",
  POOR: "a focused minimalist figure with a laser beam of light concentrating on a single small coin or goal icon, empty wallet pushed aside, rest of scene is dim and stripped bare",

  // 자조 루저
  "ATM-er": "a hand pulling a credit card out of a leaking wallet, coins and bills floating away toward other unseen people, a weary shrug posture",
  SOLO: "a figure standing alone in silhouette, holding a camera taking a group photo while the group is vaguely visible on the other side of the frame",
  IMSB: "a figure facing a mirror pointing a finger at their own reflection, question marks and small X marks floating in a thought bubble",
  IMFW: "a small fragile figure made of tofu-like soft shapes, a single beam of warm light reaching them from the side, they are already melting slightly",
  ZZZZ: "a figure sleeping face-down on a bed, phone on pillow with '99+' unread notification badge glowing, a small hourglass on the nightstand",
  "OH-NO": "a figure with their head open showing swirling storm clouds and lightning bolts inside, a small calm umbrella ready beside them, a calendar with multiple X marks on the wall",

  // 허세 과시
  BOSS: "a confident figure standing at the head of a conference table pointing forward, other chairs around the table empty or with vague seated shapes, a spotlight from above",
  SEXY: "a figure posing for a selfie with sparkle icons around them, a small heart emoji floating nearby, a mirror reflection showing the same pose, vanity and awareness mixed",
  GOGO: "a runner figure in mid-sprint on a track, one foot already off the ground, dust clouds behind, motion lines, other runners still at the starting line in the background",

  // 따뜻함
  MUM: "a figure with multiple arms holding various care items — water bottle, medicine, snack bag, umbrella — handing them out in different directions, a small hidden tired expression",
  "LOVE-R": "a figure framed inside a film strip composition with floating hearts and sparkles, movie theater curtains on the sides, exaggerated romantic drama mood",
  "THAN-K": "a figure bowing slightly while offering a gift box with both hands, a small heart and warm glow around the box, another small gift already received on the floor beside them",

  // 사색 관찰
  "THIN-K": "a figure sitting with multiple thought bubbles around their head showing different branching options, a stopwatch nearby, a decision arrow frozen mid-motion",
  "JOKE-R": "a figure on a small stage wearing a smiling clown mask, mask held slightly ajar revealing a melancholy expression underneath, empty spotlight audience seats",
  OJBK: "a figure seated like a calm emperor on a simple throne, one hand lazily gesturing 'whatever', multiple options (food, drink, books) hovering around but blurred and unchosen",
  FAKE: "a figure with multiple different masks floating around their face — smiling, serious, shy — the mask in front changing style, the figure's actual face obscured in shadow behind",
  "WOC!": "a figure with exaggerated wide-eyed surprised expression and one hand dramatically raised, but next to them a small second figure (same person) sitting calmly with a cup of tea",
  "Dior-s": "a figure lying on a couch turned away from a window showing a busy city outside, a cat resting on the figure's stomach, soft indoor lighting, low energy atmosphere",

  // 기존 6 (special palette handling via FAMILY_MAP)
  DEAD: "a figure lying face-down on a desk with coffee mug tipped over, a small 'Z' floating above, computer screen showing a blank document, overall drained atmosphere",
  MALO: "a figure at an office desk holding a phone horizontally watching something, a second monitor with a boring spreadsheet, stealth posture",
  MONK: "a figure sitting cross-legged on a mountain peak in lotus meditation pose, single cloud drifting by, calm simplicity, all distractions removed",
  CTRL: "a figure at a control panel with multiple dials and a chess board beside them, hand adjusting a central knob precisely, focused gaze, everything in perfect alignment",
  HHHH: "four smiling yellow emoji-like faces arranged in a grid, each slightly different expression, confused question mark floating in the center, chaotic but friendly",
  DRUNK: "a figure leaning on a bar counter with a single tipped wine glass, soft warm evening light, slightly blurry background implying buzz, phone in hand about to send a text"
};

const FAMILY_MAP = {
  // 21 신규
  FUCK: "직설 팩폭", SHIT: "직설 팩폭", POOR: "직설 팩폭",
  "ATM-er": "자조 루저", SOLO: "자조 루저", IMSB: "자조 루저",
  IMFW: "자조 루저", ZZZZ: "자조 루저", "OH-NO": "자조 루저",
  BOSS: "허세 과시", SEXY: "허세 과시", GOGO: "허세 과시",
  MUM: "따뜻함", "LOVE-R": "따뜻함", "THAN-K": "따뜻함",
  "THIN-K": "사색 관찰", "JOKE-R": "사색 관찰", OJBK: "사색 관찰",
  FAKE: "사색 관찰", "WOC!": "사색 관찰", "Dior-s": "사색 관찰",
  // 기존 6 — palette mapping chosen per each type's tone
  DEAD: "자조 루저",     // 번아웃 = 저에너지 자조
  MALO: "직설 팩폭",     // 월급루팡 = 냉소적 밈
  MONK: "사색 관찰",     // 무욕러 = 탈속 관조
  CTRL: "허세 과시",     // 장악자 = 자신감 과시
  HHHH: "따뜻함",        // 웃음왕 = 친근한 혼돈
  DRUNK: "사색 관찰"     // 한잔러 = 나이트 관조
};

function buildPrompt(type) {
  const family = FAMILY_MAP[type.code];
  const style = FAMILY_STYLE[family];
  const metaphor = VISUAL_METAPHORS[type.code];
  if (!metaphor) throw new Error(`No visual metaphor defined for ${type.code}`);

  return [
    "Minimal flat vector illustration, modern corporate illustration style,",
    "clean solid background with subtle gradient,",
    "centered composition, single focal subject,",
    `limited color palette of ${style.palette},`,
    `mood: ${style.mood},`,
    `subject: ${metaphor},`,
    "2D design, crisp geometric shapes, no gradients on the subject,",
    "no text, no letters, no numbers, no typography, no captions, no labels,",
    "wide 16:9 aspect ratio, social media header card composition,",
    "leave horizontal space on the sides for future text overlay,",
    "high contrast, clean silhouette, readable at small sizes"
  ].join(" ");
}

async function generateOne(type) {
  const prompt = buildPrompt(type);
  console.log(`→ ${type.code} (${type.nameKo})`);
  console.log(`  prompt: ${prompt.slice(0, 120)}...`);

  const body = {
    instances: [{ prompt }],
    parameters: {
      sampleCount: 1,
      aspectRatio: "16:9",
      personGeneration: "allow_adult"
    }
  };

  const res = await fetch(`${ENDPOINT}?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`  ❌ ${res.status}: ${err.slice(0, 300)}`);
    return false;
  }

  const data = await res.json();
  const b64 = data?.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) {
    console.error(`  ❌ no image in response:`, JSON.stringify(data).slice(0, 300));
    return false;
  }

  const buf = Buffer.from(b64, "base64");
  const outPath = path.join(OUTPUT_DIR, `${type.code}-art.png`);
  fs.writeFileSync(outPath, buf);
  console.log(`  ✓ ${outPath} (${(buf.length / 1024).toFixed(0)} KB)`);
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  let codes;
  if (args.includes("--all")) {
    codes = TYPES.filter(t => VISUAL_METAPHORS[t.code]).map(t => t.code);
  } else if (args.includes("--missing")) {
    codes = TYPES
      .filter(t => VISUAL_METAPHORS[t.code])
      .map(t => t.code)
      .filter(code => !fs.existsSync(path.join(OUTPUT_DIR, `${code}-art.png`)));
  } else {
    codes = args;
  }

  if (codes.length === 0) {
    console.error("Usage: node scripts/generate-type-art.js <CODE> [<CODE>...] | --all");
    process.exit(1);
  }

  let ok = 0, fail = 0;
  for (const code of codes) {
    const type = TYPES.find(t => t.code === code);
    if (!type) {
      console.error(`Unknown type: ${code}`);
      fail++;
      continue;
    }
    const success = await generateOne(type);
    if (success) ok++; else fail++;
    // Rate limit: Imagen allows ~ few req/s, add small delay
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log(`\nDone: ${ok} ok, ${fail} failed.`);
  process.exit(fail > 0 ? 1 : 0);
}

main();
