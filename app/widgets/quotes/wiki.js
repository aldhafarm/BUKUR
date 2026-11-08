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
  };
}

export async function fetchWiki(enwikiTitle, fetchImpl = fetch) {
  const ent = parseEntity(await (await fetchImpl(entityUrl(enwikiTitle))).json());
  if (!ent) return null;
  if (ent.arTitle) {
    try {
      const s = await (await fetchImpl(AR_SUMMARY + encodeURIComponent(ent.arTitle.replace(/ /g, '_')))).json();
      ent.extract = s?.extract ?? null;
      ent.wikipediaUrl = s?.content_urls?.desktop?.page ?? `https://ar.wikipedia.org/wiki/${encodeURIComponent(ent.arTitle)}`;
    } catch { /* المقدمة اختيارية */ }
  }
  return ent;
}
