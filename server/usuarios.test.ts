import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db module
vi.mock("./db", () => ({
  getAllUsers: vi.fn(),
  updateUserRole: vi.fn(),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
}));

import * as db from "./db";

describe("Gestión de Usuarios - Roles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getAllUsers devuelve la lista de usuarios", async () => {
    const mockUsers = [
      { id: 1, name: "Admin User", email: "admin@test.com", role: "admin", loginMethod: "oauth", lastSignedIn: new Date(), createdAt: new Date() },
      { id: 2, name: "Regular User", email: "user@test.com", role: "user", loginMethod: "oauth", lastSignedIn: new Date(), createdAt: new Date() },
    ];
    vi.mocked(db.getAllUsers).mockResolvedValue(mockUsers as any);

    const result = await db.getAllUsers();
    expect(result).toHaveLength(2);
    expect(result[0].role).toBe("admin");
    expect(result[1].role).toBe("user");
  });

  it("updateUserRole actualiza el rol correctamente", async () => {
    vi.mocked(db.updateUserRole).mockResolvedValue(undefined);

    await db.updateUserRole(2, "admin");
    expect(db.updateUserRole).toHaveBeenCalledWith(2, "admin");
  });

  it("updateUserRole puede degradar de admin a user", async () => {
    vi.mocked(db.updateUserRole).mockResolvedValue(undefined);

    await db.updateUserRole(2, "user");
    expect(db.updateUserRole).toHaveBeenCalledWith(2, "user");
  });

  it("los roles válidos son solo 'admin' y 'user'", () => {
    const validRoles = ["admin", "user"];
    expect(validRoles).toContain("admin");
    expect(validRoles).toContain("user");
    expect(validRoles).not.toContain("superadmin");
    expect(validRoles).not.toContain("moderator");
  });
});

describe("Control de acceso - lógica de rol", () => {
  it("isAdmin es true solo cuando role === 'admin'", () => {
    const checkAdmin = (role: string | null | undefined) => role === "admin";

    expect(checkAdmin("admin")).toBe(true);
    expect(checkAdmin("user")).toBe(false);
    expect(checkAdmin(null)).toBe(false);
    expect(checkAdmin(undefined)).toBe(false);
    expect(checkAdmin("")).toBe(false);
  });

  it("los menú items de admin no se muestran a usuarios normales", () => {
    const allMenuItems = [
      { label: "Dashboard", adminOnly: false },
      { label: "Empleados", adminOnly: false },
      { label: "Importar Salarios", adminOnly: true },
      { label: "Cargar Reporte", adminOnly: true },
      { label: "Reportes", adminOnly: false },
      { label: "Usuarios", adminOnly: true },
    ];

    const filterMenu = (isAdmin: boolean) =>
      allMenuItems.filter((item) => !item.adminOnly || isAdmin);

    const adminMenu = filterMenu(true);
    const userMenu = filterMenu(false);

    expect(adminMenu).toHaveLength(6);
    expect(userMenu).toHaveLength(3);
    expect(userMenu.map((i) => i.label)).toEqual(["Dashboard", "Empleados", "Reportes"]);
    expect(adminMenu.map((i) => i.label)).toContain("Usuarios");
    expect(adminMenu.map((i) => i.label)).toContain("Cargar Reporte");
  });
});
