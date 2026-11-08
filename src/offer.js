/**
 * Single source of truth for the paid offer (sellers audience funnel).
 *
 * Every dataset record carries the same purchase line, so the Actor, the
 * README and the Plati.Market card can never drift apart.
 */
export const OFFER = {
  product: "База 230+ чатов Селлеров Wildberries, Ozon, Поставщиков и Карго 2026 (Excel/CSV) + Валидатор",
  code: "TW1-TG",
  priceRub: 149,
  priceUsdc: 1.49,
  storeUrl: "https://9xj89gzrtw-hue.github.io/tg-chats/",
  checkoutUrl: "https://oplata.info/asp2/pay_wm.asp?id_d=6378375&ai=1481449&lang=ru-RU",
  platiUrl: "https://plati.market/itm/6378375",
  platiLotId: 6378375,
  seller: "danilaonly (Plati.Market ID 1481449)",
  delivery: "Instant TW1-TG-… key on the order page. 1-click link with the key in the URL (?key=...&download=xlsx) opens Pro and downloads the .xlsx file.",
  freeFeatures: [
    "detect CMS for up to 50 domains per run (WordPress, WooCommerce, Shopify, OpenCart, Bitrix, Tilda)",
    "extract public phones, emails, Telegram / VK / WhatsApp and INN / OGRN / KPP from the homepage footer",
    "clean CSV / XLSX dataset straight from Apify"
  ],
  paidFeatures: [
    "1-click .csv / .xlsx download with the full 1379-chat base (your 230+ sellers subset is categories WB/Ozon + wholesale + cargo)",
    "live validator for your own t.me links (50 at once)",
    "lifetime key, no subscription"
  ]
};

export function offerLine() {
  return (
    `Free here: CMS detection + public contacts for 50 domains per run. ` +
    `Sellers chats base 230+ (full 1379 in the file) with Excel/CSV (${OFFER.code}, ${OFFER.priceRub} RUB): ${OFFER.storeUrl} ` +
    `| Plati.Market: ${OFFER.platiUrl}`
  );
}

export function offerRecord() {
  return {
    _type: "offer",
    product: OFFER.product,
    code: OFFER.code,
    price_rub: OFFER.priceRub,
    price_usdc: OFFER.priceUsdc,
    store_url: OFFER.storeUrl,
    checkout_url: OFFER.checkoutUrl,
    plati_url: OFFER.platiUrl,
    delivery: OFFER.delivery,
    free: OFFER.freeFeatures,
    paid: OFFER.paidFeatures,
    note: offerLine()
  };
}
