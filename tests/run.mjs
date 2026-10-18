// End-to-end UI test against `vite preview` with every Supabase call mocked.
// Clicks every button, tab and link; checks the request each one sends; checks
// mobile for horizontal scroll; checks PWA installability; saves screenshots.
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { ids, makeCase, makeReading, intake } from "./fixtures.mjs";

const EXE = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const SHOTS = process.env.SHOTS || "tests/screens";
const BASE = "http://localhost:4173";
mkdirSync(SHOTS, { recursive: true });

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log("  pass", msg);
  else { failures++; console.log("  FAIL", msg); }
};

// ---------------------------------------------------------------- mock backend
function backend() {
  const cases = {
    [ids.ready]: makeCase(ids.ready, { level: "concern" }),
    [ids.fresh]: makeCase(ids.fresh, { code: "חדש" }),
    [ids.thin]: makeCase(ids.thin, { sufficient: false, code: "חסר" }),
    [ids.acute]: makeCase(ids.acute, { level: "acute", code: "סיכון" }),
  };
  for (const l of ["biographical", "tzimtzum", "buddhist", "synthesis"]) cases[ids.ready].merhav_readings.push(makeReading(ids.ready, l));
  const calls = [];
  let n = 1;
  const handle = async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const send = (status, body) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body), headers: { "access-control-allow-origin": "*" } });
    if (req.method() === "OPTIONS") return route.fulfill({ status: 200, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });

    if (url.pathname === "/rest/v1/merhav_cases") {
      calls.push({ kind: "rest", search: url.search });
      const idq = url.searchParams.get("id");
      if (idq) {
        const c = cases[idq.replace("eq.", "")];
        return send(200, c ? [c] : []);
      }
      return send(200, Object.values(cases));
    }
    if (url.pathname === "/functions/v1/merhav-analyze") {
      const body = JSON.parse(req.postData() || "{}");
      calls.push({ kind: "analyze", body });
      await new Promise((r) => setTimeout(r, 150));
      if (body.action === "intake" || body.action === "revise") {
        const c = makeCase(ids.created, { code: body.code || "חדש" });
        c.body = body.body;
        c.parent_id = body.parentId ?? null;
        cases[ids.created] = c;
        return send(200, { case: c });
      }
      const c = cases[body.caseId];
      if (!c) return send(404, { error: "המקרה לא נמצא" });
      if (body.action === "answer") {
        c.answers = body.answers;
        c.intake = intake({ sufficient: true });
        return send(200, { case: c });
      }
      if (body.action === "lens" || body.action === "synthesis") {
        const lens = body.action === "synthesis" ? "synthesis" : body.lens;
        const r = makeReading(c.id, lens, ++n);
        c.merhav_readings = c.merhav_readings.filter((x) => x.lens !== lens).concat(r);
        return send(200, { reading: r });
      }
      return send(400, { error: "פעולה לא מוכרת" });
    }
    if (url.pathname === "/functions/v1/merhav-upload") {
      const raw = req.postData() || "";
      const field = (name) => (raw.match(new RegExp(`name="${name}"\\r\\n\\r\\n([^\\r]*)`)) || [])[1];
      const caseId = field("caseId");
      const lens = field("lens");
      const remove = field("remove");
      calls.push({ kind: "upload", caseId, lens, remove: remove || null, hasFile: raw.includes('name="file"') });
      const c = cases[caseId];
      const r = c?.merhav_readings.find((x) => x.lens === lens);
      if (!r) return send(404, { error: "הקריאה עוד לא נוצרה" });
      r.images = remove ? r.images.filter((i) => i.url !== remove) : [...r.images, { url: `${BASE}/icon-512.png?v=${r.images.length + 1}`, at: new Date().toISOString() }];
      return send(200, { reading: r });
    }
    return route.fulfill({ status: 404, body: "" });
  };
  return { cases, calls, handle };
}

