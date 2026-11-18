import { ABILITIES, ABILITY_KEYS, ARMOR, BACKGROUNDS, CLASSES, LANGUAGES, ORIGIN_FEATS, SKILLS, SKILL_KEYS, SPECIES, SPELLS, STYLES, TOOLS, WEAPONS } from './dnd2024Catalog.mjs';
import { dnd5 } from './diceEngines.mjs';
import { die, rollExpression } from './manualRules.mjs';

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
export const POINT_COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
export const BUILDER_STEPS = ['Classe', 'Espécie', 'Antecedente', 'Atributos', 'Talentos', 'Perícias', 'Magias', 'Equipamento', 'Sobre'];
export const DATA_LIMIT = 2400;
export const modifier = score => Math.floor((score - 10) / 2);
export const proficiency = level => 2 + Math.floor((Math.max(1, level) - 1) / 4);
export const signedNumber = value => value >= 0 ? `+${value}` : String(value);
export const bounded = (value, min, max) => Math.max(min, Math.min(max, Math.trunc(Number(value) || 0)));
const unique = values => [...new Set(values)];
const has = (object, key) => Object.hasOwn(object, key);
const objectOrEmpty = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const shortText = value => typeof value === 'string' ? value.slice(0, 80) : '';
export const pickList = (values, options) => Array.isArray(values) ? unique(values.filter(value => options.includes(value))) : [];

export function readRecord(value) {
  try {
    const data = JSON.parse(value);
    return objectOrEmpty(data);
  } catch { return {}; }
}

export function classEntry(id) {
  return { id, level: 1, subclass: '', order: '', style: '', skills: [], tools: [], expertise: [], mastery: [] };
}

export function emptyBuild() {
  return {
    version: 1, classes: [], species: '', lineage: '', speciesSkill: '', speciesAbility: '', humanFeat: '', background: '', custom: {},
    scoreMethod: 'standard', scores: {}, rolled: [], bonusMode: 'split', bonuses: [], feats: {},
    magicAbilities: {}, backgroundTool: '', skilled: [], languages: [], classKit: '', backgroundKit: '', focus: '',
  };
}

export function readBuild(value) {
  const parsed = readRecord(value);
  if (parsed.version !== 1 || !Array.isArray(parsed.classes)) return emptyBuild();
  let remaining = 20;
  const classes = [];
  for (const item of parsed.classes) {
    if (!item || !(has(CLASSES, item.id) || item.id === 'custom') || classes.some(row => row.id === item.id) || !remaining) continue;
    const level = bounded(item.level, 1, remaining);
    classes.push({
      ...classEntry(item.id), level, subclass: shortText(item.subclass), order: shortText(item.order), style: shortText(item.style),
      skills: pickList(item.skills, SKILL_KEYS), expertise: pickList(item.expertise, SKILL_KEYS),
      mastery: pickList(item.mastery, Object.keys(WEAPONS)), tools: pickList(item.tools, TOOLS),
      ...(item.id === 'custom' ? { name: shortText(item.name), hitDie: Number(item.hitDie), customSaves: pickList(item.customSaves, ABILITY_KEYS) } : {}),
    });
    remaining -= level;
  }
  const result = emptyBuild();
  for (const [key, fallback] of Object.entries(result)) if (typeof fallback === 'string') result[key] = shortText(parsed[key]) || fallback;
  const custom = objectOrEmpty(parsed.custom);
  return {
    ...result, classes,
    custom: { backgroundName: shortText(custom.backgroundName), speciesName: shortText(custom.speciesName),
      speed: bounded(custom.speed ?? 30, 0, 120), feat: shortText(custom.feat), tool: shortText(custom.tool),
      abilities: pickList(custom.abilities, ABILITY_KEYS), skills: pickList(custom.skills, SKILL_KEYS) },
    scores: Object.fromEntries(ABILITY_KEYS.filter(key => Number.isInteger(Number(parsed.scores?.[key])) && Number(parsed.scores[key]) > 0)
      .map(key => [key, Number(parsed.scores[key])])),
    rolled: Array.isArray(parsed.rolled) ? parsed.rolled.slice(0, 6).filter(row =>
      row && Array.isArray(row.dice) && row.dice.length === 4 && row.dice.every(face => Number.isInteger(face) && face >= 1 && face <= 6))
      .map(row => ({ dice: row.dice, total: row.dice.reduce((sum, face) => sum + face, 0) - Math.min(...row.dice) })) : [],
    bonuses: Array.isArray(parsed.bonuses) ? parsed.bonuses.slice(0, 3).map(shortText) : [],
    feats: Object.fromEntries(Object.entries(objectOrEmpty(parsed.feats)).filter(([id]) => /^(\w+)-(\d{1,2})$/.test(id))
      .map(([id, row]) => [id, { name: shortText(row?.name), label: shortText(row?.label), values: pickList(row?.values, ABILITY_KEYS) }])),
    magicAbilities: Object.fromEntries(Object.entries(objectOrEmpty(parsed.magicAbilities)).filter(([feat, key]) => ORIGIN_FEATS.includes(feat) && ABILITY_KEYS.includes(key))),
    skilled: pickList(parsed.skilled, [...SKILL_KEYS, ...TOOLS]),
    languages: pickList(parsed.languages, LANGUAGES).slice(0, 2),
  };
}

export function classData(entry) {
  if (entry?.id === 'custom') return {
    name: String(entry.name || 'Classe personalizada'), hitDie: [6, 8, 10, 12].includes(Number(entry.hitDie)) ? Number(entry.hitDie) : 8,
    primary: [], saves: pickList(entry.customSaves, ABILITY_KEYS).slice(0, 2), skills: [2, SKILL_KEYS], weapons: 'simple', armor: [],
    rows: [], kits: [{ coins: 0, items: [] }], subclass: ['', {}],
  };
  return entry && has(CLASSES, entry.id) ? CLASSES[entry.id] : null;
}

