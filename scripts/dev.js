const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const envFile = path.join(root, ".env");
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

const apiPort = Number(process.env.PORT || 3001);
const apiHealth = `http://127.0.0.1:${apiPort}/api/health`;
const api = spawn(process.execPath, [path.join(root, "server.js")], {
  cwd: root,
  env: process.env,
  stdio: "inherit",
});

let vite = null;
let stopping = false;
let apiExited = false;

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = exitCode;
  vite?.kill();
  api.kill();
}

api.on("error", error => {
  console.error("Não foi possível iniciar a API:", error.message);
  stop(1);
});
api.on("exit", code => {
  apiExited = true;
  if (!stopping) {
    console.error("A API encerrou antes do Vite.");
    stop(code || 1);
  }
});

async function waitForApi(timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline && !apiExited) {
    try {
      const response = await fetch(apiHealth, { signal: AbortSignal.timeout(1000) });
      if (response.ok) {
        const health = await response.json();
        if (health.ok) return;
      }
    } catch (_) {
      // A API ainda está iniciando.
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error(`A API não ficou disponível em ${apiHealth} dentro de ${timeoutMs / 1000}s.`);
}

async function main() {
  try {
    await waitForApi();
  } catch (error) {
    console.error(error.message);
    stop(1);
    return;
  }

  console.log("API pronta; iniciando o Vite.");
  vite = spawn(process.execPath, [path.join(root, "node_modules", "vite", "bin", "vite.js"), "--host", "0.0.0.0"], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });
  vite.on("error", error => {
    console.error("Não foi possível iniciar o Vite:", error.message);
    stop(1);
  });
  vite.on("exit", code => {
    if (!stopping) stop(code || 0);
  });
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
main();