// ---------------------------------------------------------------- helpers
async function noHScroll(page, label) {
  const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  ok(sw <= cw, `${label}: no horizontal scroll (${sw} <= ${cw})`);
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function newPage(browser, be, viewport = { width: 1360, height: 900 }) {
  const ctx = await browser.newContext({ viewport, locale: "he-IL", permissions: ["clipboard-read", "clipboard-write"] });
  await ctx.route(/ktqmwpbzcnzkhjskqisy\.supabase\.co/, be.handle);
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error" && !/ERR_FAILED|fonts|net::/.test(m.text())) errors.push(m.text()); });
  return { ctx, page, errors };
}

// ---------------------------------------------------------------- run
const server = spawn("npx", ["vite", "preview", "--port", "4173", "--strictPort"], { stdio: "pipe" });
await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error("preview did not start")), 30000);
  server.stdout.on("data", (d) => { if (String(d).includes("4173")) { clearTimeout(t); res(); } });
});
const browser = await chromium.launch({ executablePath: EXE });

try {
  // 1. Home
  console.log("home");
  {
    const be = backend();
    const { page, ctx, errors } = await newPage(browser, be);
    await page.goto(BASE + "/");
    await page.waitForSelector("[data-testid=case-card]");
    ok((await page.locator("[data-testid^=dict-]").count()) === 4, "four lens cards in the spatial dictionary");
    ok((await page.locator("[data-testid=case-card]").count()) === 4, "case archive lists the cases");
    ok(await page.locator("text=מקרה אחד.").isVisible(), "hero headline visible");
    await page.mouse.move(900, 300);
    await wait(900);
    await page.screenshot({ path: `${SHOTS}/01-home.png` });
    await page.screenshot({ path: `${SHOTS}/01-home-full.png`, fullPage: true });
    // nav
    ok((await page.locator(".brand").getAttribute("href")) === "/", "app name links home");
    ok((await page.locator("a.nav-btn", { hasText: "שיחת הפיתוח" }).getAttribute("href")).includes("claude.ai/code/session_"), "dev chat link");
    ok((await page.locator("a.nav-btn", { hasText: "פרויקט המחקר" }).getAttribute("href")).includes("claude.ai/project/"), "research project link");
    await page.locator("button.nav-btn", { hasText: "העתקת קישור" }).click();
    await page.waitForSelector(".toast");
    ok((await page.evaluate(() => navigator.clipboard.readText())) === BASE + "/", "copy link copies current url");
    await page.locator("[data-testid=cases-new]").click();
    await page.waitForURL(/\/new$/);
    ok(true, "archive 'new case' button opens /new");
    await page.goBack();
    await page.locator("[data-testid=hero-new]").click();
    await page.waitForURL(/\/new$/);
    ok(true, "hero 'new case' button opens /new");
    await page.goto(BASE + "/");
    await page.locator("[data-testid=case-card]").first().click();
    await page.waitForURL(/\/case\//);
    ok(true, "case card opens the case");
    await page.locator(".brand").click();
    await page.waitForURL(BASE + "/");
    ok(true, "brand returns home");
    ok(errors.length === 0, `home: no console errors ${errors.join(" | ")}`);
    await ctx.close();
  }

  // 2. New case
  console.log("new case");
  {
    const be = backend();
    const { page, ctx, errors } = await newPage(browser, be);
    await page.goto(BASE + "/new");
    await page.locator("[data-testid=submit]").click();
    ok(await page.locator("[data-testid=new-error]").isVisible(), "short text shows an error, no request");
    ok(!be.calls.some((c) => c.kind === "analyze"), "no analyze call for empty case");
    await page.locator("[data-testid=code]").fill("ב.ט 42");
    await page.locator("[data-testid=body]").fill("אישה בת 42, מורה 17 שנה, מרגישה שהיא חיה חיים של מישהי אחרת וחולמת על עיצוב.");
    await page.screenshot({ path: `${SHOTS}/02-new.png` });
    await page.locator("[data-testid=submit]").click();
    await page.waitForURL(new RegExp(`/case/${ids.created}`));
    const call = be.calls.find((c) => c.kind === "analyze" && c.body.action === "intake");
    ok(call && call.body.code === "ב.ט 42" && call.body.body.includes("מורה"), "submit sends intake with code and body");
    ok(errors.length === 0, `new: no console errors ${errors.join(" | ")}`);
    await ctx.close();
  }

  // 3. Fresh case: lenses run in parallel, then synthesis; every card control
  console.log("fresh case flow");
  {
    const be = backend();
    const { page, ctx, errors } = await newPage(browser, be);
    await page.goto(`${BASE}/case/${ids.fresh}`);
    await page.waitForSelector("[data-testid=lens-synthesis].is-ready", { timeout: 15000 });
    const lensCalls = be.calls.filter((c) => c.kind === "analyze" && c.body.action === "lens").map((c) => c.body.lens).sort();
    ok(JSON.stringify(lensCalls) === JSON.stringify(["biographical", "buddhist", "tzimtzum"]), "three lens requests, once each");
    ok(be.calls.filter((c) => c.kind === "analyze" && c.body.action === "synthesis").length === 1, "one synthesis request after the three");
    const synthIdx = be.calls.findIndex((c) => c.body?.action === "synthesis");
    const lastLens = be.calls.map((c, i) => (c.body?.action === "lens" ? i : -1)).reduce((a, b) => Math.max(a, b), -1);
    ok(synthIdx > lastLens, "synthesis requested only after all lenses");
    await page.screenshot({ path: `${SHOTS}/03-case-top.png` });

    // rail
    for (const l of ["tzimtzum", "buddhist", "synthesis", "biographical"]) {
      await page.locator(`[data-testid=rail-${l}]`).click();
      await wait(250);
      ok(new URL(page.url()).searchParams.get("lens") === l, `rail ${l} sets ?lens=`);
    }

    // copy prompt
    await page.locator("[data-testid=copy-tzimtzum]").click();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    ok(clip.includes("--no text, words, writing, frame divisions") && clip.includes("Documentary realism"), "copy prompt copies the full prompt with the fixed tail");
    ok((await page.locator("[data-testid=copy-tzimtzum]").innerText()).includes("הועתק"), "copy button confirms");

    // file pick upload
    await page.locator("[data-testid=file-biographical]").setInputFiles({ name: "mj.png", mimeType: "image/png", buffer: Buffer.from(await (await fetch(`${BASE}/icon-192.png`)).arrayBuffer()) });
    await page.waitForSelector("[data-testid=drop-biographical] img");
    ok(be.calls.some((c) => c.kind === "upload" && c.lens === "biographical" && c.caseId === ids.fresh && c.hasFile), "file picker uploads to the right card");

    // drag and drop
    await page.locator("[data-testid=drop-tzimtzum]").scrollIntoViewIfNeeded();
    await page.evaluate(async (base) => {
      const blob = await (await fetch(base + "/icon-192.png")).blob();
      const dt = new DataTransfer();
      dt.items.add(new File([blob], "drop.png", { type: "image/png" }));
      const el = document.querySelector("[data-testid=drop-tzimtzum]");
      el.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: dt }));
      el.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt }));
    }, BASE);
    await page.waitForSelector("[data-testid=drop-tzimtzum] img");
    ok(be.calls.some((c) => c.kind === "upload" && c.lens === "tzimtzum" && c.hasFile), "drag and drop uploads");

    // paste on hovered zone
    await page.locator("[data-testid=drop-buddhist]").scrollIntoViewIfNeeded();
    await page.locator("[data-testid=drop-buddhist]").hover();
    await page.evaluate(async (base) => {
      const blob = await (await fetch(base + "/icon-192.png")).blob();
      const dt = new DataTransfer();
      dt.items.add(new File([blob], "paste.png", { type: "image/png" }));
      document.activeElement?.blur?.();
      window.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
    }, BASE);
    await page.waitForSelector("[data-testid=drop-buddhist] img");
    ok(be.calls.some((c) => c.kind === "upload" && c.lens === "buddhist" && c.hasFile), "paste uploads to the hovered card");

    // synthesis upload, then remove
    await page.locator("[data-testid=file-synthesis]").setInputFiles({ name: "s.png", mimeType: "image/png", buffer: Buffer.from(await (await fetch(`${BASE}/icon-192.png`)).arrayBuffer()) });
    await page.waitForSelector("[data-testid=drop-synthesis] img");
    ok(true, "synthesis accepts an image");
    await page.locator("[data-testid=remove-synthesis]").click();
    await page.waitForSelector("[data-testid=drop-synthesis] img", { state: "detached" });
    ok(be.calls.some((c) => c.kind === "upload" && c.lens === "synthesis" && c.remove), "remove sends the image url to drop");

    // wrong type
    await page.locator("[data-testid=file-synthesis]").setInputFiles({ name: "x.gif", mimeType: "image/gif", buffer: Buffer.from("GIF89a") });
    ok(await page.locator("[data-testid=lens-synthesis] .space .error").isVisible(), "unsupported type shows an error");

    // pick button opens chooser
    const [chooser] = await Promise.all([page.waitForEvent("filechooser"), page.locator("[data-testid=pick-tzimtzum]").click()]);
    ok(Boolean(chooser), "'replace image' opens the file chooser");

    // regenerate a lens, synthesis becomes stale, rebuild
    const before = be.calls.length;
    await page.locator("[data-testid=regen-buddhist]").click();
    await page.waitForSelector("[data-testid=lens-buddhist].is-ready");
    ok(be.calls.slice(before).some((c) => c.body?.action === "lens" && c.body.lens === "buddhist"), "re-read sends a lens request");
    await page.waitForSelector("text=בניית הסינתזה מחדש");
    ok(true, "synthesis marked stale after a lens re-read");
    await page.locator("[data-testid=regen-synthesis]").click();
    await page.waitForSelector("[data-testid=lens-synthesis].is-ready");
    ok(be.calls.filter((c) => c.body?.action === "synthesis").length === 2, "rebuild sends a synthesis request");
    await page.locator("[data-testid=lens-synthesis]").scrollIntoViewIfNeeded();
    await wait(500);
    await page.screenshot({ path: `${SHOTS}/04-synthesis.png` });
    await page.locator("[data-testid=lens-biographical]").scrollIntoViewIfNeeded();
    await wait(500);
    await page.screenshot({ path: `${SHOTS}/05-lens.png` });
    await page.screenshot({ path: `${SHOTS}/06-case-full.png`, fullPage: true });

    // copy link with lens state
    await page.locator("[data-testid=rail-buddhist]").click();
    await page.locator("button.nav-btn", { hasText: "העתקת קישור" }).click();
    ok((await page.evaluate(() => navigator.clipboard.readText())).endsWith("?lens=buddhist"), "copy link keeps the lens in the url");

    // revise
    await page.locator("[data-testid=revise]").click();
    await page.waitForURL(/\/new\?from=/);
    await page.waitForFunction(() => document.querySelector("[data-testid=body]")?.value.length > 10);
    ok(true, "revise opens the form prefilled");
    await page.locator("[data-testid=submit]").click();
    await page.waitForURL(new RegExp(`/case/${ids.created}`));
    ok(be.calls.some((c) => c.body?.action === "revise" && c.body.parentId === ids.fresh), "revise sends parentId");
    ok(errors.length === 0, `case: no console errors ${errors.join(" | ")}`);
    await ctx.close();
  }

  // 4. Thin case: gate, answers, proceed
  console.log("thin case");
  {
    const be = backend();
    const { page, ctx, errors } = await newPage(browser, be);
    await page.goto(`${BASE}/case/${ids.thin}`);
    await page.waitForSelector("[data-testid=intake]");
    await wait(600);
    ok(!be.calls.some((c) => c.body?.action === "lens"), "no lens requests while information is missing");
    ok(await page.locator("[data-testid=proceed]").isVisible(), "'continue with what we have' is offered");
    await page.screenshot({ path: `${SHOTS}/07-thin.png` });
    await page.locator("[data-testid=answers]").fill("נבדקה, הכל תקין. האם מתקשרת כל יום.");
    await page.locator("[data-testid=send-answers]").click();
    await page.waitForSelector("[data-testid=lens-synthesis].is-ready", { timeout: 15000 });
    ok(be.calls.some((c) => c.body?.action === "answer" && c.body.answers.includes("האם")), "answers are sent");
    ok(be.calls.filter((c) => c.body?.action === "lens").length === 3, "lenses run after the answers");
    ok(errors.length === 0, `thin: no console errors ${errors.join(" | ")}`);
    await ctx.close();

    const be2 = backend();
    const p2 = await newPage(browser, be2);
    await p2.page.goto(`${BASE}/case/${ids.thin}`);
    await p2.page.locator("[data-testid=proceed]").click();
    await p2.page.waitForSelector("[data-testid=lens-synthesis].is-ready", { timeout: 15000 });
    ok(be2.calls.filter((c) => c.body?.action === "lens").length === 3, "'continue' runs the three lenses");
    await p2.ctx.close();
  }

  // 5. Acute case: stop
  console.log("acute case");
  {
    const be = backend();
    const { page, ctx } = await newPage(browser, be);
    await page.goto(`${BASE}/case/${ids.acute}`);
    await page.waitForSelector("[data-testid=risk-acute]");
    await wait(600);
    ok(await page.locator("text=1201").first().isVisible(), "hotlines shown");
    ok((await page.locator("[data-testid^=lens-]").count()) === 0, "no lens cards");
    ok(!be.calls.some((c) => c.body?.action === "lens"), "no lens requests");
    await page.screenshot({ path: `${SHOTS}/08-acute.png` });
    await ctx.close();
  }

  // 6. Concern banner on the ready case + deep link
  console.log("deep link");
  {
    const be = backend();
    const { page, ctx } = await newPage(browser, be);
    await page.goto(`${BASE}/case/${ids.ready}?lens=synthesis`);
    await page.waitForSelector("[data-testid=risk-concern]");
    await wait(1200);
    const top = await page.locator("#lens-synthesis").evaluate((el) => el.getBoundingClientRect().top);
    ok(top < 300, `?lens=synthesis scrolls to the synthesis (top ${Math.round(top)})`);
    ok(!be.calls.some((c) => c.body?.action), "ready case sends no generation requests");
    await ctx.close();
  }

  // 7. Mobile
  console.log("mobile");
  {
    const be = backend();
    const { page, ctx, errors } = await newPage(browser, be, { width: 390, height: 844 });
    for (const [path, name] of [["/", "home"], ["/new", "new"], [`/case/${ids.ready}`, "case"], [`/case/${ids.acute}`, "acute"]]) {
      await page.goto(BASE + path);
      await wait(900);
      await noHScroll(page, `mobile ${name}`);
    }
    await page.goto(`${BASE}/case/${ids.ready}`);
    await wait(800);
    await page.screenshot({ path: `${SHOTS}/09-mobile-case.png` });
    await page.locator(".nav-toggle").click();
    await wait(300);
    ok(await page.locator("button.nav-btn", { hasText: "העתקת קישור" }).isVisible(), "mobile menu opens");
    await page.screenshot({ path: `${SHOTS}/10-mobile-menu.png` });
    await page.locator(".nav-btn--accent").click();
    await page.waitForURL(/\/new$/);
    ok(true, "mobile menu link works");
    await page.goto(BASE + "/");
    await wait(800);
    await page.screenshot({ path: `${SHOTS}/11-mobile-home.png`, fullPage: true });
    ok(errors.length === 0, `mobile: no console errors ${errors.join(" | ")}`);
    await ctx.close();
  }

  // 8. Installability
  console.log("pwa");
  {
    // A persistent (non-incognito) profile: Chrome never offers install in incognito.
    const be = backend();
    const { mkdtempSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const ctx = await chromium.launchPersistentContext(mkdtempSync(`${tmpdir()}/merhav-pwa-`), { executablePath: EXE, viewport: { width: 1280, height: 800 } });
    await ctx.route(/ktqmwpbzcnzkhjskqisy\.supabase\.co/, be.handle);
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    const page = ctx.pages()[0] ?? (await ctx.newPage());
    await page.goto(BASE + "/");
    await page.evaluate(() => navigator.serviceWorker.ready);
    await wait(1500);
    const cdp = await ctx.newCDPSession(page);
    const res = await cdp.send("Page.getInstallabilityErrors");
    ok(res.installabilityErrors.length === 0, `installable (${JSON.stringify(res.installabilityErrors)})`);
    const manifest = await (await fetch(`${BASE}/manifest.webmanifest`)).json();
    ok(manifest.name === "מרחב פנימי" && manifest.icons.length === 3, "manifest name and icons");
    await ctx.close();
  }
} catch (e) {
  failures++;
  console.log("  FAIL exception", e);
} finally {
  await browser.close();
  server.kill();
}

console.log(failures ? `\n${failures} failed` : "\nall passed");
process.exit(failures ? 1 : 0);
