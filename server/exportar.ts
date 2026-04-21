import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import { getPeriodoById, getAsistenciasByPeriodo, getCalculosByPeriodo, getDb } from "./db";
import { empleados as empTable } from "../drizzle/schema";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
}

function formatFecha(fecha: string) {
  const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const [y, m, d] = fecha.split("-");
  return `${d} ${meses[parseInt(m) - 1]} ${y}`;
}

async function getReporteData(periodoId: number) {
  const periodo = await getPeriodoById(periodoId);
  if (!periodo) throw new Error("Período no encontrado");

  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  const todosEmpleados = await db.select().from(empTable);
  const empleadosMap = new Map(todosEmpleados.map((e) => [e.id, e]));

  const asistenciasDB = await getAsistenciasByPeriodo(periodoId);
  const calculosDB = await getCalculosByPeriodo(periodoId);

  const asistenciasPorEmpleado = new Map<number, typeof asistenciasDB>();
  for (const a of asistenciasDB) {
    if (!asistenciasPorEmpleado.has(a.empleadoId)) asistenciasPorEmpleado.set(a.empleadoId, []);
    asistenciasPorEmpleado.get(a.empleadoId)!.push(a);
  }

  const calculos = calculosDB.map((c) => {
    const emp = empleadosMap.get(c.empleadoId);
    return {
      ...c,
      empleadoNombre: emp?.nombre || "Desconocido",
      salarioMensual: parseFloat(String(emp?.salarioMensual) || "0"),
      bonos: parseFloat(String(emp?.bonos) || "0"),
      descuento: parseFloat(String(c.descuento) || "0"),
      salarioAPagar: parseFloat(String(c.salarioAPagar) || "0"),
      asistencias: (asistenciasPorEmpleado.get(c.empleadoId) || []).sort((a, b) =>
        a.fecha.localeCompare(b.fecha)
      ),
    };
  });

  return { periodo, calculos };
}

