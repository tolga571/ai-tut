import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
dotenv.config({ path: path.join(__dirname, ".env.bot") });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BASE_URL = process.env.TELEGRAM_API_BASE_URL || "https://api.telegram.org";
const WORKSPACE_ROOT = process.env.AGENT_WORKSPACE_ROOT || process.cwd();
const DEFAULT_PROVIDER = (process.env.AGENT_DEFAULT_PROVIDER || "auto").toLowerCase();
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5-coder:7b";
const CURSOR_COMMAND = process.env.CURSOR_COMMAND || "";
const MAX_OUTPUT_CHARS = Number(process.env.MAX_OUTPUT_CHARS || "3500");
const MAX_RUNTIME_MS = Number(process.env.MAX_RUNTIME_MS || "120000");
const TELEGRAM_ALLOW_ALL = String(process.env.TELEGRAM_ALLOW_ALL || "false").toLowerCase() === "true";

const SAFE_COMMANDS = new Set(
  (process.env.SAFE_COMMANDS ||
    "git,npm,pnpm,yarn,node,npx,python,pytest,ls,dir,cat,type,rg,echo,pwd,cd")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
);

const ALLOWED_USER_IDS = new Set(
  (process.env.TELEGRAM_ALLOWED_USER_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);

if (!BOT_TOKEN) {
  console.error("Missing TELEGRAM_BOT_TOKEN. Set it in environment or .env.bot.");
  process.exit(1);
}

if (!TELEGRAM_ALLOW_ALL && ALLOWED_USER_IDS.size === 0) {
  console.error("Missing TELEGRAM_ALLOWED_USER_IDS. Refusing to start for security.");
  process.exit(1);
}

let offset = 0;
let processing = false;
const queue = [];
let currentCwd = WORKSPACE_ROOT;

function clip(text, limit = MAX_OUTPUT_CHARS) {
  if (!text) return "";
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}\n\n... [truncated]`;
}

function usage() {
  return [
    "Komutlar:",
    "/help - Yardim",
    "/status - Servis durumu",
    "/whoami - Telegram user id goster",
    "/cwd [path] - Calisma klasorunu gor / ayarla",
    "/run <komut> - Guvenli shell komutu calistir (allowlist)",
    "/gemini <prompt> - Gemini CLI ile calistir",
    "/ollama <prompt> - Ollama ile calistir",
    "/auto <prompt> - Otomatik provider sec",
    "/cursor <prompt> - CURSOR_COMMAND tanimliysa calistir",
  ].join("\n");
}

async function tg(method, payload = {}) {
  const url = `${BASE_URL}/bot${BOT_TOKEN}/${method}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Telegram API error (${method}): ${JSON.stringify(data)}`);
  }
  return data.result;
}

async function sendMessage(chatId, text) {
  await tg("sendMessage", {
    chat_id: chatId,
    text: clip(text, 3900),
    disable_web_page_preview: true,
  });
}

function runProcess(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd || currentCwd,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, opts.timeoutMs || MAX_RUNTIME_MS);

    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        code: timedOut ? 124 : code ?? 0,
        stdout: clip(stdout),
        stderr: clip(stderr),
        timedOut,
      });
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({
        code: 1,
        stdout: "",
        stderr: String(err?.message || err),
        timedOut: false,
      });
    });
  });
}

function firstToken(command) {
  const trimmed = command.trim();
  if (!trimmed) return "";
  const m = trimmed.match(/^([^\s]+)/);
  return (m?.[1] || "").toLowerCase();
}

async function runSafeShell(command) {
  const token = firstToken(command);
  if (!SAFE_COMMANDS.has(token)) {
    return {
      ok: false,
      output: `Blocked. Allowed commands: ${Array.from(SAFE_COMMANDS).join(", ")}`,
    };
  }

  const result = await runProcess("powershell.exe", ["-NoProfile", "-Command", command], {
    timeoutMs: MAX_RUNTIME_MS,
  });

  const body = [
    `exit: ${result.code}${result.timedOut ? " (timeout)" : ""}`,
    result.stdout ? `stdout:\n${result.stdout}` : "",
    result.stderr ? `stderr:\n${result.stderr}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return { ok: result.code === 0, output: body || "No output" };
}

async function runGemini(prompt) {
  const args = ["-p", prompt, "--approval-mode", "plan", "--output-format", "text"];
  const result = await runProcess("gemini", args, { timeoutMs: MAX_RUNTIME_MS });
  const output = [result.stdout, result.stderr].filter(Boolean).join("\n\n").trim();
  return { ok: result.code === 0, output: output || `gemini exit ${result.code}` };
}

async function runOllama(prompt) {
  const result = await runProcess("ollama", ["run", OLLAMA_MODEL, prompt], {
    timeoutMs: MAX_RUNTIME_MS,
  });
  const output = [result.stdout, result.stderr].filter(Boolean).join("\n\n").trim();
  return { ok: result.code === 0, output: output || `ollama exit ${result.code}` };
}

