import { describe, expect, it, vi, beforeEach } from "vitest";
import type { TrpcContext } from "./_core/context";

// Mock db module to avoid real DB calls in unit tests
vi.mock("./db", () => ({
  getAppConfig: vi.fn().mockResolvedValue([
    { key: "app_name", value: "TestApp", updatedAt: new Date() },
    { key: "app_logo", value: "/manus-storage/app-logos/logo_abc123.png", updatedAt: new Date() },
  ]),
  setAppConfig: vi.fn().mockResolvedValue(undefined),
}));

// Mock storage module
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ key: "app-logos/logo_abc123.png", url: "/manus-storage/app-logos/logo_abc123.png" }),
}));

import { appRouter } from "./routers";
import type { AuthenticatedUser } from "./_core/context";

function createAuthContext(role: "user" | "admin" = "admin"): TrpcContext {
  const user = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("config.get", () => {
  it("returns app_name and app_logo from DB", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.config.get();

    expect(result).toHaveProperty("app_name", "TestApp");
    expect(result).toHaveProperty("app_logo", "/manus-storage/app-logos/logo_abc123.png");
  });
});

describe("config.set", () => {
  it("saves a config value", async () => {
    const { setAppConfig } = await import("./db");
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.config.set({ key: "app_name", value: "NuevoNombre" });

    expect(result).toEqual({ success: true });
    expect(setAppConfig).toHaveBeenCalledWith("app_name", "NuevoNombre");
  });
});

describe("config.uploadLogo", () => {
  it("uploads logo to S3 and saves URL in DB", async () => {
    const { storagePut } = await import("./storage");
    const { setAppConfig } = await import("./db");
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Minimal valid PNG base64 (1x1 pixel)
    const minimalPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    const result = await caller.config.uploadLogo({ dataUrl: minimalPng, mimeType: "image/png" });

    expect(result.success).toBe(true);
    expect(result.url).toContain("/manus-storage/");
    expect(storagePut).toHaveBeenCalled();
    expect(setAppConfig).toHaveBeenCalledWith("app_logo", expect.stringContaining("/manus-storage/"));
  });

  it("throws error for invalid data URL format", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.config.uploadLogo({ dataUrl: "not-a-valid-data-url", mimeType: "image/png" })
    ).rejects.toThrow("Formato de imagen inválido");
  });
});
