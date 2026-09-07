export function resolveOllamaModel(
  requestModel: string,
  envModel?: string,
): string {
  const trimmed = requestModel.trim();

  if (trimmed.length > 0) {
    return trimmed;
  }

  if (envModel?.trim()) {
    return envModel.trim();
  }

  throw new Error('Model is required: set "model" in request or OLLAMA_MODEL in .env');
}
