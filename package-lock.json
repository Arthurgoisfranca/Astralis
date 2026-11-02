const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root,file),'utf8');
const ts = require('typescript');

test('JSX/TS parse without syntax errors', () => {
  for (const name of ['src/AstralisApp.jsx','src/AccountPanel.jsx','src/AudioCenter.jsx','src/SystemConsultations.jsx','src/CampaignModules.jsx','src/CharacterStudio.jsx','src/main.jsx','src/domain/sheetCalculations.ts']) {
    const result=ts.transpileModule(read(name), {fileName:name,reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}});
    assert.equal(result.diagnostics.length,0,`${name} ${result.diagnostics.map(e=>e.messageText).join(' | ')}`);
  }
});
test('character editor inputs and skill changes call setForm, not undefined set', () => {
  const source=read('src/CharacterStudio.jsx');
  assert.match(source,/function setStat\(key,value\)\{setForm\(/);
  assert.doesNotMatch(source,/\bset\(old=>/);
  assert.match(source,/type="checkbox" checked=/);
});
test('audio player remains mounted outside conditional tab', () => {
  const app=read('src/AstralisApp.jsx');
  assert.match(app,/\<AudioCenter .*visible=\{tab === "music"\}/);
  assert.match(read('src/AudioCenter.jsx'),/\<audio ref=\{audioRef\}/);
  for (const action of ['music:playlist','music:control','setQueue','chooseNext','commitSeek']) assert.ok(read('src/AudioCenter.jsx').includes(action));
});
test('server enforces GM for playlist and consults and isolates private journals', () => {
  const s=read('server.js');
  assert.match(s,/case "music:playlist": requireGM\(socket\)/);
  assert.match(s,/case "system:consultation:save": \{ requireGM\(socket\)/);
  assert.match(s,/state\.journal\.filter\(item =>/);
  assert.match(read("server/repositories/roomRepository.js"),/current_map_url/);
});
test('PWA manifest has installable icons and scoped navigation', () => {
  const m=JSON.parse(read('public/manifest.json'));
  assert.equal(m.display,'standalone');
  assert.equal(m.scope,'/');
  for(const icon of m.icons)assert.ok(fs.existsSync(path.join(root,'public',icon.src)));
});
