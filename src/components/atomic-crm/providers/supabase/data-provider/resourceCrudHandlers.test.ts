import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  handleGetList,
  handleGetOne,
  handleCreate,
  handleUpdate,
} from "./resourceCrudHandlers";
import { supabase } from "../supabase";
import { fetchEnrichedRecord } from "./enrichment";

vi.mock("../supabase", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock("./enrichment", () => ({
  fetchEnrichedRecord: vi.fn(),
}));

describe("resourceCrudHandlers", () => {
  const baseDataProvider = {
    getList: vi.fn(),
    getOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    getMany: vi.fn(),
    getManyReference: vi.fn(),
    updateMany: vi.fn(),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("handleGetList", () => {
    it("redirects resources to summary views when available", async () => {
      await handleGetList(baseDataProvider, "contacts", {
        pagination: { page: 1, perPage: 10 },
        sort: { field: "id", order: "ASC" },
        filter: {},
      });
      expect(baseDataProvider.getList).toHaveBeenCalledWith(
        "contacts_summary",
        expect.anything(),
      );
    });

    it("applies default sort for note resources", async () => {
      await handleGetList(baseDataProvider, "contactNotes", {
        pagination: { page: 1, perPage: 10 },
        sort: { field: "id", order: "ASC" },
        filter: {},
      });
      expect(baseDataProvider.getList).toHaveBeenCalledWith("contactNotes", {
        pagination: { page: 1, perPage: 10 },
        sort: { field: "date", order: "DESC" },
        filter: {},
      });
    });

    it("passes through other resources unchanged", async () => {
      await handleGetList(baseDataProvider, "tags", {
        pagination: { page: 1, perPage: 10 },
        sort: { field: "id", order: "ASC" },
        filter: {},
      });
      expect(baseDataProvider.getList).toHaveBeenCalledWith(
        "tags",
        expect.anything(),
      );
    });
  });

  describe("handleGetOne", () => {
    it("handles invoices with line items", async () => {
      const mockInvoice = { id: "inv1", number: "INV-001" };
      const mockItems = [{ id: "item1", invoice_id: "inv1", description: "Item 1" }];

      const fromSpy = vi.spyOn(supabase, "from");
      const selectSpy = vi.fn().mockReturnThis();
      const eqSpy = vi.fn().mockReturnThis();
      const singleSpy = vi.fn().mockResolvedValue({ data: mockInvoice, error: null });
      const selectItemsSpy = vi.fn().mockReturnThis();
      const eqItemsSpy = vi.fn().mockReturnThis();
      const resolveItemsSpy = vi.fn().mockResolvedValue({ data: mockItems, error: null });

      fromSpy.mockImplementation((table: string) => {
        if (table === "invoices_summary") {
          return { select: selectSpy, eq: eqSpy, single: singleSpy } as any;
        }
        if (table === "invoice_items") {
          return { select: selectItemsSpy, eq: eqItemsSpy, selectItemsSpy, then: (resolve: any) => resolveItemsSpy().then(resolve) } as any;
        }
        return {} as any;
      });

      // Simpler mock for supabase to avoid complex chaining issues in test
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "invoices_summary") {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: mockInvoice, error: null }),
              }),
            }),
          };
        }
        if (table === "invoice_items") {
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: mockItems, error: null }),
            }),
          };
        }
      });

      const result = await handleGetOne(baseDataProvider, "invoices", { id: "inv1" });
      expect(result.data).toEqual({ ...mockInvoice, items: mockItems });
    });

    it("handles business_profile creation if missing", async () => {
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "business_profile") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
            insert: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: { id: 1, name: "My Company" }, error: null }),
              }),
            }),
          };
        }
      });

      const result = await handleGetOne(baseDataProvider, "business_profile", { id: 1 });
      expect(result.data.name).toBe("My Company");
    });
  });

  describe("handleCreate", () => {
    it("handles contact creation with enrichment", async () => {
      const mockContact = { id: "c1", first_name: "John" };
      const mockEnriched = { data: { ...mockContact, search_text: "john" } };

      (supabase.from as any).mockImplementation((_table: string) => ({
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: mockContact, error: null }),
          }),
        }),
      }));

      (fetchEnrichedRecord as any).mockResolvedValue(mockEnriched);

      const result = await handleCreate(baseDataProvider, "contacts", { data: mockContact });
      expect(result).toEqual(mockEnriched);
      expect(fetchEnrichedRecord).toHaveBeenCalledWith("contacts_summary", "c1");
    });

    it("handles invoice creation with items", async () => {
      const mockInvoice = { id: "inv2", number: "INV-002" };
      const items = [{ description: "Item A" }];

      (supabase.from as any).mockImplementation((_table: string) => ({
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: mockInvoice, error: null }),
          }),
        }),
      }));

      (fetchEnrichedRecord as any).mockResolvedValue({ data: { ...mockInvoice, items } });

      await handleCreate(baseDataProvider, "invoices", { data: { ...mockInvoice, items } });
      
      expect(baseDataProvider.create).toHaveBeenCalledWith("invoice_items", expect.objectContaining({
        data: expect.objectContaining({ description: "Item A", invoice_id: "inv2" })
      }));
    });
  });

  describe("handleUpdate", () => {
    it("strips summary fields before updating contacts", async () => {
      const inputData = { id: "c1", first_name: "John", company_name: "Acme" };
      const mockContact = { id: "c1", first_name: "John" };

      const updateSpy = vi.fn().mockReturnValue({
        eq: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: mockContact, error: null }),
          }),
        }),
      });

      (supabase.from as any).mockImplementation((_table: string) => ({
        update: updateSpy,
      }));

      await handleUpdate(baseDataProvider, "contacts", { id: "c1", data: inputData });
      
      expect(updateSpy).toHaveBeenCalledWith({ id: "c1", first_name: "John" });
      expect(updateSpy).not.toHaveBeenCalledWith(expect.objectContaining({ company_name: "Acme" }));
    });
  });
});
