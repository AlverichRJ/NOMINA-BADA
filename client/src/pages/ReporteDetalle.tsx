import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Search,
  Users,
  TrendingDown,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

function formatCurrency(amount: number | string) {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n || 0);
}

function formatFecha(fecha: string) {
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const [y, m, d] = fecha.split("-");
  return `${d} ${meses[parseInt(m) - 1]} ${y}`;
}

export default function ReporteDetalle() {
  const params = useParams<{ id: string }>();
  const periodoId = parseInt(params.id || "0");
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingXlsx, setExportingXlsx] = useState(false);

  const { data, isLoading } = trpc.reportes.getReportePeriodo.useQuery(
    { periodoId },
    { enabled: !!periodoId }
  );

  const filtered = (data?.calculos ?? []).filter((c) =>
    c.empleadoNombre.toLowerCase().includes(search.toLowerCase())
  );

  async function exportPDF() {
    setExportingPdf(true);
    try {
      const res = await fetch(`/api/export/pdf/${periodoId}`);
      if (!res.ok) throw new Error("Error al generar PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Reporte_${data?.periodo.nombre ?? periodoId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF generado correctamente");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setExportingPdf(false);
    }
  }

  async function exportXLSX() {
    setExportingXlsx(true);
    try {
      const res = await fetch(`/api/export/xlsx/${periodoId}`);
      if (!res.ok) throw new Error("Error al generar Excel");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Reporte_${data?.periodo.nombre ?? periodoId}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Excel generado correctamente");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setExportingXlsx(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-24">
        <p className="text-muted-foreground">Reporte no encontrado</p>
        <Button variant="outline" className="mt-3" onClick={() => setLocation("/reportes")}>
          Volver a Reportes
        </Button>
      </div>
    );
  }

  const totalNomina = data.calculos.reduce(
    (sum, c) => sum + parseFloat(String(c.salarioAPagar) || "0"), 0
  );
  const totalDescuentos = data.calculos.reduce(
    (sum, c) => sum + parseFloat(String(c.descuento) || "0"), 0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/reportes")}
            className="gap-1.5 mt-0.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "oklch(0.15 0.02 240)" }}>
              {data.periodo.nombre}
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {data.periodo.archivoNombre} · {data.totalEmpleados} empleados
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={exportXLSX}
            disabled={exportingXlsx}
            className="gap-1.5"
          >
            {exportingXlsx ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5" />
            )}
            Excel
          </Button>
          <Button
            size="sm"
            onClick={exportPDF}
            disabled={exportingPdf}
            className="gap-1.5"
            style={{ background: "oklch(0.22 0.06 240)", color: "white" }}
          >
            {exportingPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5" />
            )}
            PDF
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Empleados",
            value: data.totalEmpleados,
            icon: Users,
            color: "oklch(0.22 0.06 240)",
            bg: "oklch(0.95 0.02 240)",
          },
          {
            label: "Promedio Asistencia",
            value: `${data.promedioAsistencia.toFixed(1)}%`,
            icon: CheckCircle2,
            color: "oklch(0.45 0.15 145)",
            bg: "oklch(0.96 0.03 145)",
          },
          {
            label: "Total Descuentos",
            value: formatCurrency(totalDescuentos),
            icon: TrendingDown,
            color: "oklch(0.52 0.20 25)",
            bg: "oklch(0.97 0.03 25)",
          },
          {
            label: "Total Nómina",
            value: formatCurrency(totalNomina),
            icon: Download,
            color: "oklch(0.45 0.15 270)",
            bg: "oklch(0.96 0.02 270)",
          },
        ].map((stat) => (
          <Card key={stat.label} className="border border-border/60 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                  <p className="text-xl font-bold mt-1" style={{ color: "oklch(0.15 0.02 240)" }}>
                    {stat.value}
                  </p>
                </div>
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: stat.bg }}
                >
                  <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar empleado..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Employee Cards */}
      <div className="space-y-3">
        {filtered.map((emp) => {
          const isExpanded = expandedId === emp.empleadoId;
          const salario = parseFloat(String(emp.salarioMensual) || "0");
          const bonos = parseFloat(String(emp.bonos) || "0");
          const descuento = parseFloat(String(emp.descuento) || "0");
          const salarioAPagar = parseFloat(String(emp.salarioAPagar) || "0");
          const pct = emp.diasLaborables > 0
            ? ((emp.diasAsistidos / emp.diasLaborables) * 100).toFixed(1)
            : "0.0";

          return (
            <Card key={emp.empleadoId} className="border border-border/60 shadow-sm overflow-hidden">
              {/* Employee Header */}
              <div
                className="p-4 cursor-pointer hover:bg-muted/20 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : emp.empleadoId)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ background: "oklch(0.22 0.06 240)" }}
                    >
                      {emp.empleadoNombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: "oklch(0.15 0.02 240)" }}>
                        {emp.empleadoNombre}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {emp.diasAsistidos} de {emp.diasLaborables} días · {pct}% asistencia
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    {emp.diasFalta > 0 && (
                      <Badge className="badge-si text-xs">
                        {emp.diasFalta} {emp.diasFalta === 1 ? "falta" : "faltas"}
                      </Badge>
                    )}
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-bold" style={{ color: "oklch(0.15 0.02 240)" }}>
                        {formatCurrency(salarioAPagar)}
                      </p>
                      {descuento > 0 && (
                        <p className="text-xs" style={{ color: "oklch(0.52 0.18 25)" }}>
                          -{formatCurrency(descuento)}
                        </p>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Detail */}
              {isExpanded && (
                <div className="border-t border-border/40">
                  {/* Summary */}
                  <div
                    className="px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3"
                    style={{ background: "oklch(0.975 0.004 240)" }}
                  >
                    <div>
                      <p className="text-xs text-muted-foreground">Salario Mensual</p>
                      <p className="text-sm font-semibold">{formatCurrency(salario)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Bonos</p>
                      <p className="text-sm font-semibold">{formatCurrency(bonos)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Descuento</p>
                      <p className="text-sm font-semibold" style={{ color: "oklch(0.52 0.18 25)" }}>
                        -{formatCurrency(descuento)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">A Pagar</p>
                      <p className="text-sm font-bold" style={{ color: "oklch(0.22 0.06 240)" }}>
                        {formatCurrency(salarioAPagar)}
                      </p>
                    </div>
                  </div>

                  {/* Attendance Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ background: "oklch(0.22 0.06 240)" }}>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white">
                            Fecha
                          </th>
                          <th className="text-center px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white">
                            Entrada
                          </th>
                          <th className="text-center px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white">
                            Salida
                          </th>
                          <th className="text-center px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white">
                            Faltas
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {emp.asistencias.map((a, idx) => {
                          const isDescanso = a.esDescanso;
                          const isFalta = a.esFalta;
                          return (
                            <tr
                              key={idx}
                              className={isFalta ? "row-falta" : ""}
                            >
                              <td className="px-4 py-2.5 font-medium">
                                {formatFecha(a.fecha)}
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                {isDescanso ? (
                                  <span className="badge-descanso">Descanso</span>
                                ) : isFalta ? (
                                  <span className="badge-si">Falta</span>
                                ) : a.entrada ? (
                                  a.entrada
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                {isDescanso ? (
                                  "—"
                                ) : isFalta ? (
                                  <span className="badge-si">Falta</span>
                                ) : a.salida ? (
                                  a.salida
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                {isDescanso ? (
                                  <span className="badge-descanso">—</span>
                                ) : isFalta ? (
                                  <span className="badge-si">SÍ</span>
                                ) : (
                                  <span className="badge-no">NO</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
