export const SYSTEM_IDS = [
  "Ordem Paranormal 2",
  "D&D 5.5E (2024)",
  "D&D 5E",
  "Call of Cthulhu",
  "Vampire: The Masquerade 5E / 6E",
  "Daggerheart",
  "Triangle Agency",
  "Sacramento",
  "Assimilação RPG",
] as const;

export type SystemId = (typeof SYSTEM_IDS)[number];
export type ResourceTrack = Readonly<{ current: number; max: number }>;
export type CircleState = Readonly<{ marked: boolean; note: string }>;
export type SixCircles = readonly [CircleState, CircleState, CircleState, CircleState, CircleState, CircleState];
export type AbilityScores = Readonly<Record<"strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma", number>>;

interface SheetIdentity {
  readonly characterId: string;
  readonly playerId: string;
  readonly name: string;
  readonly portraitUrl: string | null;
  readonly notes: string;
}

export interface OrdemParanormalSheet extends SheetIdentity {
  readonly system: "Ordem Paranormal 2";
  readonly attributes: Readonly<{ physical: number; mind: number; emotion: number }>;
  readonly resources: Readonly<{ hitPoints: ResourceTrack; determination: ResourceTrack }>;
  readonly className: string;
  readonly level: number;
  readonly skills: Readonly<Record<string, number>>;
  readonly skillModifiers: Readonly<Record<string, number>>;
  readonly levelMarks: readonly boolean[];
  readonly relationships: readonly string[];
  readonly appearance: string;
  readonly inventory: readonly string[];
}

export interface DaggerheartSheet extends SheetIdentity {
  readonly system: "Daggerheart";
  readonly attributes: Readonly<{ agility: number; strength: number; finesse: number; instinct: number; presence: number; knowledge: number }>;
  readonly evasion: number;
  readonly damageThresholds: Readonly<{ minor: number; major: number; severe: number }>;
  readonly resources: Readonly<{ hitPoints: ResourceTrack; stress: ResourceTrack; hope: ResourceTrack; armor: ResourceTrack }>;
  readonly domains: readonly string[];
  readonly subclasses: readonly Readonly<{ name: string; mechanicalTags: readonly string[] }>[];
  readonly className: string;
  readonly level: number;
  readonly inventory: readonly string[];
}

export interface CallOfCthulhuSheet extends SheetIdentity {
  readonly system: "Call of Cthulhu";
  readonly edition: "7e-1920";
  readonly characteristics: Readonly<{ str: number; dex: number; con: number; app: number; edu: number; siz: number; int: number; pow: number }>;
  readonly derived: Readonly<{ sanity: number; luck: number; magicPoints: number; hitPoints: number; movement: number }>;
  readonly skills: Readonly<Record<string, number>>;
  readonly history: string;
  readonly phobiasAndManias: readonly string[];
  readonly occupation: string;
  readonly injuries: string;
}

export interface VampireV5Sheet extends SheetIdentity {
  readonly system: "Vampire: The Masquerade 5E / 6E";
  readonly attributes: Readonly<{
    physical: Readonly<{ strength: number; dexterity: number; stamina: number }>;
    social: Readonly<{ charisma: number; manipulation: number; composure: number }>;
    mental: Readonly<{ intelligence: number; wits: number; resolve: number }>;
  }>;
  readonly skills: Readonly<Record<string, number>>;
  readonly disciplines: readonly Readonly<{ name: string; level: number }>[];
  readonly hunger: number;
  readonly humanity: number;
  readonly bloodPotency: number;
  readonly convictions: readonly string[];
  readonly health: ResourceTrack;
  readonly willpower: ResourceTrack;
}

export type QualityAssurance = "attentiveness" | "duplicity" | "dynamism" | "empathy" | "initiative" | "persistence" | "presence" | "professionalism" | "subtlety";
export interface TriangleAgencySheet extends SheetIdentity {
  readonly system: "Triangle Agency";
  readonly qualityAssurances: Readonly<Record<QualityAssurance, number>>;
  readonly realityStatus: Readonly<Record<string, number>>;
  readonly competency: number;
  readonly anomalies: readonly Readonly<{ name: string; description: string; status: string }>[];
  readonly requisitions: readonly Readonly<{ date: string; summary: string }>[];
  readonly chaosPool: ResourceTrack;
  readonly missionHistory: readonly Readonly<{ date: string; report: string }>[];
}

