# CHIM Ollama Proxy

NestJS-прокси между [CHIM](https://dwemerdynamics.com/chim/) (Skyrim) и [Ollama](https://ollama.com/). Принимает OpenAI-совместимые запросы от HerikaServer на игровом ПК и пересылает их в Ollama на MacBook.

## Архитектура

```
Gaming PC (Skyrim + CHIM :8081)
    → POST http://<MAC_LAN_IP>:3000/v1/chat/completions
        → NestJS Proxy (MacBook :3000)
            → Ollama (MacBook :11434)
```

## Быстрый старт (MacBook)

### 1. Ollama

```bash
# Разрешить доступ из LAN
launchctl setenv OLLAMA_HOST 0.0.0.0:11434

# Скачать модель с поддержкой tool calling
ollama pull llama3.1:8b
```

Перезапустите Ollama после смены `OLLAMA_HOST`.

### 2. Прокси

```bash
cp .env.example .env
yarn install --ignore-engines
yarn start:dev
```

Узнайте LAN IP Mac:

```bash
ipconfig getifaddr en0
```

### 3. Проверка

```bash
curl http://localhost:3000/health

curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"llama3.1:8b","messages":[{"role":"user","content":"Hello"}],"stream":true}'
```

**Swagger UI (debug):** http://localhost:3000/docs

В Swagger уже заполнены примеры запросов:
- **Simple dialogue (stream)** — обычный диалог без tools
- **CHIM with tools** — запрос с игровыми функциями (Follow, StopAll)
- **Non-stream (debug)** — удобно смотреть полный JSON-ответ в UI

## Настройка CHIM (Gaming PC)

1. Откройте CHIM Web UI → **Configuration** → **LLM** → **New Connector**
2. Заполните:

| Поле | Значение |
|------|----------|
| Service | Custom |
| Driver | OpenAI JSON |
| URL | `http://<MAC_LAN_IP>:3000/v1/chat/completions` |
| Model | `llama3.1:8b` (или имя вашей модели) |
| API Key | пусто |

3. Назначьте connector профилю **Standard**
4. Если HerikaServer в WSL — используйте LAN IP Mac, не `localhost`

Проверка с игрового ПК:

```bash
curl http://<MAC_LAN_IP>:3000/health
```

## Конфигурация (.env)

| Переменная | По умолчанию | Описание |
|------------|--------------|----------|
| `PORT` | `3000` | Порт прокси |
| `HOST` | `0.0.0.0` | Bind address |
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | URL Ollama |
| `OLLAMA_MODEL` | — | Override модели из CHIM |
| `OLLAMA_THINK` | `false` | Включить thinking у Qwen3/DeepSeek (`true`/`false`) |
| `TOOLS_MODE` | `pass-through` | `pass-through` или `prompt` |
| `HTTP_TIMEOUT` | `120000` | Таймаут запроса к Ollama (мс) |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn` |
| `LOG_REQUEST_BODY` | `false` | Логировать полное тело запроса |
| `PROXY_API_KEY` | — | Bearer token для защиты прокси |

## Tool Calling

CHIM использует function calling для игровых действий (торговля, движение и т.д.).

- **`pass-through`** — передаёт `tools` в Ollama как есть. Работает с `llama3.1`, `qwen2.5`, `mistral-nemo`.
- **`prompt`** — встраивает описание функций в system prompt. Используйте для моделей без native tool support.
- При ошибке 400 от Ollama на tools — автоматический fallback на prompt mode.

## Рекомендуемые модели

| Модель | Tool calling |
|--------|--------------|
| `llama3.1:8b` | Да |
| `qwen2.5:7b` | Да |
| `mistral-nemo` | Да |
| `llama3.2:3b` | Ограниченно → `TOOLS_MODE=prompt` |

### Qwen3 и reasoning-модели

Qwen3 по умолчанию тратит токены на внутренние «мысли» (`reasoning`), а CHIM читает только `content`.

**Важно:** Ollama endpoint `/v1/chat/completions` **игнорирует** `think: false` у Qwen3. Прокси поэтому при `OLLAMA_THINK=false` (по умолчанию) использует нативный **`/api/chat`** с `think: false` и конвертирует ответ в OpenAI-формат.

Если ответ всё ещё пустой — увеличьте `max_tokens` в CHIM (минимум 100–150 для qwen3).

## Firewall (macOS)

Разрешите входящие подключения на порты **3000** (NestJS) в System Settings → Network → Firewall.

## API

Swagger UI: **http://localhost:3000/docs**

### `GET /health`

```json
{
  "status": "ok",
  "ollama": "reachable",
  "timestamp": "2026-09-07T12:00:00.000Z"
}
```

### `POST /v1/chat/completions`

OpenAI-совместимый endpoint. Валидация через Zod.

## Разработка

```bash
yarn start:dev    # hot reload
yarn build        # production build
yarn start:prod   # run dist/
yarn test         # unit tests
yarn test:e2e     # e2e tests
```
