import { describe, expect, it } from "vitest";
import { assertSafeRemoteUrl } from "@/lib/safeFetch";

describe("assertSafeRemoteUrl", () => {
  it.each([
    "http://127.0.0.1/admin",
    "http://10.0.0.1/",
    "http://169.254.169.254/latest/meta-data",
    "http://[::1]/",
    "file:///etc/passwd",
  ])("rejects non-public URL %s", async (url) => {
    await expect(assertSafeRemoteUrl(url)).rejects.toThrow();
  });

  it("accepts a public IP address", async () => {
    await expect(assertSafeRemoteUrl("https://1.1.1.1/")).resolves.toBeInstanceOf(URL);
  });
});