// ─── PDF ────────────────────────────────────────────────────────────────────
export async function generarPDF(periodoId: number): Promise<Buffer> {
  const { periodo, calculos } = await getReporteData(periodoId);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const NAVY = "#1a2744";
    const NAVY_LIGHT = "#2d3f6b";
    const RED = "#c53030";
    const RED_BG = "#fff5f5";
    const GREEN = "#276749";
    const GRAY = "#718096";
    const LIGHT_GRAY = "#f7fafc";
    const WHITE = "#ffffff";
    const W = 595 - 100; // page width minus margins

    // ── PORTADA ──
    doc.rect(0, 0, 595, 120).fill(NAVY);
    doc.fillColor(WHITE).fontSize(22).font("Helvetica-Bold")
      .text("REPORTE DE CONTROL DE ASISTENCIAS", 50, 35, { width: W });
    doc.fontSize(12).font("Helvetica")
      .text(`Período: ${periodo.nombre}`, 50, 68, { width: W });
    doc.fontSize(10)
      .text(`Generado: ${new Date().toLocaleDateString("es-MX", { day:"2-digit", month:"long", year:"numeric" })}`, 50, 88, { width: W });

    // ── RESUMEN EJECUTIVO ──
    doc.fillColor(NAVY).fontSize(14).font("Helvetica-Bold")
      .text("Resumen Ejecutivo", 50, 140);
    doc.moveTo(50, 158).lineTo(545, 158).strokeColor(NAVY).lineWidth(1.5).stroke();

    const totalNomina = calculos.reduce((s, c) => s + c.salarioAPagar, 0);
    const totalDescuentos = calculos.reduce((s, c) => s + c.descuento, 0);
    const promedioAsistencia = calculos.length > 0
      ? calculos.reduce((s, c) => s + (c.diasLaborables > 0 ? (c.diasAsistidos / c.diasLaborables) * 100 : 0), 0) / calculos.length
      : 0;

    const stats = [
      ["Total Empleados", String(calculos.length)],
      ["Promedio Asistencia", `${promedioAsistencia.toFixed(1)}%`],
      ["Total Descuentos", formatCurrency(totalDescuentos)],
      ["Total Nómina a Pagar", formatCurrency(totalNomina)],
    ];

    let sx = 50;
    const sy = 168;
    const sw = (W - 15) / 4;
    for (const [label, val] of stats) {
      doc.rect(sx, sy, sw, 52).fill(LIGHT_GRAY);
      doc.fillColor(GRAY).fontSize(8).font("Helvetica").text(label, sx + 8, sy + 8, { width: sw - 16 });
      doc.fillColor(NAVY).fontSize(13).font("Helvetica-Bold").text(val, sx + 8, sy + 22, { width: sw - 16 });
      sx += sw + 5;
    }

    // ── DETALLE POR EMPLEADO ──
    let y = 240;
    const colWidths = [130, 85, 85, 60];
    const colX = [50, 180, 265, 350, 410];
    const headers = ["FECHA", "ENTRADA", "SALIDA", "FALTAS"];

    for (const emp of calculos) {
      // Estimate space needed
      const rowsNeeded = emp.asistencias.length;
      const spaceNeeded = 80 + rowsNeeded * 18 + 40;
      if (y + spaceNeeded > 780) {
        doc.addPage();
        y = 50;
      }

      // Employee header
      doc.rect(50, y, W, 28).fill(NAVY);
      doc.fillColor(WHITE).fontSize(11).font("Helvetica-Bold")
        .text(emp.empleadoNombre, 58, y + 8, { width: W - 16 });
      y += 28;

      // Employee summary
      doc.rect(50, y, W, 20).fill(LIGHT_GRAY);
      doc.fillColor(GRAY).fontSize(8).font("Helvetica")
        .text(
          `Salario: ${formatCurrency(emp.salarioMensual)}   Bonos: ${formatCurrency(emp.bonos)}   Descuento: ${formatCurrency(emp.descuento)}   A Pagar: ${formatCurrency(emp.salarioAPagar)}   Asistidos: ${emp.diasAsistidos}/${emp.diasLaborables}   Faltas: ${emp.diasFalta}`,
          58, y + 6, { width: W - 16 }
        );
      y += 20;

      // Table header
      doc.rect(50, y, W, 18).fill(NAVY_LIGHT);
      for (let i = 0; i < headers.length; i++) {
        doc.fillColor(WHITE).fontSize(7.5).font("Helvetica-Bold")
          .text(headers[i], colX[i], y + 5, { width: colWidths[i], align: "center" });
      }
      y += 18;

      // Table rows
      for (let ri = 0; ri < emp.asistencias.length; ri++) {
        const a = emp.asistencias[ri];
        const isFalta = a.esFalta;
        const isDescanso = a.esDescanso;
        const rowH = 16;

        if (y + rowH > 790) {
          doc.addPage();
          y = 50;
          // Re-draw header
          doc.rect(50, y, W, 18).fill(NAVY_LIGHT);
          for (let i = 0; i < headers.length; i++) {
            doc.fillColor(WHITE).fontSize(7.5).font("Helvetica-Bold")
              .text(headers[i], colX[i], y + 5, { width: colWidths[i], align: "center" });
          }
          y += 18;
        }

        const rowBg = isFalta ? RED_BG : ri % 2 === 0 ? WHITE : LIGHT_GRAY;
        doc.rect(50, y, W, rowH).fill(rowBg);

        const textColor = isFalta ? RED : NAVY;
        doc.fillColor(textColor).fontSize(8).font(isFalta ? "Helvetica-Bold" : "Helvetica");

        doc.text(formatFecha(a.fecha), colX[0], y + 4, { width: colWidths[0], align: "center" });
        doc.text(isDescanso ? "Descanso" : a.entrada || "—", colX[1], y + 4, { width: colWidths[1], align: "center" });
        doc.text(isDescanso ? "—" : a.salida || "—", colX[2], y + 4, { width: colWidths[2], align: "center" });

        if (isDescanso) {
          doc.fillColor(GRAY).text("—", colX[3], y + 4, { width: colWidths[3], align: "center" });
        } else if (isFalta) {
          doc.fillColor(RED).font("Helvetica-Bold").text("SÍ", colX[3], y + 4, { width: colWidths[3], align: "center" });
        } else {
          doc.fillColor(GREEN).text("NO", colX[3], y + 4, { width: colWidths[3], align: "center" });
        }

        // Row border
        doc.rect(50, y, W, rowH).strokeColor("#e2e8f0").lineWidth(0.3).stroke();
        y += rowH;
      }

      y += 20; // spacing between employees
    }

    doc.end();
  });
}

