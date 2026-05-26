import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import { getPeriodoById, getAsistenciasByPeriodo, getCalculosByPeriodo, getDiasPeriodo, getPeriodoDiasSeleccionados, getEmpleados } from "./db";
import { calcularDescuento, calcularSalarioAPagar, esDomingo } from "./parser";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
}

function formatFecha(fecha: string) {
  const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const [y, m, d] = fecha.split("-");
  return `${d} ${meses[parseInt(m) - 1]} ${y}`;
}

function esNombreNoIdentificado(nombre?: string | null) {
  const normalizado = String(nombre ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return !normalizado || ["desconocido", "unknown", "sin nombre", "sin identificar"].includes(normalizado);
}

function nombreEmpleadoParaReporte(emp: any, empleadoId: number) {
  if (!emp) return `Empleado eliminado #${empleadoId}`;
  if (esNombreNoIdentificado(emp.nombre)) return `Empleado sin identificar #${empleadoId}`;
  return emp.nombre;
}

async function getReporteData(periodoId: number) {
  const periodo = await getPeriodoById(periodoId);
  if (!periodo) throw new Error("Período no encontrado");

  const todosEmpleados = await getEmpleados(periodoId, true);
  const empleadosMap = new Map(todosEmpleados.map((e: any) => [e.id, e]));

  const asistenciasTodas = await getAsistenciasByPeriodo(periodoId);
  const calculosDB = await getCalculosByPeriodo(periodoId);
  const diasPeriodo = await getDiasPeriodo(periodoId);
  const diasSeleccionados = await getPeriodoDiasSeleccionados(periodoId);
  const diasActivos = diasSeleccionados && diasSeleccionados.length > 0 ? diasSeleccionados : diasPeriodo;
  const diasActivosSet = new Set(diasActivos);
  const asistenciasDB = asistenciasTodas.filter((a) => diasActivosSet.has(a.fecha));

  const asistenciasPorEmpleado = new Map<number, typeof asistenciasDB>();
  for (const a of asistenciasDB) {
    if (!asistenciasPorEmpleado.has(a.empleadoId)) asistenciasPorEmpleado.set(a.empleadoId, []);
    asistenciasPorEmpleado.get(a.empleadoId)!.push(a);
  }

  const calculos = calculosDB.map((c) => {
    const emp = empleadosMap.get(c.empleadoId);
    const asistencias = (asistenciasPorEmpleado.get(c.empleadoId) || []).sort((a, b) =>
      a.fecha.localeCompare(b.fecha)
    );
    const salarioMensual = parseFloat(String(emp?.salarioMensual) || "0");
    const bonos = parseFloat(String(emp?.bonos) || "0");
    const diasLaborables = asistencias.filter((a) => !a.esDescanso && !esDomingo(a.fecha)).length;
    const diasFalta = asistencias.filter((a) => a.esFalta && !a.esDescanso && !esDomingo(a.fecha)).length;
    const diasAsistidos = asistencias.filter((a) => !a.esFalta && !a.esDescanso && !esDomingo(a.fecha)).length;
    const descuento = calcularDescuento(salarioMensual, diasFalta);
    const salarioAPagar = calcularSalarioAPagar(salarioMensual, diasLaborables, bonos, descuento);
    return {
      ...c,
      empleadoNombre: nombreEmpleadoParaReporte(emp, c.empleadoId),
      nombreOriginal: (emp as any)?.nombre ?? null,
      requiereRevisionNombre: !emp || esNombreNoIdentificado((emp as any)?.nombre),
      departamentoId: (emp as any)?.departamentoId ?? null,
      departamentoNombre: (emp as any)?.departamentoNombre ?? null,
      notas: (emp as any)?.notas ?? null,
      salarioMensual,
      bonos,
      diasLaborables,
      diasFalta,
      diasAsistidos,
      descuento,
      salarioAPagar,
      asistencias,
    };
  });

  return { periodo, calculos };
}

// ─── PDF ────────────────────────────────────────────────────────────────────
export type PDFReporteOptions = {
  departamentoId?: number | null;
  tipoRegistros?: "todos" | "asistencias" | "faltas" | "descansos";
  includeResumen?: boolean;
  includeTotalEmpleados?: boolean;
  includePromedioAsistencia?: boolean;
  includeTotalDescuentos?: boolean;
  includeTotalNomina?: boolean;
  includeSalario?: boolean;
  includeBonos?: boolean;
  includeDescuento?: boolean;
  includeSalarioPagar?: boolean;
  includeAsistidos?: boolean;
  includeFaltas?: boolean;
  includeTablaDias?: boolean;
  includeEntrada?: boolean;
  includeSalidaComida?: boolean;
  includeEntradaComida?: boolean;
  includeSalida?: boolean;
  includeColumnaFaltas?: boolean;
  diasSeleccionados?: string[];
};

const defaultPDFOptions: Required<Omit<PDFReporteOptions, "departamentoId">> & { departamentoId: number | null } = {
  departamentoId: null,
  tipoRegistros: "todos",
  includeResumen: true,
  includeTotalEmpleados: true,
  includePromedioAsistencia: true,
  includeTotalDescuentos: true,
  includeTotalNomina: true,
  includeSalario: true,
  includeBonos: true,
  includeDescuento: true,
  includeSalarioPagar: true,
  includeAsistidos: true,
  includeFaltas: true,
  includeTablaDias: true,
  includeEntrada: true,
  includeSalidaComida: true,
  includeEntradaComida: true,
  includeSalida: true,
  includeColumnaFaltas: true,
  diasSeleccionados: [],
};

export async function generarPDF(periodoId: number, options: PDFReporteOptions = {}): Promise<Buffer> {
  const { periodo, calculos } = await getReporteData(periodoId);
  const pdfOptions = { ...defaultPDFOptions, ...options };
  const diasFiltro = Array.isArray(pdfOptions.diasSeleccionados) && pdfOptions.diasSeleccionados.length > 0
    ? new Set(pdfOptions.diasSeleccionados)
    : null;
  const calculosFiltrados = calculos
    .filter((c: any) => pdfOptions.departamentoId == null || Number(c.departamentoId) === Number(pdfOptions.departamentoId))
    .map((c: any) => ({
      ...c,
      asistencias: (c.asistencias ?? []).filter((a: any) => {
        if (diasFiltro && !diasFiltro.has(a.fecha)) return false;
        if (pdfOptions.tipoRegistros === "faltas") return a.esFalta && !a.esDescanso;
        if (pdfOptions.tipoRegistros === "descansos") return a.esDescanso;
        if (pdfOptions.tipoRegistros === "asistencias") return !a.esFalta && !a.esDescanso;
        return true;
      }),
    }))
    .map((c: any) => {
      const diasLaborables = (c.asistencias ?? []).filter((a: any) => !a.esDescanso && !esDomingo(a.fecha)).length;
      const diasFalta = (c.asistencias ?? []).filter((a: any) => a.esFalta && !a.esDescanso && !esDomingo(a.fecha)).length;
      const diasAsistidos = (c.asistencias ?? []).filter((a: any) => !a.esFalta && !a.esDescanso && !esDomingo(a.fecha)).length;
      const descuento = calcularDescuento(c.salarioMensual, diasFalta);
      const salarioAPagar = calcularSalarioAPagar(c.salarioMensual, diasLaborables, c.bonos, descuento);
      return { ...c, diasLaborables, diasFalta, diasAsistidos, descuento, salarioAPagar };
    })
    .filter((c: any) => pdfOptions.tipoRegistros === "todos" || c.asistencias.length > 0);
  const departamentoSeleccionado = pdfOptions.departamentoId == null
    ? null
    : calculos.find((c: any) => Number(c.departamentoId) === Number(pdfOptions.departamentoId))?.departamentoNombre;

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
    const filtrosAplicados = [
      departamentoSeleccionado ? `Departamento: ${departamentoSeleccionado}` : null,
      pdfOptions.tipoRegistros !== "todos" ? `Registros: ${pdfOptions.tipoRegistros}` : null,
      diasFiltro ? `Días seleccionados: ${diasFiltro.size}` : null,
    ].filter(Boolean).join(" · ");
    if (filtrosAplicados) {
      doc.fontSize(9).text(filtrosAplicados, 50, 104, { width: W });
    }

    const totalNomina = calculosFiltrados.reduce((s: number, c: any) => s + c.salarioAPagar, 0);
    const totalDescuentos = calculosFiltrados.reduce((s: number, c: any) => s + c.descuento, 0);
    const promedioAsistencia = calculosFiltrados.length > 0
      ? calculosFiltrados.reduce((s: number, c: any) => s + (c.diasLaborables > 0 ? (c.diasAsistidos / c.diasLaborables) * 100 : 0), 0) / calculosFiltrados.length
      : 0;

    const stats = [
      pdfOptions.includeTotalEmpleados ? ["Total Empleados", String(calculosFiltrados.length)] : null,
      pdfOptions.includePromedioAsistencia ? ["Promedio Asistencia", `${promedioAsistencia.toFixed(1)}%`] : null,
      pdfOptions.includeTotalDescuentos ? ["Total Descuentos", formatCurrency(totalDescuentos)] : null,
      pdfOptions.includeTotalNomina ? ["Total Nómina a Pagar", formatCurrency(totalNomina)] : null,
    ].filter(Boolean) as string[][];

    let y = 140;
    if (pdfOptions.includeResumen && stats.length > 0) {
      doc.fillColor(NAVY).fontSize(14).font("Helvetica-Bold")
        .text("Resumen Ejecutivo", 50, y);
      doc.moveTo(50, y + 18).lineTo(545, y + 18).strokeColor(NAVY).lineWidth(1.5).stroke();

      let sx = 50;
      const sy = y + 28;
      const gap = 5;
      const sw = (W - gap * (stats.length - 1)) / stats.length;
      for (const [label, val] of stats) {
        doc.rect(sx, sy, sw, 52).fill(LIGHT_GRAY);
        doc.fillColor(GRAY).fontSize(8).font("Helvetica").text(label, sx + 8, sy + 8, { width: sw - 16 });
        doc.fillColor(NAVY).fontSize(13).font("Helvetica-Bold").text(val, sx + 8, sy + 22, { width: sw - 16 });
        sx += sw + gap;
      }
      y = sy + 72;
    }

    if (calculosFiltrados.length === 0) {
      doc.fillColor(GRAY).fontSize(11).font("Helvetica")
        .text("No hay empleados o registros que coincidan con los filtros seleccionados.", 50, y, { width: W });
      doc.end();
      return;
    }

    // ── DETALLE POR EMPLEADO ──
    const tableColumns = [
      { key: "fecha", header: "FECHA", width: 95 },
      ...(pdfOptions.includeEntrada ? [{ key: "entrada", header: "ENTRADA LAB.", width: 82 }] : []),
      ...(pdfOptions.includeSalidaComida ? [{ key: "salidaComida", header: "SALIDA COM.", width: 82 }] : []),
      ...(pdfOptions.includeEntradaComida ? [{ key: "entradaComida", header: "ENTRADA COM.", width: 82 }] : []),
      ...(pdfOptions.includeSalida ? [{ key: "salida", header: "SALIDA LAB.", width: 82 }] : []),
      ...(pdfOptions.includeColumnaFaltas ? [{ key: "faltas", header: "FALTAS", width: 55 }] : []),
    ];
    const totalColWidth = tableColumns.reduce((sum, col) => sum + col.width, 0);
    const colX: number[] = [];
    let runningX = 50 + Math.max(0, (W - totalColWidth) / 2);
    for (const col of tableColumns) {
      colX.push(runningX);
      runningX += col.width;
    }

    for (const emp of calculosFiltrados) {
      // Estimate space needed
      const rowsNeeded = emp.asistencias.length;
      const notasTexto = String(emp.notas ?? "").trim();
      const notasExtra = notasTexto ? Math.min(90, Math.max(34, Math.ceil(notasTexto.length / 95) * 12 + 22)) : 0;
      const spaceNeeded = 80 + notasExtra + rowsNeeded * 18 + 40;
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
      const resumenPartes = [
        emp.departamentoNombre ? `Depto: ${emp.departamentoNombre}` : null,
        pdfOptions.includeSalario ? `Salario: ${formatCurrency(emp.salarioMensual)}` : null,
        pdfOptions.includeBonos ? `Bonos: ${formatCurrency(emp.bonos)}` : null,
        pdfOptions.includeDescuento ? `Descuento: ${formatCurrency(emp.descuento)}` : null,
        pdfOptions.includeSalarioPagar ? `A Pagar: ${formatCurrency(emp.salarioAPagar)}` : null,
        pdfOptions.includeAsistidos ? `Asistidos: ${emp.diasAsistidos}/${emp.diasLaborables}` : null,
        pdfOptions.includeFaltas ? `Faltas: ${emp.diasFalta}` : null,
      ].filter(Boolean).join("   ");
      if (resumenPartes) {
        doc.rect(50, y, W, 20).fill(LIGHT_GRAY);
        doc.fillColor(GRAY).fontSize(8).font("Helvetica")
          .text(resumenPartes, 58, y + 6, { width: W - 16 });
        y += 20;
      }

      if (notasTexto) {
        const noteHeight = Math.min(110, Math.max(34, doc.heightOfString(notasTexto, { width: W - 32 }) + 24));
        if (y + noteHeight > 780) {
          doc.addPage();
          y = 50;
        }
        doc.rect(50, y, W, noteHeight).fill("#fffbeb").strokeColor("#f6d365").lineWidth(0.5).stroke();
        doc.fillColor(NAVY).fontSize(8.5).font("Helvetica-Bold").text("NOTAS", 58, y + 8, { width: W - 16 });
        doc.fillColor("#3f3f46").fontSize(8).font("Helvetica").text(notasTexto, 58, y + 20, {
          width: W - 16,
          height: noteHeight - 24,
          ellipsis: true,
        });
        y += noteHeight + 8;
      }

      if (!pdfOptions.includeTablaDias) {
        y += 16;
        continue;
      }

      // Table header
      doc.rect(50, y, W, 18).fill(NAVY_LIGHT);
      for (let i = 0; i < tableColumns.length; i++) {
        doc.fillColor(WHITE).fontSize(7.5).font("Helvetica-Bold")
          .text(tableColumns[i].header, colX[i], y + 5, { width: tableColumns[i].width, align: "center" });
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
          for (let i = 0; i < tableColumns.length; i++) {
            doc.fillColor(WHITE).fontSize(7.5).font("Helvetica-Bold")
              .text(tableColumns[i].header, colX[i], y + 5, { width: tableColumns[i].width, align: "center" });
          }
          y += 18;
        }

        const rowBg = isFalta ? RED_BG : ri % 2 === 0 ? WHITE : LIGHT_GRAY;
        doc.rect(50, y, W, rowH).fill(rowBg);

        const textColor = isFalta ? RED : NAVY;
        doc.fillColor(textColor).fontSize(8).font(isFalta ? "Helvetica-Bold" : "Helvetica");

        tableColumns.forEach((col, i) => {
          if (col.key === "fecha") {
            doc.fillColor(textColor).font(isFalta ? "Helvetica-Bold" : "Helvetica")
              .text(formatFecha(a.fecha), colX[i], y + 4, { width: col.width, align: "center" });
          } else if (col.key === "entrada") {
            doc.fillColor(textColor).font(isFalta ? "Helvetica-Bold" : "Helvetica")
              .text(isDescanso ? "Descanso" : a.entrada || "—", colX[i], y + 4, { width: col.width, align: "center" });
          } else if (col.key === "salidaComida") {
            doc.fillColor(textColor).font(isFalta ? "Helvetica-Bold" : "Helvetica")
              .text(isDescanso ? "Descanso" : a.salidaComida || "—", colX[i], y + 4, { width: col.width, align: "center" });
          } else if (col.key === "entradaComida") {
            doc.fillColor(textColor).font(isFalta ? "Helvetica-Bold" : "Helvetica")
              .text(isDescanso ? "Descanso" : a.entradaComida || "—", colX[i], y + 4, { width: col.width, align: "center" });
          } else if (col.key === "salida") {
            doc.fillColor(textColor).font(isFalta ? "Helvetica-Bold" : "Helvetica")
              .text(isDescanso ? "Descanso" : a.salida || "—", colX[i], y + 4, { width: col.width, align: "center" });
          } else if (col.key === "faltas") {
            if (isDescanso) {
              doc.fillColor(GRAY).font("Helvetica").text("—", colX[i], y + 4, { width: col.width, align: "center" });
            } else if (isFalta) {
              doc.fillColor(RED).font("Helvetica-Bold").text("SÍ", colX[i], y + 4, { width: col.width, align: "center" });
            } else {
              doc.fillColor(GREEN).font("Helvetica").text("NO", colX[i], y + 4, { width: col.width, align: "center" });
            }
          }
        });

        // Row border
        doc.rect(50, y, W, rowH).strokeColor("#e2e8f0").lineWidth(0.3).stroke();
        y += rowH;
      }

      y += 20; // spacing between employees
    }

    doc.end();
  });
}

