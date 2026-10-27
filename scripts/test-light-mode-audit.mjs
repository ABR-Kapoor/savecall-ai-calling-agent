// Automated Light Mode UI Audit
// Verifies Gate 10: Strict Light Mode Only Across the Whole Application
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const ROOT_DIR = path.resolve(".");
const CLIENT_DIRS = [
  path.join(ROOT_DIR, "src", "routes"),
  path.join(ROOT_DIR, "src", "components"),
  path.join(ROOT_DIR, "src", "styles.css"),
];

let totalChecks = 0;
function testAssert(condition, message) {
  assert.ok(condition, message);
  totalChecks++;
  console.log(`  ✓ ${message}`);
}

function getAllFiles(dir, exts = [".tsx", ".ts", ".css"]) {
  if (!fs.existsSync(dir)) return [];
  const stat = fs.statSync(dir);
  if (stat.isFile()) return [dir];
  let results = [];
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const fullPath = path.join(dir, item);
    const itemStat = fs.statSync(fullPath);
    if (itemStat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, exts));
    } else if (exts.includes(path.extname(fullPath))) {
      results.push(fullPath);
    }
  }
  return results;
}

console.log("===============================================================");
console.log("      INSURCALL - STRICT LIGHT MODE AUDIT (GATE 10)           ");
console.log("===============================================================\n");

// 1. Audit styles.css for dark theme selectors
const cssPath = path.join(ROOT_DIR, "src", "styles.css");
const cssContent = fs.readFileSync(cssPath, "utf-8");

testAssert(!cssContent.includes(".dark {"), "styles.css does NOT contain .dark { token overrides");
testAssert(!cssContent.includes("@custom-variant dark"), "styles.css does NOT define @custom-variant dark");
testAssert(!cssContent.includes("prefers-color-scheme: dark"), "styles.css does NOT switch theme based on OS prefers-color-scheme: dark");

// 2. Audit routes for dark class utilities
const files = [];
for (const dir of CLIENT_DIRS) {
  files.push(...getAllFiles(dir));
}

let darkClassOccurrences = 0;
for (const file of files) {
  const content = fs.readFileSync(file, "utf-8");
  // Check for dark: classes in customer UI
  const matches = content.match(/dark:[a-zA-Z0-9_-]+/g);
  if (matches && matches.length > 0) {
    // If found, report
    console.warn(`  Warning: Found ${matches.length} dark: utility classes in ${path.relative(ROOT_DIR, file)}`);
    darkClassOccurrences += matches.length;
  }
}

testAssert(darkClassOccurrences === 0, `Zero dark: utility classes found across customer-facing UI (${files.length} files scanned)`);

// 3. Audit Phone onboarding route for light theme surfaces
const phoneRoutePath = path.join(ROOT_DIR, "src", "routes", "_authenticated", "phone.tsx");
if (fs.existsSync(phoneRoutePath)) {
  const phoneContent = fs.readFileSync(phoneRoutePath, "utf-8");
  testAssert(!phoneContent.includes("bg-zinc-950"), "Phone route uses light surfaces, not bg-zinc-950");
  testAssert(!phoneContent.includes("border-zinc-800"), "Phone route uses light borders, not border-zinc-800");
}

// 4. Audit WhatsApp route for light theme surfaces
const whatsappRoutePath = path.join(ROOT_DIR, "src", "routes", "_authenticated", "whatsapp.tsx");
testAssert(fs.existsSync(whatsappRoutePath), "WhatsApp connection route exists");
const whatsappContent = fs.readFileSync(whatsappRoutePath, "utf-8");
testAssert(!whatsappContent.includes("dark:"), "WhatsApp route contains 0 dark: classes");
testAssert(whatsappContent.includes("bg-white") || whatsappContent.includes("bg-slate-50"), "WhatsApp route uses clean light surfaces");

console.log("\n===============================================================");
console.log(`   LIGHT MODE AUDIT PASSED: ${totalChecks}/${totalChecks} CHECKS VERIFIED   `);
console.log("===============================================================\n");
