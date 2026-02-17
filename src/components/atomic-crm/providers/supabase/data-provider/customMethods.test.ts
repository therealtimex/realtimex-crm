import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DataProvider } from "ra-core";

import type { Deal } from "../../../types";

const mocks = vi.hoisted(() => {
  const invokeMock = vi.fn();
  const getActivityLogMock = vi.fn();
  const getIsInitializedMock = vi.fn().mockResolvedValue(true) as {
    (): Promise<boolean>;
    _is_initialized_cache: boolean | null;
  };
  getIsInitializedMock._is_initialized_cache = null;

  return {
    getActivityLogMock,
    getIsInitializedMock,
    invokeMock,
  };
});

vi.mock("../supabase", () => ({
  supabase: {
    functions: {
      invoke: mocks.invokeMock,
    },
  },
}));

vi.mock("../../commons/activity", () => ({
  getActivityLog: mocks.getActivityLogMock,
}));

vi.mock("../authProvider", () => ({
  getIsInitialized: mocks.getIsInitializedMock,
}));

import { createCustomMethods } from "./customMethods";

const makeDeal = (overrides: Partial<Deal> = {}): Deal => ({
  id: overrides.id ?? 1,
  name: overrides.name ?? "Deal",
  company_id: overrides.company_id ?? 1,
  contact_ids: overrides.contact_ids ?? [],
  category: overrides.category ?? "new",
  stage: overrides.stage ?? "qualified",
  description: overrides.description ?? "",
  amount: overrides.amount ?? 100,
  created_at: overrides.created_at ?? "2026-01-01T00:00:00.000Z",
  updated_at: overrides.updated_at ?? "2026-01-01T00:00:00.000Z",
  archived_at: overrides.archived_at,
  expected_closing_date:
    overrides.expected_closing_date ?? "2026-01-31T00:00:00.000Z",
  sales_id: overrides.sales_id ?? 1,
  index: overrides.index ?? 1,
  nb_invoices: overrides.nb_invoices,
});

describe("createCustomMethods", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getIsInitializedMock._is_initialized_cache = null;
  });

  it("updates stage indexes when unarchiving a deal", async () => {
    const deals = [
      makeDeal({ id: 10, stage: "qualified", index: 4, archived_at: "2026-01-01" }),
      makeDeal({ id: 20, stage: "qualified", index: 7, archived_at: "2026-01-02" }),
      makeDeal({ id: 30, stage: "qualified", index: 12 }),
    ];

    const baseDataProvider = {
      getList: vi.fn().mockResolvedValue({ data: deals }),
      update: vi.fn().mockImplementation(async (_resource, params) => ({
        data: params.data,
      })),
    } as unknown as DataProvider;

    const methods = createCustomMethods(baseDataProvider);
    await methods.unarchiveDeal(deals[1]);

    expect(baseDataProvider.getList).toHaveBeenCalledWith("deals", {
      filter: { stage: "qualified" },
      pagination: { page: 1, perPage: 1000 },
      sort: { field: "index", order: "ASC" },
    });

    expect(baseDataProvider.update).toHaveBeenCalledTimes(3);

    const updates = (baseDataProvider.update as any).mock.calls.map(
      ([resource, params]: [string, any]) => ({ resource, params }),
    );

    expect(updates).toEqual([
      {
        resource: "deals",
        params: expect.objectContaining({
          id: 10,
          data: expect.objectContaining({ id: 10, index: 1, archived_at: "2026-01-01" }),
          previousData: deals[0],
        }),
      },
      {
        resource: "deals",
        params: expect.objectContaining({
          id: 20,
          data: expect.objectContaining({ id: 20, index: 0, archived_at: null }),
          previousData: deals[1],
        }),
      },
      {
        resource: "deals",
        params: expect.objectContaining({
          id: 30,
          data: expect.objectContaining({ id: 30, index: 3, archived_at: undefined }),
          previousData: deals[2],
        }),
      },
    ]);
  });

  it("marks initialization cache after successful sign-up", async () => {
    mocks.invokeMock.mockResolvedValue({
      data: { data: { id: 555 } },
      error: null,
    });

    const methods = createCustomMethods({} as DataProvider);

    const result = await methods.signUp({
      email: "admin@example.com",
      password: "secret",
      first_name: "Admin",
      last_name: "User",
    });

    expect(mocks.invokeMock).toHaveBeenCalledWith("setup", {
      method: "POST",
      body: {
        email: "admin@example.com",
        password: "secret",
        first_name: "Admin",
        last_name: "User",
      },
    });
    expect(mocks.getIsInitializedMock._is_initialized_cache).toBe(true);
    expect(result).toEqual({
      id: 555,
      email: "admin@example.com",
      password: "secret",
    });
  });
});
