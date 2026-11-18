import { useState } from "react";
import { Modal } from "./SharedTools.jsx";
import { CUSTOM_TEMPLATES, FIELD_TYPES, computeCalculated, normalizeTemplate, validateTemplate } from "./domain/customSheet.mjs";

const TYPE_LABELS = { texto: "Texto", textoLongo: "Texto longo", numero: "Número", booleano: "Caixa de seleção", selecao: "Seleção", lista: "Lista de linhas", recurso: "Barra de recurso", atributo: "Atributo", pericia: "Perícia", calculado: "Campo calculado" };
const trackParts = value => { const [a = "", b = ""] = String(value || "").split("/"); return [a, b]; };

// Ficha preenchida pelo jogador, dirigida pelo template da mesa.
function CustomSheetFiller({ template, stats, onChange, roll }) {
  const calculated = computeCalculated(template, stats);
  const rollField = async field => {
    const expr = String(field.roll || "").replace(/\{([^}]*)\}/g, (_, key) => String(Number(String(stats[key.trim()] ?? "").split("/")[0]) || 0));
    try { await roll("expression", { expression: expr }); } catch (_) { /* o aviso aparece no toast global */ }
  };
  return <div className="custom-sheet">{template.sections.map(section => <section className="studio-section" key={section.id}>
    <header><h3>{section.title}</h3></header>
    <div className="studio-fields">{section.fields.map(field => {
      const value = stats[field.key] ?? "";
      if (field.type === "textoLongo") return <label className="studio-field studio-field-wide" key={field.key}>{field.label}<textarea rows={3} value={value} onChange={e => onChange(field.key, e.target.value)}/></label>;
      if (field.type === "numero" || field.type === "atributo" || field.type === "pericia") return <label className="studio-field" key={field.key}>{field.label}{field.roll && <button type="button" className="button quiet roll-inline" onClick={() => rollField(field)}>🎲</button>}<input type="number" value={value} onChange={e => onChange(field.key, e.target.value)}/></label>;
      if (field.type === "booleano") return <label className="studio-field checkbox-field" key={field.key}><input type="checkbox" checked={value === "sim"} onChange={e => onChange(field.key, e.target.checked ? "sim" : "")}/>{field.label}</label>;
      if (field.type === "selecao") return <label className="studio-field" key={field.key}>{field.label}<select value={value} onChange={e => onChange(field.key, e.target.value)}><option value="">—</option>{(field.options || []).map(o => <option key={o} value={o}>{o}</option>)}</select></label>;
      if (field.type === "lista") return <label className="studio-field studio-field-wide" key={field.key}>{field.label}<textarea rows={4} placeholder="Uma linha por item" value={value} onChange={e => onChange(field.key, e.target.value)}/></label>;
      if (field.type === "recurso") { const [cur, max] = trackParts(value); return <div className="studio-track" key={field.key}><span>{field.label}</span><div className="track-inputs"><input aria-label={field.label + " atual"} type="number" value={cur} onChange={e => onChange(field.key, e.target.value + "/" + max)}/><i>/</i><input aria-label={field.label + " máximo"} type="number" value={max} onChange={e => onChange(field.key, cur + "/" + e.target.value)}/></div></div>; }
      if (field.type === "calculado") { const r = calculated[field.key]; return <label className="studio-field" key={field.key}>{field.label}<output className={r?.ok ? "" : "field-warning"}>{r?.ok ? r.value : (r?.warning || "—")}</output></label>; }
      return <label className="studio-field" key={field.key}>{field.label}{field.roll && <button type="button" className="button quiet roll-inline" onClick={() => rollField(field)}>🎲</button>}<input value={value} onChange={e => onChange(field.key, e.target.value)}/></label>;
    })}</div>
  </section>)}</div>;
}

