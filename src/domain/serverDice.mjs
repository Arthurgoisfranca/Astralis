/** Resolve rolagens pedidas pelo cliente. Roda no servidor com um sorteador seguro;
 * o cliente só informa o tipo da rolagem e os parâmetros, nunca os dados. */
import { triangleAgency, daggerheart, vampireV5, cthulhu7, dnd5, sacramento } from "./diceEngines.mjs";
import { cairnSave, ordemBasic, ordemWithPavor, rollExpression, die } from "./manualRules.mjs";
import { vampireAlpha2, alphaReroll } from "./vampireAlpha2.mjs";

export const ROLL_KINDS = ["triangle", "daggerheart", "vampireV5", "cthulhu", "dnd", "sacramento", "ordem", "cairn", "alpha2", "alpha2Reroll", "expression", "free"];
const STEP_DICE = [4, 6, 8, 10, 12, 20];
const FREE_DICE = [4, 6, 8, 10, 12, 20, 100];

function int(value, min, max, label) {
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(Math.trunc(n))) throw new Error(`${label}: informe um número.`);
  const v = Math.trunc(n);
  if (v < min || v > max) throw new Error(`${label}: use um valor entre ${min} e ${max}.`);
  return v;
}
const optionalInt = (value, min, max, label, fallback) => value === undefined || value === null || value === "" ? fallback : int(value, min, max, label);
function step(value, label) {
  const sides = Number(String(value ?? "").replace(/^d/i, ""));
  if (!STEP_DICE.includes(sides)) throw new Error(`${label}: use d4, d6, d8, d10, d12 ou d20.`);
  return sides;
}

/** @param {{kind:string, params?:object}} request
 *  @param {() => number} rng sorteador em [0, 1)
 *  @param {{lastAlpha?: object}} context última rolagem Alpha 2.0 deste participante, para a rerrolagem */
export function resolveRoll(request, rng, context = {}) {
  const kind = String(request?.kind || ""), p = request?.params && typeof request.params === "object" ? request.params : {};
  if (!ROLL_KINDS.includes(kind)) throw new Error("Tipo de rolagem desconhecido.");
  switch (kind) {
    case "triangle": return triangleAgency(rng);
    case "daggerheart": return daggerheart({ attribute: optionalInt(p.attribute, -10, 20, "Atributo", 0), bonus: optionalInt(p.bonus, -50, 50, "Modificador", 0), difficulty: optionalInt(p.difficulty, 1, 100, "Dificuldade", 12) }, rng);
    case "vampireV5": return vampireV5({ pool: int(p.pool, 1, 30, "Parada"), hunger: optionalInt(p.hunger, 0, 5, "Fome", 0), difficulty: optionalInt(p.difficulty, 1, 30, "Sucessos necessários", 1) }, rng);
    case "cthulhu": return cthulhu7({ skill: int(p.skill, 0, 100, "Perícia (%)") }, rng);
    case "dnd": return dnd5({
      advantage: ["normal", "advantage", "disadvantage"].includes(p.advantage) ? p.advantage : "normal",
      attributeScore: optionalInt(p.attributeScore, 1, 30, "Valor do atributo", 10),
      proficiency: optionalInt(p.proficiency, -10, 20, "Proficiência", 0),
      bonus: optionalInt(p.bonus, -50, 50, "Modificador", 0),
      difficulty: optionalInt(p.difficulty, 1, 60, "Dificuldade", 12),
      kind: p.kind === "attack" ? "attack" : "check",
    }, rng);
    case "sacramento": return sacramento({
      antecedent: optionalInt(p.antecedent, -20, 20, "Modificador", 0), difficulty: optionalInt(p.difficulty, 1, 50, "Defesa", 5),
      physical: optionalInt(p.physical, 0, 20, "Físico", 0), speed: optionalInt(p.speed, 0, 20, "Velocidade", 0),
      intellect: optionalInt(p.intellect, 0, 20, "Intelecto", 0), courage: optionalInt(p.courage, 0, 20, "Coragem", 0),
      pain: optionalInt(p.pain, 0, 6, "Dor", 0), housePenalty: p.housePenalty === true,
    }, rng);
    case "ordem": {
      const args = { skillSides: step(p.skillSides, "Dado de perícia"), attributeSides: step(p.attributeSides, "Dado de atributo"), difficulty: optionalInt(p.difficulty, 1, 60, "DT", 7) };
      return p.pavor === true ? ordemWithPavor({ ...args, pavorSides: step(p.pavorSides, "Dado de Pavor") }, rng) : ordemBasic(args, rng);
    }
    case "cairn": {
      const save = cairnSave(int(p.attribute, 0, 20, "Atributo Cairn"), rng);
      const label = ["str", "dex", "wil"].includes(p.ability) ? p.ability.toUpperCase() : "ATRIBUTO";
      return { ...save, dice: [save.value], good: save.success, title: save.success ? "Salvaguarda bem-sucedida" : "Falha na salvaguarda", detail: `1d20 (${save.value}) ≤ ${label} ${save.target}. 1 sempre passa; 20 sempre falha.` };
    }
    case "alpha2": return vampireAlpha2({ pool: int(p.pool, 1, 100, "Parada"), hunger: optionalInt(p.hunger, 0, 5, "Fome", 0), difficulty: optionalInt(p.difficulty, 1, 100, "Dificuldade", 1) }, rng);
    case "alpha2Reroll": {
      const last = context.lastAlpha;
      if (!last || last.id !== p.rollId) throw new Error("Rerrole a partir da última rolagem feita nesta ficha.");
      if (last.rerolled) throw new Error("Esta rolagem já foi rerrolada.");
      const indices = Array.isArray(p.indices) ? p.indices.map(Number) : [];
      return alphaReroll(last.result, indices, rng);
    }
    case "expression": return rollExpression(String(p.expression || "").slice(0, 20), rng);
    case "free": {
      const sides = Number(p.sides), count = int(p.count, 1, 20, "Quantidade");
      if (!FREE_DICE.includes(sides)) throw new Error("Tipo de dado inválido.");
      return { dice: Array.from({ length: count }, () => die(sides, rng)), sides };
    }
  }
}

/** Sistemas cujas rolagens alimentam o Escudo do Mestre (Caos e Medo). */
export const RECORDED_KINDS = { triangle: "Triangle Agency", daggerheart: "Daggerheart" };
