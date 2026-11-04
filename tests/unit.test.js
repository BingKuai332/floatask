'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { LOCALES, createT, normalizeLocale } = require('../src/shared/i18n');

test('locales have complete keys and matching interpolation parameters',()=>{
 assert.deepEqual(Object.keys(LOCALES.en).sort(),Object.keys(LOCALES['zh-CN']).sort());
 for(const [key,text] of Object.entries(LOCALES.en)) {
  const params = s => [...s.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();
  assert.deepEqual(params(text), params(LOCALES['zh-CN'][key]),key);
 }
 assert.equal(normalizeLocale('en-US'),'en');
 assert.equal(createT('en')('result.charCount',{n:5}),'5 chars');
});

function withHistory(seed,fn) {
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'floatask-unit-'));
 try {
  if(seed)fs.writeFileSync(path.join(directory,'history.json'),JSON.stringify({records:seed}));
  const context={require:name=>name==='electron'?{app:{getPath:()=>directory}}:require(name),module:{exports:{}},console};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/main/history.js'),'utf8'),context);
  fn(context.module.exports,directory);
 } finally { if(path.dirname(directory)===path.resolve(os.tmpdir()) && path.basename(directory).startsWith('floatask-unit-'))fs.rmSync(directory,{recursive:true,force:true}); }
}
test('history upserts, excludes secrets and images, and keeps favorites when clearing',()=>{
 withHistory(null,(history,dir)=>{
  const session={selectionText:'A term',imageDataUrl:'data:image/png;base64,PRIVATE',apiKey:'PRIVATE_KEY',history:[{role:'system',content:'PRIVATE_SYSTEM'},{role:'user',content:'Explain'},{role:'assistant',content:'Answer'}]};
  const record=history.record(session,{model:'mock'});
  history.setFavorite(record.id,true);
  session.history.push({role:'user',content:'Next'},{role:'assistant',content:'Next answer'});
  history.record(session);
  assert.equal(history.list().length,1);assert.equal(history.get(record.id).messages.length,4);
  const saved=fs.readFileSync(path.join(dir,'history.json'),'utf8');
  assert(!saved.includes('PRIVATE'));
  assert.equal(history.clear(),0);assert.equal(history.get(record.id).favorite,true);
  assert.equal(history.clear(false),1);assert.equal(history.get(record.id),null);
 });
});
test('history capacity preserves favorites and drops oldest non-favorites',()=>{
 const seed=Array.from({length:501},(_,i)=>({id:'h'+i,updatedAt:i,favorite:i===0,messages:[{role:'assistant',content:'Answer'}]}));
 withHistory(seed,history=>{
  history.record({history:[{role:'assistant',content:'New answer'}]});
  assert.equal(history.list().length,500);assert(history.get('h0'));assert.equal(history.get('h1'),null);
 });
});
test('all favorites survive capacity and write failures surface to callers',()=>{
 const seed=Array.from({length:501},(_,i)=>({id:'h'+i,updatedAt:i,favorite:true,messages:[{role:'assistant',content:'Answer'}]}));
 withHistory(seed,(history,dir)=>{
  history.record({history:[{role:'assistant',content:'New answer'}]});
  assert.equal(history.list().length,501);assert(history.get('h0'));
  fs.mkdirSync(path.join(dir,'history.json.tmp'));
  assert.throws(()=>history.setFavorite('h0',false));
 });
});

test('history retention purges only expired non-favorite records', () => withHistory([
 {id:'old-plain',createdAt:Date.now()-40*86400000,updatedAt:Date.now()-40*86400000,favorite:false,title:'old',messages:[{role:'user',content:'a'}]},
 {id:'old-fav',createdAt:Date.now()-60*86400000,updatedAt:Date.now()-60*86400000,favorite:true,title:'old fav',messages:[{role:'user',content:'b'}]},
 {id:'fresh',createdAt:Date.now()-86400000,updatedAt:Date.now()-86400000,favorite:false,title:'fresh',messages:[{role:'user',content:'c'}]}
],(history)=>{
 assert.equal(history.purge(30),1,'one expired non-favorite removed');
 const ids=[...history.list().map(r=>r.id)].sort();
 assert.deepEqual(ids,['fresh','old-fav'],'favorites and recent records survive');
 assert.equal(history.purge(0),0,'zero retention disables purging');
 assert.equal(history.purge(365),0,'nothing expires within a year');
}));