export const levelRow = entry => classData(entry)?.rows[entry.level - 1] ?? { features: [] };
export function featureLevels(entry) {
  const data = classData(entry);
  if (!data) return [];
  return Array.from({ length: data.rows.length || entry.level }, (_, index) => {
    const base = data.rows[index]?.features ?? [];
    const extra = entry.subclass === data.subclass[0] ? data.subclass[1][index + 1] ?? [] : [];
    return { level: index + 1, features: [...base, ...extra] };
  });
}

export function newAbilityRolls(random = Math.random) {
  return Array.from({ length: 6 }, () => {
    const dice = Array.from({ length: 4 }, () => die(6, random));
    return { dice, total: dice.reduce((total, face) => total + face, 0) - Math.min(...dice) };
  });
}

function chosenBackground(build) {
  if (has(BACKGROUNDS, build.background)) return BACKGROUNDS[build.background];
  if (build.background !== 'custom') return null;
  return {
    name: String(build.custom.backgroundName || ''), abilities: pickList(build.custom.abilities, ABILITY_KEYS).slice(0, 3),
    skills: pickList(build.custom.skills, SKILL_KEYS).slice(0, 2), feat: build.custom.feat || '',
    tool: String(build.custom.tool || ''), kits: [{ items: [], coins: 50 }],
  };
}

function chosenSpecies(build) {
  if (has(SPECIES, build.species)) return SPECIES[build.species];
  if (build.species !== 'custom') return null;
  return { name: String(build.custom.speciesName || ''), speed: bounded(build.custom.speed, 0, 120), traits: [] };
}

export function featSlots(build) {
  return build.classes.flatMap(entry => featureLevels(entry).filter(row => row.level <= entry.level)
    .flatMap(row => {
      const epic = row.features.includes('Epic Boon');
      return epic || row.features.includes('Ability Score Improvement')
        ? [{ id: `${entry.id}-${row.level}`, name: classData(entry).name, level: row.level, epic }] : [];
    }));
}

function abilityValues(build, background) {
  const scores = Object.fromEntries(ABILITY_KEYS.map(key => [key, bounded(build.scores[key] ?? 10, 1, 20)]));
  const assigned = ABILITY_KEYS.map(key => Number(build.scores[key]));
  const validIntegers = assigned.every(Number.isInteger);
  const pointCost = assigned.reduce((total, value) => total + (POINT_COST[value] ?? 0), 0);
  const pool = build.scoreMethod === 'standard' ? STANDARD_ARRAY : build.rolled.map(row => row.total);
  const counts = list => list.slice().sort((a, b) => a - b).join(',');
  const methodOk = ['standard', 'point', 'roll', 'manual'].includes(build.scoreMethod) && validIntegers && (
    build.scoreMethod === 'manual' ? assigned.every(score => score >= 1 && score <= 20)
      : build.scoreMethod === 'point' ? assigned.every(score => has(POINT_COST, score)) && pointCost <= 27
        : pool.length === 6 && counts(pool) === counts(assigned));
  const eligible = background?.abilities ?? [];
  const bonuses = pickList(build.bonuses, eligible);
  const bonusPoints = build.bonusMode === 'three' ? [1, 1, 1] : [2, 1];
  const bonusOk = eligible.length === 3 && bonuses.length === bonusPoints.length &&
    bonuses.every((ability, index) => scores[ability] + bonusPoints[index] <= 20);
  if (bonusOk) bonuses.forEach((ability, index) => { scores[ability] += bonusPoints[index]; });
  return { scores, methodOk, bonusOk, pointCost };
}

export function skillChoiceGroups(build, background = chosenBackground(build)) {
  const locked = new Set(background?.skills ?? []);
  const groups = [];
  function add(id, title, options, count, selected) {
    const allowed = options.filter(name => !locked.has(name));
    const available = allowed.length >= count ? allowed : SKILL_KEYS.filter(name => !locked.has(name));
    const values = pickList(selected, available).slice(0, count);
    values.forEach(name => locked.add(name));
    groups.push({ id, title, count, allowed: available, values });
  }
  build.classes.forEach((entry, index) => {
    const data = classData(entry);
    const count = index === 0 ? data.skills[0] : data.multiclassSkills ?? 0;
    if (count) add(entry.id, data.name, data.skills[1], count, entry.skills);
  });
  if (build.species === 'human') add('species', 'Humano', SKILL_KEYS, 1, [build.speciesSkill]);
  if (build.species === 'elf') add('species', 'Sentidos aguçados', ['Insight', 'Perception', 'Survival'], 1, [build.speciesSkill]);
  return groups;
}

const skillNamesFor = (choices, background) => unique([...(background?.skills ?? []), ...choices.flatMap(group => group.values)]);
const featOrigins = build => unique([chosenBackground(build)?.feat, build.species === 'human' ? build.humanFeat : ''].filter(Boolean));
const magicOrigin = feat => ({
  'Magic Initiate (Cleric)': 'cleric', 'Magic Initiate (Druid)': 'druid', 'Magic Initiate (Wizard)': 'wizard',
})[feat];
export const isInnateCaster = build => ['elf', 'gnome', 'tiefling'].includes(build.species);
const innateSpells = {
  Drow: ['Dancing Lights', 'Faerie Fire', 'Darkness'], 'Alto elfo': ['Prestidigitation', 'Detect Magic', 'Misty Step'],
  'Elfo da floresta': ['Druidcraft', 'Longstrider', 'Pass without Trace'],
  'Gnomo da floresta': ['Minor Illusion', 'Speak with Animals'], 'Gnomo das rochas': ['Mending', 'Prestidigitation'],
  Abissal: ['Poison Spray', 'Ray of Sickness', 'Hold Person'], Ctônico: ['Chill Touch', 'False Life', 'Ray of Enfeeblement'],
  Infernal: ['Fire Bolt', 'Hellish Rebuke', 'Darkness'],
};
const dragonResistance = { Preto: 'Ácido', Azul: 'Eletricidade', Latão: 'Fogo', Bronze: 'Eletricidade', Cobre: 'Ácido',
  Ouro: 'Fogo', Verde: 'Veneno', Vermelho: 'Fogo', Prata: 'Frio', Branco: 'Frio' };
