import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetUser, mockFrom, mockAxiosPost, mockRpc } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockAxiosPost: vi.fn(),
  mockRpc: vi.fn(),
}));

vi.mock("axios", () => ({
  default: {
    post: mockAxiosPost,
  },
}));

vi.mock("../../components/atomic-crm/providers/supabase/supabase", () => ({
  supabase: {
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
    rpc: mockRpc,
  },
}));

import { EmbeddingService } from "./EmbeddingService";

describe("EmbeddingService task embedding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (EmbeddingService as any).aiSettingsCache = null;

    mockGetUser.mockResolvedValue({
      data: {
        user: { id: "user-1" },
      },
    });

    mockAxiosPost.mockResolvedValue({
      data: {
        success: true,
        embedding: [0.1, 0.2],
        model: "text-embedding-3-small",
      },
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "tasks_summary") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  text: "Follow up with procurement",
                  contact_first_name: "Jane",
                  contact_last_name: "Doe",
                  company_name: "Acme Corp",
                  deal_name: "Q1 Expansion",
                },
                error: null,
              }),
            })),
          })),
        };
      }

      if (table === "ai_settings") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {},
                error: null,
              }),
            })),
          })),
        };
      }

      if (table === "entity_vectors") {
        return {
          upsert: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        };
      }

      throw new Error(`Unexpected table access: ${table}`);
    });
  });

  it("fills missing task company/deal context from tasks_summary before embedding", async () => {
    await EmbeddingService.embedRecord("task", {
      id: 42,
      type: "Call",
      text: "Follow up with procurement",
      contact_first_name: "Jane",
      contact_last_name: "Doe",
    });

    expect(mockAxiosPost).toHaveBeenCalledTimes(1);

    const payload = mockAxiosPost.mock.calls[0][1];
    expect(payload.content).toContain("Contact: Jane Doe");
    expect(payload.content).toContain("Company: Acme Corp");
    expect(payload.content).toContain("Deal: Q1 Expansion");

    expect(mockFrom).toHaveBeenCalledWith("tasks_summary");
  });

  it("falls back to tasks relationships when tasks_summary context is unavailable", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "tasks_summary") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "relation tasks_summary does not exist" },
              }),
            })),
          })),
        };
      }

      if (table === "tasks") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  text: "Prep renewal walkthrough",
                  contact_id: 7,
                  company_id: 8,
                  deal_id: 9,
                },
                error: null,
              }),
            })),
          })),
        };
      }

      if (table === "contacts") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  first_name: "Riley",
                  last_name: "Quinn",
                },
                error: null,
              }),
            })),
          })),
        };
      }

      if (table === "companies") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  name: "Globex",
                },
                error: null,
              }),
            })),
          })),
        };
      }

      if (table === "deals") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  name: "Renewal Phase 2",
                },
                error: null,
              }),
            })),
          })),
        };
      }

      if (table === "ai_settings") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {},
                error: null,
              }),
            })),
          })),
        };
      }

      if (table === "entity_vectors") {
        return {
          upsert: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        };
      }

      throw new Error(`Unexpected table access: ${table}`);
    });

    await EmbeddingService.embedRecord("task", {
      id: 77,
      type: "Email",
      text: "Prep renewal walkthrough",
    });

    expect(mockFrom).toHaveBeenCalledWith("tasks_summary");
    expect(mockFrom).toHaveBeenCalledWith("tasks");
    expect(mockFrom).toHaveBeenCalledWith("contacts");
    expect(mockFrom).toHaveBeenCalledWith("companies");
    expect(mockFrom).toHaveBeenCalledWith("deals");

    const payload = mockAxiosPost.mock.calls[0][1];
    expect(payload.content).toContain("Contact: Riley Quinn");
    expect(payload.content).toContain("Company: Globex");
    expect(payload.content).toContain("Deal: Renewal Phase 2");
  });

  it("performs semantic search for tasks", async () => {
    mockFrom.mockImplementation((table: string) => {
        if (table === "ai_settings") {
            return {
                select: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        maybeSingle: vi.fn().mockResolvedValue({
                            data: { embedding_provider: 'openai', embedding_model: 'text-embedding-3-small' },
                            error: null,
                        }),
                    })),
                })),
            };
        }
        return {};
    });

    mockRpc.mockResolvedValue({
        data: [{ id: 'uuid-1', entity_id: 42, entity_type: 'task', similarity: 0.9 }],
        error: null
    });

    const results = await EmbeddingService.searchTasksSemantic("urgent follow up");

    expect(mockAxiosPost).toHaveBeenCalled();
    expect(mockRpc).toHaveBeenCalledWith('match_entities', expect.anything());
    expect(results).toHaveLength(1);
    expect(results[0].entity_id).toBe(42);
  });

  it("embeds all tasks and task notes during re-indexing", async () => {
    mockFrom.mockImplementation((table: string) => {
        if (table === "tasks") {
            return {
                select: vi.fn(() => ({
                    data: [
                        { id: 101, text: "Task 1" },
                        { id: 102, text: "Task 2" }
                    ],
                    error: null,
                    eq: vi.fn(() => ({
                        maybeSingle: vi.fn().mockResolvedValue({
                            data: { text: "Task 1", contact_id: null },
                            error: null
                        })
                    }))
                }))
            };
        }
        if (table === "taskNotes") {
            return {
                select: vi.fn(() => ({
                    data: [
                        { id: 201, text: "Note 1", task_id: 101 }
                    ],
                    error: null
                }))
            };
        }
        if (table === "tasks_summary") {
            return {
                select: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        maybeSingle: vi.fn().mockResolvedValue({
                            data: null, // Simulate no summary yet
                            error: null
                        })
                    }))
                }))
            };
        }
        if (table === "ai_settings") {
            return {
                select: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        maybeSingle: vi.fn().mockResolvedValue({ data: {}, error: null })
                    }))
                }))
            };
        }
        if (table === "entity_vectors") {
            return {
                upsert: vi.fn().mockResolvedValue({ data: null, error: null })
            };
        }
        return {
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
                }))
            }))
        };
    });

    const result = await EmbeddingService.embedAllTasks();

    expect(mockFrom).toHaveBeenCalledWith("tasks");
    expect(mockFrom).toHaveBeenCalledWith("taskNotes");
    expect(result?.success).toBe(3); // 2 tasks + 1 note
    expect(mockAxiosPost).toHaveBeenCalledTimes(3);
  });
});
