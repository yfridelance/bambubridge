import { describe, expect, it } from "vitest";
import en from "./en/translation.json";
import de from "./de/translation.json";

type Tree = { [key: string]: Tree | string };

function flatten(obj: Tree, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") {
      keys.push(full);
    } else {
      keys.push(...flatten(v, full));
    }
  }
  return keys;
}

describe("translation files", () => {
  const enKeys = flatten(en as Tree).sort();
  const deKeys = flatten(de as Tree).sort();

  it("EN and DE expose the same keys", () => {
    expect(deKeys).toEqual(enKeys);
  });

  it("no empty values in EN", () => {
    const empty = flatten(en as Tree).filter((k) => {
      const value = k
        .split(".")
        .reduce<unknown>((acc, part) => (acc as Tree)?.[part], en);
      return typeof value === "string" && value.trim() === "";
    });
    expect(empty).toEqual([]);
  });

  it("no empty values in DE", () => {
    const empty = flatten(de as Tree).filter((k) => {
      const value = k
        .split(".")
        .reduce<unknown>((acc, part) => (acc as Tree)?.[part], de);
      return typeof value === "string" && value.trim() === "";
    });
    expect(empty).toEqual([]);
  });
});
