// Renders public/icon.svg to the PNG sizes the manifest needs (no text in the icon).
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const exe = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const svg = readFileSync(new URL("../public/icon.svg", import.meta.url), "utf8");
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage();

for (const [size, name, pad] of [[192, "icon-192.png", 0], [512, "icon-512.png", 0], [512, "icon-maskable-512.png", 0.12]]) {
  await page.setViewportSize({ width: size, height: size });
  const inner = Math.round(size * (1 - pad * 2));
  await page.setContent(
    `<html><body style="margin:0;background:#141311;display:grid;place-items:center;width:${size}px;height:${size}px">
      <div style="width:${inner}px;height:${inner}px">${svg.replace("<svg ", `<svg width="${inner}" height="${inner}" `)}</div></body></html>`,
  );
  await page.screenshot({ path: new URL(`../public/${name}`, import.meta.url).pathname, omitBackground: false });
  console.log("wrote", name);
}
await browser.close();
