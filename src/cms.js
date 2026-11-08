/**
 * CMS detection + contact extraction. Pure functions, no network.
 */

export function normalizeDomain(raw) {
  if (!raw || typeof raw !== "string") return "";
  let s = raw.trim();
  if (!s) return "";
  s = s.replace(/^https?:\/\//i, "");
  s = s.split("/")[0].split("?")[0].split("#")[0];
  s = s.replace(/^www\./i, "");
  s = s.toLowerCase();
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(s)) return "";
  return s;
}

export function detectCms(html, headersText = "") {
  const h = String(html || "").toLowerCase();
  const hd = String(headersText || "").toLowerCase();
  const both = h + "\n" + hd;

  // Strong, specific markers first (order matters: WooCommerce is also WP).
  const rules = [
    { cms: "WooCommerce", confidence: "high", test: () => /wp-content\/plugins\/woocommerce|wc-blocks|woocommerce\.min\.|class="woocommerce/.test(both) },
    { cms: "Shopify", confidence: "high", test: () => /cdn\.shopify\.com|shopify\.theme|myshopify\.com|x-shopify/.test(both) },
    { cms: "WordPress", confidence: "high", test: () => /wp-content|wp-includes|wp-json|meta name="generator" content="wordpress/.test(both) },
    { cms: "OpenCart", confidence: "high", test: () => /catalog\/view|index\.php\?route=|opencart/.test(both) },
    { cms: "Bitrix", confidence: "high", test: () => /bitrix|1c-bitrix|b24\.js/.test(both) },
    { cms: "Tilda", confidence: "high", test: () => /tilda|p\.tilda|page\.tilda/.test(both) },
    { cms: "Magento", confidence: "medium", test: () => /magento|pub\/media|static\/frontend\//.test(both) },
    { cms: "Joomla", confidence: "medium", test: () => /com_content|joomla|media\/jui\//.test(both) },
    { cms: "Wix", confidence: "medium", test: () => /static\.wixstatic|wix\.com|_wix/.test(both) },
    { cms: "Squarespace", confidence: "medium", test: () => /squarespace|static1\.squarespace/.test(both) },
  ];
  for (const r of rules) {
    try {
      if (r.test()) return { cms: r.cms, cmsConfidence: r.confidence };
    } catch {
      /* ignore */
    }
  }
  // Weak signals: generator with unknown value, shared footprints.
  if (/meta name="generator"/.test(h)) return { cms: "Unknown", cmsConfidence: "low" };
  if (/wp-|wordpress/i.test(both)) return { cms: "WordPress", cmsConfidence: "medium" };
  return { cms: "Unknown", cmsConfidence: "low" };
}

function dedup(list) {
  const seen = new Set();
  const out = [];
  for (const v of list) {
    const k = String(v).toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(v);
    }
  }
  return out;
}

export function extractTitle(html) {
  const m = String(html || "").match(/<title[^>]*>([^<]{1,300})<\/title>/i);
  if (!m) return null;
  return m[1].replace(/\s+/g, " ").trim() || null;
}

export function extractPhones(html) {
  const text = String(html || "");
  const found = new Set();
  // International and Russian formats.
  const re = /(\+?7[\s\-()]*\d{3}[\s\-()]*\d{3}[\s\-()]*\d{2}[\s\-()]*\d{2}|8[\s\-()]*\d{3}[\s\-()]*\d{3}[\s\-()]*\d{2}[\s\-()]*\d{2}|\+[1-9]\d{0,3}[\s\-()]*\d{3,4}[\s\-()]*\d{3,4}[\s\-()]*\d{2,4})/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const digits = m[1].replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 15) continue;
    // Drop obvious non-phones: years, prices without separators are already filtered by length.
    found.add(m[1].replace(/\s+/g, " ").trim());
    if (found.size > 20) break;
  }
  return [...found];
}

export function extractEmails(html) {
  const text = String(html || "");
  const found = new Set();
  const re = /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const e = m[0].toLowerCase();
    if (e.endsWith(".png") || e.endsWith(".jpg") || e.endsWith(".jpeg") || e.endsWith(".gif")) continue;
    if (e.includes("example.com")) continue;
    found.add(e);
    if (found.size > 20) break;
  }
  return [...found];
}

