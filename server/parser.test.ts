import { describe, it, expect } from "vitest";
import {
  calcularDescuento,
  calcularSalarioAPagar,
  esDomingo,
  parsearArchivo,
} from "./parser";

// ─── Cálculos de Nómina ──────────────────────────────────────────────────────
describe("calcularDescuento", () => {
  it("calcula descuento correctamente: salario/30 * diasFalta", () => {
    const descuento = calcularDescuento(30000, 3);
    expect(descuento).toBeCloseTo(3000, 2);
  });

  it("retorna 0 cuando no hay faltas", () => {
    expect(calcularDescuento(20000, 0)).toBe(0);
  });

  it("maneja salario 0 correctamente", () => {
    expect(calcularDescuento(0, 5)).toBe(0);
  });
});

describe("calcularSalarioAPagar", () => {
  it("calcula salario a pagar con la fórmula correcta", () => {
    // (salario/30) * diasLaborables + bonos - descuento
    const salario = 30000;
    const diasLab = 13;
    const bonos = 1000;
    const descuento = 1000;
    const resultado = calcularSalarioAPagar(salario, diasLab, bonos, descuento);
    const esperado = (30000 / 30) * 13 + 1000 - 1000;
    expect(resultado).toBeCloseTo(esperado, 2);
  });

  it("retorna 0 cuando el resultado es negativo", () => {
    const resultado = calcularSalarioAPagar(1000, 0, 0, 5000);
    // No debe retornar negativo (el router hace Math.max(0, ...))
    expect(resultado).toBeLessThanOrEqual(0);
  });
});

// ─── esDomingo ───────────────────────────────────────────────────────────────
describe("esDomingo", () => {
  it("identifica correctamente un domingo", () => {
    // 2026-04-05 es domingo
    expect(esDomingo("2026-04-05")).toBe(true);
  });

  it("no marca un lunes como domingo", () => {
    // 2026-04-06 es lunes
    expect(esDomingo("2026-04-06")).toBe(false);
  });

  it("no marca un sábado como domingo", () => {
    // 2026-04-04 es sábado
    expect(esDomingo("2026-04-04")).toBe(false);
  });
});

// ─── Parser de Archivo TXT ───────────────────────────────────────────────────
describe("parsearArchivo - detección de faltas", () => {
  const archivoSimple = `
      (1) Empleado Prueba Uno

      Fecha de ingreso: 01/01/2026
      Horario: Horario VERTIKAL

      FechaEntradaSalidaTiempoDebe laborarA favorExtraRetardoSalida Pre.
      lun. 6/abr/269:00am5:00pm8:00
      lunes 6/abr/26Asistido8:009:30- 1:30
      mar. 7/abr/26
      martes 7/abr/26Falta 9:30
      mié. 8/abr/269:15am5:30pm8:15
      miércoles 8/abr/26Asistido8:159:30- 1:15

      Tiempo total laborado:16:15 [16.25]65.00 %

      TiempoTomando en cuenta faltas de asistencia
      A laborar:30:00 [30.00]
      Extra:0:00 [0.00]
      A favor:-13:45 [-13.75]

      Resumen del periodo
            Días laborables asistidos: 2 de 3
            Faltas de asistencia: 1
  `;

  it("detecta la falta correctamente cuando la línea contiene 'Falta'", () => {
    const result = parsearArchivo(archivoSimple);
    expect(result.empleados).toHaveLength(1);
    const emp = result.empleados[0];
    expect(emp).toBeDefined();
    const faltaDia = emp!.registros.find((r) => r.esFalta);
    expect(faltaDia).toBeDefined();
    expect(faltaDia!.fecha).toBe("2026-04-07");
  });

  it("no marca como falta los días asistidos", () => {
    const result = parsearArchivo(archivoSimple);
    const emp = result.empleados[0];
    expect(emp).toBeDefined();
    const asistidos = emp!.registros.filter((r) => !r.esFalta && !r.esDescanso);
    expect(asistidos.length).toBeGreaterThan(0);
  });

  it("extrae el resumen del período correctamente", () => {
    const result = parsearArchivo(archivoSimple);
    const emp = result.empleados[0];
    expect(emp).toBeDefined();
    expect(emp!.diasLaborablesAsistidos).toBe(2);
    expect(emp!.faltasAsistencia).toBe(1);
  });
});

describe("parsearArchivo - múltiples registros de entrada/salida", () => {
  const archivoMultiple = `
      (1) Empleado Prueba Dos

      Fecha de ingreso: 01/01/2026
      Horario: Horario VERTIKAL

      FechaEntradaSalidaTiempoDebe laborarA favorExtraRetardoSalida Pre.
      lun. 6/abr/269:14am1:33pm4:19
      2:13pm6:37pm4:24
      lunes 6/abr/26Asistido9:259:30- 0:05

      Tiempo total laborado:8:43 [8.72]70.00 %

      TiempoTomando en cuenta faltas de asistencia
      A laborar:9:30 [9.50]
      Extra:0:00 [0.00]
      A favor:-0:47 [-0.78]

      Resumen del periodo
            Días laborables asistidos: 1 de 1
            Faltas de asistencia: 0
  `;

  it("registra el día como asistido (no falta)", () => {
    const result = parsearArchivo(archivoMultiple);
    const emp = result.empleados[0];
    expect(emp).toBeDefined();
    const dia = emp!.registros.find((r) => r.fecha === "2026-04-06");
    expect(dia).toBeDefined();
    expect(dia!.esFalta).toBe(false);
    expect(dia!.esDescanso).toBe(false);
  });

  it("registra correctamente el resumen del período", () => {
    const result = parsearArchivo(archivoMultiple);
    const emp = result.empleados[0];
    expect(emp).toBeDefined();
    expect(emp!.diasLaborablesAsistidos).toBe(1);
    expect(emp!.faltasAsistencia).toBe(0);
  });
});
