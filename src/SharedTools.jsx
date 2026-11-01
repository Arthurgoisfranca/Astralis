import React, { useEffect, useRef, useState } from "react";

export const makeId = () => crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random();
export const readImage = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
  reader.onload = () => resolve(String(reader.result));
  reader.readAsDataURL(file);
});

export async function resizeImage(file, maxEdge = 1800) {
  if (!file || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("Use PNG, JPG ou WebP.");
  if (file.size > 12 * 1024 * 1024) throw new Error("A imagem deve ter até 12 MB.");
  const source = await readImage(file), image = new Image();
  await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error("Não foi possível abrir a imagem.")); image.src = source; });
  let scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas"); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
  const context = canvas.getContext("2d", { alpha: file.type === "image/png" }); context.drawImage(image, 0, 0, canvas.width, canvas.height);
  let blob = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", .88));
  if (!blob || blob.size > 7 * 1024 * 1024) {
    scale = Math.min(.7, 1200 / Math.max(image.width, image.height)); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height); blob = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", .76));
  }
  if (!blob) throw new Error("Não foi possível preparar a imagem.");
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
}

export function ImageDrop({ value, onChange, upload, kind = "image", label = "Arraste uma imagem ou escolha um arquivo", compact = false }) {
  const [dragging, setDragging] = useState(false), [busy, setBusy] = useState(false);
  async function choose(file) {
    if (!file) return;
    setBusy(true);
    try {
      const prepared = await resizeImage(file);
      if (!upload) { onChange(await readImage(prepared)); return; }
      const saved = await upload(prepared, { scope: "public", kind });
      onChange(saved.url);
    } catch (error) { alert(error.message || "Não foi possível enviar a imagem."); }
    finally { setBusy(false); }
  }
  return <label className={"drop-image " + (compact ? "compact" : "") + (dragging ? " dragging" : "")} onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); choose(event.dataTransfer.files[0]); }}>
    {value ? <img src={value} alt="Imagem selecionada"/> : <span>{busy ? "Preparando imagem…" : label}</span>}
    <input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={event => choose(event.target.files[0])}/>
  </label>;
}
export function Modal({ title, children, onClose }) {
  useEffect(() => {
    const fn = event => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);
  return <div className="modal-scrim" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="modal-card"><header><h2>{title}</h2><button type="button" className="close-button" onClick={onClose}>Fechar</button></header>{children}</section>
  </div>;
}

export function TokenMaker({ initial, onClose, onSave }) {
  const canvasRef = useRef(null);
  const [source, setSource] = useState(initial || "");
  const [color, setColor] = useState("#b77b48");
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d"), size = 360;
    canvas.width = size; canvas.height = size; ctx.clearRect(0, 0, size, size);
    if (!source) return;
    const image = new Image();
    image.onload = () => {
      ctx.save(); ctx.beginPath(); ctx.arc(size / 2, size / 2, size * .44, 0, Math.PI * 2); ctx.clip();
      const scale = Math.max(size * .88 / image.width, size * .88 / image.height) * zoom;
      const width = image.width * scale, height = image.height * scale;
      ctx.drawImage(image, (size - width) / 2, (size - height) / 2, width, height); ctx.restore();
      ctx.beginPath(); ctx.arc(size / 2, size / 2, size * .46, 0, Math.PI * 2); ctx.strokeStyle = color; ctx.lineWidth = 15; ctx.stroke();
      ctx.beginPath(); ctx.arc(size / 2, size / 2, size * .49, 0, Math.PI * 2); ctx.strokeStyle = "#efe3ce"; ctx.lineWidth = 3; ctx.stroke();
    };
    image.src = source;
  }, [source, color, zoom]);

  async function choose(file) {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 8 * 1024 * 1024) return alert("Escolha uma imagem de até 8 MB.");
    try { setSource(await readImage(file)); } catch (error) { alert(error.message); }
  }
  function download() {
    const link = document.createElement("a"); link.href = canvasRef.current.toDataURL("image/png"); link.download = "token.png"; link.click();
  }
  return <Modal title="Token Stamp" onClose={onClose}>
    <div className="token-maker"><canvas ref={canvasRef} aria-label="Prévia do token"/>
      <label className="button quiet file-button">Escolher imagem<input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => choose(event.target.files[0])}/></label>
      <label>Zoom<input type="range" min=".7" max="2.2" step=".05" value={zoom} onChange={event => setZoom(Number(event.target.value))}/></label>
      <label>Cor da moldura<input type="color" value={color} onChange={event => setColor(event.target.value)}/></label>
      <div className="modal-actions"><button className="button quiet" onClick={download} type="button">Baixar PNG</button><button className="button primary" type="button" onClick={() => onSave(canvasRef.current.toDataURL("image/png"))}>Usar na ficha</button></div>
    </div>
  </Modal>;
}


