const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
test('index.html is HTML and not package.json',()=>{
  const data=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.match(data,/<!doctype\s+html/i);
  assert.match(data,/<div id="root"><\/div>/);
  assert.match(data,/src="\/src\/main\.jsx"/);
  assert.doesNotMatch(data,/^\s*\{\s*"name"\s*:/);
});
test('configuration files contain valid root JSON structures',()=>{
  const pkg=require('../package.json');
  const lock=require('../package-lock.json');
  const tsconfig=require('../tsconfig.json');
  assert.equal(pkg.version,lock.packages[''].version);
  assert.equal(tsconfig.compilerOptions.noEmit,true);
});
test('production server and service worker guard against invalid HTML',()=>{
  const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
  const worker=fs.readFileSync(path.join(root,'public/sw.js'),'utf8');
  assert.match(server,/dist\/index\.html não é um build Vite válido/);
  assert.match(server,/Cache-Control/);
  assert.match(worker,/isValidHtml/);
  assert.match(worker,/cache:'no-store'/);
});