export function extractTelegram(html) {
  const text = String(html || "");
  const found = new Set();
  const re = /https?:\/\/t\.me\/([A-Za-z0-9_]{3,})\/?/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    found.add("https://t.me/" + m[1]);
    if (found.size > 10) break;
  }
  return [...found];
}

export function extractVk(html) {
  const text = String(html || "");
  const found = new Set();
  const re = /https?:\/\/(?:www\.)?vk\.com\/([A-Za-z0-9_\.\-]+)/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    found.add("https://vk.com/" + m[1]);
    if (found.size > 10) break;
  }
  return [...found];
}

export function extractWhatsapp(html) {
  const text = String(html || "");
  const found = new Set();
  const re = /https?:\/\/wa\.me\/(\d{7,15})/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    found.add("https://wa.me/" + m[1]);
    if (found.size > 10) break;
  }
  return [...found];
}

export function isValidInn(inn) {
  const s = String(inn || "").replace(/\D/g, "");
  if (s.length !== 10 && s.length !== 12) return false;
  if (/^0+$/.test(s)) return false;
  const d = s.split("").map(Number);
  const sum = (n, w) => w.slice(0, n).reduce((acc, x, i) => acc + x * d[i], 0);
  if (s.length === 10) {
    const check = (sum(9, [2, 4, 10, 3, 5, 9, 4, 6, 8]) % 11) % 10;
    return check === d[9];
  }
  const c1 = (sum(10, [7, 2, 4, 10, 3, 5, 9, 4, 6, 8]) % 11) % 10;
  const c2 = (sum(11, [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8]) % 11) % 10;
  return c1 === d[10] && c2 === d[11];
}

export function isValidOgrn(ogrn) {
  const s = String(ogrn || "").replace(/\D/g, "");
  if (s.length !== 13) return false;
  const check = Number(s.slice(0, 12)) % 11;
  const last = Number(s[12]);
  return (check === 10 ? 0 : check) === last;
}

export function extractInn(html) {
  // Require a label (ИНН/INN) nearby — otherwise any JS number passes the checksum by chance.
  const re = /(?:ИНН|INN|inn)[^\d]{0,24}?(\d{10}|\d{12})\b/gi;
  const found = new Set();
  let m;
  const text = String(html || "");
  while ((m = re.exec(text)) !== null) {
    if (isValidInn(m[1])) found.add(m[1]);
    if (found.size > 10) break;
  }
  return [...found];
}

export function extractOgrn(html) {
  const re = /(?:ОГРН|OGRN|ogrn)[^\d]{0,24}?(\d{13})\b/gi;
  const found = new Set();
  let m;
  const text = String(html || "");
  while ((m = re.exec(text)) !== null) {
    if (isValidOgrn(m[1])) found.add(m[1]);
    if (found.size > 10) break;
  }
  return [...found];
}

export function extractKpp(html) {
  // KPP is 9 digits; without a checksum, require surrounding context to cut false positives.
  const re = /(?:КПП|KPP)[:\s]*?(\d{9})\b/gi;
  const found = new Set();
  let m;
  const text = String(html || "");
  while ((m = re.exec(text)) !== null) {
    found.add(m[1]);
    if (found.size > 10) break;
  }
  return [...found];
}

export function extractContacts(html) {
  return {
    title: extractTitle(html),
    phones: extractPhones(html),
    emails: extractEmails(html),
    telegram: extractTelegram(html),
    vk: extractVk(html),
    whatsapp: extractWhatsapp(html),
    inn: extractInn(html),
    ogrn: extractOgrn(html),
    kpp: extractKpp(html),
  };
}

export function mergeContacts(a, b) {
  return {
    title: b.title || a.title,
    phones: dedup([...(a.phones || []), ...(b.phones || [])]).slice(0, 20),
    emails: dedup([...(a.emails || []), ...(b.emails || [])]).slice(0, 20),
    telegram: dedup([...(a.telegram || []), ...(b.telegram || [])]).slice(0, 10),
    vk: dedup([...(a.vk || []), ...(b.vk || [])]).slice(0, 10),
    whatsapp: dedup([...(a.whatsapp || []), ...(b.whatsapp || [])]).slice(0, 10),
    inn: dedup([...(a.inn || []), ...(b.inn || [])]).slice(0, 10),
    ogrn: dedup([...(a.ogrn || []), ...(b.ogrn || [])]).slice(0, 10),
    kpp: dedup([...(a.kpp || []), ...(b.kpp || [])]).slice(0, 10),
  };
}
