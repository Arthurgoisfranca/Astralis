const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const Database = require("better-sqlite3");
const { createClient } = require("@supabase/supabase-js");

const dataDir = path.resolve(process.env.DATA_DIR || path.join(__dirname, "..", "data"));
const databasePath = path.join(dataDir, "mesa.sqlite");
const bucketMap = {
  "mesa-assets": process.env.SUPABASE_PUBLIC_BUCKET || "mesa-assets",
  "mesa-private": process.env.SUPABASE_PRIVATE_BUCKET || "mesa-private",
  "mesa-community": process.env.SUPABASE_COMMUNITY_BUCKET || "mesa-community"
};
const mimeByExtension = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".pdf": "application/pdf", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };

function createdAt(value) {
  const date = typeof value === "number" ? new Date(value) : new Date(value || Date.now());
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}
async function uploadObject(supabase, bucket, objectPath, body, contentType) {
  const { error } = await supabase.storage.from(bucket).upload(objectPath, body, { contentType, upsert: true });
  if (error) throw error;
}
async function uploadExistingFiles(supabase) {
  let copied = 0;
  for (const [sourceBucket, targetBucket] of Object.entries(bucketMap)) {
    const bucketDir = path.join(dataDir, "uploads", sourceBucket);
    if (!fs.existsSync(bucketDir)) continue;
    const queue = [bucketDir];
    while (queue.length) {
      const current = queue.pop();
      for (const item of fs.readdirSync(current, { withFileTypes: true })) {
        const absolute = path.join(current, item.name);
        if (item.isDirectory()) { queue.push(absolute); continue; }
        const objectPath = path.relative(bucketDir, absolute).split(path.sep).join("/");
        const type = mimeByExtension[path.extname(item.name).toLowerCase()] || "application/octet-stream";
        await uploadObject(supabase, targetBucket, objectPath, fs.readFileSync(absolute), type);
        copied++;
      }
    }
  }
  return copied;
}
async function rewriteState(supabase, value, roomId) {
  if (Array.isArray(value)) return Promise.all(value.map(item => rewriteState(supabase, item, roomId)));
  if (value && typeof value === "object") {
    const result = {};
    for (const [key, item] of Object.entries(value)) {
      if (key === "bucket" && typeof item === "string" && bucketMap[item]) result[key] = bucketMap[item];
      else result[key] = await rewriteState(supabase, item, roomId);
    }
    return result;
  }
  if (typeof value !== "string") return value;
  const inline = value.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (inline) {
    const ext = inline[1] === "jpeg" ? "jpg" : inline[1], objectPath = roomId + "/gm/migrated-" + crypto.randomBytes(8).toString("hex") + "." + ext;
    await uploadObject(supabase, bucketMap["mesa-assets"], objectPath, Buffer.from(inline[2], "base64"), "image/" + inline[1]);
    return supabase.storage.from(bucketMap["mesa-assets"]).getPublicUrl(objectPath).data.publicUrl;
  }
  const local = value.match(/^\/files\/(mesa-assets|mesa-private|mesa-community)\/(.+)$/);
  if (local) {
    const targetBucket = bucketMap[local[1]], objectPath = decodeURIComponent(local[2]);
    return local[1] === "mesa-private" ? value : supabase.storage.from(targetBucket).getPublicUrl(objectPath).data.publicUrl;
  }
  return value;
}

async function main() {
  if (!process.env.SUPABASE_URL || !(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)) throw new Error("Configure SUPABASE_URL e SUPABASE_SECRET_KEY no ambiente ou em .env.");
  if (!fs.existsSync(databasePath)) throw new Error("Banco local não encontrado em " + databasePath);
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const db = new Database(databasePath, { readonly: true });
  const rooms = db.prepare("SELECT id, gm_token, invite_token, state, created_at FROM rooms").all();
  const filesCopied = await uploadExistingFiles(supabase);
  let roomsCopied = 0;
  for (const room of rooms) {
    const inviteToken = room.invite_token || crypto.randomBytes(24).toString("hex");
    const state = await rewriteState(supabase, JSON.parse(room.state), room.id);
    const { error } = await supabase.from("rooms").upsert({ id: room.id, gm_token: room.gm_token, invite_token: inviteToken, state, created_at: createdAt(room.created_at) }, { onConflict: "id", ignoreDuplicates: true });
    if (error) throw error;
    roomsCopied++;
  }
  let libraryCopied = 0;
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='community_files'").get();
  if (tables) {
    for (const row of db.prepare("SELECT id,title,system,uploader,bucket,file_path,file_name,created_at FROM community_files").all()) {
      const target = { ...row, bucket: bucketMap[row.bucket] || row.bucket, created_at: createdAt(row.created_at) };
      const { error } = await supabase.from("community_library").upsert(target, { onConflict: "id", ignoreDuplicates: true });
      if (error) throw error;
      libraryCopied++;
    }
  }
  db.close();
  console.log(`Migração concluída: ${roomsCopied} salas, ${filesCopied} arquivos e ${libraryCopied} PDFs da biblioteca processados.`);
  console.log("Os arquivos locais foram mantidos como cópia. Registros que já existiam no Supabase não foram sobrescritos.");
}
main().catch(error => { console.error("Falha na migração:", error.message); process.exitCode = 1; });