// Construtor do template (mestre e co-mestre).
function CustomSheetBuilder({ template, onApply, onClose }) {
  const [draft, setDraft] = useState(() => normalizeTemplate(template));
  const [notice, setNotice] = useState("");
  const update = next => setDraft(normalizeTemplate(next));
  const addSection = () => update({ ...draft, sections: [...draft.sections, { id: "sec" + Date.now(), title: "Nova seção", fields: [] }] });
  const addField = si => update({ ...draft, sections: draft.sections.map((s, i) => i === si ? { ...s, fields: [...s.fields, { id: "f" + Date.now(), key: "", label: "Novo campo", type: "texto" }] } : s) });
  const editField = (si, fi, patch) => update({ ...draft, sections: draft.sections.map((s, i) => i === si ? { ...s, fields: s.fields.map((f, j) => j === fi ? { ...f, ...patch } : f) } : s) });
  const moveField = (si, fi, dir) => { const fields = [...draft.sections[si].fields]; const to = fi + dir; if (to < 0 || to >= fields.length) return; [fields[fi], fields[to]] = [fields[to], fields[fi]]; update({ ...draft, sections: draft.sections.map((s, i) => i === si ? { ...s, fields } : s) }); };
  const removeField = (si, fi) => update({ ...draft, sections: draft.sections.map((s, i) => i === si ? { ...s, fields: s.fields.filter((_, j) => j !== fi) } : s) });
  const moveSection = (si, dir) => { const sections = [...draft.sections]; const to = si + dir; if (to < 0 || to >= sections.length) return; [sections[si], sections[to]] = [sections[to], sections[si]]; update({ ...draft, sections }); };
  const removeSection = si => update({ ...draft, sections: draft.sections.filter((_, i) => i !== si) });
  const exportJson = () => { const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "ficha-astralis.json"; a.click(); URL.revokeObjectURL(a.href); };
  const importJson = async e => { const file = e.target.files?.[0]; if (!file) return; const result = validateTemplate(await file.text()); if (result.ok) { update(result.template); setNotice("Modelo importado."); } else setNotice(result.error); };
  return <Modal title="Construtor de ficha" onClose={onClose}><div className="custom-builder">
    <div className="builder-toolbar">
      <select aria-label="Partir de um modelo" defaultValue="" onChange={e => { if (CUSTOM_TEMPLATES[e.target.value]) update({ ...CUSTOM_TEMPLATES[e.target.value] }); }}>
        <option value="">Partir de um modelo…</option>{Object.keys(CUSTOM_TEMPLATES).map(name => <option key={name} value={name}>{name}</option>)}
      </select>
      <button type="button" className="button quiet" onClick={exportJson}>Exportar</button>
      <label className="button quiet">Importar<input type="file" accept="application/json" hidden onChange={importJson}/></label>
    </div>
    <label className="studio-field">Nome da ficha<input value={draft.name} onChange={e => update({ ...draft, name: e.target.value })}/></label>
    {draft.sections.map((section, si) => <section className="builder-section" key={section.id}>
      <div className="builder-section-head">
        <input aria-label="Título da seção" value={section.title} onChange={e => update({ ...draft, sections: draft.sections.map((s, i) => i === si ? { ...s, title: e.target.value } : s) })}/>
        <div><button type="button" onClick={() => moveSection(si, -1)}>↑</button><button type="button" onClick={() => moveSection(si, 1)}>↓</button><button type="button" onClick={() => removeSection(si)}>×</button></div>
      </div>
      {section.fields.map((field, fi) => <div className="builder-field" key={field.id}>
        <input aria-label="Rótulo" placeholder="Rótulo" value={field.label} onChange={e => editField(si, fi, { label: e.target.value })}/>
        <input aria-label="Chave" placeholder="chave" value={field.key} onChange={e => editField(si, fi, { key: e.target.value })}/>
        <select aria-label="Tipo" value={field.type} onChange={e => editField(si, fi, { type: e.target.value })}>{FIELD_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}</select>
        {field.type === "selecao" && <input aria-label="Opções" placeholder="opção1, opção2" value={(field.options || []).join(", ")} onChange={e => editField(si, fi, { options: e.target.value.split(",").map(o => o.trim()).filter(Boolean) })}/>}
        {field.type === "calculado" && <input aria-label="Fórmula" placeholder="({forca} - 10) / 2" value={field.formula || ""} onChange={e => editField(si, fi, { formula: e.target.value })}/>}
        {(field.type === "numero" || field.type === "atributo" || field.type === "pericia") && <input aria-label="Rolagem" placeholder="1d20+{chave}" value={field.roll || ""} onChange={e => editField(si, fi, { roll: e.target.value })}/>}
        <button type="button" onClick={() => moveField(si, fi, -1)}>↑</button><button type="button" onClick={() => moveField(si, fi, 1)}>↓</button><button type="button" onClick={() => removeField(si, fi)}>×</button>
      </div>)}
      <button type="button" className="button quiet" onClick={() => addField(si)}>Adicionar campo</button>
    </section>)}
    <div className="builder-actions">
      <button type="button" className="button quiet" onClick={addSection}>Adicionar seção</button>
      <button type="button" className="button primary" onClick={() => onApply(draft)}>Salvar ficha da mesa</button>
    </div>
    {notice && <p role="status">{notice}</p>}
  </div></Modal>;
}

export function CustomSheetStudio({ player, room, isGM, send, roll, onClose, onSave }) {
  const template = normalizeTemplate(room.customSheet || CUSTOM_TEMPLATES["Em branco"]);
  const [stats, setStats] = useState(() => ({ ...(player.character?.stats || {}) }));
  const [builderOpen, setBuilderOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(player.character?.name || "");
  const change = (key, value) => setStats(old => ({ ...old, [key]: value }));
  const save = async () => {
    setSaving(true);
    try { await onSave({ ...(player.character || {}), name, stats, sheet: { system: "Outros", templateVersion: template.version } }); onClose(); }
    catch (error) { alert(error.message || "Não foi possível salvar."); }
    finally { setSaving(false); }
  };
  const applyTemplate = async draft => { const result = await send("customSheet:save", { template: draft }); if (result?.ok) setBuilderOpen(false); else alert(result?.error || "Não foi possível salvar a ficha da mesa."); };
  return <Modal title={"Ficha de " + player.name} onClose={onClose}>
    <div className="custom-studio">
      <div className="studio-identity"><input className="character-name-input" placeholder="Nome do personagem" value={name} onChange={e => setName(e.target.value)}/><span className="studio-system">{template.name}</span>{isGM && <button type="button" className="button secondary" onClick={() => setBuilderOpen(true)}>Editar ficha da mesa</button>}</div>
      <CustomSheetFiller template={template} stats={stats} onChange={change} roll={roll}/>
      <footer className="studio-footer"><button type="button" className="studio-cancel" onClick={onClose}>Fechar</button><button type="button" className="studio-save" disabled={saving} onClick={save}>{saving ? "Salvando…" : "Salvar ficha"}</button></footer>
    </div>
    {builderOpen && <CustomSheetBuilder template={room.customSheet || CUSTOM_TEMPLATES["Em branco"]} onApply={applyTemplate} onClose={() => setBuilderOpen(false)}/>}
  </Modal>;
}