type PDFPagosBancosOptions = {
  departamentoId?: number | null;
  banco?: string | null;
};

function cleanText(value: unknown, fallback = ""): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function formatMoneyTable(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function groupByBankName(value: unknown): string {
  return cleanText(value, "SIN BANCO").toUpperCase();
}

export async function generarPDFPagosBancos(periodoId: number, options: PDFPagosBancosOptions = {}): Promise<Buffer> {
  const periodo = await getPeriodoById(periodoId);
  if (!periodo) throw new Error("Período no encontrado");

  const empleados = await getEmpleados(periodoId);
  const diasPeriodo = await getDiasPeriodo(periodoId);
  const diasSeleccionados = await getPeriodoDiasSeleccionados(periodoId);
  const diasCalculo = (diasSeleccionados && diasSeleccionados.length > 0 ? diasSeleccionados : diasPeriodo).length;
  const departamentoId = options.departamentoId == null ? null : Number(options.departamentoId);
  const bancoFiltro = cleanText(options.banco).toUpperCase();

  const rows = empleados
    .filter((emp: any) => departamentoId == null || Number(emp.departamentoId) === departamentoId)
    .filter((emp: any) => !bancoFiltro || bancoFiltro === "TODOS" || groupByBankName(emp.banco) === bancoFiltro)
    .map((emp: any) => {
      const salario = parseFloat(String(emp.salarioMensual ?? "0")) || 0;
      const bonos = parseFloat(String(emp.bonos ?? "0")) || 0;
      const descuentos = parseFloat(String(emp.descuentosAdicionales ?? "0")) || 0;
      const faltas = Math.max(0, Math.round(parseFloat(String(emp.dias_falta_periodo ?? "0")) || 0));
      const diasBase = diasCalculo > 0 ? Math.max(0, diasCalculo - faltas) : Math.max(0, Math.round(parseFloat(String(emp.diasLaborados ?? "0")) || 0));
      const diasPagables = emp.diasLaborados !== null && emp.diasLaborados !== undefined && String(emp.diasLaborados).trim() !== ""
        ? Math.max(0, Math.round(parseFloat(String(emp.diasLaborados)) || diasBase))
        : diasBase;
      const importe = Math.max(0, (salario / 30) * diasPagables + bonos - descuentos);
      return {
        nombre: cleanText(emp.nombre, `Empleado #${emp.id}`),
        importe,
        numeroCuenta: cleanText(emp.numeroCuenta),
        tarjeta: cleanText(emp.tarjeta),
        clabeInterbancaria: cleanText(emp.clabeInterbancaria),
        banco: groupByBankName(emp.banco),
      };
    })
    .filter((row: any) => row.importe > 0)
    .sort((a: any, b: any) => a.banco.localeCompare(b.banco, "es") || a.nombre.localeCompare(b.nombre, "es"));

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 18, size: "A4", layout: "landscape" });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const page = { left: 18, right: 824, top: 18, bottom: 575 };
    const headerH = 18;
    const rowH = 17;
    const subtotalH = 20;
    const sectionH = 20;
    const col = [
      { key: "nombre", label: "Nombre", x: 18, w: 210, align: "left" as const },
      { key: "importe", label: "", x: 228, w: 86, align: "right" as const },
      { key: "numeroCuenta", label: "No de cuenta", x: 314, w: 104, align: "center" as const },
      { key: "tarjeta", label: "Tarjeta", x: 418, w: 132, align: "center" as const },
      { key: "clabeInterbancaria", label: "Clabe interbancaria", x: 550, w: 166, align: "center" as const },
      { key: "banco", label: "Banco", x: 716, w: 108, align: "center" as const },
    ];

    function drawCell(x: number, y: number, w: number, h: number, text: string, opts: { bold?: boolean; fill?: string; align?: "left" | "right" | "center"; size?: number } = {}) {
      const previousX = doc.x;
      const previousY = doc.y;
      if (opts.fill) doc.rect(x, y, w, h).fill(opts.fill);
      doc.rect(x, y, w, h).strokeColor("#111111").lineWidth(0.5).stroke();
      doc.fillColor("#111111").font(opts.bold ? "Helvetica-Bold" : "Helvetica").fontSize(opts.size ?? 7.2)
        .text(text, x + 4, y + 4.2, { width: w - 8, align: opts.align ?? "left", lineBreak: false, ellipsis: true });
      doc.x = previousX;
      doc.y = previousY;
    }

    function drawHeader(y: number) {
      for (const c of col) drawCell(c.x, y, c.w, headerH, c.label, { bold: true, fill: "#f2f2f2", align: c.align, size: 8 });
    }

    function ensureSpace(required: number) {
      if (doc.y + required <= page.bottom) return;
      doc.addPage();
      doc.y = page.top;
      drawHeader(doc.y);
      doc.y += headerH;
    }

    doc.fillColor("#111111").font("Helvetica-Bold").fontSize(13).text("PAGOS A BANCOS", page.left, page.top, { width: page.right - page.left, align: "center" });
    doc.font("Helvetica").fontSize(8).text(`Período: ${periodo.nombre}`, page.left, page.top + 15, { width: page.right - page.left, align: "center" });
    doc.text(`Generado: ${new Date().toLocaleDateString("es-MX")}`, page.left, page.top + 27, { width: page.right - page.left, align: "center" });
    doc.y = 62;
    drawHeader(doc.y);
    doc.y += headerH;

    if (rows.length === 0) {
      drawCell(page.left, doc.y, page.right - page.left, 32, "No hay pagos a bancos que coincidan con el período y filtros seleccionados.", { align: "center", size: 9 });
      doc.end();
      return;
    }

    const grupos = new Map<string, typeof rows>();
    for (const row of rows) {
      if (!grupos.has(row.banco)) grupos.set(row.banco, [] as typeof rows);
      grupos.get(row.banco)!.push(row);
    }

    let totalGeneral = 0;
    Array.from(grupos.entries()).forEach(([banco, bancoRows]) => {
      ensureSpace(sectionH + headerH + rowH + subtotalH);
      drawCell(page.left, doc.y, page.right - page.left, sectionH, banco, { bold: true, fill: "#ffffff", align: "center", size: 9 });
      doc.y += sectionH;

      const subtotal = bancoRows.reduce((sum: number, row) => sum + row.importe, 0);
      totalGeneral += subtotal;
      bancoRows.forEach((row, index: number) => {
        ensureSpace(rowH + subtotalH);
        const fill = index % 2 === 1 ? "#e2f0d9" : "#ffffff";
        drawCell(col[0].x, doc.y, col[0].w, rowH, row.nombre, { fill, align: "left", bold: true, size: 6.7 });
        drawCell(col[1].x, doc.y, col[1].w, rowH, formatMoneyTable(row.importe), { fill, align: "right", size: 7 });
        drawCell(col[2].x, doc.y, col[2].w, rowH, row.numeroCuenta, { fill, align: "center", bold: true, size: 6.7 });
        drawCell(col[3].x, doc.y, col[3].w, rowH, row.tarjeta, { fill, align: "center", bold: true, size: 6.7 });
        drawCell(col[4].x, doc.y, col[4].w, rowH, row.clabeInterbancaria, { fill, align: "center", bold: true, size: 6.7 });
        drawCell(col[5].x, doc.y, col[5].w, rowH, row.banco, { fill, align: "center", bold: true, size: 6.7 });
        doc.y += rowH;
      });

      ensureSpace(subtotalH + sectionH);
      drawCell(col[0].x, doc.y, col[0].w, subtotalH, "", { fill: "#ffffff" });
      drawCell(col[1].x, doc.y, col[1].w, subtotalH, formatMoneyTable(subtotal), { fill: "#ffffff", align: "right", bold: true, size: 10 });
      for (let i = 2; i < col.length; i++) drawCell(col[i].x, doc.y, col[i].w, subtotalH, "", { fill: "#ffffff" });
      doc.y += subtotalH;
    });

    ensureSpace(subtotalH);
    drawCell(col[0].x, doc.y, col[0].w, subtotalH, "TOTAL GENERAL", { fill: "#f2f2f2", bold: true, align: "right", size: 9 });
    drawCell(col[1].x, doc.y, col[1].w, subtotalH, formatMoneyTable(totalGeneral), { fill: "#f2f2f2", align: "right", bold: true, size: 10 });
    for (let i = 2; i < col.length; i++) drawCell(col[i].x, doc.y, col[i].w, subtotalH, "", { fill: "#f2f2f2" });
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
    { header: "Notas", key: "notas", width: 48 },
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
      notas: c.notas || "",
    });

    const bg = i % 2 === 0 ? "FFF7FAFC" : "FFFFFFFF";
    row.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      cell.alignment = { vertical: "middle", wrapText: true };
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
    ws.mergeCells("A1:F1");
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

    if (String(emp.notas ?? "").trim()) {
      ws.mergeCells("A5:F5");
      ws.getCell("A5").value = `Notas: ${String(emp.notas).trim()}`;
      ws.getCell("A5").alignment = { wrapText: true, vertical: "top" };
      ws.getCell("A5").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFBEB" } };
      ws.getCell("A5").font = { color: { argb: "FF3f3f46" } };
      ws.getRow(5).height = Math.min(80, Math.max(24, Math.ceil(String(emp.notas).length / 90) * 16));
    }

    // Table header
    ws.columns = [
      { key: "fecha", width: 18 },
      { key: "entrada", width: 18 },
      { key: "salidaComida", width: 18 },
      { key: "entradaComida", width: 18 },
      { key: "salida", width: 18 },
      { key: "falta", width: 10 },
    ];

    const tHeaderRow = ws.getRow(6);
    tHeaderRow.values = ["FECHA", "ENTRADA LABORAL", "SALIDA COMIDA", "ENTRADA COMIDA", "SALIDA LABORAL", "FALTAS"];
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
        isDescanso ? "—" : a.salidaComida || "—",
        isDescanso ? "—" : a.entradaComida || "—",
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