const { createSelectionGuard } = require('../src/main/selection-guard');
test('selection guard passes silently without a pending OCR correction', async () => {
 let rendererCalls = 0, nativeCalls = 0;
 const guard = createSelectionGuard({
  hasPendingCorrection: () => false,
  hasResultWindow: () => true,
  showResultWindow: () => {},
  askRenderer: () => { rendererCalls += 1; return Promise.resolve(true); },
  askNative: () => { nativeCalls += 1; return Promise.resolve(true); }
 });
 assert.equal(await guard.confirm(), true);
 assert.equal(rendererCalls, 0);
 assert.equal(nativeCalls, 0);
});
test('selection guard asks the result window and honors both answers', async () => {
 let shown = 0;
 const accept = createSelectionGuard({
  hasPendingCorrection: () => true,
  hasResultWindow: () => true,
  showResultWindow: () => { shown += 1; },
  askRenderer: () => Promise.resolve(true),
  askNative: () => Promise.resolve(false)
 });
 assert.equal(await accept.confirm(), true);
 assert.equal(shown, 1, 'the result window is raised so the user sees the question');
 const decline = createSelectionGuard({
  hasPendingCorrection: () => true,
  hasResultWindow: () => true,
  showResultWindow: () => {},
  askRenderer: () => Promise.resolve(false),
  askNative: () => Promise.resolve(true)
 });
 assert.equal(await decline.confirm(), false);
});
test('selection guard aborts when the result window never replies', async () => {
 const guard = createSelectionGuard({
  hasPendingCorrection: () => true,
  hasResultWindow: () => true,
  showResultWindow: () => {},
  askRenderer: () => new Promise(() => {}),
  askNative: () => Promise.resolve(true),
  timeoutMs: 25
 });
 assert.equal(await guard.confirm(), false, 'an unanswered guard must not allow discarding');
});
test('selection guard falls back to a native prompt without a result window', async () => {
 let nativeCalls = 0;
 const guard = createSelectionGuard({
  hasPendingCorrection: () => true,
  hasResultWindow: () => false,
  showResultWindow: () => {},
  askRenderer: () => Promise.resolve(true),
  askNative: () => { nativeCalls += 1; return Promise.resolve(true); }
 });
 assert.equal(await guard.confirm(), true);
 assert.equal(nativeCalls, 1);
});
test('selection guard treats a broken renderer reply as a refusal', async () => {
 const guard = createSelectionGuard({
  hasPendingCorrection: () => true,
  hasResultWindow: () => true,
  showResultWindow: () => {},
  askRenderer: () => Promise.reject(new Error('contents gone')),
  askNative: () => Promise.resolve(true)
 });
 assert.equal(await guard.confirm(), false);
});

test('result window CSS carries no pre-migration hardcoded colors or stray sizes', () => {
 const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'result.css'), 'utf8');
 for (const banned of ['rgba(11, 17, 25', '125, 211, 252', '251, 113, 133', 'rgba(3, 7, 12', 'rgba(3, 6, 10', '148, 178, 208']) {
  assert.ok(!css.includes(banned), `result.css still contains ${banned}`);
 }
 for (const match of css.matchAll(/font-size:\s*([0-9]+(?:\.[0-9]+)?)px/g)) {
  assert.ok(parseFloat(match[1]) >= 10, `result.css hardcodes sub-auxiliary ${match[0].trim()}`);
 }
 for (const radius of ['border-radius: 5px', 'border-radius: 7px', 'border-radius: 9px']) {
  assert.ok(!css.includes(radius), `result.css still hardcodes ${radius}`);
 }
});

test('font window CSS carries no tactical-terminal remnants', () => {
 const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'font.css'), 'utf8');
 for (const banned of ['229, 180, 90', 'clip-path', 'border-radius: 0', 'border-radius:0', '#0c1015', '#080b0e', '#060809', '#040607', '#0b0f13', '125, 211, 252', '251, 113, 133', 'repeating-linear-gradient']) {
  assert.ok(!css.includes(banned), `font.css still contains ${banned}`);
 }
 for (const match of css.matchAll(/font-size:\s*([0-9]+(?:\.[0-9]+)?)px/g)) {
  assert.ok(parseFloat(match[1]) >= 10, `font.css hardcodes sub-auxiliary ${match[0].trim()}`);
 }
});

test('generated theme.css is in sync with design-tokens.yaml', () => {
 const { renderTheme, loadTokens } = require('../scripts/build-theme');
 const generated = renderTheme(loadTokens());
 const onDisk = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'theme.css'), 'utf8');
 assert.equal(onDisk, generated, 'run `npm run build:tokens` after editing design-tokens.yaml');
});

