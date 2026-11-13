/**
 * Versioned envelopes. Every stored value is `{ schema: n, ...fields }`. When
 * a field's shape changes, bump the current version and add a migration from
 * the previous one; old saves are upgraded one step at a time on load:
 *
 *   stored v1 ──m[1]──▶ v2 ──m[2]──▶ v3 (current)
 *
 * A value written by a *newer* build (a cached old PWA reading a newer save)
 * is never overwritten: the store keeps it untouched and works from memory.
 */
import { isInt, isObject, type Json } from './validate';

/** Upgrades data of schema `n` (the key it is stored under) to schema `n + 1`. */
export type Migration = (data: Json) => Json;

export type MigrateResult =
  /** Data at the current schema, ready for field validation. */
  | { readonly kind: 'ok'; readonly data: Json; readonly migrated: boolean }
  /** Written by a newer build: leave it alone. */
  | { readonly kind: 'newer' }
  /** Not ours, unparsable, or no migration path: start fresh. */
  | { readonly kind: 'invalid' };

/** Parses JSON without throwing. */
export function parseJson(text: string | null): unknown {
  if (text === null) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

export function migrate(
  raw: unknown,
  current: number,
  migrations: Readonly<Partial<Record<number, Migration>>>,
): MigrateResult {
  if (!isObject(raw) || !isInt(raw.schema, 1)) return { kind: 'invalid' };
  if (raw.schema > current) return { kind: 'newer' };
  let data: Json = raw;
  let migrated = false;
  for (let v = raw.schema; v < current; v++) {
    const step = migrations[v];
    if (!step) return { kind: 'invalid' };
    data = { ...step(data), schema: v + 1 };
    migrated = true;
  }
  return { kind: 'ok', data, migrated };
}
