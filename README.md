# E-Commerce Store, CMS & B2B Contact Leads Extractor

**Give the Actor a list of stores, get a clean B2B leads table out:** CMS (WordPress, WooCommerce, Shopify, OpenCart, Bitrix, Tilda), page title, public phones, e-mails, Telegram / VK / WhatsApp links and INN / OGRN / KPP from the footer — one row per domain, ready for CSV or Excel.

> **Need open Telegram chats of WB/Ozon sellers, suppliers and cargo?**
> **База 230+ чатов Селлеров Wildberries, Ozon, Поставщиков и Карго 2026** — проверенные открытые чаты, валидатор своих ссылок и выгрузка в Excel/CSV. Полный файл — 1379 чатов, категория «Маркетплейсы + опт + карго» — это 233 чата.
> Pro key `TW1-TG` — **149 ₽**, lifetime. 1-клик ссылка из автовыдачи включает Pro и скачивает файл.
> [Plati.Market lot 6378375](https://plati.market/itm/6378375) · [oplata.info checkout](https://oplata.info/asp2/pay_wm.asp?id_d=6378375&ai=1481449&lang=ru-RU) · [product page](https://9xj89gzrtw-hue.github.io/tg-chats/)

---

## What it does

| Input | What you get |
|---|---|
| list of domains (`example.com`, `https://shop.example.ru`) | one row per domain: CMS + contacts |

For every domain the Actor returns:

- `cms` — `WordPress`, `WooCommerce`, `Shopify`, `OpenCart`, `Bitrix`, `Tilda`, `Magento`, `Joomla`, `Wix`, `Squarespace` or `Unknown`
- `cmsConfidence` — `high` / `medium` / `low`
- `title` — page `<title>`
- `phones`, `emails` — public contacts
- `telegram`, `vk`, `whatsapp` — public messenger links
- `inn`, `ogrn`, `kpp` — Russian requisites (INN/OGRN with checksum validation)
- `sourceUrls` — where each contact was found (homepage + optional `/contacts`)
- `checkedAt`, `error` — honest status

No login, no browser, no proxy. Plain HTTPS GET with a browser-like User-Agent.

## Quick start

1. Paste domains into **domains** (up to **50** in the free tier, 500 max).
2. Keep **includeContactsPage = true** to also scan `/contacts`, `/contact`, `/kontakty` and `/about`.
3. Run. Export the dataset as **CSV** or **XLSX** from the Apify Console.

Example input:

```json
{
  "domains": ["example.com", "shop.example.ru", "https://www.example-shop.com/store"],
  "includeContactsPage": true,
  "maxDomains": 50,
  "includeOffer": true
}
```

Example output row:

```json
{
  "_type": "lead",
  "domain": "shop.example.ru",
  "url": "https://shop.example.ru/",
  "cms": "WooCommerce",
  "cmsConfidence": "high",
  "title": "Магазин — телефоны и контакты",
  "phones": ["+7 (495) 123-45-67"],
  "emails": ["sales@example.ru"],
  "telegram": ["https://t.me/shop_example"],
  "vk": ["https://vk.com/shop_example"],
  "whatsapp": ["https://wa.me/74951234567"],
  "inn": ["7701234560"],
  "ogrn": ["1027700132195"],
  "kpp": ["770101001"],
  "sourceUrls": ["https://shop.example.ru/", "https://shop.example.ru/contacts"],
  "checkedAt": "2026-11-08T12:00:00.000Z",
  "error": null
}
```

## How it works (and where it stops)

- **CMS detection.** Pure pattern matching over HTML and response headers: `wp-content` / `wp-json` → WordPress, `woocommerce` → WooCommerce (checked first, since it is also WordPress), `cdn.shopify.com` → Shopify, `catalog/view` → OpenCart, `bitrix` → Bitrix, `tilda` → Tilda. Unknown sites get `Unknown / low` — no invented guesses.
- **Contacts.** Regular expressions over the homepage (plus `/contacts` when enabled). INN and OGRN are filtered by checksum so random 10/13-digit strings do not leak into the table.
- **Limits.** The Actor only reads public pages. Private data, form submissions and logins are out of scope by design. Fetch failures become honest `error` rows with `fetch failed: …`.

## Output

Record types in the dataset:

- `lead` — one checked domain
- `error` — unreachable domain or HTTP error
- `offer` — sellers chats base (TW1-TG), price, checkout and Plati.Market links

Export straight from the Console or the dataset API:

```
GET /v2/datasets/{id}/items?format=csv
GET /v2/datasets/{id}/items?format=xlsx
```

## Free vs Pro

| | This Actor (free tier) | Sellers chats base (`TW1-TG`) |
|---|---|---|
| Domains per run | 50 (max 500) | — |
| CMS detection | ✅ | — |
| Phones / e-mails / TG / VK / WhatsApp / INN / OGRN | ✅ | — |
| Open chats base 230+ (full 1379 in the file) | — | ✅ Excel/CSV |
| Live t.me link validator (50 at once) | — | ✅ |
| Price | free tier | **149 ₽, lifetime key** |

The Pro key is ECDSA P-256 signed and verified offline. It is delivered automatically on the order page after SBP / RU card payment and never expires.

## Pay-per-event (synthetic events)

This Actor is ready for Apify's synthetic PPE events out of the box: every `Actor.pushData()` row automatically counts as `apify-default-dataset-item` and every run start counts as `apify-actor-start`. No extra `charge()` call is required — and none must be added for the synthetic events (Apify charges them itself). Once `pricingInfos` is set in the Apify Console (requires payout billing info at `console.apify.com/actors/{id}/publication`), the events start billing automatically.

## Local development

```bash
npm install
npm test                              # 7 offline tests, no network
node src/main.js --domains example.com --max-domains 1
```

The same `src/run.js` powers the Actor and the CLI; `src/main.js` switches on `APIFY_IS_AT_HOME` / `ACTOR_ID`.

## Files

```
.actor/actor.json          Actor spec, categories, dataset + output schema
.actor/INPUT_SCHEMA.json   domains, includeContactsPage, limits
src/cms.js                 CMS detection + contact extraction (pure)
src/run.js                 fetching and dataset records
src/offer.js               single source of truth for the Pro offer
tests/                     offline tests (no network)
```

## License

MIT. The Actor is free to run within the tier above; the chats base is a separate product sold on Plati.Market.
