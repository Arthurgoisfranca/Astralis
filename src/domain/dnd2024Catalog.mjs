import progression from './dnd2024Progression.json' with { type: 'json' };
import spellData from './dnd2024Spells.json' with { type: 'json' };
import spellSummaries from './dnd2024SpellSummaries.json' with { type: 'json' };
import subclasses from './dnd2024Subclasses.json' with { type: 'json' };

export const DND_2024 = 'D&D 5.5E (2024)';
export const SRD_URL = 'https://www.dndbeyond.com/srd';
export const SRD_LICENSE = 'https://creativecommons.org/licenses/by/4.0/legalcode';
export const SRD_CREDIT = 'This work includes material from the System Reference Document 5.2.1 (“SRD 5.2.1”) by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.';

export const ABILITIES = {
  strength: ['Força', 'FOR'], dexterity: ['Destreza', 'DES'], constitution: ['Constituição', 'CON'],
  intelligence: ['Inteligência', 'INT'], wisdom: ['Sabedoria', 'SAB'], charisma: ['Carisma', 'CAR'],
};
export const ABILITY_KEYS = Object.keys(ABILITIES);
export const SKILLS = {
  Acrobatics: ['Acrobacia', 'dexterity'], 'Animal Handling': ['Adestrar Animais', 'wisdom'],
  Arcana: ['Arcanismo', 'intelligence'], Athletics: ['Atletismo', 'strength'],
  Deception: ['Enganação', 'charisma'], History: ['História', 'intelligence'],
  Insight: ['Intuição', 'wisdom'], Intimidation: ['Intimidação', 'charisma'],
  Investigation: ['Investigação', 'intelligence'], Medicine: ['Medicina', 'wisdom'],
  Nature: ['Natureza', 'intelligence'], Perception: ['Percepção', 'wisdom'],
  Performance: ['Atuação', 'charisma'], Persuasion: ['Persuasão', 'charisma'],
  Religion: ['Religião', 'intelligence'], 'Sleight of Hand': ['Prestidigitação', 'dexterity'],
  Stealth: ['Furtividade', 'dexterity'], Survival: ['Sobrevivência', 'wisdom'],
};
export const SKILL_KEYS = Object.keys(SKILLS);
export const TOOLS = [
  'Ferramentas de ferreiro', 'Ferramentas de carpinteiro', 'Ferramentas de ladrão', 'Ferramentas de oleiro',
  'Utensílios de calígrafo', 'Kit de herbalismo', 'Kit de disfarce', 'Kit de falsificação', 'Suprimentos de alquimista',
  'Utensílios de cozinheiro', 'Baralho', 'Dados', 'Flauta', 'Laúde', 'Tambor',
];
export const LANGUAGES = ['Comum', 'Anão', 'Élfico', 'Gigante', 'Gnômico', 'Goblin', 'Halfling', 'Orc',
  'Linguagem de Sinais Comum', 'Dracônico'];

function kit(coins, items = []) { return { coins, items: items.map(item => Array.isArray(item) ? item : [item, 1]) }; }