export type SpellCircle = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export interface DndSheet extends SheetIdentity {
  readonly system: "D&D 5.5E (2024)" | "D&D 5E";
  readonly abilities: AbilityScores;
  readonly proficiencyBonus: number;
  readonly savingThrows: readonly string[];
  readonly skillProficiencies: readonly string[];
  readonly skillExpertise: readonly string[];
  readonly armorClass: number;
  readonly initiative: number;
  readonly speed: number;
  readonly hitPoints: ResourceTrack & Readonly<{ temporary: number }>;
  readonly spellSlots: Readonly<Record<SpellCircle, ResourceTrack>>;
  readonly originFeats: readonly string[];
  readonly classFeatures: readonly Readonly<{ name: string; uses: ResourceTrack; die?: "d8" | "d10" | "d12" }>[];
  readonly className: string;
  readonly level: number;
}

export type PainCondition = "none" | "stunned" | "bleeding" | "fallen";
export interface SacramentoSheet extends SheetIdentity {
  readonly system: "Sacramento";
  readonly attributes: Readonly<{ physical: number; speed: number; intellect: number; courage: number }>;
  readonly lifeCircles: SixCircles;
  readonly painCircles: readonly [
    Readonly<{ marked: boolean; condition: PainCondition }>,
    Readonly<{ marked: boolean; condition: PainCondition }>,
    Readonly<{ marked: boolean; condition: PainCondition }>,
    Readonly<{ marked: boolean; condition: PainCondition }>,
    Readonly<{ marked: boolean; condition: PainCondition }>,
    Readonly<{ marked: boolean; condition: PainCondition }>,
  ];
  readonly combatActions: readonly string[];
  readonly backgrounds: readonly string[];
  readonly mount: Readonly<{ name: string; type: string; power: number; resistance: number; equipment: readonly string[] }>;
}

export interface AssimilacaoLegacySheet extends SheetIdentity {
  readonly system: "Assimilação RPG";
  readonly archetype: string;
  readonly vigor: ResourceTrack;
  readonly integrity: ResourceTrack;
  readonly progress: number;
  readonly conditions: readonly string[];
  readonly customFields: Readonly<Record<string, string | number | boolean>>;
}

export type CharacterSheet =
  | OrdemParanormalSheet
  | DaggerheartSheet
  | CallOfCthulhuSheet
  | VampireV5Sheet
  | TriangleAgencySheet
  | DndSheet
  | SacramentoSheet
  | AssimilacaoLegacySheet;

const identity = (characterId: string, playerId: string, name: string): SheetIdentity => ({
  characterId,
  playerId,
  name,
  portraitUrl: null,
  notes: "",
});
const track = (max = 0): ResourceTrack => ({ current: max, max });
const emptyCircles = (): SixCircles => Array.from({ length: 6 }, () => ({ marked: false, note: "" })) as unknown as SixCircles;
const emptyPainCircles = (): SacramentoSheet["painCircles"] => [{ marked: false, condition: "none" }, { marked: false, condition: "none" }, { marked: false, condition: "none" }, { marked: false, condition: "none" }, { marked: false, condition: "none" }, { marked: false, condition: "none" }];

