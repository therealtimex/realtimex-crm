import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildCustomMethods } from "./customMethods";
import { supabase } from "../supabase";

vi.mock("../supabase", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe("customMethods", () => {
  const baseDataProvider = {
    getList: vi.fn(),
    getOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  } as any;

  const customMethods = buildCustomMethods(baseDataProvider);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("signUp", () => {
    it("calls setup function and returns user data", async () => {
      (supabase.functions.invoke as any).mockResolvedValue({
        data: { data: { id: "u1" } },
        error: null,
      });

      const result = await customMethods.signUp({
        email: "test@example.com",
        password: "password123",
        first_name: "Test",
        last_name: "User",
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith("setup", {
        method: "POST",
        body: expect.objectContaining({ email: "test@example.com" }),
      });
      expect(result.id).toBe("u1");
    });

    it("throws error if setup fails", async () => {
      (supabase.functions.invoke as any).mockResolvedValue({
        data: null,
        error: { message: "Error" },
      });

      await expect(customMethods.signUp({} as any)).rejects.toThrow("Failed to create account");
    });
  });

  describe("unarchiveDeal", () => {
    it("re-indexes deals and clears archived_at for the target deal", async () => {
      const mockDeals = [
        { id: "d1", stage: "new", index: 0, archived_at: "some-date" },
        { id: "d2", stage: "new", index: 1, archived_at: "some-date" },
      ];
      baseDataProvider.getList.mockResolvedValue({ data: mockDeals });
      baseDataProvider.update.mockResolvedValue({ data: {} });

      await customMethods.unarchiveDeal({ id: "d2", stage: "new" } as any);

      expect(baseDataProvider.getList).toHaveBeenCalledWith("deals", expect.objectContaining({
        filter: { stage: "new" }
      }));
      
      // Verify that d2 was updated with index 0 and archived_at null
      expect(baseDataProvider.update).toHaveBeenCalledWith("deals", expect.objectContaining({
        id: "d2",
        data: expect.objectContaining({ index: 0, archived_at: null })
      }));
      
      // Verify that d1 was updated with index 1
      expect(baseDataProvider.update).toHaveBeenCalledWith("deals", expect.objectContaining({
        id: "d1",
        data: expect.objectContaining({ index: 1 })
      }));
    });
  });
});
