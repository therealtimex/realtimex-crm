import { describe, it, expect, vi, beforeEach } from "vitest";
import { uploadToBucket } from "./upload";
import { supabase } from "../supabase";

vi.mock("../supabase", () => ({
  supabase: {
    storage: {
      from: vi.fn(),
    },
  },
}));

// Mock global fetch
global.fetch = vi.fn();

describe("uploadToBucket", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips upload if file already exists in bucket (signed URL check)", async () => {
    const fi = { 
      src: "https://some-storage.com/file.png", 
      path: "file.png", 
      title: "test", 
      rawFile: new File([], "file.png") 
    } as any;

    (supabase.storage.from as any).mockReturnValue({
      createSignedUrl: vi.fn().mockResolvedValue({ error: null }),
    });

    await uploadToBucket(fi);

    expect(supabase.storage.from).toHaveBeenCalledWith("attachments");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("uploads to bucket if not already there", async () => {
    const fi = { 
      src: "blob:http://...", 
      title: "test", 
      rawFile: new File(["content"], "test.png", { type: "image/png" }) 
    } as any;

    (global.fetch as any).mockResolvedValue({
      blob: () => Promise.resolve(new Blob(["content"])),
    });

    (supabase.storage.from as any).mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://public.url/test.png" } }),
    });

    const result = await uploadToBucket(fi);

    expect(supabase.storage.from).toHaveBeenCalledWith("attachments");
    expect(result.src).toBe("https://public.url/test.png");
    expect(result.type).toBe("image/png");
    expect(result.path).toBeDefined();
  });

  it("throws error if upload fails", async () => {
    const fi = { 
      src: "data:image/png;base64,...", 
      title: "test", 
      rawFile: new File([], "test.png") 
    } as any;

    (global.fetch as any).mockResolvedValue({
      blob: () => Promise.resolve(new Blob([])),
    });

    (supabase.storage.from as any).mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: { message: "Upload failed" } }),
    });

    await expect(uploadToBucket(fi)).rejects.toThrow("Failed to upload attachment");
  });
});