// ─── EXCEL ──────────────────────────────────────────────────────────────────
export async function generarExcel(periodoId: number): Promise<Buffer> {
  const { periodo, calculos } = await getReporteData(periodoId);
  const wb = new ExcelJS.Workbook();
  wb.creator = "Sistema de Asistencias";

  // ── Hoja Resumen ──
  const wsResumen = wb.addWorksheet("Resumen");
  wsResumen.columns = [
    { header: "Empleado", key: "nombre", width: 35 },
    { header: "Salario Mensual", key: "salario", width: 18 },
    { header: "Bonos", key: "bonos", width: 14 },
    { header: "Días Laborables", key: "diasLab", width: 18 },
    { header: "Días Asistidos", key: "diasAsis", width: 17 },
    { header: "Faltas", key: "faltas", width: 10 },
    { header: "Descuento", key: "descuento", width: 16 },
    { header: "Salario a Pagar", key: "salarioPagar", width: 18 },
  ];

  // Style header row
  const headerRow = wsResumen.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1a2744" } };
    cell.font = { color: { argb: "FFFFFFFF" }, bold: true, size: 11 };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FF2d3f6b" } },
    };
  });
  headerRow.height = 22;

  for (let i = 0; i < calculos.length; i++) {
    const c = calculos[i];
    const row = wsResumen.addRow({
      nombre: c.empleadoNombre,
      salario: c.salarioMensual,
      bonos: c.bonos,
      diasLab: c.diasLaborables,
      diasAsis: c.diasAsistidos,
      faltas: c.diasFalta,
      descuento: c.descuento,
      salarioPagar: c.salarioAPagar,
    });

    const bg = i % 2 === 0 ? "FFF7FAFC" : "FFFFFFFF";
    row.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      cell.alignment = { vertical: "middle" };
    });

    // Format currency cells
    ["salario", "bonos", "descuento", "salarioPagar"].forEach((key) => {
      const cell = row.getCell(key);
      cell.numFmt = '"$"#,##0.00';
    });

    // Highlight faltas
    if (c.diasFalta > 0) {
      const faltaCell = row.getCell("faltas");
      faltaCell.font = { bold: true, color: { argb: "FFC53030" } };
      faltaCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF5F5" } };
    }

    row.height = 18;
  }

  // ── Hoja por empleado ──
  for (const emp of calculos) {
    const wsName = emp.empleadoNombre.substring(0, 31).replace(/[\/\\?*\[\]]/g, "");
    const ws = wb.addWorksheet(wsName);

    // Info header
    ws.mergeCells("A1:D1");
    ws.getCell("A1").value = emp.empleadoNombre;
    ws.getCell("A1").font = { bold: true, size: 13, color: { argb: "FF1a2744" } };
    ws.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFf0f4ff" } };

    ws.getCell("A2").value = "Salario Mensual";
    ws.getCell("B2").value = emp.salarioMensual;
    ws.getCell("B2").numFmt = '"$"#,##0.00';
    ws.getCell("C2").value = "Bonos";
    ws.getCell("D2").value = emp.bonos;
    ws.getCell("D2").numFmt = '"$"#,##0.00';

    ws.getCell("A3").value = "Días Laborables";
    ws.getCell("B3").value = emp.diasLaborables;
    ws.getCell("C3").value = "Faltas";
    ws.getCell("D3").value = emp.diasFalta;
    if (emp.diasFalta > 0) {
      ws.getCell("D3").font = { bold: true, color: { argb: "FFC53030" } };
    }

    ws.getCell("A4").value = "Descuento";
    ws.getCell("B4").value = emp.descuento;
    ws.getCell("B4").numFmt = '"$"#,##0.00';
    ws.getCell("C4").value = "A Pagar";
    ws.getCell("D4").value = emp.salarioAPagar;
    ws.getCell("D4").numFmt = '"$"#,##0.00';
    ws.getCell("D4").font = { bold: true, color: { argb: "FF1a2744" } };

    // Table header
    ws.columns = [
      { key: "fecha", width: 18 },
      { key: "entrada", width: 14 },
      { key: "salida", width: 14 },
      { key: "falta", width: 10 },
    ];

    const tHeaderRow = ws.getRow(6);
    tHeaderRow.values = ["FECHA", "ENTRADA", "SALIDA", "FALTAS"];
    tHeaderRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1a2744" } };
      cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
      cell.alignment = { horizontal: "center" };
    });
    tHeaderRow.height = 20;

    emp.asistencias.forEach((a, idx) => {
      const row = ws.getRow(7 + idx);
      const isFalta = a.esFalta;
      const isDescanso = a.esDescanso;

      row.values = [
        formatFecha(a.fecha),
        isDescanso ? "Descanso" : a.entrada || "—",
        isDescanso ? "—" : a.salida || "—",
        isDescanso ? "—" : isFalta ? "SÍ" : "NO",
      ];

      const bg = isFalta ? "FFFFF5F5" : idx % 2 === 0 ? "FFFFFFFF" : "FFF7FAFC";
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
        cell.alignment = { horizontal: "center" };
      });

      if (isFalta) {
        row.eachCell((cell) => {
          cell.font = { bold: true, color: { argb: "FFC53030" } };
        });
      }
      row.height = 16;
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