const subclassSpells = {
  cleric: { 3: ['Aid', 'Bless', 'Cure Wounds', 'Lesser Restoration'], 5: ['Mass Healing Word', 'Revivify'], 7: ['Aura of Life', 'Death Ward'], 9: ['Greater Restoration', 'Mass Cure Wounds'] },
  paladin: { 3: ['Protection from Evil and Good', 'Shield of Faith'], 5: ['Aid', 'Zone of Truth'], 9: ['Beacon of Hope', 'Dispel Magic'], 13: ['Freedom of Movement', 'Guardian of Faith'], 17: ['Commune', 'Flame Strike'] },
  sorcerer: { 3: ['Alter Self', 'Chromatic Orb', 'Command', 'Dragon’s Breath'], 5: ['Fear', 'Fly'], 7: ['Arcane Eye', 'Charm Monster'], 9: ['Legend Lore', 'Summon Dragon'] },
  warlock: { 3: ['Burning Hands', 'Command', 'Scorching Ray', 'Suggestion'], 5: ['Fireball', 'Stinking Cloud'], 7: ['Fire Shield', 'Wall of Fire'], 9: ['Geas', 'Insect Plague'] },
};

const maxCircle = slots => slots.reduce((max, count, index) => count ? index + 1 : max, 0);
const spellGroup = (id, title, count, catalog, min, max, ability, exclude = [], optional = false) => ({
  id, title, count, min, max, ability, optional,
  options: Object.values(SPELLS).filter(spell => spell.classes.includes(catalog) &&
    spell.level >= min && spell.level <= max && !exclude.includes(spell.name)),
});

export function spellChoices(build, level) {
  const groups = [], granted = [];
  for (const entry of build.classes) {
    const data = classData(entry), row = levelRow(entry);
    if (!data.magic) continue;
    const [caster, ability] = data.magic;
    const addGranted = name => granted.push({ name, ability, source: data.name, id: entry.id });
    const fixed = [
      ...(entry.subclass === data.subclass[0] ? Object.entries(subclassSpells[entry.id] ?? {})
        .filter(([level]) => Number(level) <= entry.level).flatMap(([, names]) => names) : []),
      ...(entry.id === 'ranger' ? ["Hunter’s Mark"] : []),
      ...(entry.id === 'paladin' && entry.level >= 2 ? ['Divine Smite'] : []),
    ];
    unique(fixed).forEach(addGranted);
    if (row.cantrips) groups.push(spellGroup(`${entry.id}:cantrips`, `${data.name} · truques`, row.cantrips, entry.id, 0, 0, ability));
    if (entry.id === 'cleric' && entry.order === 'thaumaturge' || entry.id === 'druid' && entry.order === 'magician') {
      groups.push(spellGroup(`${entry.id}:order`, `${data.name} · truque da ordem`, 1, entry.id, 0, 0, ability));
    }
    const circle = caster === 'pact' ? row.pactLevel : maxCircle(row.slots ?? []);
    if (row.prepared && circle) groups.push(spellGroup(`${entry.id}:prepared`, `${data.name} · magias preparadas`, row.prepared, entry.id, 1, circle, ability, fixed));
    if (caster === 'pact') [11, 13, 15, 17].forEach((threshold, index) => {
      if (entry.level >= threshold) groups.push(spellGroup(`warlock:arcanum${index + 6}`, `Arcanum Místico · círculo ${index + 6}`, 1, 'warlock', index + 6, index + 6, ability));
    });
  }
  for (const feat of featOrigins(build)) {
    const caster = magicOrigin(feat);
    if (caster) {
      const ability = build.magicAbilities[feat] || 'wisdom';
      groups.push(spellGroup(`${caster}:initiate0`, `${feat} · truques`, 2, caster, 0, 0, ability));
      groups.push(spellGroup(`${caster}:initiate1`, `${feat} · magia de 1º círculo`, 1, caster, 1, 1, ability));
    }
  }
  if (isInnateCaster(build)) {
    const names = innateSpells[build.lineage] ?? [];
    const thresholds = build.species === 'gnome' ? [1, 1] : [1, 3, 5];
    const add = (name, index) => granted.push({
      name, ability: build.speciesAbility || 'wisdom', source: SPECIES[build.species].name, id: 'species',
      innate: index > 0 && build.lineage !== 'Gnomo das rochas' ? (build.lineage === 'Gnomo da floresta' ? 'pb' : 1) : 0,
    });
    names.forEach((name, index) => { if (level >= thresholds[index]) add(name, index); });
    if (build.species === 'tiefling' && level > 0) add('Thaumaturgy', 0);
  }
  return { groups, granted };
}

