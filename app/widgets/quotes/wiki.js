// جلب صورة العَلَم ومعلوماته من ويكي داتا وويكيبيديا — بنفس طريقة أداة «الأعلام»:
// «كل كيان مربوط بمعرفه في Wikidata». نربط بعنوان مقالة ويكيبيديا الإنجليزية (sitelink) فيُعطينا
// ويكي داتا الكيانَ نفسه بلا تخمين للمعرّف، ثم صورته (P18) والعنوان العربي، ثم مقدمة المقالة العربية.
// الجلب في متصفح المستخدم (الواجهات تسمح بـ CORS عبر origin=*).

const WD = 'https://www.wikidata.org/w/api.php';
const AR_SUMMARY = 'https://ar.wikipedia.org/api/rest_v1/page/summary/';
const FILEPATH = 'https://commons.wikimedia.org/wiki/Special:FilePath/';
const FILEPAGE = 'https://commons.wikimedia.org/wiki/File:';

export function entityUrl(enwikiTitle) {
  const q = new URLSearchParams({
    action: 'wbgetentities', sites: 'enwiki', titles: enwikiTitle, props: 'claims|labels|descriptions|sitelinks',
    languages: 'ar|en', sitefilter: 'arwiki|enwiki', format: 'json', origin: '*',
  });
  return `${WD}?${q}`;
}

/** يحلّل ردّ wbgetentities إلى ما نعرضه — دالة نقية تُختبر بلا شبكة. */
export function parseEntity(json) {
  const ent = Object.values(json?.entities ?? {}).find((e) => e && !('missing' in e));
  if (!ent) return null;
  const file = ent.claims?.P18?.[0]?.mainsnak?.datavalue?.value ?? null;
  const name = file ? file.replace(/ /g, '_') : null;
  return {
    qid: ent.id,
    label: ent.labels?.ar?.value ?? ent.labels?.en?.value ?? null,
    description: ent.descriptions?.ar?.value ?? null,
    arTitle: ent.sitelinks?.arwiki?.title ?? null,
    image: name ? { thumb: `${FILEPATH}${encodeURIComponent(name)}?width=160`, page: `${FILEPAGE}${encodeURIComponent(name)}`, file } : null,
    wikidataUrl: `https://www.wikidata.org/wiki/${ent.id}`,
    workIds: (ent.claims?.P800 ?? []).map((c) => c.mainsnak?.datavalue?.value?.id).filter(Boolean).slice(0, 12),
  };
}

const imageOf = (file) => {
  if (!file) return null;
  const name = file.replace(/ /g, '_');
  return { thumb: `${FILEPATH}${encodeURIComponent(name)}?width=220`, page: `${FILEPAGE}${encodeURIComponent(name)}`, file };
};

/** «أعماله البارزة» (P800) — لكل كتاب عنوانه وصورته (P18) إن وُجدت. دالة نقية للتحليل. */
export function parseWorks(json, ids) {
  const ents = json?.entities ?? {};
  return ids.map((id) => ents[id]).filter((e) => e && !('missing' in e)).map((e) => ({
    qid: e.id,
    title: e.labels?.ar?.value ?? e.labels?.en?.value ?? e.id,
    image: imageOf(e.claims?.P18?.[0]?.mainsnak?.datavalue?.value),
    url: `https://www.wikidata.org/wiki/${e.id}`,
  }));
}

export function worksUrl(ids) {
  const q = new URLSearchParams({ action: 'wbgetentities', ids: ids.join('|'), props: 'labels|claims', languages: 'ar|en', format: 'json', origin: '*' });
  return `${WD}?${q}`;
}

export async function fetchWiki(enwikiTitle, fetchImpl = fetch) {
  const ent = parseEntity(await (await fetchImpl(entityUrl(enwikiTitle))).json());
  if (!ent) return null;
  if (ent.workIds.length) {
    try { ent.works = parseWorks(await (await fetchImpl(worksUrl(ent.workIds))).json(), ent.workIds); } catch { ent.works = []; }
  } else ent.works = [];
  if (ent.arTitle) {
    try {
      const s = await (await fetchImpl(AR_SUMMARY + encodeURIComponent(ent.arTitle.replace(/ /g, '_')))).json();
      ent.extract = s?.extract ?? null;
      ent.wikipediaUrl = s?.content_urls?.desktop?.page ?? `https://ar.wikipedia.org/wiki/${encodeURIComponent(ent.arTitle)}`;
    } catch { /* المقدمة اختيارية */ }
  }
  return ent;
}