const classData = {
  barbarian: {
    name: 'Bárbaro', hitDie: 12, primary: ['strength'], saves: ['strength', 'constitution'],
    skills: [2, ['Animal Handling', 'Athletics', 'Intimidation', 'Nature', 'Perception', 'Survival']],
    weapons: 'martial', armor: ['light', 'medium', 'shield'], multiclassArmor: ['shield'], multiclassWeapons: 'martial',
    kits: [kit(15, ['Greataxe', ['Handaxe', 4], "Explorer's Pack"]), kit(75)],
  },
  bard: {
    name: 'Bardo', hitDie: 8, primary: ['charisma'], saves: ['dexterity', 'charisma'],
    skills: [3, SKILL_KEYS], weapons: 'simple', armor: ['light'], multiclassArmor: ['light'], multiclassSkills: 1,
    toolPicks: 3, magic: ['full', 'charisma'],
    kits: [kit(19, ['Leather Armor', ['Dagger', 2], 'Musical Instrument', "Entertainer's Pack"]), kit(90)],
  },
  cleric: {
    name: 'Clérigo', hitDie: 8, primary: ['wisdom'], saves: ['wisdom', 'charisma'],
    skills: [2, ['History', 'Insight', 'Medicine', 'Persuasion', 'Religion']],
    weapons: 'simple', armor: ['light', 'medium', 'shield'], multiclassArmor: ['light', 'medium', 'shield'], magic: ['full', 'wisdom'],
    kits: [kit(7, ['Chain Shirt', 'Shield', 'Mace', 'Holy Symbol', "Priest's Pack"]), kit(110)],
  },
  druid: {
    name: 'Druida', hitDie: 8, primary: ['wisdom'], saves: ['intelligence', 'wisdom'],
    skills: [2, ['Animal Handling', 'Arcana', 'Insight', 'Medicine', 'Nature', 'Perception', 'Religion', 'Survival']],
    weapons: 'simple', armor: ['light', 'shield'], multiclassArmor: ['light', 'shield'], tools: ['Kit de herbalismo'], magic: ['full', 'wisdom'],
    kits: [kit(9, ['Leather Armor', 'Shield', 'Sickle', 'Druidic Focus (Quarterstaff)', "Explorer's Pack", 'Herbalism Kit']), kit(50)],
  },
  fighter: {
    name: 'Guerreiro', hitDie: 10, primary: ['strength', 'dexterity'], either: true, saves: ['strength', 'constitution'],
    skills: [2, ['Acrobatics', 'Animal Handling', 'Athletics', 'History', 'Insight', 'Intimidation', 'Persuasion', 'Perception', 'Survival']],
    weapons: 'martial', armor: ['light', 'medium', 'heavy', 'shield'], multiclassArmor: ['light', 'medium', 'shield'], multiclassWeapons: 'martial',
    kits: [kit(4, ['Chain Mail', 'Greatsword', 'Flail', ['Javelin', 8], "Dungeoneer's Pack"]),
      kit(11, ['Studded Leather Armor', 'Scimitar', 'Shortsword', 'Longbow', ['Arrow', 20], 'Quiver', "Dungeoneer's Pack"]), kit(155)],
  },
  monk: {
    name: 'Monge', hitDie: 8, primary: ['dexterity', 'wisdom'], saves: ['strength', 'dexterity'],
    skills: [2, ['Acrobatics', 'Athletics', 'History', 'Insight', 'Religion', 'Stealth']],
    weapons: 'monk', armor: [], multiclassWeapons: 'monk', toolPicks: 1,
    kits: [kit(11, ['Spear', ['Dagger', 5], 'Chosen Tool', "Explorer's Pack"]), kit(50)],
  },
  paladin: {
    name: 'Paladino', hitDie: 10, primary: ['strength', 'charisma'], saves: ['wisdom', 'charisma'],
    skills: [2, ['Athletics', 'Insight', 'Intimidation', 'Medicine', 'Persuasion', 'Religion']],
    weapons: 'martial', armor: ['light', 'medium', 'heavy', 'shield'], multiclassArmor: ['light', 'medium', 'shield'], multiclassWeapons: 'martial', magic: ['half', 'charisma'],
    kits: [kit(9, ['Chain Mail', 'Shield', 'Longsword', ['Javelin', 6], 'Holy Symbol', "Priest's Pack"]), kit(150)],
  },
  ranger: {
    name: 'Patrulheiro', hitDie: 10, primary: ['dexterity', 'wisdom'], saves: ['strength', 'dexterity'],
    skills: [3, ['Animal Handling', 'Athletics', 'Insight', 'Investigation', 'Nature', 'Perception', 'Stealth', 'Survival']],
    weapons: 'martial', armor: ['light', 'medium', 'shield'], multiclassArmor: ['light', 'medium', 'shield'], multiclassWeapons: 'martial', multiclassSkills: 1, magic: ['half', 'wisdom'],
    kits: [kit(7, ['Studded Leather Armor', 'Scimitar', 'Shortsword', 'Longbow', ['Arrow', 20], 'Quiver', 'Druidic Focus (Mistletoe)', "Explorer's Pack"]), kit(150)],
  },
  rogue: {
    name: 'Ladino', hitDie: 8, primary: ['dexterity'], saves: ['dexterity', 'intelligence'],
    skills: [4, ['Acrobatics', 'Athletics', 'Deception', 'Insight', 'Intimidation', 'Investigation', 'Perception', 'Persuasion', 'Sleight of Hand', 'Stealth']],
    weapons: 'rogue', armor: ['light'], multiclassArmor: ['light'], multiclassSkills: 1, tools: ['Ferramentas de ladrão'],
    kits: [kit(8, ['Leather Armor', ['Dagger', 2], 'Shortsword', 'Shortbow', ['Arrow', 20], 'Quiver', "Thieves’ Tools", "Burglar's Pack"]), kit(100)],
  },
  sorcerer: {
    name: 'Feiticeiro', hitDie: 6, primary: ['charisma'], saves: ['constitution', 'charisma'],
    skills: [2, ['Arcana', 'Deception', 'Insight', 'Intimidation', 'Persuasion', 'Religion']],
    weapons: 'simple', armor: [], magic: ['full', 'charisma'],
    kits: [kit(28, ['Spear', ['Dagger', 2], 'Arcane Focus (Crystal)', "Dungeoneer's Pack"]), kit(50)],
  },
  warlock: {
    name: 'Bruxo', hitDie: 8, primary: ['charisma'], saves: ['wisdom', 'charisma'],
    skills: [2, ['Arcana', 'Deception', 'History', 'Intimidation', 'Investigation', 'Nature', 'Religion']],
    weapons: 'simple', armor: ['light'], multiclassArmor: ['light'], magic: ['pact', 'charisma'],
    kits: [kit(15, ['Leather Armor', 'Sickle', ['Dagger', 2], 'Arcane Focus (Orb)', 'Book (Occult Lore)', "Scholar's Pack"]), kit(100)],
  },
  wizard: {
    name: 'Mago', hitDie: 6, primary: ['intelligence'], saves: ['intelligence', 'wisdom'],
    skills: [2, ['Arcana', 'History', 'Insight', 'Investigation', 'Medicine', 'Nature', 'Religion']],
    weapons: 'simple', armor: [], magic: ['full', 'intelligence'],
    kits: [kit(5, [['Dagger', 2], 'Arcane Focus (Quarterstaff)', 'Robe', 'Spellbook', "Scholar's Pack"]), kit(55)],
  },
};