export function selectionsFor(groups, choices) {
  const seen = new Set();
  return Object.fromEntries(groups.map(group => {
    const isClassCantrip = /:(cantrips|order)$/.test(group.id);
    const origin = group.id.split(':')[0];
    const selected = pickList(choices[group.id], group.options.map(spell => spell.name))
      .filter(name => !isClassCantrip || !seen.has(`${origin}:${name}`)).slice(0, group.count);
    if (isClassCantrip) selected.forEach(name => seen.add(`${origin}:${name}`));
    return [group.id, selected];
  }));
}

function spellSlots(entries) {
  const casters = entries.filter(entry => ['full', 'half'].includes(classData(entry).magic?.[0]));
  if (casters.length <= 1) return casters.length ? levelRow(casters[0]).slots : [];
  const casterLevel = casters.reduce((sum, entry) => sum + (classData(entry).magic[0] === 'half' ? Math.ceil(entry.level / 2) : entry.level), 0);
  return CLASSES.cleric.rows[casterLevel - 1].slots;
}

function startingKit(build, starting, background) {
  const selections = [
    [starting?.kits, build.classKit], [background?.kits, build.backgroundKit],
  ];
  const equipment = new Map();
  let coins = 0, needsFocus = false;
  for (const [kits, option] of selections) {
    if (!Object.hasOwn(kits ?? [], option)) continue;
    const kit = kits[option];
    coins += kit.coins;
    for (const [item, count] of kit.items) {
      if (item === 'Holy Symbol') needsFocus = true;
      const name = item === 'Holy Symbol' && build.focus ? build.focus
        : item === 'Gaming Set' && build.backgroundTool ? build.backgroundTool
          : ['Musical Instrument', 'Chosen Tool'].includes(item) && build.classes[0]?.tools?.[0] ? build.classes[0].tools[0] : item;
      equipment.set(name, (equipment.get(name) ?? 0) + count);
    }
  }
  return { items: [...equipment], coins, needsFocus };
}

export function armorClass(armor, shield, modifiers, entries, armorTraining) {
  const [base, type] = ARMOR[armor] ?? [];
  let total = 10 + modifiers.dexterity;
  if (type) total = base + (type === 'heavy' ? 0 : type === 'medium' ? Math.min(2, modifiers.dexterity) : modifiers.dexterity);
  else {
    const defense = entries.find(entry => ['monk', 'barbarian'].includes(entry.id));
    if (defense?.id === 'barbarian') total += modifiers.constitution;
    if (defense?.id === 'monk' && !shield) total += modifiers.wisdom;
  }
  if (shield && armorTraining.has('shield')) total += 2;
  if (type && entries.some(entry => entry.style === 'Defense')) total += 1;
  return total;
}

