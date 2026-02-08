export type Translate = (
  key: string,
  options?: Record<string, unknown>,
) => string;

export const toI18nKey = (value: string): string => {
  // Handle undefined/null values gracefully
  if (!value) return "";

  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
};

export const translateWithFallback = (
  translate: Translate,
  key: string,
  fallback: string,
  options: Record<string, unknown> = {},
) => translate(key, { _: fallback, ...options });

export const translateChoice = (
  translate: Translate,
  prefix: string,
  id: string,
  fallback: string,
) => translateWithFallback(translate, `${prefix}.${toI18nKey(id)}`, fallback);