export const CLASSES = Object.fromEntries(Object.entries(classData).map(([id, data]) =>
  [id, { ...data, rows: progression[id], subclasses: subclasses[id] }]));
export const SPECIES = {
  dragonborn: { name: 'Draconato', speed: 30, darkvision: 60, traits: ['Sopro', 'Resistência dracônica', 'Voo dracônico'],
    lineages: ['Preto', 'Azul', 'Latão', 'Bronze', 'Cobre', 'Ouro', 'Verde', 'Vermelho', 'Prata', 'Branco'] },
  dwarf: { name: 'Anão', speed: 30, darkvision: 120, hpPerLevel: 1, resistance: 'Veneno',
    traits: ['Resiliência anã', 'Vigor anão', 'Conhecimento de pedras'] },
  elf: { name: 'Elfo', speed: 30, darkvision: 60, traits: ['Ancestralidade feérica', 'Sentidos aguçados', 'Transe'],
    lineages: ['Drow', 'Alto elfo', 'Elfo da floresta'] },
  gnome: { name: 'Gnomo', speed: 30, darkvision: 60, traits: ['Astúcia gnômica'], lineages: ['Gnomo da floresta', 'Gnomo das rochas'] },
  goliath: { name: 'Golias', speed: 35, traits: ['Ancestralidade gigante', 'Forma grande', 'Constituição poderosa'],
    lineages: ['Nuvem', 'Fogo', 'Gelo', 'Colina', 'Pedra', 'Tempestade'] },
  halfling: { name: 'Halfling', speed: 30, traits: ['Coragem', 'Agilidade halfling', 'Sorte', 'Furtividade natural'] },
  human: { name: 'Humano', speed: 30, traits: ['Versátil', 'Habilidoso', 'Inspiração ao descansar'] },
  orc: { name: 'Orc', speed: 30, darkvision: 120, traits: ['Ímpeto de adrenalina', 'Resistência implacável'] },
  tiefling: { name: 'Tiefling', speed: 30, darkvision: 60, traits: ['Legado sobrenatural', 'Presença sobrenatural'],
    lineages: ['Abissal', 'Ctônico', 'Infernal'] },
};