export function buildDetails(build, spellSelections, name = '') {
  const entries = build.classes;
  const starting = classData(entries[0]);
  const species = chosenSpecies(build), background = chosenBackground(build);
  const level = entries.reduce((sum, entry) => sum + entry.level, 0);
  const pb = proficiency(level);
  const abilities = abilityValues(build, background);
  const { scores } = abilities;
  const origins = featOrigins(build);
  const feats = featSlots(build);
  const featIssues = [];
  const gainedFeats = new Set(origins);
  for (const slot of feats) {
    const choice = build.feats[slot.id];
    const points = choice?.name === 'Ability Score Improvement' ? [2] : [1];
    const picks = pickList(choice?.values, ABILITY_KEYS);
    if (choice?.name === 'Ability Score Improvement' && picks.length === 2) points.splice(0, 1, 1, 1);
    const allowed = slot.epic ? ['Boon of Fate', 'Boon of Combat Prowess', 'Ability Score Improvement', 'Custom'] : ['Ability Score Improvement', 'Grappler', 'Tough', 'Custom'];
    const requiresScores = ['Ability Score Improvement', 'Grappler', 'Boon of Fate', 'Boon of Combat Prowess'].includes(choice?.name);
    const name = choice?.name === 'Custom' ? choice.label?.trim() : choice?.name;
    if (!allowed.includes(choice?.name) || !name || name !== 'Ability Score Improvement' && gainedFeats.has(name) ||
      requiresScores && (picks.length !== points.length || picks.some((key, index) => scores[key] + points[index] > (choice.name.startsWith('Boon') ? 30 : 20))) ||
      choice?.name === 'Grappler' && (!['strength', 'dexterity'].includes(picks[0]) || Math.max(scores.strength, scores.dexterity) < 13)) {
      featIssues.push(`${slot.name} nível ${slot.level}: escolha um talento e resolva seus ajustes.`);
      continue;
    }
    gainedFeats.add(name);
    if (requiresScores) picks.forEach((key, index) => { scores[key] += points[index]; });
  }
  const modifiers = Object.fromEntries(ABILITY_KEYS.map(key => [key, modifier(scores[key])]));
  const skillGroups = skillChoiceGroups(build, background);
  const baseSkills = skillNamesFor(skillGroups, background);
  const baseTools = unique([background?.tool || build.backgroundTool, ...entries.flatMap(entry => [...(classData(entry).tools ?? []), ...(entry.tools ?? [])])].filter(Boolean));
  const skilled = origins.includes('Skilled') ? pickList(build.skilled, [...SKILL_KEYS, ...TOOLS].filter(key => !baseSkills.includes(key) && !baseTools.includes(key))).slice(0, 3) : [];
  const proficientSkills = unique([...baseSkills, ...skilled.filter(key => has(SKILLS, key))]);
  const expertiseGroups = entries.map(entry => {
    const count = entry.id === 'rogue' ? (entry.level >= 6 ? 4 : 2)
      : entry.id === 'bard' && entry.level >= 2 ? (entry.level >= 9 ? 4 : 2)
        : entry.id === 'ranger' && entry.level >= 2 ? 1 : 0;
    return { id: entry.id, count, values: pickList(entry.expertise, proficientSkills).slice(0, count) };
  }).filter(group => group.count);
  const expertise = unique(expertiseGroups.flatMap(group => group.values));
  const saves = entries.some(entry => entry.id === 'monk' && entry.level >= 14) ? ABILITY_KEYS : starting?.saves ?? [];
  const armorTraining = new Set(entries.flatMap((entry, index) => {
    const data = classData(entry);
    const proper = index === 0 ? data.armor : data.multiclassArmor ?? [];
    const extra = entry.id === 'cleric' && entry.order === 'protector' ? ['heavy']
      : entry.id === 'druid' && entry.order === 'warden' ? ['medium'] : [];
    return [...proper, ...extra];
  }));
  const weaponTraining = new Set(entries.map((entry, index) => {
    const data = classData(entry);
    if (entry.id === 'cleric' && entry.order === 'protector' || entry.id === 'druid' && entry.order === 'warden') return 'martial';
    return index === 0 ? data.weapons : data.multiclassWeapons ?? '';
  }));
  const equipment = startingKit(build, starting, background);
  const armor = equipment.items.find(([item]) => has(ARMOR, item))?.[0] ?? '';
  const shield = equipment.items.some(([item]) => item === 'Shield');
  const ac = armorClass(armor, shield, modifiers, entries, armorTraining);
  const alert = origins.includes('Alert') ? pb : 0;
  const tough = gainedFeats.has('Tough');
  const hp = Math.max(1, entries.reduce((sum, entry, index) => {
    const faces = classData(entry).hitDie;
    const first = index === 0 ? 1 : 0;
    return sum + first * Math.max(1, faces + modifiers.constitution) +
      (entry.level - first) * Math.max(1, faces / 2 + 1 + modifiers.constitution);
  }, (tough ? 2 : 0) * level + (species?.hpPerLevel ?? 0) * level +
    (entries.find(entry => entry.id === 'sorcerer' && entry.level >= 3 && entry.subclass === 'Draconic Sorcery')?.level ?? 0)));
  const speed = species?.speed ?? 30;
  const darkvision = build.species === 'elf' && build.lineage === 'Drow' ? 120 : species?.darkvision ?? 0;
  const spell = spellChoices(build, level);
  const selected = selectionsFor(spell.groups, spellSelections);
  const issues = Object.fromEntries(BUILDER_STEPS.map(step => [step, []]));
  if (!entries.length) issues.Classe.push('Escolha a classe inicial.');
  entries.forEach((entry, index) => {
    const data = classData(entry);
    if (entry.id === 'custom' && (!entry.name?.trim() || data.saves.length !== 2)) issues.Classe.push('Defina o nome e duas salvaguardas da classe personalizada.');
    if (entries.length > 1 && data.primary.length) {
      const qualifying = data.primary.map(key => scores[key] >= 13);
      if (!(data.either ? qualifying.some(Boolean) : qualifying.every(Boolean))) issues.Classe.push(`Multiclasse: confira os requisitos de ${data.name}.`);
    }
    if (entry.level >= 3 && entry.id !== 'custom' && !entry.subclass) issues.Classe.push(`${data.name}: escolha a subclasse.`);
    if ((entry.id === 'cleric' && !['protector', 'thaumaturge'].includes(entry.order)) ||
      (entry.id === 'druid' && !['warden', 'magician'].includes(entry.order))) issues.Classe.push(`${data.name}: escolha a ordem.`);
    if ((entry.id === 'fighter' || ['paladin', 'ranger'].includes(entry.id) && entry.level >= 2) && !STYLES.includes(entry.style)) issues.Classe.push(`${data.name}: escolha um estilo de luta.`);
    if (masteryCapacity(entry) > pickList(entry.mastery, Object.keys(WEAPONS)).length) issues.Classe.push(`${data.name}: complete as maestrias.`);
    const toolCount = index === 0 ? data.toolPicks ?? 0 : entry.id === 'bard' ? 1 : 0;
    if (toolCount > (entry.tools?.length ?? 0)) issues.Perícias.push(`${data.name}: complete as ferramentas ou instrumentos.`);
  });
  if (!species?.name || species.lineages && !species.lineages.includes(build.lineage)) issues.Espécie.push('Escolha a espécie e a linhagem, quando aplicável.');
  if (isInnateCaster(build) && !['intelligence', 'wisdom', 'charisma'].includes(build.speciesAbility)) issues.Espécie.push('Escolha o atributo da magia inata.');
  if (!background?.name || background.abilities.length !== 3 || background.skills.length !== 2 || !background.feat) issues.Antecedente.push('Complete o antecedente.');
  if (!abilities.methodOk || !abilities.bonusOk) issues.Atributos.push('Distribua os seis atributos e os bônus de antecedente.');
  if (build.species === 'human' && !ORIGIN_FEATS.includes(build.humanFeat)) issues.Talentos.push('Escolha o talento de origem do Humano.');
  for (const feat of origins) if (magicOrigin(feat) && !['intelligence', 'wisdom', 'charisma'].includes(build.magicAbilities[feat])) issues.Talentos.push(`${feat}: escolha o atributo de conjuração.`);
  issues.Talentos.push(...featIssues);
  for (const group of skillGroups) if (group.values.length < group.count) issues.Perícias.push(`${group.title}: selecione ${group.count - group.values.length} perícia(s).`);
  for (const group of expertiseGroups) if (group.values.length < group.count) issues.Perícias.push(`${classData(entries.find(entry => entry.id === group.id)).name}: complete as especializações.`);
  if (background?.tools && !background.tools.includes(build.backgroundTool)) issues.Perícias.push('Escolha a ferramenta de antecedente.');
  if (origins.includes('Skilled') && skilled.length < 3) issues.Perícias.push('Skilled: complete as três proficiências.');
  for (const group of spell.groups) {
    const count = selected[group.id]?.length ?? 0;
    if (count < group.count) issues.Magias.push(`${group.title}: ${count}/${group.count}.`);
  }
  if (!starting?.kits[build.classKit] || !background?.kits[build.backgroundKit] || equipment.needsFocus && !build.focus) issues.Equipamento.push('Complete os pacotes iniciais e o símbolo sagrado, se houver.');
  if (!name.trim()) issues.Sobre.push('Informe o nome do personagem.');
  if (pickList(build.languages, LANGUAGES.filter(key => key !== 'Comum')).length !== 2) issues.Sobre.push('Escolha dois idiomas além do Comum.');
  const jackOfAllTrades = entries.some(entry => entry.id === 'bard' && entry.level >= 2);
  const archery = entries.some(entry => entry.style === 'Archery');
  const tools = [...baseTools, ...skilled.filter(key => TOOLS.includes(key))];
  const resistance = species?.resistance ?? (build.species === 'dragonborn' ? dragonResistance[build.lineage] : build.species === 'tiefling'
    ? { Abissal: 'Veneno', Ctônico: 'Necrótico', Infernal: 'Fogo' }[build.lineage] : undefined);
  const knowledgeBonus = Object.fromEntries(SKILL_KEYS.flatMap(skill => entries.flatMap(entry =>
    entry.id === 'cleric' && entry.order === 'thaumaturge' && ['Arcana', 'Religion'].includes(skill) ||
    entry.id === 'druid' && entry.order === 'magician' && ['Arcana', 'Nature'].includes(skill)
      ? [[skill, Math.max(1, modifiers.wisdom)]] : [])));
  return { level, pb, ...abilities, modifiers, skillGroups, proficientSkills, expertiseGroups, expertise, saves, armorTraining, weaponTraining, equipment,
    hp, ac, armor, shield, tools, baseSkills, baseTools, resistance, jackOfAllTrades, archery, knowledgeBonus,
    initiative: modifiers.dexterity + (alert || (jackOfAllTrades ? Math.floor(pb / 2) : 0)),
    speed: speed + (build.species === 'elf' && build.lineage === 'Elfo da floresta' ? 5 : 0),
    darkvision, species, background, origins, feats, ...spell, selected, slots: spellSlots(entries),
    pact: entries.filter(entry => entry.id === 'warlock').map(levelRow)[0],
    favoredEnemy: entries.filter(entry => entry.id === 'ranger').map(levelRow)[0]?.favoredEnemy ?? 0, issues };
}

