import { createHash } from "node:crypto";

function normalizeForDigest(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeForDigest);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, normalizeForDigest(nested)]),
    );
  }
  return value;
}

export function stableJson(value: unknown) {
  return JSON.stringify(normalizeForDigest(value));
}

export function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

export function digestCanonicalValue(value: unknown) {
  return sha256(stableJson(value));
}
