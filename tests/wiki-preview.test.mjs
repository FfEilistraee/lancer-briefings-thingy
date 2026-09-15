import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { applyWikiTransforms, wikiPreviewText } from '../src/utils/wiki.js';

test('the Varkul card shows names without exposing wiki markup', () => {
  const source = readFileSync(new URL('../src/assets/world/npcs/npc-Varkul.md', import.meta.url), 'utf8');
  const summary = JSON.parse(source.match(/^summary: (.+)$/m)[1]);
  const preview = wikiPreviewText(summary);
  assert.equal(preview, 'Varkul is a young leader of the Kovashi tribe on Elysian-9, known for his striking appearance and calm demeanor. He carefully balances the traditions of his people with the demands of the Macbeth Empire.');
  assert.ok(summary.includes('[[Varkul]]'), 'source content stays unchanged');
});

test('preview labels support aliases, headings, and rendered Markdown links', () => {
  assert.equal(wikiPreviewText('[[Varkul|Ash-Voice]] on [[Elysion-9#History|Pandora]]'), 'Ash-Voice on Pandora');
  assert.equal(wikiPreviewText('[[Elysion-9#History]] / [[#History]]'), 'Elysion-9 / History');
  assert.equal(wikiPreviewText('[Varkul](wiki:varkul) and **Kovashi**'), 'Varkul and Kovashi');
  assert.equal(wikiPreviewText(['[[Varkul]]', '[[Kovashi]]']), 'Varkul Kovashi');
  assert.equal(wikiPreviewText('![[portrait.png|120]]\n[[Varkul]]'), 'Varkul');
  assert.equal(wikiPreviewText(null), '');
});

test('article links remain links after preview formatting', () => {
  const source = '[[Varkul|Ash-Voice]] lives on [[Elysion-9]].';
  assert.equal(wikiPreviewText(source), 'Ash-Voice lives on Elysion-9.');
  assert.equal(applyWikiTransforms(source), '[Ash-Voice](wiki:varkul) lives on [Elysion-9](wiki:elysion-9).');
});