export function masteryCapacity(entry) {
  return levelRow(entry).mastery ?? (['paladin', 'ranger', 'rogue'].includes(entry.id) ? 2 : 0);
}

export function resourceCaps(build, details) {
  const resources = [];
  const resource = (id, name, max, short = 0, dieFaces = null) => {
    if (max) resources.push({ id, name, max, short, die: dieFaces?.toLowerCase() ?? '' });
  };
  for (const entry of build.classes) {
    const row = levelRow(entry);
    switch (entry.id) {
      case 'barbarian': resource('rage', 'Fúria', row.rages, 1); break;
      case 'bard': resource('inspiration', 'Inspiração Bárdica', Math.max(1, details.modifiers.charisma), entry.level >= 5 ? Infinity : 0, row.inspiration); break;
      case 'cleric': resource('divinity', 'Canalizar Divindade', row.channel, 1); break;
      case 'druid': resource('wild', 'Forma Selvagem', row.wildShape, 1); break;
      case 'fighter':
        resource('wind', 'Retomar o Fôlego', row.secondWind, 1);
        resource('surge', 'Surto de Ação', entry.level >= 17 ? 2 : entry.level >= 2 ? 1 : 0, Infinity);
        break;
      case 'monk': resource('focus', 'Pontos de Foco', row.focus, Infinity); break;
      case 'paladin':
        resource('lay-on-hands', 'Imposição das Mãos', 5 * entry.level);
        resource('paladin-divinity', 'Canalizar Divindade (Paladino)', row.channel, 1);
        resource('divine-smite', 'Destruição Divina · uso livre', entry.level >= 2 ? 1 : 0);
        break;
      case 'ranger': resource('favored-enemy', 'Marca do Caçador · usos livres', row.favoredEnemy); break;
      case 'sorcerer':
        resource('sorcery', 'Pontos de Feitiçaria', row.sorcery);
        resource('innate', 'Feitiçaria Inata', 2);
        break;
      default: break;
    }
  }
  if (details.origins.some(magicOrigin)) {
    details.origins.filter(magicOrigin).forEach(feat => resource(`initiate:${magicOrigin(feat)}`, `${feat} · conjuração livre`, 1));
  }
  if (build.species === 'dragonborn') resource('breath', 'Sopro dracônico', details.pb);
  if (build.species === 'goliath') resource('giant', 'Ancestralidade gigante', details.pb);
  if (build.species === 'orc') {
    resource('adrenaline', 'Ímpeto de adrenalina', details.pb, Infinity);
    resource('endurance', 'Resistência implacável', 1);
  }
  return resources;
}

export function skillBonus(skill, details) {
  const [, key] = SKILLS[skill];
  const trained = details.expertise.includes(skill) ? 2 : Number(details.proficientSkills.includes(skill));
  return details.modifiers[key] + details.pb * trained + (details.knowledgeBonus[skill] ?? 0) +
    (!trained && details.jackOfAllTrades ? Math.floor(details.pb / 2) : 0);
}