test('fenced code blocks render a copy action at the top right', () => {
 const context = { window: {}, console };
 vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'markdown.js'), 'utf8'), context);
 const { render } = context.window.FloatAskMarkdown;
 const html = render('```python\nscores = query @ key.transpose(-2, -1)\n```');
 assert.ok(html.includes('class="code-block"'), 'fenced code wraps in a code block');
 assert.ok(html.includes('data-lang="python"'), 'the block keeps the language');
 assert.ok(html.includes('class="code-copy"'), 'the block carries a copy button');
 assert.ok(html.includes('language-python'), 'the code keeps its language class');
 assert.ok(html.includes('scores = query @ key.transpose(-2, -1)'), 'code content is preserved');
 const bare = render('```\nplain line\n```');
 assert.ok(bare.includes('class="code-copy"'), 'blocks without a language still offer copying');
 assert.ok(bare.includes('plain line'), 'bare fence content is preserved');
});

test('no production source requires the dev-only toolchain', () => {
 // The packaged app excludes scripts/, tests/ and devDependencies (yaml),
 // so a runtime require of any of them breaks only in the package.
 const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
 });
 const srcRoot = path.join(__dirname, '..', 'src');
 for (const file of walk(srcRoot).filter(name => name.endsWith('.js'))) {
  const source = fs.readFileSync(file, 'utf8');
  const relative = path.relative(srcRoot, file);
  assert.ok(!/require\((['"])\.\.\/\.\.\/scripts\//.test(source), `${relative} must not require scripts/ (excluded from the package)`);
  assert.ok(!/require\((['"])yaml\1\)/.test(source), `${relative} must not require the yaml devDependency`);
 }
});
test('main-process design constants mirror the token source', () => {
 // The module ships as literals (the packaged app excludes the YAML
 // toolchain), so this test is the runtime reconciliation against the
 // token source on every development run.
 const { loadTokens, DEFAULT_TOKENS_PATH } = require('../scripts/build-theme');
 const tokens = loadTokens(DEFAULT_TOKENS_PATH);
 const constants = require('../src/main/design-constants');
 assert.deepEqual(constants.ANSWER_EXPANDED_SIZE, [...tokens.components.answerWindow.expandedSize], 'expanded answer size comes from the tokens');
 assert.deepEqual(constants.ANSWER_COMPACT_SIZE, [...tokens.components.answerWindow.compactSize], 'compact answer size comes from the tokens');
 assert.deepEqual(constants.CAPSULE_EXPANDED, [...tokens.components.toolbar.expandedSize], 'toolbar expanded size comes from the tokens');
 assert.equal(constants.TOOLBAR_PRIMARY_RADIUS, tokens.components.toolbar.primaryRadius, 'capsule primary radius comes from the tokens');
 assert.equal(constants.TOOLBAR_COLLAPSED_RADIUS, tokens.components.toolbar.collapsedOuterRadius, 'capsule collapsed radius comes from the tokens');
 assert.equal(constants.DENSITY.compact, tokens.readingDensity.compact, 'compact density factor comes from the tokens');
 assert.equal(constants.DENSITY.relaxed, tokens.readingDensity.relaxed, 'relaxed density factor comes from the tokens');
 // window-geometry stays vm-pure for its own suite; these guards keep its
 // literals honest against the token source.
 const geometry = require('../src/main/window-geometry');
 assert.deepEqual(geometry.CAPSULE_EXPANDED, constants.CAPSULE_EXPANDED, 'window-geometry stays in sync with the tokens');
 assert.deepEqual(geometry.HALF_CAPSULE_VERTICAL, constants.CAPSULE_COLLAPSED_VERTICAL, 'collapsed vertical capsule in sync');
 assert.deepEqual(geometry.HALF_CAPSULE_HORIZONTAL, constants.CAPSULE_COLLAPSED_HORIZONTAL, 'collapsed horizontal capsule in sync');
});

test('portable packaging excludes internal design and agent workspaces', () => {
 const script = require('../package.json').scripts.pack;
 const match = script.match(/--ignore="([^"]+)"/);
 assert.ok(match, 'the pack script declares an ignore rule');
 const ignore = new RegExp(match[1]);
 for (const entry of ['/design-mockups', '/.superpowers', '/.design-reference']) {
  assert.ok(ignore.test(entry), `${entry} must not ship in app.asar`);
 }
 for (const entry of ['/src', '/resources', '/package.json']) {
  assert.ok(!ignore.test(entry), `${entry} remains in the application package`);
 }
});

test('collapsed result and translation cards suppress their clipped floating shadow', () => {
 for (const name of ['result', 'translate']) {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', `${name}.css`), 'utf8');
  assert.match(css, /body\.collapsed \.card\s*\{[^}]*box-shadow:\s*none/, `${name} removes the shadow in its collapsed window`);
 }
});
