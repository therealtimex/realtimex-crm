import { describe, expect, it, vi } from "vitest";

import {
  createEmbeddingCallbacks,
  hasSemanticFieldChange,
} from "./embeddingCallbacks";

describe("hasSemanticFieldChange", () => {
  it("returns false for non-object params", () => {
    expect(hasSemanticFieldChange(null, ["text"])).toBe(false);
    expect(hasSemanticFieldChange("value", ["text"])).toBe(false);
  });

  it("returns true when any semantic field is present", () => {
    expect(hasSemanticFieldChange({ index: 2, text: "hello" }, ["text"])).toBe(
      true,
    );
  });

  it("returns false when only non-semantic fields change", () => {
    expect(
      hasSemanticFieldChange(
        { index: 2, archived_at: "2026-01-01T00:00:00.000Z" },
        ["text", "status"],
      ),
    ).toBe(false);
  });
});

describe("createEmbeddingCallbacks", () => {
  it("embeds on update only when semantic fields changed", async () => {
    const embedRecord = vi.fn().mockResolvedValue(true);
    const deleteRecordEmbedding = vi.fn();
    const logEmbeddingError = vi.fn();

    const callbacks = createEmbeddingCallbacks("task", ["text", "status"], {
      embedRecord,
      deleteRecordEmbedding,
      logEmbeddingError,
    });

    const result = { data: { id: 99, text: "Call customer" } };

    await callbacks.afterUpdate(result, { data: { index: 10 } });
    expect(embedRecord).not.toHaveBeenCalled();

    await callbacks.afterUpdate(result, { data: { text: "Updated" } });
    expect(embedRecord).toHaveBeenCalledWith("task", result.data);
  });

  it("deletes embedding when deleted record has an id", async () => {
    const deleteRecordEmbedding = vi.fn();
    const callbacks = createEmbeddingCallbacks("deal", ["name"], {
      embedRecord: vi.fn().mockResolvedValue(true),
      deleteRecordEmbedding,
      logEmbeddingError: vi.fn(),
    });

    await callbacks.afterDelete({ data: { id: 123 } });

    expect(deleteRecordEmbedding).toHaveBeenCalledWith("deal", 123);
  });

  it("logs embedding errors from background create embedding", async () => {
    const error = new Error("embedding failed");
    const embedRecord = vi.fn().mockRejectedValue(error);
    const deleteRecordEmbedding = vi.fn();
    const logEmbeddingError = vi.fn();

    const callbacks = createEmbeddingCallbacks("contact", ["name"], {
      embedRecord,
      deleteRecordEmbedding,
      logEmbeddingError,
    });

    await callbacks.afterCreate({ data: { id: 7, name: "Jane" } });
    await Promise.resolve();

    expect(logEmbeddingError).toHaveBeenCalledWith("contact", error);
  });
});