export const BACKGROUNDS = {
  acolyte: { name: 'Acólito', abilities: ['intelligence', 'wisdom', 'charisma'], feat: 'Magic Initiate (Cleric)',
    skills: ['Insight', 'Religion'], tool: 'Utensílios de calígrafo',
    kits: [kit(8, ['Calligrapher’s Supplies', 'Book (Prayers)', 'Holy Symbol', ['Parchment', 10], 'Robe']), kit(50)] },
  criminal: { name: 'Criminoso', abilities: ['dexterity', 'constitution', 'intelligence'], feat: 'Alert',
    skills: ['Sleight of Hand', 'Stealth'], tool: 'Ferramentas de ladrão',
    kits: [kit(16, [['Dagger', 2], "Thieves’ Tools", 'Crowbar', ['Pouch', 2], "Traveler's Clothes"]), kit(50)] },
  sage: { name: 'Sábio', abilities: ['constitution', 'intelligence', 'wisdom'], feat: 'Magic Initiate (Wizard)',
    skills: ['Arcana', 'History'], tool: 'Utensílios de calígrafo',
    kits: [kit(8, ['Quarterstaff', 'Calligrapher’s Supplies', 'Book (History)', ['Parchment', 8], 'Robe']), kit(50)] },
  soldier: { name: 'Soldado', abilities: ['strength', 'dexterity', 'constitution'], feat: 'Savage Attacker',
    skills: ['Athletics', 'Intimidation'], tools: ['Dados', 'Baralho'],
    kits: [kit(14, ['Spear', 'Shortbow', ['Arrow', 20], 'Gaming Set', "Healer's Kit", 'Quiver', "Traveler's Clothes"]), kit(50)] },
};

export const ORIGIN_FEATS = ['Alert', 'Magic Initiate (Cleric)', 'Magic Initiate (Druid)', 'Magic Initiate (Wizard)', 'Savage Attacker', 'Skilled', 'Tough'];
export const STYLES = ['Archery', 'Blind Fighting', 'Defense', 'Dueling', 'Great Weapon Fighting', 'Interception',
  'Protection', 'Thrown Weapon Fighting', 'Two-Weapon Fighting', 'Unarmed Fighting'];
export const METAMAGIC = ['Acelerada', 'Agravada', 'Buscadora', 'Cautelosa', 'Distante', 'Duplicada', 'Persistente', 'Potencializada', 'Sutil', 'Transmutada'];
export const SPELLS = Object.fromEntries(Object.entries(spellData).map(([name, [level, school, classes, components, range, duration, flags, label]]) =>
  [name, { name, label, summary: spellSummaries[name], level, school, classes, components, range, duration,
    concentration: flags.includes('C'), ritual: flags.includes('R') }]));
export const spellLabel = name => SPELLS[name]?.label ?? name;