export function weaponStats(item, details) {
  if (!has(WEAPONS, item)) return null;
  const [formula, damageType, mastery, traits = '', range = '5 pés'] = WEAPONS[item];
  const ranged = traits.includes('ranged');
  const ability = ranged || traits.includes('finesse') && details.modifiers.dexterity > details.modifiers.strength ? 'dexterity' : 'strength';
  const eligible = !traits.includes('martial') ? ['simple', 'martial', 'monk', 'rogue']
    : ['martial', ...(traits.includes('light') ? ['monk', 'rogue'] : []), ...(traits.includes('finesse') ? ['rogue'] : [])];
  const trained = eligible.some(value => details.weaponTraining.has(value));
  const attack = details.modifiers[ability] + (trained ? details.pb : 0) + (ranged && details.archery ? 2 : 0);
  return { formula, damageType, mastery, ability, range, attack, damageModifier: details.modifiers[ability] };
}

export function rollDndTest({ label, kind, bonus, target = null, mode = 'normal', conditions = [], exhaustion = 0, effects = {},
  skill = '', criticalAt = 20, halfling = false, extraAdvantage = false, extraDisadvantage = false }, random = Math.random) {
  const disadvantage = extraDisadvantage || conditions.includes('Envenenado') && ['check', 'attack'].includes(kind) ||
    conditions.includes('Caído') && kind === 'attack' || conditions.includes('Contido') && (kind === 'attack' || kind === 'save' && label.includes('Destreza')) ||
    conditions.includes('Cego') && kind === 'attack' || ['Incapacitado', 'Atordoado', 'Paralisado', 'Inconsciente', 'Petrificado']
      .some(value => conditions.includes(value)) && kind === 'initiative';
  const advantage = extraAdvantage || mode === 'advantage';
  const hasDisadvantage = mode === 'disadvantage' || disadvantage;
  const effective = advantage === hasDisadvantage ? 'normal' : advantage ? 'advantage' : 'disadvantage';
  function rerollOne() {
    const first = random();
    return halfling && first < 1 / 20 ? random() : first;
  }
  const raw = dnd5({ advantage: effective, kind }, rerollOne);
  const effectName = effects.bless && ['attack', 'save'].includes(kind) ? 'Bless'
    : effects.guidance && kind === 'check' && effects.guidance === skill ? 'Guidance' : null;
  const effect = effectName ? die(4, random) : null;
  const fatigue = bounded(exhaustion, 0, 6) * 2;
  return evaluateTest({ label, kind, dice: raw.dice, target, bonus, effect, effectName, fatigue, criticalAt, mode: effective });
}

function evaluateTest(test) {
  const { kind, dice, target, bonus, effect, fatigue, criticalAt, mode } = test;
  const selected = mode === 'advantage' ? dice.indexOf(Math.max(...dice))
    : mode === 'disadvantage' ? dice.indexOf(Math.min(...dice)) : 0;
  const natural = dice[selected];
  const total = natural + bonus + (effect ?? 0) - fatigue;
  const isAttack = kind === 'attack';
  const critical = isAttack && natural >= criticalAt;
  const fumble = isAttack && natural === 1;
  const good = critical ? true : fumble ? false : target === null ? null : total >= target;
  const status = critical ? 'Acerto crítico' : fumble ? 'Erro automático'
    : good === null ? 'Resultado' : good ? (isAttack ? 'Acerto' : 'Sucesso') : isAttack ? 'Erro' : 'Falha';
  return { ...test, total, good, status, selected, critical };
}

export function rerollDndTest(test, random = Math.random) {
  const dice = test.dice.slice();
  const replaced = dice[test.selected];
  dice[test.selected] = die(20, random);
  return evaluateTest({ ...test, dice, replaced });
}

export function rollDamage(formula, modifierValue = 0, critical = false, random = Math.random) {
  const flat = Number(formula);
  if (String(formula).trim() && Number.isFinite(flat)) return { total: Math.max(0, flat + modifierValue), dice: [], modifier: flat + modifierValue };
  const match = String(formula).trim().match(/^(\d*)d(\d+)(?:\s*([+-])\s*(\d+))?$/i);
  if (!match || Number(match[1] || 1) < 1) throw Error('Cadastre a expressão como 1d8 ou 2d6+2.');
  const [, count, sides, sign, amount] = match;
  const number = Number(count || 1) * (critical ? 2 : 1);
  const dice = rollExpression(`${number}d${sides}`, random).dice;
  const bonus = modifierValue + (sign === '-' ? -1 : 1) * Number(amount ?? 0);
  return { total: Math.max(0, dice.reduce((total, value) => total + value, bonus)), dice, modifier: bonus };
}

export const BUILD_STAT = 'dnd2024Build';
export const SPELL_STAT = 'dnd2024Spells';
export const PLAY_STAT = 'dnd2024Play';

