import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const uploadToBucketMock = vi.fn().mockResolvedValue(undefined);
  const embedRecordMock = vi.fn().mockResolvedValue(true);

  const eqEntityIdMock = vi.fn().mockResolvedValue({ error: null });
  const eqEntityTypeMock = vi.fn().mockReturnValue({ eq: eqEntityIdMock });
  const deleteMock = vi.fn().mockReturnValue({ eq: eqEntityTypeMock });
  const fromMock = vi.fn().mockReturnValue({ delete: deleteMock });

  return {
    deleteMock,
    embedRecordMock,
    eqEntityIdMock,
    eqEntityTypeMock,
    fromMock,
    uploadToBucketMock,
  };
});

vi.mock("./upload", () => ({
  uploadToBucket: mocks.uploadToBucketMock,
}));

vi.mock("@/lib/ai/EmbeddingService", () => ({
  EmbeddingService: {
    embedRecord: mocks.embedRecordMock,
  },
}));

vi.mock("../supabase", () => ({
  supabase: {
    from: mocks.fromMock,
  },
}));

import { createLifecycleCallbacks } from "./lifecycleCallbacks";

describe("createLifecycleCallbacks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fromMock.mockReturnValue({ delete: mocks.deleteMock });
  });

  it("applies contact full-text search before listing", async () => {
    const callbacks = createLifecycleCallbacks();
    const contactsCallbacks = callbacks.find(
      (callback) => callback.resource === "contacts",
    );

    expect(contactsCallbacks).toBeDefined();

    const result = await contactsCallbacks?.beforeGetList?.({
      filter: { q: "Le Dang", status: "active" },
      pagination: { page: 1, perPage: 25 },
      sort: { field: "id", order: "ASC" },
    });

    expect(result?.filter).toEqual({
      status: "active",
      "search_text@ilike": "Le Dang",
    });
  });

  it("uploads all task note attachments before save", async () => {
    const callbacks = createLifecycleCallbacks();
    const taskNoteCallbacks = callbacks.find(
      (callback) => callback.resource === "taskNotes",
    );

    const note = {
      text: "Follow up note",
      attachments: [{ src: "blob:1" }, { src: "blob:2" }],
    } as any;

    const result = await taskNoteCallbacks?.beforeSave?.(note);

    expect(result).toBe(note);
    expect(mocks.uploadToBucketMock).toHaveBeenCalledTimes(2);
    expect(mocks.uploadToBucketMock).toHaveBeenNthCalledWith(
      1,
      note.attachments[0],
    );
    expect(mocks.uploadToBucketMock).toHaveBeenNthCalledWith(
      2,
      note.attachments[1],
    );
  });

  it("embeds contacts only when semantic fields change", async () => {
    const callbacks = createLifecycleCallbacks();
    const contactCallbacks = callbacks.find(
      (callback) => callback.resource === "contacts",
    );

    const result = { data: { id: 42, first_name: "Jane" } };

    await contactCallbacks?.afterUpdate?.(result, { data: { index: 3 } });
    expect(mocks.embedRecordMock).not.toHaveBeenCalled();

    await contactCallbacks?.afterUpdate?.(result, {
      data: { first_name: "Janet" },
    });

    expect(mocks.embedRecordMock).toHaveBeenCalledWith("contact", result.data);
  });

  it("deletes deal embeddings after deletion", async () => {
    const callbacks = createLifecycleCallbacks();
    const dealCallbacks = callbacks.find(
      (callback) => callback.resource === "deals",
    );

    await dealCallbacks?.afterDelete?.({ data: { id: 99 } });

    expect(mocks.fromMock).toHaveBeenCalledWith("entity_vectors");
    expect(mocks.deleteMock).toHaveBeenCalledOnce();
    expect(mocks.eqEntityTypeMock).toHaveBeenCalledWith("entity_type", "deal");
    expect(mocks.eqEntityIdMock).toHaveBeenCalledWith("entity_id", 99);
  });
});
