/** Sistema "Outros": modelo de ficha universal e avaliador de fórmula seguro (sem eval). */

export const CUSTOM_SYSTEM = "Outros";
export const FIELD_TYPES = ["texto", "textoLongo", "numero", "booleano", "selecao", "lista", "recurso", "atributo", "pericia", "calculado"];

const slug = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "campo";

/** Avaliador de expressão aritmética segura.
 * Suporta números, + - * / , parênteses e referências {chave}. Sem acesso a globais/funções. */
export function evalFormula(expression, values = {}) {
  const src = String(expression || "");
  const tokens = [];
  const re = /\s*(?:(\d+(?:\.\d+)?)|\{([^}]*)\}|([+\-*/()]))/y;
  let i = 0;
  while (i < src.length) {
    re.lastIndex = i;
    const m = re.exec(src);
    if (!m) return { ok: false, warning: "Fórmula inválida." };
    i = re.lastIndex;
    if (m[1] !== undefined) tokens.push({ t: "num", v: Number(m[1]) });
    else if (m[2] !== undefined) {
      const raw = values[m[2].trim()];
      const n = Number(String(raw ?? "").split("/")[0]);
      tokens.push({ t: "num", v: Number.isFinite(n) ? n : 0, ref: m[2].trim(), missing: raw === undefined || raw === "" });
    } else tokens.push({ t: "op", v: m[3] });
  }
  if (!tokens.length) return { ok: false, warning: "Fórmula vazia." };
  let pos = 0, divZero = false;
  const peek = () => tokens[pos];
  const eat = () => tokens[pos++];
  function parseExpr() {
    let left = parseTerm();
    if (left === null) return null;
    while (peek() && peek().t === "op" && (peek().v === "+" || peek().v === "-")) {
      const op = eat().v, right = parseTerm();
      if (right === null) return null;
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }
  function parseTerm() {
    let left = parseFactor();
    if (left === null) return null;
    while (peek() && peek().t === "op" && (peek().v === "*" || peek().v === "/")) {
      const op = eat().v, right = parseFactor();
      if (right === null) return null;
      if (op === "*") left *= right;
      else { if (right === 0) { divZero = true; return null; } left /= right; }
    }
    return left;
  }
  function parseFactor() {
    const tk = peek();
    if (!tk) return null;
    if (tk.t === "op" && tk.v === "-") { eat(); const v = parseFactor(); return v === null ? null : -v; }
    if (tk.t === "op" && tk.v === "(") { eat(); const v = parseExpr(); if (v === null) return null; if (!peek() || peek().v !== ")") return null; eat(); return v; }
    if (tk.t === "num") { eat(); return tk.v; }
    return null;
  }
  const result = parseExpr();
  if (divZero) return { ok: false, warning: "Divisão por zero." };
  if (result === null || pos !== tokens.length || !Number.isFinite(result)) return { ok: false, warning: "Fórmula inválida." };
  return { ok: true, value: Math.round(result * 100) / 100 };
}

function normalizeField(raw, usedKeys) {
  if (!raw || typeof raw !== "object") return null;
  const type = FIELD_TYPES.includes(raw.type) ? raw.type : "texto";
  const label = String(raw.label || "Campo").slice(0, 80);
  let key = slug(raw.key || label).slice(0, 40);
  while (usedKeys.has(key)) key += "_";
  usedKeys.add(key);
  const field = { id: String(raw.id || key), key, label, type };
  if (type === "selecao") field.options = (Array.isArray(raw.options) ? raw.options : []).map(o => String(o).slice(0, 60)).slice(0, 40);
  if (type === "recurso") field.max = Number(raw.max) || 0;
  if (type === "calculado") field.formula = String(raw.formula || "").slice(0, 200);
  if (raw.roll) field.roll = String(raw.roll).slice(0, 60);
  return field;
}

export function normalizeTemplate(raw) {
  const input = raw && typeof raw === "object" ? raw : {};
  const usedKeys = new Set();
  const sections = (Array.isArray(input.sections) ? input.sections : []).slice(0, 12).map((section, si) => ({
    id: String(section?.id || "sec" + si),
    title: String(section?.title || "Seção").slice(0, 60),
    fields: (Array.isArray(section?.fields) ? section.fields : []).slice(0, 40).map(f => normalizeField(f, usedKeys)).filter(Boolean),
  }));
  return {
    version: Number.isInteger(input.version) && input.version > 0 ? input.version : 1,
    name: String(input.name || "Ficha personalizada").slice(0, 80),
    sections: sections.length ? sections : BLANK_TEMPLATE.sections,
  };
}

/** Valida um template importado. Devolve {ok, template} ou {ok:false, error}. */
export function validateTemplate(raw) {
  try {
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!data || typeof data !== "object" || !Array.isArray(data.sections)) return { ok: false, error: "JSON de ficha inválido." };
    return { ok: true, template: normalizeTemplate(data) };
  } catch (_) { return { ok: false, error: "JSON inválido." }; }
}

const BLANK_TEMPLATE = {
  version: 1, name: "Ficha em branco",
  sections: [{ id: "geral", title: "Geral", fields: [
    { id: "conceito", key: "conceito", label: "Conceito", type: "texto" },
    { id: "notas", key: "notas", label: "Notas", type: "textoLongo" },
  ] }],
};

const D20_TEMPLATE = {
  version: 1, name: "d20 básico",
  sections: [
    { id: "atributos", title: "Atributos", fields: [
      ...["forca:Força", "destreza:Destreza", "constituicao:Constituição", "inteligencia:Inteligência", "sabedoria:Sabedoria", "carisma:Carisma"].map(pair => {
        const [key, label] = pair.split(":");
        return { id: key, key, label, type: "atributo" };
      }),
      { id: "mod_forca", key: "mod_forca", label: "Mod. Força", type: "calculado", formula: "({forca} - 10) / 2" },
    ] },
    { id: "recursos", title: "Recursos", fields: [
      { id: "pv", key: "pv", label: "Pontos de Vida", type: "recurso", max: 10 },
      { id: "ca", key: "ca", label: "Classe de Armadura", type: "numero" },
    ] },
    { id: "pericias", title: "Perícias", fields: [
      { id: "atletismo", key: "atletismo", label: "Atletismo", type: "pericia", roll: "1d20+{mod_forca}" },
    ] },
  ],
};

export const CUSTOM_TEMPLATES = { "Em branco": BLANK_TEMPLATE, "d20 básico": D20_TEMPLATE };

/** Valores calculados para render. Não lança; devolve mapa key -> {value|warning}. */
export function computeCalculated(template, values) {
  const out = {};
  for (const section of template.sections || []) for (const field of section.fields || []) {
    if (field.type === "calculado") out[field.key] = evalFormula(field.formula, values);
  }
  return out;
}
