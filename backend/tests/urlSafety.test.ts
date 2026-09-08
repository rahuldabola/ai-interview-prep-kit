import { describe, expect, it } from "vitest";
import { assertSafeUrl, UnsafeUrlError } from "../src/retrieval/urlSafety.js";

// ALLOW_PRIVATE_HOSTS defaults to false when unset, so these run in "production" mode.
describe("assertSafeUrl", () => {
  it("rejects malformed URLs", async () => {
    await expect(assertSafeUrl("not a url")).rejects.toThrow(UnsafeUrlError);
  });

  it("rejects non-http(s) schemes", async () => {
    await expect(assertSafeUrl("ftp://example.com/file")).rejects.toThrow(UnsafeUrlError);
    await expect(assertSafeUrl("file:///etc/passwd")).rejects.toThrow(UnsafeUrlError);
  });

  it("rejects localhost", async () => {
    await expect(assertSafeUrl("http://localhost:8099/")).rejects.toThrow(UnsafeUrlError);
  });

  it("rejects loopback IP literals", async () => {
    await expect(assertSafeUrl("http://127.0.0.1:8099/")).rejects.toThrow(UnsafeUrlError);
  });

  it("rejects private-range IP literals", async () => {
    await expect(assertSafeUrl("http://10.0.0.5/")).rejects.toThrow(UnsafeUrlError);
    await expect(assertSafeUrl("http://192.168.1.1/")).rejects.toThrow(UnsafeUrlError);
    await expect(assertSafeUrl("http://169.254.169.254/")).rejects.toThrow(UnsafeUrlError); // cloud metadata endpoint
  });
});
