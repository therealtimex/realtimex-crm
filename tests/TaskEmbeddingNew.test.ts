import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the Supabase client
const { mockGetUser, mockFrom, mockAxiosPost } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockAxiosPost: vi.fn(),
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
  },
}));

import { EmbeddingService } from "./EmbeddingService";

describe("Task Embedding Service - New embedTask Method", () => {
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
        embedding: [0.1, 0.2, 0.3, 0.4],
        model: "text-embedding-3-small",
      },
    });

    // Default mock for entity_vectors upsert
    mockFrom.mockImplementation((table: string) => {
      if (table === "entity_vectors") {
        return {
          upsert: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        };
      }

      if (table === "ai_settings") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { embedding_provider: "openai", embedding_model: "text-embedding-3-small" },
                error: null,
              }),
            })),
          })),
        };
      }

      if (table === "tasks_summary") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 1,
                  text: "Follow up with John about the proposal",
                  contact_first_name: "John",
                  contact_last_name: "Doe",
                  company_name: "Acme Corp",
                  deal_name: "Q4 Deal",
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
                  first_name: "John",
                  last_name: "Doe",
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
                  name: "Acme Corp",
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
                  name: "Q4 Deal",
                },
                error: null,
              }),
            })),
          })),
        };
      }

      throw new Error(`Unexpected table access: ${table}`);
    });
  });

  it("should properly embed a task using the new embedTask method", async () => {
    const task = {
      id: 1,
      type: "Follow Up",
      text: "Follow up with John about the proposal",
      priority: "high",
      status: "todo",
      due_date: "2023-12-31T00:00:00Z",
      contact_id: 1,
      company_id: null,
      deal_id: null,
      assigned_to: 1,
      archived: false,
      created_at: "2023-12-01T00:00:00Z",
    };

    await EmbeddingService.embedTask(task);

    expect(mockAxiosPost).toHaveBeenCalledTimes(1);

    const payload = mockAxiosPost.mock.calls[0][1];
    expect(payload.content).toContain("Follow Up: Follow up with John about the proposal");
    expect(payload.content).toContain("Priority: high");
    expect(payload.content).toContain("Status: todo");
    expect(payload.content).toContain("Due: Dec 31, 2023");
    expect(payload.content).toContain("Assigned to sales rep ID 1");
    expect(payload.content).toContain("Created: Dec 1, 2023");
  });

  it("should embed a task with contact context using embedTask method", async () => {
    const task = {
      id: 1,
      type: "Follow Up",
      text: "Follow up with John about the proposal",
      contact_first_name: "John",
      contact_last_name: "Doe",
    };

    await EmbeddingService.embedTask(task);

    expect(mockAxiosPost).toHaveBeenCalledTimes(1);

    const payload = mockAxiosPost.mock.calls[0][1];
    expect(payload.content).toContain("Contact: John Doe");
  });

  it("should embed a task with company context using embedTask method", async () => {
    const task = {
      id: 1,
      type: "Follow Up",
      text: "Follow up with John about the proposal",
      companyName: "Acme Corp",
    };

    await EmbeddingService.embedTask(task);

    expect(mockAxiosPost).toHaveBeenCalledTimes(1);

    const payload = mockAxiosPost.mock.calls[0][1];
    expect(payload.content).toContain("Company: Acme Corp");
  });

  it("should embed a task with deal context using embedTask method", async () => {
    const task = {
      id: 1,
      type: "Follow Up",
      text: "Follow up with John about the proposal",
      dealName: "Q4 Deal",
    };

    await EmbeddingService.embedTask(task);

    expect(mockAxiosPost).toHaveBeenCalledTimes(1);

    const payload = mockAxiosPost.mock.calls[0][1];
    expect(payload.content).toContain("Deal: Q4 Deal");
  });

  it("should handle embedding failure gracefully in embedTask method", async () => {
    mockAxiosPost.mockRejectedValueOnce(new Error("Network error"));

    const task = {
      id: 1,
      type: "Follow Up",
      text: "Follow up with John about the proposal",
    };

    // This should throw an error that we can catch
    await expect(EmbeddingService.embedTask(task)).rejects.toThrow("Network error");
  });

  it("should handle task without ID gracefully", async () => {
    const task = {
      type: "Follow Up",
      text: "Follow up with John about the proposal",
    };

    await EmbeddingService.embedTask(task);

    expect(mockAxiosPost).toHaveBeenCalledTimes(0);
  });
});