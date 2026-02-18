import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase-config and supabase early
vi.mock("@/lib/supabase-config", () => ({
  getSupabaseConfig: vi.fn().mockReturnValue({ url: "https://mock.url", anonKey: "mock-key" }),
}));

vi.mock("../supabase", () => ({
  supabase: {
    from: vi.fn(),
    storage: {
      from: vi.fn(),
    },
  },
}));
import { lifecycleCallbacks } from "./lifecycleCallbacks";
import { uploadToBucket } from "./upload";
import { processCompanyLogo, processContactAvatar } from "./avatarProcessors";
import { applyFullTextSearch } from "./transforms";

vi.mock("./upload", () => ({
  uploadToBucket: vi.fn(),
}));

vi.mock("./avatarProcessors", () => ({
  processCompanyLogo: vi.fn(),
  processContactAvatar: vi.fn(),
}));

vi.mock("./transforms", () => ({
  applyFullTextSearch: vi.fn().mockReturnValue(vi.fn()),
}));

describe("lifecycleCallbacks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("finds the resource in the list", () => {
    const contactRes = lifecycleCallbacks.find(r => r.resource === "contacts");
    expect(contactRes).toBeDefined();
    expect(contactRes?.beforeCreate).toBeDefined();
  });

  it("calls uploadToBucket for resources with attachments", async () => {
    const contactNotesRes = lifecycleCallbacks.find(r => r.resource === "contactNotes");
    const data = { attachments: [{ src: "..." }] };
    
    await contactNotesRes?.beforeSave?.(data as any, {}, {});
    
    expect(uploadToBucket).toHaveBeenCalledWith(data.attachments[0]);
  });

  it("calls processContactAvatar for contacts", async () => {
    const contactsRes = lifecycleCallbacks.find(r => r.resource === "contacts");
    const params = { data: {} };
    
    await contactsRes?.beforeCreate?.(params as any, {});
    
    expect(processContactAvatar).toHaveBeenCalled();
  });

  it("calls processCompanyLogo for companies", async () => {
    const companiesRes = lifecycleCallbacks.find(r => r.resource === "companies");
    const params = { data: {} };
    
    await companiesRes?.beforeCreate?.(params as any, {});
    
    expect(processCompanyLogo).toHaveBeenCalled();
  });

  it("applies full text search for summary views", async () => {
    const summaryRes = lifecycleCallbacks.find(r => r.resource === "contacts_summary");
    
    await summaryRes?.beforeGetList?.({ filter: { q: "test" } } as any, {});
    
    expect(applyFullTextSearch).toHaveBeenCalledWith(["search_text"]);
  });
});
