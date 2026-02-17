import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DataProvider } from "ra-core";

const mocks = vi.hoisted(() => {
  const fromMock = vi.fn();

  return {
    fromMock,
  };
});

vi.mock("../supabase", () => ({
  supabase: {
    from: mocks.fromMock,
  },
}));

import { createResourceCrudHandlers } from "./resourceCrudHandlers";

const makeBaseDataProvider = () => {
  return {
    getList: vi.fn(),
    getOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  } as unknown as DataProvider;
};

describe("createResourceCrudHandlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps list resources to their summary views", async () => {
    const baseDataProvider = makeBaseDataProvider();
    (baseDataProvider.getList as any).mockResolvedValue({ data: [], total: 0 });

    const handlers = createResourceCrudHandlers(baseDataProvider);
    const params = {
      filter: { q: "Jane" },
      pagination: { page: 1, perPage: 25 },
      sort: { field: "id", order: "ASC" },
    } as any;

    await handlers.getList("contacts", params);

    expect(baseDataProvider.getList).toHaveBeenCalledWith(
      "contacts_summary",
      params,
    );
  });

  it("forces descending note date sort for note resources", async () => {
    const baseDataProvider = makeBaseDataProvider();
    (baseDataProvider.getList as any).mockResolvedValue({ data: [], total: 0 });

    const handlers = createResourceCrudHandlers(baseDataProvider);

    await handlers.getList("taskNotes", {
      filter: { task_id: 1 },
      pagination: { page: 1, perPage: 10 },
      sort: { field: "id", order: "ASC" },
    } as any);

    expect(baseDataProvider.getList).toHaveBeenCalledWith(
      "taskNotes",
      expect.objectContaining({
        sort: { field: "date", order: "DESC" },
      }),
    );
  });

  it("strips task summary fields before creating tasks and returns enriched record", async () => {
    const baseDataProvider = makeBaseDataProvider();

    const insertSingleMock = vi
      .fn()
      .mockResolvedValue({ data: { id: 77, text: "Call customer" }, error: null });
    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ single: insertSingleMock }),
    });

    const summarySingleMock = vi.fn().mockResolvedValue({
      data: { id: 77, text: "Call customer", contact_first_name: "Jane" },
      error: null,
    });
    const summarySelectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({ single: summarySingleMock }),
    });

    mocks.fromMock.mockImplementation((table: string) => {
      if (table === "tasks") {
        return {
          insert: insertMock,
        };
      }

      if (table === "tasks_summary") {
        return {
          select: summarySelectMock,
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const handlers = createResourceCrudHandlers(baseDataProvider);
    const result = await handlers.create("tasks", {
      data: {
        id: 77,
        text: "Call customer",
        contact_first_name: "Jane",
        nb_notes: 4,
      },
    });

    expect(insertMock).toHaveBeenCalledWith({
      id: 77,
      text: "Call customer",
    });
    expect(result).toEqual({
      data: { id: 77, text: "Call customer", contact_first_name: "Jane" },
    });
  });

  it("falls back to base invoice update result and synchronizes invoice items", async () => {
    const baseDataProvider = makeBaseDataProvider();
    (baseDataProvider.update as any).mockResolvedValue({
      data: { id: 9, number: "INV-009" },
    });
    (baseDataProvider.create as any).mockResolvedValue({ data: {} });

    const deleteEqMock = vi.fn().mockResolvedValue({ error: null });
    const deleteMock = vi.fn().mockReturnValue({ eq: deleteEqMock });

    mocks.fromMock.mockImplementation((table: string) => {
      if (table === "invoice_items") {
        return {
          delete: deleteMock,
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const handlers = createResourceCrudHandlers(baseDataProvider);

    const result = await handlers.update("invoices", {
      id: 9,
      data: {
        number: "INV-009",
        items: [{ id: 1, description: "Service" }],
        company_name: "Acme",
        computed_status: "draft",
      },
    });

    expect(baseDataProvider.update).toHaveBeenCalledWith(
      "invoices",
      expect.objectContaining({
        id: 9,
        data: expect.objectContaining({
          number: "INV-009",
        }),
      }),
    );

    const invoiceUpdateData = (baseDataProvider.update as any).mock.calls[0][1].data;
    expect(invoiceUpdateData.company_name).toBeUndefined();
    expect(invoiceUpdateData.computed_status).toBeUndefined();
    expect(invoiceUpdateData.items).toBeUndefined();
    expect(typeof invoiceUpdateData.updated_at).toBe("string");

    expect(deleteMock).toHaveBeenCalledOnce();
    expect(deleteEqMock).toHaveBeenCalledWith("invoice_id", 9);

    expect(baseDataProvider.create).toHaveBeenCalledWith("invoice_items", {
      data: {
        description: "Service",
        invoice_id: 9,
      },
    });

    expect(result).toEqual({ data: { id: 9, number: "INV-009" } });
  });
});
