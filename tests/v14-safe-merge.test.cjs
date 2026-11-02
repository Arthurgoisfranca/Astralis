const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root,name),'utf8');

test('PDF export uses pdf-lib document without shadowing browser document', () => {
 const source = read('src/CampaignModules.jsx');
 assert.match(source,/const pdfDocument = await PDFDocument\.load\(buffer\), form = pdfDocument\.getForm\(\)/);
 assert.match(source,/const bytes = await pdfDocument\.save\(\)/);
 assert.match(source,/document\.createElement\("a"\)/);
 assert.doesNotMatch(source,/const document = await PDFDocument\.load/);
});
test('GM journal keeps the same save event while fields remain associated with labels', () => {
 const source = read('src/CampaignModules.jsx');
 assert.match(source,/className="writing-field">Notas privadas do Mestre<textarea/);
 assert.match(source,/className="writing-field">Resumo compartilhado<textarea/);
 assert.match(source,/send\("notes:save", \{ shared, private: privateText \}\)/);
 assert.match(source,/send\("journal:save", entry\)/);
});
test('Map preview fits image ratio and does not change persisted payload', () => {
 const source = read('src/CampaignModules.jsx');
 assert.match(source,/const \[mapAspect, setMapAspect\]/);
 assert.match(source,/const fitted =/);
 assert.match(source,/width:fitted\.width, height:fitted\.height/);
 assert.match(source,/send\("map:update", \{ image, name, visible: value\.visible, tokens, measurements, gridFeet \}\)/);
});
test('Global mini-player and independent queue without unmounting audio', () => {
 const source = read('src/AudioCenter.jsx');
 assert.equal((source.match(/<audio ref=\{audioRef\}/g)||[]).length,1);
 assert.match(source,/className="audio-mini-controls"/);
 assert.match(source,/\{drawer && <div className="audio-queue"/);
 assert.match(source,/setDrawer\(false\)/);
});
test('no .env and no generated folders shipped', () => {
 assert.equal(fs.existsSync(path.join(root,'.env')),false);
 assert.equal(fs.existsSync(path.join(root,'dist')),false);
});
