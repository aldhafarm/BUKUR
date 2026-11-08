// اختبار تحليل ردّ ويكي داتا (بلا شبكة): الصورة P18، العنوان العربي، الوصف، والحالات الناقصة.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { entityUrl, parseEntity, fetchWiki } from '../app/widgets/quotes/wiki.js';

const sample = {
  entities: {
    Q1: {
      id: 'Q1',
      labels: { ar: { value: 'ابن سينا' }, en: { value: 'Avicenna' } },
      descriptions: { ar: { value: 'وصف تجريبي' } },
      sitelinks: { arwiki: { title: 'ابن سينا' } },
      claims: { P18: [{ mainsnak: { datavalue: { value: 'Some File.jpg' } } }] },
    },
  },
};

test('الرابط يطلب الكيان بعنوان ويكيبيديا الإنجليزية مع origin=* (CORS)', () => {
  const u = new URL(entityUrl('Avicenna'));
  assert.equal(u.searchParams.get('sites'), 'enwiki');
  assert.equal(u.searchParams.get('titles'), 'Avicenna');
  assert.equal(u.searchParams.get('origin'), '*');
});

test('تحليل الكيان: الصورة وصفحة ملفها، والعنوان العربي، والوصف', () => {
  const e = parseEntity(sample);
  assert.equal(e.qid, 'Q1');
  assert.equal(e.label, 'ابن سينا');
  assert.equal(e.arTitle, 'ابن سينا');
  assert.match(e.image.thumb, /Special:FilePath\/Some_File\.jpg\?width=160$/);
  assert.match(e.image.page, /File:Some_File\.jpg$/);
});

test('كيان مفقود أو بلا صورة: لا انهيار', () => {
  assert.equal(parseEntity({ entities: { '-1': { missing: '' } } }), null);
  assert.equal(parseEntity(null), null);
  const noImg = structuredClone(sample); delete noImg.entities.Q1.claims.P18;
  assert.equal(parseEntity(noImg).image, null);
});

test('fetchWiki يجمع الكيان ومقدمة المقالة العربية', async () => {
  const fake = async (url) => ({ json: async () => (url.includes('wikidata')
    ? sample : { extract: 'مقدمة تجريبية', content_urls: { desktop: { page: 'https://ar.wikipedia.org/wiki/x' } } }) });
  const w = await fetchWiki('Avicenna', fake);
  assert.equal(w.extract, 'مقدمة تجريبية');
  assert.equal(w.wikipediaUrl, 'https://ar.wikipedia.org/wiki/x');
});
