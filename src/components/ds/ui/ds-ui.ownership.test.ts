import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const DS_UI_DIR = join(process.cwd(), "src/components/ds/ui");

describe("DS UI ownership guardrails", () => {
  it("contains no pass-through re-export wrappers", () => {
    const files = readdirSync(DS_UI_DIR).filter(
      (f) =>
        (f.endsWith(".ts") || f.endsWith(".tsx")) && !f.includes(".test."),
    );

    for (const file of files) {
      const content = readFileSync(join(DS_UI_DIR, file), "utf8");
      expect(content).not.toMatch(/^export \* from "@\/components\/ui\//m);
    }
  });

  it("contains no direct imports from upstream ui path", () => {
    const files = readdirSync(DS_UI_DIR).filter(
      (f) =>
        (f.endsWith(".ts") || f.endsWith(".tsx")) && !f.includes(".test."),
    );

    for (const file of files) {
      const content = readFileSync(join(DS_UI_DIR, file), "utf8");
      expect(content).not.toContain(`@/components/ui/`);
    }
  });
});
