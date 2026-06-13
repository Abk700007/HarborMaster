import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });

// Collect console errors
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

// ─── 1. Landing Page ─────────────────────────────────────────────────────────
console.log('📸 Shooting landing page...');
await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: 'scripts/shot_01_landing.png', fullPage: false });
console.log('   ✓ shot_01_landing.png');

// ─── 2. Click "Build My Workspace" ──────────────────────────────────────────
const startBtn = page.locator('button', { hasText: 'Build My Workspace' }).first();
if (await startBtn.isVisible()) {
  await startBtn.click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'scripts/shot_02_auth.png', fullPage: false });
  console.log('   ✓ shot_02_auth.png');
}

// ─── 3. Click "Continue with GitHub" to reach onboarding Step 1 ──────────────
const authBtn = page.locator('button', { hasText: 'Continue with GitHub' }).first();
if (await authBtn.isVisible()) {
  await authBtn.click();
  await page.waitForTimeout(1200);
}
await page.screenshot({ path: 'scripts/shot_03_onboard_s1.png', fullPage: false });
console.log('   ✓ shot_03_onboard_s1.png');

// ─── 4. Step 2 (Connect GitHub) via "Next" button ─────────────────────────────
const nextBtn1 = page.locator('button', { hasText: 'Next: Connect Repositories' }).first();
if (await nextBtn1.isVisible()) {
  await nextBtn1.click();
  await page.waitForTimeout(800);
}
await page.screenshot({ path: 'scripts/shot_04_onboard_s2.png', fullPage: false });
console.log('   ✓ shot_04_onboard_s2.png');

// ─── 5. Step 3 (Connect Discord) ───────────────────────────────────────────────
const nextBtn2 = page.locator('button', { hasText: 'Next: Connect Community' }).first();
if (await nextBtn2.isVisible()) {
  await nextBtn2.click();
  await page.waitForTimeout(800);
}
await page.screenshot({ path: 'scripts/shot_05_onboard_s3.png', fullPage: false });
console.log('   ✓ shot_05_onboard_s3.png');

// ─── 6. Step 4 (Connect Notion) ────────────────────────────────────────────────
const nextBtn3 = page.locator('button', { hasText: 'Next: Connect Documentation' }).first();
if (await nextBtn3.isVisible()) {
  await nextBtn3.click();
  await page.waitForTimeout(800);
}
await page.screenshot({ path: 'scripts/shot_06_onboard_s4.png', fullPage: false });
console.log('   ✓ shot_06_onboard_s4.png');

// ─── 7. Sync (Step 5) & Dashboard ─────────────────────────────────────────────
const finishBtn = page.locator('button', { hasText: 'Build HarborMaster Workspace' }).first();
if (await finishBtn.isVisible()) {
  await finishBtn.click();
  await page.waitForTimeout(1200); // wait for sync animation to be midway
}
await page.screenshot({ path: 'scripts/shot_07_onboard_s5_sync.png', fullPage: false });
console.log('   ✓ shot_07_onboard_s5_sync.png');

await page.waitForTimeout(3000); // let it complete and transition to dashboard
await page.screenshot({ path: 'scripts/shot_08_dashboard.png', fullPage: false });
console.log('   ✓ shot_08_dashboard.png');

// ─── Summary ─────────────────────────────────────────────────────────────────
if (errors.length) {
  console.error('\n⚠ Console errors found:');
  errors.slice(0, 5).forEach(e => console.error('  -', e.slice(0, 120)));
} else {
  console.log('\n✅ Zero console errors detected!');
}

await browser.close();
console.log('\n🎉 All screenshots saved to scripts/');