export function readPlay(stats, details) {
  const saved = readRecord(stats[PLAY_STAT]);
  const [current, max] = String(stats.hp || '').split('/');
  const items = Array.isArray(saved.items) ? saved.items.filter(entry => Array.isArray(entry) && typeof entry[0] === 'string' && Number(entry[1]) > 0) : details.equipment.items;
  const countMap = value => Object.fromEntries(Object.entries(objectOrEmpty(value)).map(([key, amount]) => [key, bounded(amount, 0, 9999)]));
  const coins = { pp: 0, gp: details.equipment.coins, ep: 0, sp: 0, cp: 0 };
  for (const key of Object.keys(coins)) if (saved.coins?.[key] != null) coins[key] = bounded(saved.coins[key], 0, 999999);
  return {
    armor: typeof saved.armor === 'string' && (saved.armor === '' || has(ARMOR, saved.armor)) ? saved.armor : details.armor,
    shield: typeof saved.shield === 'boolean' ? saved.shield : details.shield,
    hero: saved.hero === true, spent: countMap(saved.spent), hitDice: countMap(saved.hitDice),
    conditions: Array.isArray(saved.conditions) ? unique(saved.conditions.filter(condition => typeof condition === 'string' && condition.length < 40)) : [],
    guidance: has(SKILLS, saved.guidance) ? saved.guidance : '', bless: saved.bless === true,
    exhaustion: bounded(saved.exhaustion, 0, 6), deathSuccess: bounded(saved.deathSuccess, 0, 3), deathFailure: bounded(saved.deathFailure, 0, 3),
    toolAbility: has(ABILITIES, saved.toolAbility) ? saved.toolAbility : 'dexterity',
    actions: Array.isArray(saved.actions) ? saved.actions.filter(row => Array.isArray(row) && row.length === 2 && row.every(item => typeof item === 'string')) : [],
    items, hp: current === '' || current === undefined ? details.hp : bounded(current, 0, Number(max) || details.hp),
    temp: bounded(stats.hpTemp, 0, 9999), max: Number(max) > 0 ? Number(max) : details.hp,
    coins, experience: bounded(saved.experience ?? stats.experience, 0, 9999999),
  };
}

export const usesLeft = (play, id, max) => max - bounded(play.spent?.[id], 0, max);

export function changeHP(play, action, amount) {
  const value = bounded(amount, 0, 9999);
  if (action === 'heal') {
    return { ...play, hp: Math.min(play.max, play.hp + value), ...(value ? { deathSuccess: 0, deathFailure: 0 } : {}) };
  }
  const hp = Math.max(0, play.hp - Math.max(0, value - play.temp));
  return { ...play, hp, temp: Math.max(0, play.temp - value) };
}

export function recover(play, build, details, long) {
  if (long) return {
    ...play, hp: play.max, temp: 0, spent: {}, hitDice: {}, exhaustion: Math.max(0, play.exhaustion - 1),
    hero: build.species === 'human' || play.hero, deathSuccess: 0, deathFailure: 0,
  };
  const spent = { ...play.spent, pact: 0 };
  for (const { id, short } of resourceCaps(build, details)) spent[id] = Math.max(0, (spent[id] ?? 0) - short);
  return { ...play, spent };
}

function saveJson(data) {
  const serialized = JSON.stringify(data);
  if (serialized.length > DATA_LIMIT) throw new Error('A ficha excede o limite de uma seção. Remova registros ou encurte os textos.');
  return serialized;
}

export function storeCharacter(stats, build, spellSelections, play, details) {
  const skills = details.proficientSkills.map(key => `${SKILLS[key][0]}=${details.expertise.includes(key) ? 'expertise' : 'proficient'}`);
  const { hp, temp, max, ...playData } = play;
  return {
    ...stats,
    [BUILD_STAT]: saveJson(build),
    [SPELL_STAT]: saveJson(spellSelections),
    [PLAY_STAT]: saveJson(playData),
    ...Object.fromEntries(ABILITY_KEYS.map(key => [key, String(details.scores[key])])),
    level: String(details.level), proficiencyBonus: String(details.pb),
    className: build.classes.map(entry => `${classData(entry).name} ${entry.level}`).join(' / '),
    species: details.species?.name ?? '', background: details.background?.name ?? '',
    hp: `${hp}/${max}`, hpTemp: String(temp),
    experience: String(play.experience),
    ac: String(armorClass(play.armor, play.shield, details.modifiers, build.classes, details.armorTraining)),
    initiative: String(details.initiative), speed: String(details.speed),
    passivePerception: String(10 + skillBonus('Perception', details)),
    savingThrows: details.saves.map(key => ABILITIES[key][0]).join(', '),
    skillProficiencies: skills.join('\n'),
    languagesProficiencies: ['Comum', ...build.languages, ...details.tools].join(', '),
    originFeats: details.origins.join('\n'),
    inventory: play.items.map(([item, quantity]) => `${item.replace(/[\n|]/g, ' ')}|${quantity}`).join('\n').slice(0, DATA_LIMIT),
    ...Object.fromEntries(Object.entries(play.coins).map(([key, amount]) => [key, String(amount)])),
    spellSlots: details.slots.map((maxSlots, index) => `${index + 1}:${usesLeft(play, `slot${index + 1}`, maxSlots)}/${maxSlots}`).join(';'),
    classFeatures: resourceCaps(build, details).map(entry => `${entry.name}|${usesLeft(play, entry.id, entry.max)}|${entry.max}|${entry.die}`).join('\n'),
  };
}

export function demoGabriel() {
  return {
    name: 'Gabriel',
    build: {
      ...emptyBuild(),
      classes: [{ ...classEntry('cleric'), order: 'thaumaturge', skills: ['Persuasion', 'History'] }],
      species: 'dwarf', background: 'acolyte', scoreMethod: 'manual',
      scores: { strength: 14, dexterity: 9, constitution: 8, intelligence: 15, wisdom: 10, charisma: 10 },
      bonuses: ['intelligence', 'charisma'], magicAbilities: { 'Magic Initiate (Cleric)': 'charisma' },
      languages: ['Anão', 'Élfico'], classKit: '0', backgroundKit: '0', focus: 'Emblema',
    },
    spells: {
      'cleric:cantrips': ['Mending', 'Sacred Flame', 'Resistance'], 'cleric:order': ['Guidance'],
      'cleric:prepared': ['Create or Destroy Water', 'Cure Wounds', 'Detect Evil and Good', 'Detect Magic'],
      'cleric:initiate0': ['Light', 'Guidance'], 'cleric:initiate1': ['Bane'],
    },
    about: { pronouns: 'Ele/Dele' },
  };
}