export function createBlankSheet(system: SystemId, characterId: string, playerId: string, name = ""): CharacterSheet {
  const base = identity(characterId, playerId, name);
  switch (system) {
    case "Ordem Paranormal 2":
      return { ...base, system, attributes: { physical: 0, mind: 0, emotion: 0 }, resources: { hitPoints: track(), determination: track() }, className: "", level: 1, skills: {}, skillModifiers: {}, levelMarks: [], relationships: [], appearance: "", inventory: [] };
    case "Daggerheart":
      return { ...base, system, attributes: { agility: 0, strength: 0, finesse: 0, instinct: 0, presence: 0, knowledge: 0 }, evasion: 0, damageThresholds: { minor: 0, major: 0, severe: 0 }, resources: { hitPoints: track(), stress: track(), hope: track(), armor: track() }, domains: [], subclasses: [], className: "", level: 1, inventory: [] };
    case "Call of Cthulhu":
      return { ...base, system, edition: "7e-1920", characteristics: { str: 0, dex: 0, con: 0, app: 0, edu: 0, siz: 0, int: 0, pow: 0 }, derived: { sanity: 0, luck: 0, magicPoints: 0, hitPoints: 0, movement: 0 }, skills: {}, history: "", phobiasAndManias: [], occupation: "", injuries: "" };
    case "Vampire: The Masquerade 5E / 6E":
      return { ...base, system, attributes: { physical: { strength: 1, dexterity: 1, stamina: 1 }, social: { charisma: 1, manipulation: 1, composure: 1 }, mental: { intelligence: 1, wits: 1, resolve: 1 } }, skills: {}, disciplines: [], hunger: 0, humanity: 7, bloodPotency: 0, convictions: [], health: track(), willpower: track() };
    case "Triangle Agency":
      return { ...base, system, qualityAssurances: { attentiveness: 0, duplicity: 0, dynamism: 0, empathy: 0, initiative: 0, persistence: 0, presence: 0, professionalism: 0, subtlety: 0 }, realityStatus: {}, competency: 0, anomalies: [], requisitions: [], chaosPool: track(), missionHistory: [] };
    case "D&D 5.5E (2024)":
    case "D&D 5E":
      return { ...base, system, abilities: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 }, proficiencyBonus: 2, savingThrows: [], skillProficiencies: [], skillExpertise: [], armorClass: 10, initiative: 0, speed: 30, hitPoints: { ...track(), temporary: 0 }, spellSlots: { 1: track(), 2: track(), 3: track(), 4: track(), 5: track(), 6: track(), 7: track(), 8: track(), 9: track() }, originFeats: [], classFeatures: [], className: "", level: 1 };
    case "Sacramento":
      return { ...base, system, attributes: { physical: 0, speed: 0, intellect: 0, courage: 0 }, lifeCircles: emptyCircles(), painCircles: emptyPainCircles(), combatActions: [], backgrounds: [], mount: { name: "", type: "", power: 0, resistance: 0, equipment: [] } };
    case "Assimilação RPG":
      return { ...base, system, archetype: "", vigor: track(), integrity: track(), progress: 0, conditions: [], customFields: {} };
  }
}
export interface AdaptiveSheetInput {
  readonly name: string;
  readonly classLevel?: string;
  readonly portraitUrl?: string | null;
  readonly notes?: string;
  readonly appearance?: string;
  readonly inventory?: string;
  readonly stats: Readonly<Record<string, string | number | undefined>>;
}

const statText = (input: AdaptiveSheetInput, key: string): string => String(input.stats[key] ?? "").trim();
const statNumber = (input: AdaptiveSheetInput, key: string, fallback = 0): number => {
  const value = Number(statText(input, key).split("/")[0]);
  return Number.isFinite(value) ? value : fallback;
};
const statList = (input: AdaptiveSheetInput, key: string): string[] => statText(input, key).split(/[\n,;]/).map(value => value.trim()).filter(Boolean);
const statNumbers = (input: AdaptiveSheetInput, key: string): number[] => statText(input, key).match(/-?\d+(?:\.\d+)?/g)?.map(Number).filter(Number.isFinite) || [];
const parseSpellSlots = (input: AdaptiveSheetInput): DndSheet["spellSlots"] => { const slots = Object.fromEntries(([1,2,3,4,5,6,7,8,9] as const).map(circle => [circle, track()])); for (const entry of statText(input,"spellSlots").split(";")) { const match=entry.match(/^\s*(\d)\s*:\s*(\d+)\s*\/\s*(\d+)\s*$/); if(match&&Number(match[1])>=1) slots[Number(match[1]) as SpellCircle]={current:Number(match[2]),max:Number(match[3])}; } return Object.freeze(slots) as DndSheet["spellSlots"]; };
const featureCounters = (input: AdaptiveSheetInput): DndSheet["classFeatures"] => Object.freeze(statText(input,"classFeatures").split(/\r?\n/).map(entry=>{ const [name,current,max,die] = entry.split("|"); return { name:(name||"").trim(), uses:{current:Math.max(0,Number(current)||0),max:Math.max(0,Number(max)||0)}, ...(die==="d8"||die==="d10"||die==="d12"?{die:die as "d8"|"d10"|"d12"}: {}) }; }).filter(item=>item.name));
const statTrack = (input: AdaptiveSheetInput, key: string): ResourceTrack => {
  const [currentText, maxText] = statText(input, key).split("/").map(value => value.trim());
  const current = Math.max(0, Number(currentText) || 0), max = Math.max(current, Number(maxText) || current);
  return Object.freeze({ current, max });
};
const numericEntries = (input: AdaptiveSheetInput, key: string): Readonly<Record<string, number>> => Object.freeze(Object.fromEntries(
  statText(input, key).split(/[\n,;]/).map(entry => entry.match(/^\s*(.+?)\s*[:=]\s*(-?\d+(?:\.\d+)?)\s*$/)).filter((match): match is RegExpMatchArray => Boolean(match)).map(match => [match[1].trim(), Number(match[2])]),
));
const circleMarks = (input: AdaptiveSheetInput, key: string): readonly boolean[] => {
  const values = statNumbers(input, key);
  const marked = values.length === 1 && !/[\n,;]/.test(statText(input, key)) ? new Set(Array.from({ length: Math.min(6, values[0]) }, (_, index) => index + 1)) : new Set(values);
  return Object.freeze(Array.from({ length: 6 }, (_, index) => marked.has(index + 1)));
};
const parseLevel = (input: AdaptiveSheetInput, key = "nivel"): number => Math.max(1, Math.trunc(statNumber(input, key, 1)));
const sheetIdentity = (input: AdaptiveSheetInput) => ({ name: input.name.trim(), portraitUrl: input.portraitUrl || null, notes: input.notes || "" });

