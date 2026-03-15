# Telegram Orchestrator

Telegram botunu yerel agent kapisi olarak calistirir.

## Ozellikler
- Tek kuyruk (concurrency=1)
- User allowlist
- Guvenli shell allowlist (`/run`)
- Gemini CLI (`/gemini`)
- Ollama (`/ollama`)
- Auto fallback (`/auto`)
- Opsiyonel cursor komut hook'u (`CURSOR_COMMAND`)

## Kurulum
1. `tools/telegram-orchestrator/.env.bot.example` dosyasini `tools/telegram-orchestrator/.env.bot` olarak kopyala.
2. `TELEGRAM_BOT_TOKEN` ve `TELEGRAM_ALLOWED_USER_IDS` degerlerini doldur.
3. Istersen `AGENT_WORKSPACE_ROOT`, `SAFE_COMMANDS`, `OLLAMA_MODEL` degerlerini ozellestir.

## Baslatma
```bash
node tools/telegram-orchestrator/bot.mjs
```

## Telegram Komutlari
- `/help`
- `/status`
- `/cwd [path]`
- `/run <komut>`
- `/gemini <prompt>`
- `/ollama <prompt>`
- `/auto <prompt>`
- `/cursor <prompt>`

## Guvenlik Notlari
- `TELEGRAM_ALLOWED_USER_IDS` bos birakilamaz.
- `/run` sadece `SAFE_COMMANDS` listesindeki ilk komut token'larini calistirir.
- CWD, `AGENT_WORKSPACE_ROOT` disina cikamaz.
