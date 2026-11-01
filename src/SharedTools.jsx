import React, { useEffect, useRef, useState } from "react";

export const makeId = () => crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random();
const SHA256_ROUND = new Uint32Array([
  0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
  0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
  0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
  0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
  0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
]);
function rotateRight(value, bits) { return (value >>> bits) | (value << (32 - bits)); }
function sha256Fallback(bytes) {
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64, padded = new Uint8Array(paddedLength);
  padded.set(bytes); padded[bytes.length] = 0x80;
  let bitLength = BigInt(bytes.length) * 8n;
  for (let index = 0; index < 8; index += 1) { padded[padded.length - 1 - index] = Number(bitLength & 0xffn); bitLength >>= 8n; }
  const state = new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]), words = new Uint32Array(64);
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let index = 0; index < 16; index += 1) { const start = offset + index * 4; words[index] = ((padded[start] << 24) | (padded[start + 1] << 16) | (padded[start + 2] << 8) | padded[start + 3]) >>> 0; }
    for (let index = 16; index < 64; index += 1) {
      const x = words[index - 15], y = words[index - 2], s0 = rotateRight(x, 7) ^ rotateRight(x, 18) ^ (x >>> 3), s1 = rotateRight(y, 17) ^ rotateRight(y, 19) ^ (y >>> 10);
      words[index] = (words[index - 16] + s0 + words[index - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = state;
    for (let index = 0; index < 64; index += 1) {
      const sum1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25), choose = (e & f) ^ (~e & g), first = (h + sum1 + choose + SHA256_ROUND[index] + words[index]) >>> 0;
      const sum0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22), majority = (a & b) ^ (a & c) ^ (b & c), second = (sum0 + majority) >>> 0;
      h = g; g = f; f = e; e = (d + first) >>> 0; d = c; c = b; b = a; a = (first + second) >>> 0;
    }
    state[0] = (state[0] + a) >>> 0; state[1] = (state[1] + b) >>> 0; state[2] = (state[2] + c) >>> 0; state[3] = (state[3] + d) >>> 0;
    state[4] = (state[4] + e) >>> 0; state[5] = (state[5] + f) >>> 0; state[6] = (state[6] + g) >>> 0; state[7] = (state[7] + h) >>> 0;
  }
  return Array.from(state, value => value.toString(16).padStart(8, "0")).join("");
}
export async function sha256Hex(blob) {
  const bytes = await blob.arrayBuffer();
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  }
  return sha256Fallback(new Uint8Array(bytes));
}
export const readImage = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
  reader.onload = () => resolve(String(reader.result));
  reader.readAsDataURL(file);
});

export async function resizeImage(file, maxEdge = 2048) {
  if (!file || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("Use PNG, JPG ou WebP.");
  if (file.size > 30 * 1024 * 1024) throw new Error("A imagem deve ter até 30 MB.");
  const limit = Math.min(2048, Math.max(1, Math.trunc(maxEdge) || 2048));
  let bitmap = null, image = null, width = 0, height = 0, source = null, sourceUrl = "";
  try {
    if (typeof createImageBitmap === "function") {
      bitmap = await createImageBitmap(file);
      source = bitmap;
      width = bitmap.width;
      height = bitmap.height;
    } else {
      sourceUrl = URL.createObjectURL(file);
      image = new Image();
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error("Não foi possível abrir a imagem."));
        image.src = sourceUrl;
      });
      source = image;
      width = image.naturalWidth;
      height = image.naturalHeight;
    }
    const scale = Math.min(1, limit / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Não foi possível preparar a imagem.");
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error("Não foi possível comprimir a imagem.")), "image/webp", 0.85));
    const baseName = file.name.replace(/\.[^.]+$/, "") || "imagem";
    return new File([blob], baseName + ".webp", { type: "image/webp", lastModified: Date.now() });
  } finally {
    bitmap?.close();
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  }
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


