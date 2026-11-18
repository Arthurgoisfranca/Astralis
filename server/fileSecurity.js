"use strict";
/** Regras de segurança de arquivos: tipo real pelo conteúdo, extensão derivada do tipo,
 * caminhos de Storage sem travessia e permissão de upload por papel. */

const FAMILY_BY_MIME = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "zip",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/ogg": "ogg",
  "audio/webm": "webm",
  "audio/mp4": "mp4",
  "audio/x-m4a": "mp4",
};
const EXTENSION_BY_FAMILY = { png: ".png", jpeg: ".jpg", webp: ".webp", pdf: ".pdf", zip: ".docx", mp3: ".mp3", wav: ".wav", ogg: ".ogg", webm: ".webm", mp4: ".m4a" };
const IMAGE_FAMILIES = new Set(["png", "jpeg", "webp"]);

const ascii = (buffer, start, end) => buffer.subarray(start, end).toString("latin1");

/** Identifica o formato pelos primeiros bytes. Devolve a família ou null. */
function sniffFamily(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return null;
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpeg";
  if (buffer.length >= 12 && ascii(buffer, 0, 4) === "RIFF" && ascii(buffer, 8, 12) === "WEBP") return "webp";
  if (buffer.length >= 12 && ascii(buffer, 0, 4) === "RIFF" && ascii(buffer, 8, 12) === "WAVE") return "wav";
  if (ascii(buffer, 0, 5) === "%PDF-") return "pdf";
  if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) return "zip";
  if (ascii(buffer, 0, 4) === "OggS") return "ogg";
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) return "webm";
  if (buffer.length >= 8 && ascii(buffer, 4, 8) === "ftyp") return "mp4";
  if (ascii(buffer, 0, 3) === "ID3" || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)) return "mp3";
  return null;
}

/** O MIME declarado é aceito e o conteúdo corresponde a ele. */
function contentMatchesMime(buffer, mime) {
  const expected = FAMILY_BY_MIME[mime];
  return Boolean(expected) && sniffFamily(buffer) === expected;
}

/** Extensão segura escolhida pelo tipo verificado, nunca pelo nome enviado. */
function extensionFor(mime) {
  return EXTENSION_BY_FAMILY[FAMILY_BY_MIME[mime]] || ".bin";
}

/** Valida um caminho "<sala>/<dono>/<arquivo>" sem segmentos vazios, "." ou "..".
 * Devolve os segmentos ou null. */
function safeStoragePath(roomId, filePath) {
  const value = String(filePath || "");
  if (!value || value.length > 600 || value.includes("\\") || value.includes("\0")) return null;
  const segments = value.split("/");
  if (segments.length < 3 || segments[0] !== String(roomId)) return null;
  if (segments.some(segment => !segment || segment === "." || segment === ".." || !/^[A-Za-z0-9_.-]+$/.test(segment))) return null;
  return segments;
}

/** Permissão de upload pelo papel e pelo MIME declarado (o conteúdo é conferido depois).
 * Mestre: qualquer tipo aceito; biblioteca só PDF.
 * Jogador: retrato (imagem) em public, ficha em PDF em private, PDF na biblioteca. */
function uploadAllowed(role, scope, mime) {
  const family = FAMILY_BY_MIME[mime];
  if (!family) return false;
  if (scope === "community") return family === "pdf";
  if (role === "gm") return true;
  if (scope === "public") return IMAGE_FAMILIES.has(family);
  if (scope === "private") return family === "pdf";
  return false;
}

module.exports = { sniffFamily, contentMatchesMime, extensionFor, safeStoragePath, uploadAllowed, FAMILY_BY_MIME };
