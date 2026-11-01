// Captures the User Manual screenshots against a seeded dev stack.
// Run: npm run manual:shots  (requires: dev servers on :5176/:3006,
// playwright browsers installed — see plan)
//
// Logs in via the API as it-admin + demo.member.1, then screenshots each
// route at 1440x900 into public/manual/. Re-runnable; overwrites in place.
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const FE_URL = process.env.MANUAL_FE_URL ?? 'http://localhost:5176';
const API_URL = process.env.MANUAL_API_URL ?? 'http://localhost:3006/api/v1';
const OUT_DIR = new URL('../public/manual/', import.meta.url);

const SHOTS = [
  // [role, slug, route, click?]; click opens a dialog before shooting.
  ['anon', 'login', '/login'],
  ['member', 'member-home', '/'],
  ['member', 'member-form', '/membership-form'],
  ['member', 'member-submit', '/submit-reports'],
  ['member', 'member-activity', '/activity'],
  ['member', 'member-activity-cert', '/activity', 'Add Certificate'],
  ['member', 'member-activity-log', '/activity', 'Add Activity'],
  ['member', 'member-knowledge', '/knowledge-products'],
  ['member', 'member-profile', '/profile'],
  ['member', 'member-leaderboards', '/leaderboards'],
  ['admin', 'admin-overview', '/admin-overview'],
  ['admin', 'admin-approvals', '/admin-approvals'],
  ['admin', 'admin-companies', '/member-directory?tab=companies'],
  ['admin', 'admin-summary', '/reports-summary'],
  ['admin', 'admin-performance', '/reports-performance'],
  ['admin', 'admin-support', '/support'],
];
// NOTE: /member-directory and /reports-* redirect non-admins home
// (admin-center module), so member shots stick to member-reachable routes.

const ACCOUNTS = {
  admin: { username: 'it-admin', password: process.env.MANUAL_ADMIN_PASSWORD ?? 'Arise@2026' },
  member: { username: 'demo.member.1', password: 'DemoPass123!' },
};

const browser = await chromium.launch();
try {
  mkdirSync(OUT_DIR, { recursive: true });
  // Throwaway page on the app origin for the login calls (same CORS as the app).
  const probe = await browser.newPage();
  await probe.goto(FE_URL, { waitUntil: 'domcontentloaded' });
  const tokens = {};
  for (const role of ['admin', 'member']) {
    tokens[role] = await probe.evaluate(
      async ({ apiUrl, account }) => {
        const res = await fetch(`${apiUrl}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(account),
        });
        if (!res.ok) throw new Error(`login failed: ${res.status}`);
        const body = await res.json();
        return body?.data?.accessToken ?? null;
      },
      { apiUrl: API_URL, account: ACCOUNTS[role] },
    );
    if (!tokens[role]) throw new Error(`no accessToken for ${ACCOUNTS[role].username}`);
    console.log(`logged in as ${ACCOUNTS[role].username}`);
  }
  await probe.close();

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  let currentRole = null;
  for (const [role, slug, route, clickName] of SHOTS) {
    if (role !== currentRole) {
      currentRole = role;
      if (role !== 'anon') {
        await page.addInitScript(
          (token) => localStorage.setItem('arisekms_access_token', token),
          tokens[role],
        );
      }
    }
    await page.goto(`${FE_URL}${route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200); // charts + staged reveals settle
    if (clickName) {
      await page.getByRole('button', { name: clickName }).first().click();
      await page.waitForTimeout(1000); // dialog transition settles
    }
    await page.screenshot({ path: new URL(`${slug}.png`, OUT_DIR).pathname });
    console.log(`captured ${slug}.png`);
  }
  await page.close();
} finally {
  await browser.close();
}
console.log(`done: ${SHOTS.length} shots in public/manual/`);