export function buildCharacterSheet(system: SystemId, characterId: string, playerId: string, input: AdaptiveSheetInput): CharacterSheet {
  const base = createBlankSheet(system, characterId, playerId, input.name);
  const identityFields = sheetIdentity(input);
  switch (system) {
    case "Ordem Paranormal 2": {
      const sheet = base as OrdemParanormalSheet;
      return { ...sheet, ...identityFields, attributes: { physical: statNumber(input, "physical"), mind: statNumber(input, "mind"), emotion: statNumber(input, "emotion") }, resources: { hitPoints: statTrack(input, "pv"), determination: statTrack(input, "pd") }, className: statText(input, "classe") || input.classLevel || "", level: parseLevel(input), skills: numericEntries(input, "pericias"), skillModifiers: {}, levelMarks: Object.freeze(Array.from({ length: parseLevel(input) }, () => false)), relationships: Object.freeze(statList(input, "relacoes")), appearance: input.appearance || "", inventory: Object.freeze(statList(input, "inventory")) };
    }
    case "Daggerheart": {
      const sheet = base as DaggerheartSheet;
      return { ...sheet, ...identityFields, attributes: { agility: statNumber(input, "agility"), strength: statNumber(input, "strength"), finesse: statNumber(input, "finesse"), instinct: statNumber(input, "instinct"), presence: statNumber(input, "presence"), knowledge: statNumber(input, "knowledge") }, evasion: statNumber(input, "evasion"), damageThresholds: { minor: statNumber(input, "minor"), major: statNumber(input, "major"), severe: statNumber(input, "severe") }, resources: { hitPoints: statTrack(input, "hp"), stress: statTrack(input, "stress"), hope: statTrack(input, "hope"), armor: statTrack(input, "armor") }, domains: Object.freeze(statList(input, "domains")), subclasses: Object.freeze(statList(input, "subclasses").map(name => ({ name, mechanicalTags: Object.freeze([]) }))), className: input.classLevel || "", level: parseLevel(input), inventory: Object.freeze(statList(input, "inventory")) };
    }
    case "Call of Cthulhu": {
      const sheet = base as CallOfCthulhuSheet;
      return { ...sheet, ...identityFields, characteristics: { str: statNumber(input, "str"), dex: statNumber(input, "dex"), con: statNumber(input, "con"), app: statNumber(input, "app"), edu: statNumber(input, "edu"), siz: statNumber(input, "siz"), int: statNumber(input, "int"), pow: statNumber(input, "pow") }, derived: { sanity: statNumber(input, "san"), luck: statNumber(input, "luck"), magicPoints: statNumber(input, "magicPoints"), hitPoints: statNumber(input, "hitPoints"), movement: statNumber(input, "movement") }, skills: numericEntries(input, "skills"), history: statText(input, "history"), phobiasAndManias: Object.freeze(statList(input, "phobias")), occupation: statText(input, "occupation"), injuries: statText(input, "injuries") };
    }
    case "Vampire: The Masquerade 5E / 6E": {
      const sheet = base as VampireV5Sheet;
      return { ...sheet, ...identityFields, attributes: { physical: { strength: statNumber(input, "strength", 1), dexterity: statNumber(input, "dexterity", 1), stamina: statNumber(input, "stamina", 1) }, social: { charisma: statNumber(input, "charisma", 1), manipulation: statNumber(input, "manipulation", 1), composure: statNumber(input, "composure", 1) }, mental: { intelligence: statNumber(input, "intelligence", 1), wits: statNumber(input, "wits", 1), resolve: statNumber(input, "resolve", 1) } }, skills: numericEntries(input, "skills"), disciplines: Object.freeze(statList(input, "disciplines").map(entry => { const [name, level] = entry.split(":").map(value => value.trim()); return { name, level: Math.max(0, Number(level) || 0) }; })), hunger: Math.min(5, Math.max(0, statNumber(input, "hunger"))), humanity: statNumber(input, "humanity", 7), bloodPotency: statNumber(input, "bloodPotency"), convictions: Object.freeze(statList(input, "convictions")), health: statTrack(input, "health"), willpower: statTrack(input, "willpower") };
    }
    case "Triangle Agency": {
      const sheet = base as TriangleAgencySheet;
      return { ...sheet, ...identityFields, qualityAssurances: { attentiveness: statNumber(input, "attentiveness"), duplicity: statNumber(input, "duplicity"), dynamism: statNumber(input, "dynamism"), empathy: statNumber(input, "empathy"), initiative: statNumber(input, "initiative"), persistence: statNumber(input, "persistence"), presence: statNumber(input, "presence"), professionalism: statNumber(input, "professionalism"), subtlety: statNumber(input, "subtlety") }, realityStatus: numericEntries(input, "realityStatus"), competency: statNumber(input, "competency"), anomalies: Object.freeze(statList(input, "anomalies").map(name => ({ name, description: "", status: "Desconhecido" }))), requisitions: Object.freeze(statList(input, "requisitions").map(summary => ({ date: "", summary }))), chaosPool: statTrack(input, "chaosPool"), missionHistory: Object.freeze(statList(input, "missionHistory").map(report => ({ date: "", report }))) };
    }
    case "D&D 5.5E (2024)":
    case "D&D 5E": {
      const sheet = base as DndSheet, spellSlots = parseSpellSlots(input);
      return { ...sheet, ...identityFields, abilities: { strength: statNumber(input, "strength", 10), dexterity: statNumber(input, "dexterity", 10), constitution: statNumber(input, "constitution", 10), intelligence: statNumber(input, "intelligence", 10), wisdom: statNumber(input, "wisdom", 10), charisma: statNumber(input, "charisma", 10) }, proficiencyBonus: statNumber(input, "proficiencyBonus", 2), savingThrows: Object.freeze(statList(input, "savingThrows")), skillProficiencies: Object.freeze(statText(input, "skillProficiencies").split(/[\n,;]/).map(entry => entry.split(/[=:]/)).filter(parts => parts.length > 1 && parts[1].trim()).map(parts => parts[0].trim())), skillExpertise: Object.freeze(statText(input, "skillProficiencies").split(/[\n,;]/).map(entry => entry.split(/[=:]/)).filter(parts => parts.length > 1 && parts[1].trim()==="expertise").map(parts => parts[0].trim())), armorClass: statNumber(input, "ac", 10), initiative: statNumber(input, "initiative"), speed: statNumber(input, "speed", 30), hitPoints: { ...statTrack(input, "hp"), temporary: statNumber(input, "hpTemp") }, spellSlots, originFeats: Object.freeze(statList(input, "originFeats")), classFeatures: featureCounters(input), className: input.classLevel || "", level: parseLevel(input, "level") };
    }
    case "Sacramento": {
      const sheet = base as SacramentoSheet, life = circleMarks(input, "lifeCircles"), pain = circleMarks(input, "painCircles");
      return { ...sheet, ...identityFields, attributes: { physical: statNumber(input, "physical"), speed: statNumber(input, "speed"), intellect: statNumber(input, "intellect"), courage: statNumber(input, "courage") }, lifeCircles: Object.freeze(sheet.lifeCircles.map((circle, index) => ({ ...circle, marked: life[index] }))) as SixCircles, painCircles: Object.freeze(sheet.painCircles.map((circle, index) => ({ ...circle, marked: pain[index] }))) as SacramentoSheet["painCircles"], combatActions: Object.freeze(statList(input, "combatActions")), backgrounds: Object.freeze(statList(input, "backgrounds")), mount: { name: statText(input, "mountName"), type: statText(input, "mountType"), power: statNumber(input, "mountPower"), resistance: statNumber(input, "mountResistance"), equipment: Object.freeze(statList(input, "mountEquipment")) } };
    }
    case "Assimilação RPG": {
      const sheet = base as AssimilacaoLegacySheet;
      return { ...sheet, ...identityFields, archetype: statText(input, "arquetipo") || input.classLevel || "", vigor: statTrack(input, "vigor"), integrity: statTrack(input, "integridade"), progress: statNumber(input, "progresso"), conditions: Object.freeze(statList(input, "condicoes")), customFields: Object.freeze({ resource: statText(input, "recurso") }) };
    }
  }
}
