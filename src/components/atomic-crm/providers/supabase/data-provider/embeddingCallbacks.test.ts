import { describe, it, expect, vi, beforeEach } from "vitest";
import { createEmbeddingCallbacks } from "./embeddingCallbacks";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/ai/EmbeddingService", () => ({
  EmbeddingService: {
    embedRecord: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../supabase", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: vi.fn(),
    }),
  },
}));

import { EmbeddingService } from "@/lib/ai/EmbeddingService";
import { supabase } from "../supabase";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createEmbeddingCallbacks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("afterCreate", () => {
    it("triggers embedding when result.data has an id", async () => {
      const callbacks = createEmbeddingCallbacks("contact");
      const result = { data: { id: 1, first_name: "Alice" } };

      const returned = await callbacks.afterCreate(result);

      expect(EmbeddingService.embedRecord).toHaveBeenCalledWith("contact", result.data);
      expect(returned).toBe(result);
    });

    it("does not trigger embedding when result.data is missing", async () => {
      const callbacks = createEmbeddingCallbacks("contact");
      const result = { data: null };

      await callbacks.afterCreate(result);

      expect(EmbeddingService.embedRecord).not.toHaveBeenCalled();
    });

    it("does not trigger embedding when result.data has no id", async () => {
      const callbacks = createEmbeddingCallbacks("contact");
      const result = { data: {} };

      await callbacks.afterCreate(result);

      expect(EmbeddingService.embedRecord).not.toHaveBeenCalled();
    });
  });

  describe("afterUpdate", () => {
    it("triggers embedding when a semantic field changed for contact", async () => {
      const callbacks = createEmbeddingCallbacks("contact");
      const result = { data: { id: 1, first_name: "Alice" } };
      const params = { data: { first_name: "Alicia" } };

      await callbacks.afterUpdate(result, params);

      expect(EmbeddingService.embedRecord).toHaveBeenCalledWith("contact", result.data);
    });

    it("does not trigger embedding when only non-semantic fields changed for contact", async () => {
      const callbacks = createEmbeddingCallbacks("contact");
      const result = { data: { id: 1, last_seen: "2025-01-01" } };
      const params = { data: { last_seen: "2025-02-01" } };

      await callbacks.afterUpdate(result, params);

      expect(EmbeddingService.embedRecord).not.toHaveBeenCalled();
    });

    it("triggers embedding when a semantic field changed for deal", async () => {
      const callbacks = createEmbeddingCallbacks("deal");
      const result = { data: { id: 2, name: "New Deal" } };
      const params = { data: { name: "Updated Deal" } };

      await callbacks.afterUpdate(result, params);

      expect(EmbeddingService.embedRecord).toHaveBeenCalledWith("deal", result.data);
    });

    it("does not trigger embedding when only stage changed for deal", async () => {
      const callbacks = createEmbeddingCallbacks("deal");
      const result = { data: { id: 2, stage: "proposal" } };
      const params = { data: { stage: "won" } };

      await callbacks.afterUpdate(result, params);

      expect(EmbeddingService.embedRecord).not.toHaveBeenCalled();
    });

    it("returns result unchanged when result.data is invalid", async () => {
      const callbacks = createEmbeddingCallbacks("task");
      const result = { data: null };
      const params = { data: { text: "changed" } };

      const returned = await callbacks.afterUpdate(result, params);

      expect(returned).toBe(result);
      expect(EmbeddingService.embedRecord).not.toHaveBeenCalled();
    });

    it("returns result unchanged when params.data is missing", async () => {
      const callbacks = createEmbeddingCallbacks("task");
      const result = { data: { id: 3 } };
      const params = { data: null };

      const returned = await callbacks.afterUpdate(result, params);

      expect(returned).toBe(result);
      expect(EmbeddingService.embedRecord).not.toHaveBeenCalled();
    });
  });

  describe("afterDelete", () => {
    it("schedules entity_vectors deletion when result.data.id exists", async () => {
      const fromMock = { delete: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), then: vi.fn() };
      (supabase.from as any).mockReturnValue(fromMock);

      const callbacks = createEmbeddingCallbacks("company");
      const result = { data: { id: 5 } };

      await callbacks.afterDelete(result);

      expect(supabase.from).toHaveBeenCalledWith("entity_vectors");
      expect(fromMock.delete).toHaveBeenCalled();
      expect(fromMock.eq).toHaveBeenCalledWith("entity_type", "company");
      expect(fromMock.eq).toHaveBeenCalledWith("entity_id", 5);
    });

    it("does not call supabase when result.data.id is missing", async () => {
      const callbacks = createEmbeddingCallbacks("company");
      const result = { data: {} };

      await callbacks.afterDelete(result);

      expect(supabase.from).not.toHaveBeenCalled();
    });
  });
});