export const WEAPONS = {
  Club: ['1d4', 'Concussão', 'Slow', 'light'], Dagger: ['1d4', 'Perfuração', 'Nick', 'finesse light', '20/60 pés'],
  Greatclub: ['1d8', 'Concussão', 'Push'], Handaxe: ['1d6', 'Corte', 'Vex', 'light', '20/60 pés'],
  Javelin: ['1d6', 'Perfuração', 'Slow', '', '30/120 pés'], 'Light Hammer': ['1d4', 'Concussão', 'Nick', 'light', '20/60 pés'],
  Mace: ['1d6', 'Concussão', 'Sap'], Quarterstaff: ['1d6', 'Concussão', 'Topple'], Sickle: ['1d4', 'Corte', 'Nick', 'light'],
  Spear: ['1d6', 'Perfuração', 'Sap', '', '20/60 pés'], Dart: ['1d4', 'Perfuração', 'Vex', 'ranged finesse', '20/60 pés'],
  'Light Crossbow': ['1d8', 'Perfuração', 'Slow', 'ranged', '80/320 pés'], Shortbow: ['1d6', 'Perfuração', 'Vex', 'ranged', '80/320 pés'],
  Sling: ['1d4', 'Concussão', 'Slow', 'ranged', '30/120 pés'],
  Battleaxe: ['1d8', 'Corte', 'Topple', 'martial'], Flail: ['1d8', 'Concussão', 'Sap', 'martial'],
  Glaive: ['1d10', 'Corte', 'Graze', 'martial', '10 pés'], Greataxe: ['1d12', 'Corte', 'Cleave', 'martial'],
  Greatsword: ['2d6', 'Corte', 'Graze', 'martial'], Halberd: ['1d10', 'Corte', 'Cleave', 'martial', '10 pés'],
  Lance: ['1d10', 'Perfuração', 'Topple', 'martial', '10 pés'], Longsword: ['1d8', 'Corte', 'Sap', 'martial'],
  Maul: ['2d6', 'Concussão', 'Topple', 'martial'], Morningstar: ['1d8', 'Perfuração', 'Sap', 'martial'],
  Pike: ['1d10', 'Perfuração', 'Push', 'martial', '10 pés'], Rapier: ['1d8', 'Perfuração', 'Vex', 'martial finesse'],
  Scimitar: ['1d6', 'Corte', 'Nick', 'martial finesse light'], Shortsword: ['1d6', 'Perfuração', 'Vex', 'martial finesse light'],
  Trident: ['1d8', 'Perfuração', 'Topple', 'martial', '20/60 pés'], Warhammer: ['1d8', 'Concussão', 'Push', 'martial'],
  'War Pick': ['1d8', 'Perfuração', 'Sap', 'martial'], Whip: ['1d4', 'Corte', 'Slow', 'martial finesse', '10 pés'],
  Blowgun: ['1', 'Perfuração', 'Vex', 'martial ranged', '25/100 pés'],
  'Hand Crossbow': ['1d6', 'Perfuração', 'Vex', 'martial ranged light', '30/120 pés'],
  'Heavy Crossbow': ['1d10', 'Perfuração', 'Push', 'martial ranged', '100/400 pés'],
  Longbow: ['1d8', 'Perfuração', 'Slow', 'martial ranged', '150/600 pés'],
  Musket: ['1d12', 'Perfuração', 'Slow', 'martial ranged', '40/120 pés'],
  Pistol: ['1d10', 'Perfuração', 'Vex', 'martial ranged', '30/90 pés'],
};

export const ARMOR = {
  'Padded Armor': [11, 'light', 0, true], 'Leather Armor': [11, 'light'], 'Studded Leather Armor': [12, 'light'],
  Hide: [12, 'medium'], 'Chain Shirt': [13, 'medium'], 'Scale Mail': [14, 'medium', 0, true], Breastplate: [14, 'medium'],
  'Half Plate Armor': [15, 'medium', 0, true], 'Ring Mail': [14, 'heavy', 0, true], 'Chain Mail': [16, 'heavy', 13, true],
  'Splint Armor': [17, 'heavy', 15, true], 'Plate Armor': [18, 'heavy', 15, true],
};