async function runCursor(prompt) {
  if (!CURSOR_COMMAND) {
    return {
      ok: false,
      output:
        "CURSOR_COMMAND tanimli degil. .env.bot icine CURSOR_COMMAND ekleyin.",
    };
  }

  const cmd = CURSOR_COMMAND.replace(/\{prompt\}/g, prompt);
  return runSafeShell(cmd);
}

async function runAuto(prompt) {
  const gemini = await runGemini(prompt);
  if (gemini.ok) return { provider: "gemini", ...gemini };

  const ollama = await runOllama(prompt);
  if (ollama.ok) return { provider: "ollama", ...ollama };

  return {
    provider: "none",
    ok: false,
    output: `Auto fallback failed.\nGemini:\n${gemini.output}\n\nOllama:\n${ollama.output}`,
  };
}

async function handleCommand(text) {
  const trimmed = (text || "").trim();
  if (!trimmed) return "Bos komut.";

  if (trimmed === "/help" || trimmed === "/start") return usage();
  if (trimmed === "/status") {
    return [
      "Agent: up",
      `cwd: ${currentCwd}`,
      `queue: ${queue.length}${processing ? " (busy)" : ""}`,
      `default provider: ${DEFAULT_PROVIDER}`,
      `allowed commands: ${Array.from(SAFE_COMMANDS).join(", ")}`,
    ].join("\n");
  }

  if (trimmed.startsWith("/cwd")) {
    const next = trimmed.replace("/cwd", "").trim();
    if (!next) return `cwd: ${currentCwd}`;
    const resolved = path.resolve(currentCwd, next);
    const rootResolved = path.resolve(WORKSPACE_ROOT);
    if (!resolved.toLowerCase().startsWith(rootResolved.toLowerCase())) {
      return `Blocked. cwd must stay under workspace root: ${rootResolved}`;
    }
    currentCwd = resolved;
    return `cwd updated: ${currentCwd}`;
  }

  if (trimmed.startsWith("/run ")) {
    const command = trimmed.replace("/run ", "").trim();
    const result = await runSafeShell(command);
    return result.output;
  }

  if (trimmed.startsWith("/gemini ")) {
    const prompt = trimmed.replace("/gemini ", "").trim();
    const result = await runGemini(prompt);
    return result.output;
  }

  if (trimmed.startsWith("/ollama ")) {
    const prompt = trimmed.replace("/ollama ", "").trim();
    const result = await runOllama(prompt);
    return result.output;
  }

  if (trimmed.startsWith("/cursor ")) {
    const prompt = trimmed.replace("/cursor ", "").trim();
    const result = await runCursor(prompt);
    return result.output;
  }

  if (trimmed.startsWith("/auto ")) {
    const prompt = trimmed.replace("/auto ", "").trim();
    const result = await runAuto(prompt);
    return `[provider=${result.provider}]\n${result.output}`;
  }

  if (DEFAULT_PROVIDER === "gemini") {
    const result = await runGemini(trimmed);
    return result.output;
  }
  if (DEFAULT_PROVIDER === "ollama") {
    const result = await runOllama(trimmed);
    return result.output;
  }
  if (DEFAULT_PROVIDER === "cursor") {
    const result = await runCursor(trimmed);
    return result.output;
  }

  const result = await runAuto(trimmed);
  return `[provider=${result.provider}]\n${result.output}`;
}

async function processQueue() {
  if (processing) return;
  processing = true;
  while (queue.length > 0) {
    const job = queue.shift();
    try {
      await sendMessage(job.chatId, "Islem alindi...");
      const output = await handleCommand(job.text);
      await sendMessage(job.chatId, output || "Done.");
    } catch (error) {
      await sendMessage(job.chatId, `Error: ${String(error?.message || error)}`);
    }
  }
  processing = false;
}

function isAllowedUser(update) {
  if (TELEGRAM_ALLOW_ALL) return true;
  const fromId = update?.message?.from?.id;
  if (!fromId) return false;
  return ALLOWED_USER_IDS.has(String(fromId));
}

async function pollLoop() {
  while (true) {
    try {
      const updates = await tg("getUpdates", {
        timeout: 30,
        offset,
        allowed_updates: ["message"],
      });

      for (const update of updates) {
        offset = update.update_id + 1;
        const text = update?.message?.text || "";
        const chatId = update?.message?.chat?.id;
        if (!chatId || !text) continue;

        if (text.trim() === "/whoami") {
          const fromId = update?.message?.from?.id;
          await sendMessage(chatId, `your user id: ${fromId ?? "unknown"}`);
          continue;
        }

        if (!isAllowedUser(update)) {
          await sendMessage(chatId, "Unauthorized user.");
          continue;
        }

        queue.push({ chatId, text });
        void processQueue();
      }
    } catch (error) {
      console.error("[pollLoop]", error);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}

console.log("Telegram orchestrator starting...");
console.log(`workspace: ${WORKSPACE_ROOT}`);
console.log(`default provider: ${DEFAULT_PROVIDER}`);
pollLoop().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
