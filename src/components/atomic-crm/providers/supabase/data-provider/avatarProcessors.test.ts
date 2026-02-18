import { describe, it, expect, vi, beforeEach } from "vitest";
import { processCompanyLogo, processContactAvatar } from "./avatarProcessors";
import { getCompanyAvatar } from "../../commons/getCompanyAvatar";
import { getContactAvatar } from "../../commons/getContactAvatar";
import { uploadToBucket } from "./upload";

vi.mock("../../commons/getCompanyAvatar", () => ({
  getCompanyAvatar: vi.fn(),
}));

vi.mock("../../commons/getContactAvatar", () => ({
  getContactAvatar: vi.fn(),
}));

vi.mock("./upload", () => ({
  uploadToBucket: vi.fn(),
}));

describe("avatarProcessors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("processCompanyLogo", () => {
    it("fetches company avatar if no logo is provided", async () => {
      const params = { data: { name: "Acme" } };
      (getCompanyAvatar as any).mockResolvedValue("https://avatar.url");

      const result = await processCompanyLogo(params);

      expect(getCompanyAvatar).toHaveBeenCalledWith(params.data);
      expect(result.data.logo).toBe("https://avatar.url");
    });

    it("uploads logo to bucket if rawFile is provided", async () => {
      const mockFile = new File([""], "logo.png", { type: "image/png" });
      const params = { data: { logo: { src: "blob:...", rawFile: mockFile } } };

      await processCompanyLogo(params);

      expect(uploadToBucket).toHaveBeenCalledWith(params.data.logo);
    });

    it("does nothing if logo is already a string URL", async () => {
      const params = { data: { logo: { src: "https://existing.url" } } };
      
      const result = await processCompanyLogo(params);

      expect(getCompanyAvatar).not.toHaveBeenCalled();
      expect(uploadToBucket).not.toHaveBeenCalled();
      expect(result.data.logo.src).toBe("https://existing.url");
    });
  });

  describe("processContactAvatar", () => {
    it("fetches contact avatar if missing and email exists", async () => {
      const params = { 
        data: { 
          email_jsonb: [{ email: "test@example.com", type: "Work" }] 
        } 
      } as any;
      (getContactAvatar as any).mockResolvedValue("https://contact.avatar");

      const result = await processContactAvatar(params);

      expect(getContactAvatar).toHaveBeenCalledWith(params.data);
      expect(result.data.avatar.src).toBe("https://contact.avatar");
    });

    it("does nothing if avatar already has a src", async () => {
      const params = { 
        data: { 
          avatar: { src: "https://existing.url" },
          email_jsonb: [{ email: "test@example.com", type: "Work" }] 
        } 
      } as any;

      const result = await processContactAvatar(params);

      expect(getContactAvatar).not.toHaveBeenCalled();
      expect(result.data.avatar.src).toBe("https://existing.url");
    });

    it("does nothing if no email is provided", async () => {
      const params = { data: { email_jsonb: [] } } as any;

      const result = await processContactAvatar(params);

      expect(getContactAvatar).not.toHaveBeenCalled();
      expect(result.data.avatar).toBeUndefined();
    });
  });
});
