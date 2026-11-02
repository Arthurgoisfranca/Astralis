#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const built = process.argv.includes('--built');
const problems = [];
const file = name => path.join(root, name);
function read(name) {
  try { return fs.readFileSync(file(name), 'utf8'); }
  catch { problems.push(`Arquivo ausente: ${name}`); return ''; }
}
function json(name) {
  const contents = read(name);
  if (!contents.trim()) { problems.push(`${name} está vazio.`); return {}; }
  try { const object = JSON.parse(contents); if (!object || typeof object !== 'object' || Array.isArray(object)) throw Error('esperado objeto'); return object; }
  catch (e) { problems.push(`${name} não contém JSON válido: ${e.message}`); return {}; }
}
function checkHtml(name, opts = {}) {
  const contents = read(name);
  if (!/<!doctype\s+html\b/i.test(contents)) problems.push(`${name} não começa com DOCTYPE HTML. Pode ter sido substituído pelo package.json.`);
  if (!/<html\b[^>]*>/i.test(contents) || !/<div\s+id=["']root["']/i.test(contents)) problems.push(`${name} não contém a estrutura React (#root).`);
  if (opts.source && !/src\s*=\s*["']\/src\/main\.jsx["']/.test(contents)) problems.push(`${name} não referencia /src/main.jsx.`);
  if (opts.built && (!/\/assets\/[^"']+\.js/.test(contents))) problems.push(`${name} não referencia o bundle JavaScript compilado de /assets/.`);
}
function main() {
  const pkg = json('package.json');
  const lock = json('package-lock.json');
  const config = json('tsconfig.json');
  const manifest = json('public/manifest.json');
  checkHtml('index.html', {source:true});
  if (!pkg.scripts?.build || !pkg.scripts?.start || !pkg.dependencies?.react || !pkg.devDependencies?.vite) problems.push('package.json incompleto (scripts/build/start ou React/Vite).');
  if (lock.lockfileVersion < 1 || lock.packages?.['']?.name !== pkg.name || lock.packages?.['']?.version !== pkg.version) problems.push('package-lock.json não corresponde ao package.json.');
  const depNames = ['dependencies','devDependencies'];
  for (const section of depNames) {
    for (const [dep, version] of Object.entries(pkg[section] || {})) {
      if (lock.packages?.['']?.[section]?.[dep] !== version) problems.push(`Dependência divergente no lockfile: ${dep}`);
    }
  }
  if (!config.compilerOptions || !Array.isArray(config.include)) problems.push('tsconfig.json incompleto.');
  if (manifest.name !== 'Mesa & Dados — RPG Online' || !Array.isArray(manifest.icons)) problems.push('public/manifest.json incompleto.');
  for (const name of ['vite.config.js','src/main.jsx','src/AstralisApp.jsx','src/AudioCenter.jsx','src/AccountPanel.jsx','src/CharacterStudio.jsx','src/CampaignModules.jsx','src/astralisTheme.css','server.js','server/repositories/roomRepository.js','public/sw.js']) {
    if (read(name).trim().length < 100) problems.push(`${name} está vazio ou incompleto.`);
  }
  if (built) checkHtml('dist/index.html', {built:true});
  if (problems.length) {
    console.error('\n❌ Mesa & Dados: estrutura do projeto inválida.\n');
    for (const item of [...new Set(problems)]) console.error(' • '+item);
    console.error('\nCorrija os arquivos do GitHub a partir do ZIP completo. NÃO sobrescreva index.html com JSON.\n');
    process.exitCode = 1;
  } else console.log(`✅ Estrutura do Mesa & Dados validada (${built ? 'fonte + build' : 'fonte'}).`);
}
main();
