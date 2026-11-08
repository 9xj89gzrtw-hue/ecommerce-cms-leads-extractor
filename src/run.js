/**
 * Orchestration: fetch domains, detect CMS, extract contacts.
 * No login, no browser — plain HTTPS GET with a browser-like UA.
 */
import {
  normalizeDomain,
  detectCms,
  extractContacts,
  mergeContacts
} from "./cms.js";
import { offerRecord } from "./offer.js";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

async function fetchHtml(url, timeoutSecs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutSecs * 1000);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,*/*" }
    });
    const headers = Object.fromEntries(res.headers.entries());
    const text = await res.text();
    return { status: res.status, finalUrl: res.url, headers, html: text.slice(0, 2_000_000) };
  } finally {
    clearTimeout(timer);
  }
}

function contactsUrls(domain, finalUrl, includeContactsPage) {
  if (!includeContactsPage) return [];
  const base = finalUrl || `https://${domain}/`;
  const origin = base.replace(/\/[^/]*$/, "/");
  // Try a small set of likely contacts pages; first that returns HTML wins.
  return [
    origin + "contacts",
    origin + "contact",
    origin + "kontakty",
    origin + "about"
  ];
}

export async function checkDomain(domain, opts = {}) {
  const timeoutSecs = opts.timeoutSecs || 15;
  const includeContactsPage = opts.includeContactsPage !== false;
  const checkedAt = new Date().toISOString();
  let main;
  try {
    main = await fetchHtml(`https://${domain}/`, timeoutSecs);
  } catch (err) {
    return {
      _type: "error",
      domain,
      url: `https://${domain}/`,
      cms: "Unknown",
      cmsConfidence: "low",
      title: null,
      phones: [], emails: [], telegram: [], vk: [], whatsapp: [],
      inn: [], ogrn: [], kpp: [],
      sourceUrls: [`https://${domain}/`],
      checkedAt,
      error: `fetch failed: ${err && err.name === "AbortError" ? "timeout" : (err && err.message) || err}`
    };
  }

  const headersText = Object.entries(main.headers || {}).map(([k, v]) => `${k}: ${v}`).join("\n");
  const cmsInfo = detectCms(main.html, headersText);
  let contacts = extractContacts(main.html);
  const sourceUrls = [main.finalUrl || `https://${domain}/`];

  for (const cu of contactsUrls(domain, main.finalUrl, includeContactsPage)) {
    try {
      const extra = await fetchHtml(cu, Math.min(timeoutSecs, 10));
      if (extra.status >= 200 && extra.status < 300 && /<html/i.test(extra.html.slice(0, 2000))) {
        contacts = mergeContacts(contacts, extractContacts(extra.html));
        sourceUrls.push(extra.finalUrl || cu);
        break;
      }
    } catch {
      /* best effort */
    }
  }

  return {
    _type: "lead",
    domain,
    url: main.finalUrl || `https://${domain}/`,
    cms: cmsInfo.cms,
    cmsConfidence: cmsInfo.cmsConfidence,
    title: contacts.title,
    phones: contacts.phones,
    emails: contacts.emails,
    telegram: contacts.telegram,
    vk: contacts.vk,
    whatsapp: contacts.whatsapp,
    inn: contacts.inn,
    ogrn: contacts.ogrn,
    kpp: contacts.kpp,
    sourceUrls,
    checkedAt,
    error: main.status >= 400 ? `HTTP ${main.status}` : null
  };
}

export async function run(input = {}, push) {
  const rawDomains = Array.isArray(input.domains) ? input.domains : [];
  const maxDomains = Math.min(Math.max(input.maxDomains || 50, 1), 500);
  const timeoutSecs = Math.min(Math.max(input.requestTimeoutSecs || 15, 5), 60);
  const includeContactsPage = input.includeContactsPage !== false;
  const includeOffer = input.includeOffer !== false;

  const domains = [];
  const seen = new Set();
  for (const raw of rawDomains) {
    const d = normalizeDomain(raw);
    if (!d || seen.has(d)) continue;
    seen.add(d);
    domains.push(d);
    if (domains.length >= maxDomains) break;
  }

  const byCms = {};
  let failures = 0;
  for (const d of domains) {
    let row;
    try {
      row = await checkDomain(d, { timeoutSecs, includeContactsPage });
    } catch (err) {
      row = {
        _type: "error",
        domain: d,
        url: `https://${d}/`,
        cms: "Unknown",
        cmsConfidence: "low",
        title: null,
        phones: [], emails: [], telegram: [], vk: [], whatsapp: [],
        inn: [], ogrn: [], kpp: [],
        sourceUrls: [`https://${d}/`],
        checkedAt: new Date().toISOString(),
        error: String((err && err.message) || err)
      };
    }
    if (row._type === "error") failures += 1;
    else byCms[row.cms] = (byCms[row.cms] || 0) + 1;
    await push(row);
  }

  if (includeOffer) await push(offerRecord());
  return { domains: domains.length, byCms, failures };
}
