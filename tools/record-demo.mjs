/* ============================================================
   record-demo.mjs — records the WhatsApp chat demo as clean
   9:16 1080x1920 H.264 MP4s (demo-es.mp4 / demo-en.mp4).

   Usage:
     cd landing/tools
     npm install && npx playwright install chromium
     node record-demo.mjs            # both languages
     node record-demo.mjs es         # one language

   Requires ffmpeg on PATH.
   ============================================================ */
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LANDING = path.resolve(__dirname, "..");
const MEDIA = path.join(LANDING, "media");

const TARGETS = [
  { lang: "es", page: path.join(LANDING, "demo", "es.html"), out: "demo-es.mp4" },
  { lang: "en", page: path.join(LANDING, "demo", "en.html"), out: "demo-en.mp4" },
];

const only = process.argv[2];
const targets = only ? TARGETS.filter((t) => t.lang === only) : TARGETS;
if (targets.length === 0) {
  console.error(`Unknown language "${only}". Use: es | en`);
  process.exit(1);
}

fs.mkdirSync(MEDIA, { recursive: true });

function ffprobe(file) {
  const out = execFileSync("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration,size",
    "-of", "default=noprint_wrappers=1",
    file,
  ]).toString();
  const dur = parseFloat(/duration=([\d.]+)/.exec(out)?.[1] ?? "0");
  const size = parseInt(/size=(\d+)/.exec(out)?.[1] ?? "0", 10);
  return { dur, size };
}

async function record({ lang, page: pagePath, out }) {
  console.log(`\n▶ Recording ${lang.toUpperCase()} demo…`);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `demo-${lang}-`));

  const browser = await chromium.launch({ headless: true });
  // Playwright records at viewport size (it never upscales), so we record on a
  // real 1080x1920 viewport and let the page zoom its 360x640 layout 3x (?zoom=3).
  const context = await browser.newContext({
    viewport: { width: 1080, height: 1920 },
    recordVideo: { dir: tmpDir, size: { width: 1080, height: 1920 } },
  });
  const page = await context.newPage();
  await page.goto(`file://${pagePath}?record=1&zoom=3`);

  // chat.js flips document.title to DEMO_DONE when the run finishes
  await page.waitForFunction(() => window.__demoDone === true, null, {
    timeout: 120_000,
  });
  await page.waitForTimeout(600); // small tail on the end card

  const video = page.video();
  await context.close(); // flushes the webm
  await browser.close();
  const webm = await video.path();

  const mp4 = path.join(MEDIA, out);
  execFileSync("ffmpeg", [
    "-y",
    "-i", webm,
    "-c:v", "libx264",
    "-preset", "slow",
    "-crf", "20",
    "-pix_fmt", "yuv420p",
    "-r", "30",
    "-an",
    "-movflags", "+faststart",
    mp4,
  ], { stdio: ["ignore", "ignore", "inherit"] });

  fs.rmSync(tmpDir, { recursive: true, force: true });

  const { dur, size } = ffprobe(mp4);
  console.log(
    `✔ ${path.relative(LANDING, mp4)} — ${dur.toFixed(1)}s, ${(size / 1024 / 1024).toFixed(2)} MB`
  );
  return { mp4, dur, size };
}

for (const t of targets) {
  await record(t);
}
console.log("\nDone.");
