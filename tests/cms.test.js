import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeDomain,
  detectCms,
  extractContacts,
  isValidInn,
  isValidOgrn
} from "../src/cms.js";
import { run } from "../src/run.js";
import { offerRecord } from "../src/offer.js";

test("normalizeDomain", () => {
  assert.equal(normalizeDomain("https://www.Example.COM/shop?a=1"), "example.com");
  assert.equal(normalizeDomain("shop.example.ru"), "shop.example.ru");
  assert.equal(normalizeDomain(""), "");
  assert.equal(normalizeDomain("not a domain!!"), "");
});

test("detectCms: WooCommerce beats WordPress", () => {
  const html = `<html><head><link href="/wp-content/plugins/woocommerce/assets/css/woocommerce.css"></head></html>`;
  assert.equal(detectCms(html).cms, "WooCommerce");
});

test("detectCms: WordPress, Shopify, OpenCart, Bitrix, Tilda", () => {
  assert.equal(detectCms(`<script src="/wp-includes/js/wp-emoji.js">`).cms, "WordPress");
  assert.equal(detectCms(`<link href="https://cdn.shopify.com/s/files/1/123/theme.css">`).cms, "Shopify");
  assert.equal(detectCms(`<a href="index.php?route=product/product">`).cms, "OpenCart");
  assert.equal(detectCms(`<script src="/bitrix/js/main/core.js">`).cms, "Bitrix");
  assert.equal(detectCms(`<div id="tilda-page">`).cms, "Tilda");
  const u = detectCms(`<html><title>Hi</title></html>`);
  assert.equal(u.cms, "Unknown");
  assert.equal(u.cmsConfidence, "low");
});

test("extractContacts: footer with phones, email, TG, INN/OGRN", () => {
  const html = `<html><head><title>Shop — phones and contacts</title></head><body>
    <footer>Тел: +7 (495) 123-45-67, e-mail: sales@example.ru
    Наш Telegram: https://t.me/shop_example · VK: https://vk.com/shop_example · WhatsApp: https://wa.me/74951234567
    ИНН 7701234560, ОГРН 1027700132195, КПП 770101001</footer></body></html>`;
  const c = extractContacts(html);
  assert.equal(c.title, "Shop — phones and contacts");
  assert.ok(c.phones.some((p) => p.includes("495")));
  assert.ok(c.emails.includes("sales@example.ru"));
  assert.ok(c.telegram.includes("https://t.me/shop_example"));
  assert.ok(c.vk.includes("https://vk.com/shop_example"));
  assert.ok(c.whatsapp.includes("https://wa.me/74951234567"));
  assert.deepEqual(c.inn, ["7701234560"]);
  assert.deepEqual(c.ogrn, ["1027700132195"]);
  assert.deepEqual(c.kpp, ["770101001"]);
});

test("INN/OGRN checksums reject random digits", () => {
  assert.equal(isValidInn("7701234560"), true);
  assert.equal(isValidInn("7701234567"), false);
  assert.equal(isValidOgrn("1027700132195"), true);
  assert.equal(isValidOgrn("1027700132196"), false);
});

test("run: empty input pushes only the offer record", async () => {
  const rows = [];
  const summary = await run({ domains: [], includeOffer: true }, async (r) => rows.push(r));
  assert.equal(summary.domains, 0);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]._type, "offer");
  assert.match(offerRecord().note, /TW1-TG/);
});

test("run: invalid domains are skipped, offer still appended", async () => {
  const rows = [];
  const summary = await run({ domains: ["not a domain", ""], includeOffer: true }, async (r) => rows.push(r));
  assert.equal(summary.domains, 0);
  assert.equal(rows.length, 1);
});
