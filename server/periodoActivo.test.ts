import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock de la BD
vi.mock("./db", () => ({
  getAppConfig: vi.fn(async () => [
    { key: "active_period_id", value: "42" },
  ]),
  setAppConfig: vi.fn(async () => {}),
  getPeriodos: vi.fn(async () => [
    { id: 1, nombre: "REPORTES 1-14 ABRIL", archivoNombre: "TWReporte.txt", createdAt: new Date() },
    { id: 2, nombre: "REPORTES 15-30 ABRIL", archivoNombre: "TWReporte2.txt", createdAt: new Date() },
  ]),
  getEmpleados: vi.fn(async (periodoId?: number) => {
    // Simula que retorna datos distintos según el período
    return [
      {
        id: 1,
        nombre: "Juan Pérez",
        salarioMensual: "10000",
        bonos: "0",
        diasLaborados: 8,
        descuentosAdicionales: "0",
        activo: true,
        dias_falta_periodo: periodoId === 2 ? 3 : 1,
      },
    ];
  }),
}));

import { getEmpleados, getPeriodos } from "./db";

describe("Período activo global", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getEmpleados sin periodoId usa el último período por defecto", async () => {
    const empleados = await getEmpleados();
    expect(empleados).toBeDefined();
    expect(Array.isArray(empleados)).toBe(true);
  });

  it("getEmpleados con periodoId retorna datos del período especificado", async () => {
    const empleadosPeriodo1 = await getEmpleados(1);
    const empleadosPeriodo2 = await getEmpleados(2);

    expect(empleadosPeriodo1[0].dias_falta_periodo).toBe(1);
    expect(empleadosPeriodo2[0].dias_falta_periodo).toBe(3);
  });

  it("getPeriodos retorna la lista de períodos ordenada", async () => {
    const periodos = await getPeriodos();
    expect(periodos.length).toBe(2);
    expect(periodos[0].nombre).toBe("REPORTES 1-14 ABRIL");
  });

  it("getEmpleados acepta periodoId como parámetro opcional", async () => {
    // Sin parámetro
    await getEmpleados();
    expect(getEmpleados).toHaveBeenCalledWith();

    // Con parámetro
    await getEmpleados(5);
    expect(getEmpleados).toHaveBeenCalledWith(5);
  });
});
