import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Calendar,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  MessageSquare,
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
import { useAuth } from "@/_core/hooks/useAuth";

function formatCurrency(amount: number | string) {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n || 0);
}

function formatFecha(fecha: string) {
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const [y, m, d] = fecha.split("-");
  return `${d} ${meses[parseInt(m) - 1]} ${y}`;
}

type DepartamentoFiltro = number | "todos" | "sin_departamento";

export default function ReporteDetalle() {
  const params = useParams<{ id: string }>();
  const periodoId = parseInt(params.id || "0");
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const [departamentoActivo, setDepartamentoActivo] = useState<DepartamentoFiltro>("todos");
  const [sabadosOpen, setSabadosOpen] = useState(false);
  const [sabadosSeleccionados, setSabadosSeleccionados] = useState<string[]>([]);
  const [sabadoScope, setSabadoScope] = useState<"global" | "seleccionados">("global");
  const [estadoSabado, setEstadoSabado] = useState<"asistencia" | "falta" | "descanso">("asistencia");
  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState<number[]>([]);
  const [empleadoSearch, setEmpleadoSearch] = useState("");
  const [pdfConfigOpen, setPdfConfigOpen] = useState(false);
  const [pdfDiasOpen, setPdfDiasOpen] = useState(false);
  const [pdfOptions, setPdfOptions] = useState({
    departamentoId: "todos",
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
    diasSeleccionados: [] as string[],
  });
  const utils = trpc.useUtils();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isReportesOnly = user?.role === "reportes";
  const canExportPdf = isAdmin || isReportesOnly;

  const { data, isLoading } = trpc.reportes.getReportePeriodo.useQuery(
    { periodoId },
    { enabled: !!periodoId }
  );

  const { data: sabados = [] } = trpc.periodos.getSabados.useQuery(
    { periodoId },
    { enabled: !!periodoId && sabadosOpen }
  );
  const { data: empleados = [] } = trpc.empleados.list.useQuery(
    { periodoId },
    { enabled: !!periodoId && sabadosOpen && sabadoScope === "seleccionados" }
  );

  const updateDiasMutation = trpc.periodos.updateDiasSeleccionados.useMutation({
    onSuccess: () => {
      utils.reportes.getReportePeriodo.invalidate({ periodoId });
      utils.periodos.getDias.invalidate({ periodoId });
      utils.empleados.list.invalidate();
      toast.success("Días actualizados");
    },
    onError: (e) => toast.error(e.message),
  });

  const actualizarSabadosMutation = trpc.periodos.actualizarSabados.useMutation({
    onSuccess: async (result) => {
      await utils.periodos.getSabados.invalidate({ periodoId });
      await utils.periodos.getDias.invalidate({ periodoId });
      await utils.empleados.list.invalidate({ periodoId });
      await utils.reportes.getReportePeriodo.invalidate({ periodoId });
      await utils.periodos.list.invalidate();
      toast.success(`Sábados actualizados (${result.affectedRows ?? 0} registros)`);
      setSabadosOpen(false);
    },
    onError: (e) => toast.error("Error al actualizar sábados: " + e.message),
  });

  const calculosReporte = data?.calculos ?? [];
  const departamentos = Array.from(
    new Map(
      calculosReporte
        .filter((c: any) => c.departamentoId)
        .map((c: any) => [c.departamentoId, { id: c.departamentoId, nombre: c.departamentoNombre || "Sin nombre" }])
    ).values()
  );

  const calcularPromedioAsistencia = (items: any[]) => {
    if (items.length === 0) return "0.0";
    const total = items.reduce((sum, c) => sum + (c.diasLaborables > 0 ? (c.diasAsistidos / c.diasLaborables) * 100 : 0), 0);
    return (total / items.length).toFixed(1);
  };

  const calcularTotalNomina = (items: any[]) =>
    items.reduce((sum, c) => sum + parseFloat(String(c.salarioAPagar) || "0"), 0);

  const departamentosFiltro = [
    {
      id: "todos" as DepartamentoFiltro,
      nombre: "Todos los departamentos",
      empleados: calculosReporte.length,
      promedioAsistencia: calcularPromedioAsistencia(calculosReporte),
      totalNomina: calcularTotalNomina(calculosReporte),
    },
    ...departamentos.map((d: any) => {
      const items = calculosReporte.filter((c: any) => Number(c.departamentoId) === Number(d.id));
      return {
        id: d.id as DepartamentoFiltro,
        nombre: d.nombre,
        empleados: items.length,
        promedioAsistencia: calcularPromedioAsistencia(items),
        totalNomina: calcularTotalNomina(items),
      };
    }),
    ...(() => {
      const sinDepartamento = calculosReporte.filter((c: any) => !c.departamentoId);
      return sinDepartamento.length > 0
        ? [{
            id: "sin_departamento" as DepartamentoFiltro,
            nombre: "Sin departamento",
            empleados: sinDepartamento.length,
            promedioAsistencia: calcularPromedioAsistencia(sinDepartamento),
            totalNomina: calcularTotalNomina(sinDepartamento),
          }]
        : [];
    })(),
  ];

  function seleccionarDepartamento(id: DepartamentoFiltro) {
    setDepartamentoActivo(id);
    setExpandedId(null);
  }

  const filtered = calculosReporte.filter((c: any) => {
    const matchesSearch = c.empleadoNombre.toLowerCase().includes(search.toLowerCase());
    const matchesDepto = departamentoActivo === "todos"
      || (departamentoActivo === "sin_departamento" ? !c.departamentoId : Number(c.departamentoId) === Number(departamentoActivo));
    return matchesSearch && matchesDepto;
  });

  const empleadosFiltrados = empleados.filter((emp: any) =>
    emp.nombre.toLowerCase().includes(empleadoSearch.trim().toLowerCase())
  );

  function toggleDia(fecha: string) {
    if (!data) return;
    const actuales = new Set(data.diasSeleccionados ?? data.diasPeriodo ?? []);
    if (actuales.has(fecha)) actuales.delete(fecha);
    else actuales.add(fecha);
    const dias = (data.diasPeriodo ?? []).filter((d: string) => actuales.has(d));
    if (dias.length === 0) return toast.error("Debes seleccionar al menos un día");
    updateDiasMutation.mutate({ periodoId, dias });
  }

  function toggleSabado(fecha: string) {
    setSabadosSeleccionados((prev) =>
      prev.includes(fecha) ? prev.filter((d) => d !== fecha) : [...prev, fecha]
    );
  }

  function toggleEmpleado(id: number) {
    setEmpleadosSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((empleadoId) => empleadoId !== id) : [...prev, id]
    );
  }

  function abrirSabados() {
    if (!periodoId) return toast.error("No se encontró el período del reporte");
    setSabadosSeleccionados([]);
    setEmpleadosSeleccionados([]);
    setEmpleadoSearch("");
    setSabadoScope("global");
    setEstadoSabado("asistencia");
    setSabadosOpen(true);
  }

  function aplicarSabados() {
    if (!periodoId) return toast.error("No se encontró el período del reporte");
    if (sabadosSeleccionados.length === 0) return toast.error("Selecciona al menos un sábado");
    if (sabadoScope === "seleccionados" && empleadosSeleccionados.length === 0) {
      return toast.error("Selecciona al menos un empleado o usa la opción global");
    }
    actualizarSabadosMutation.mutate({
      periodoId,
      fechas: sabadosSeleccionados,
      estado: estadoSabado,
      empleadoIds: sabadoScope === "seleccionados" ? empleadosSeleccionados : undefined,
    });
  }

  function setPdfOption(key: keyof typeof pdfOptions, value: string | boolean | string[]) {
    setPdfOptions((prev) => ({ ...prev, [key]: value }));
  }

  function abrirPdfConfig() {
    const diasBase = data?.diasSeleccionados ?? data?.diasPeriodo ?? [];
    setPdfOptions((prev) => ({
      ...prev,
      includeTotalDescuentos: isReportesOnly ? false : prev.includeTotalDescuentos,
      includeTotalNomina: isReportesOnly ? false : prev.includeTotalNomina,
      includeSalario: isReportesOnly ? false : prev.includeSalario,
      includeBonos: isReportesOnly ? false : prev.includeBonos,
      includeDescuento: isReportesOnly ? false : prev.includeDescuento,
      includeSalarioPagar: isReportesOnly ? false : prev.includeSalarioPagar,
      diasSeleccionados: prev.diasSeleccionados.length > 0 ? prev.diasSeleccionados : [...diasBase],
    }));
    setPdfDiasOpen(false);
    setPdfConfigOpen(true);
  }

  function togglePdfDia(fecha: string) {
    setPdfOptions((prev) => {
      const actuales = new Set(prev.diasSeleccionados);
      if (actuales.has(fecha)) actuales.delete(fecha);
      else actuales.add(fecha);
      const ordenados = (data?.diasPeriodo ?? []).filter((d: string) => actuales.has(d));
      return { ...prev, diasSeleccionados: ordenados };
    });
  }

  function seleccionarTodosPdfDias() {
    setPdfOptions((prev) => ({ ...prev, diasSeleccionados: [...(data?.diasPeriodo ?? [])] }));
  }

  function limpiarPdfDias() {
    setPdfOptions((prev) => ({ ...prev, diasSeleccionados: [] }));
  }

  function renderMarcaDia(a: any, campo: "entrada" | "salidaComida" | "entradaComida" | "salida") {
    const isDescanso = a.esDescanso;
    const isFalta = a.esFalta;
    const valor = a[campo];
    const asistenciaManual = [a.entrada, a.salidaComida, a.entradaComida, a.salida].some((marca) => marca === "Manual" || marca === "Asistencia");

    if (isDescanso) return <span className="badge-descanso">Descanso</span>;
    if (isFalta) return <span className="badge-si">Falta</span>;
    if (valor === "Manual" || valor === "Asistencia") return <span className="badge-asistencia">Asistencia</span>;
    if (asistenciaManual && !valor) return <span className="badge-asistencia">Asistencia</span>;
    return valor ? valor : <span className="text-muted-foreground">—</span>;
  }

  async function exportPDF() {
    if (!canExportPdf) {
      toast.error("No tienes permiso para exportar reportes");
      return;
    }
    setExportingPdf(true);
    try {
      const diasPdf = pdfOptions.diasSeleccionados;
      if (diasPdf.length === 0) {
        toast.error("Selecciona al menos un día para exportar");
        return;
      }
      const params = new URLSearchParams();
      const opcionesPdf = isReportesOnly
        ? {
            ...pdfOptions,
            includeTotalDescuentos: false,
            includeTotalNomina: false,
            includeSalario: false,
            includeBonos: false,
            includeDescuento: false,
            includeSalarioPagar: false,
          }
        : pdfOptions;
      Object.entries(opcionesPdf).forEach(([key, value]) => {
        if (Array.isArray(value)) params.set(key, value.join(","));
        else params.set(key, String(value));
      });
      params.set("diasSeleccionados", diasPdf.join(","));
      const res = await fetch(`/api/export/pdf/${periodoId}?${params.toString()}`);
      if (!res.ok) throw new Error("Error al generar PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Reporte_${data?.periodo.nombre ?? periodoId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF generado correctamente");
      setPdfConfigOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setExportingPdf(false);
    }
  }

  async function exportXLSX() {
    if (!isAdmin) {
      toast.error("No tienes permiso para exportar reportes");
      return;
    }
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

  const totalNomina = filtered.reduce(
    (sum, c) => sum + parseFloat(String(c.salarioAPagar) || "0"), 0
  );
  const totalDescuentos = filtered.reduce(
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
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={abrirSabados}
              className="gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              Sábados
            </Button>
          )}
          {isAdmin && (
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
          )}
          {canExportPdf && (
            <Button
              size="sm"
              onClick={abrirPdfConfig}
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
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Empleados",
            value: filtered.length,
            icon: Users,
            color: "oklch(0.22 0.06 240)",
            bg: "oklch(0.95 0.02 240)",
          },
          {
            label: "Promedio Asistencia",
            value: `${(filtered.length > 0 ? filtered.reduce((sum, c) => sum + (c.diasLaborables > 0 ? (c.diasAsistidos / c.diasLaborables) * 100 : 0), 0) / filtered.length : 0).toFixed(1)}%`,
            icon: CheckCircle2,
            color: "oklch(0.45 0.15 145)",
            bg: "oklch(0.96 0.03 145)",
          },
          ...(!isReportesOnly ? [
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
          ] : []),
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

      {/* Selección de días del TXT */}
      {isAdmin && (data.diasPeriodo?.length ?? 0) > 0 && (
        <Card className="border border-border/60 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">Días incluidos en el cálculo</p>
                <p className="text-xs text-muted-foreground">
                  Por defecto se cargan todos los días del TXT. Abre el desplegable para elegir con qué días trabajar.
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" className="justify-between gap-2 min-w-[260px]" disabled={updateDiasMutation.isPending}>
                    {(data.diasSeleccionados ?? data.diasPeriodo).length} de {data.diasPeriodo.length} días seleccionados
                    <ChevronDown className="w-4 h-4 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72 max-h-80 overflow-y-auto">
                  <DropdownMenuLabel>Días del archivo TXT</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {data.diasPeriodo.map((fecha: string) => {
                    const activo = (data.diasSeleccionados ?? data.diasPeriodo).includes(fecha);
                    return (
                      <DropdownMenuCheckboxItem
                        key={fecha}
                        checked={activo}
                        disabled={updateDiasMutation.isPending}
                        onSelect={(event) => event.preventDefault()}
                        onCheckedChange={() => toggleDia(fecha)}
                      >
                        {formatFecha(fecha)}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Apartados por departamento */}
      <Card className="border border-border/60 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold" style={{ color: "oklch(0.15 0.02 240)" }}>
                Apartados por departamento
              </p>
              <p className="text-xs text-muted-foreground">
                Selecciona un departamento para filtrar empleados, asistencias, faltas y totales de este período.
              </p>
            </div>
            <Badge variant="outline" className="w-fit">
              {filtered.length} empleados visibles
            </Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {departamentosFiltro.map((d) => {
              const activo = departamentoActivo === d.id;
              return (
                <button
                  key={String(d.id)}
                  type="button"
                  onClick={() => seleccionarDepartamento(d.id)}
                  className={`rounded-xl border p-3 text-left transition-all hover:shadow-sm ${activo ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border/60 bg-background hover:bg-muted/30"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold" style={{ color: "oklch(0.15 0.02 240)" }}>
                        {d.nombre}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {d.empleados} {d.empleados === 1 ? "empleado" : "empleados"}
                      </p>
                    </div>
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: activo ? "oklch(0.22 0.06 240)" : "oklch(0.95 0.02 240)" }}
                    >
                      <Users className="h-4 w-4" style={{ color: activo ? "white" : "oklch(0.22 0.06 240)" }} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

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
                        {(emp as any).departamentoNombre ? ` · ${(emp as any).departamentoNombre}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    {emp.diasFalta > 0 && (
                      <Badge className="badge-si text-xs">
                        {emp.diasFalta} {emp.diasFalta === 1 ? "falta" : "faltas"}
                      </Badge>
                    )}
                    {!isReportesOnly && (
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
                    )}
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
                  {!isReportesOnly && (
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
                  )}

                  {(emp as any).notas?.trim() && (
                    <div className="mx-4 my-3 rounded-lg border border-amber-200 bg-amber-50/80 p-3 print:border-slate-300 print:bg-white">
                      <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-amber-900 print:text-slate-900">
                        <MessageSquare className="h-4 w-4" />
                        Notas
                      </div>
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-amber-950 print:text-slate-900">
                        {(emp as any).notas}
                      </p>
                    </div>
                  )}

                  {/* Attendance Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ background: "oklch(0.22 0.06 240)" }}>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white">
                            Fecha
                          </th>
                          <th className="text-center px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white">
                            Entrada Laboral
                          </th>
                          <th className="text-center px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white">
                            Salida Comida
                          </th>
                          <th className="text-center px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white">
                            Entrada Comida
                          </th>
                          <th className="text-center px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white">
                            Salida Laboral
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
                                {renderMarcaDia(a, "entrada")}
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                {renderMarcaDia(a, "salidaComida")}
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                {renderMarcaDia(a, "entradaComida")}
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                {renderMarcaDia(a, "salida")}
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


      <Dialog open={pdfConfigOpen} onOpenChange={setPdfConfigOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configurar exportación PDF</DialogTitle>
            <DialogDescription>
              Elige el departamento, el tipo de registros y la información que quieres mostrar en el PDF antes de generarlo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <section className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Departamento</label>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={pdfOptions.departamentoId}
                  onChange={(e) => setPdfOption("departamentoId", e.target.value)}
                >
                  <option value="todos">Todos los departamentos</option>
                  {departamentos.map((d: any) => (
                    <option key={d.id} value={String(d.id)}>{d.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Tipo de información</label>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={pdfOptions.tipoRegistros}
                  onChange={(e) => setPdfOption("tipoRegistros", e.target.value)}
                >
                  <option value="todos">Todo: asistencias, faltas y descansos</option>
                  <option value="asistencias">Solo asistencias</option>
                  <option value="faltas">Solo faltas</option>
                  <option value="descansos">Solo descansos</option>
                </select>
              </div>
            </section>

            <section className="rounded-lg border p-4 space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">Días a exportar</p>
                  <p className="text-xs text-muted-foreground">
                    {pdfOptions.diasSeleccionados.length} de {data.diasPeriodo?.length ?? 0} días seleccionados para este PDF.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-between gap-2 sm:min-w-[210px]"
                  onClick={() => setPdfDiasOpen((open) => !open)}
                >
                  <span>{pdfDiasOpen ? "Ocultar días" : "Seleccionar días"}</span>
                  {pdfDiasOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>

              {pdfDiasOpen && (
                <div className="space-y-3 rounded-md bg-muted/20 p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <p className="text-xs text-muted-foreground">
                      Selecciona uno o varios días específicos del período para incluirlos en el PDF.
                    </p>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={seleccionarTodosPdfDias}>
                        Todos
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={limpiarPdfDias}>
                        Limpiar
                      </Button>
                    </div>
                  </div>
                  <div className="grid max-h-48 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
                    {(data.diasPeriodo ?? []).map((fecha: string) => {
                      const activo = pdfOptions.diasSeleccionados.includes(fecha);
                      return (
                        <label
                          key={fecha}
                          className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors ${activo ? "border-primary/40 bg-primary/5" : "bg-background"}`}
                        >
                          <input
                            type="checkbox"
                            checked={activo}
                            onChange={() => togglePdfDia(fecha)}
                          />
                          <span>{formatFecha(fecha)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>

            <section className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-lg border p-4 space-y-3">
                <p className="text-sm font-semibold">Resumen ejecutivo</p>
                {[
                  ["includeResumen", "Mostrar resumen"],
                  ["includeTotalEmpleados", "Total de empleados"],
                  ["includePromedioAsistencia", "Promedio de asistencia"],
                  ...(!isReportesOnly ? [
                    ["includeTotalDescuentos", "Total descuentos"],
                    ["includeTotalNomina", "Total nómina"],
                  ] : []),
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(pdfOptions[key as keyof typeof pdfOptions])}
                      onChange={(e) => setPdfOption(key as keyof typeof pdfOptions, e.target.checked)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <p className="text-sm font-semibold">Datos por empleado</p>
                {[
                  ...(!isReportesOnly ? [
                    ["includeSalario", "Salario"],
                    ["includeBonos", "Bonos"],
                    ["includeDescuento", "Descuento"],
                    ["includeSalarioPagar", "Salario a pagar"],
                  ] : []),
                  ["includeAsistidos", "Días asistidos"],
                  ["includeFaltas", "Faltas"],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(pdfOptions[key as keyof typeof pdfOptions])}
                      onChange={(e) => setPdfOption(key as keyof typeof pdfOptions, e.target.checked)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <p className="text-sm font-semibold">Tabla diaria</p>
                {[
                  ["includeTablaDias", "Mostrar tabla diaria"],
                  ["includeEntrada", "Entrada Laboral"],
                  ["includeSalidaComida", "Salida Comida"],
                  ["includeEntradaComida", "Entrada Comida"],
                  ["includeSalida", "Salida Laboral"],
                  ["includeColumnaFaltas", "Columna faltas"],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(pdfOptions[key as keyof typeof pdfOptions])}
                      onChange={(e) => setPdfOption(key as keyof typeof pdfOptions, e.target.checked)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </section>

            <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
              {isReportesOnly
                ? "Ejemplo: para generar solo asistencias del departamento de edición en días específicos, selecciona ese departamento, elige “Solo asistencias” y marca únicamente los días que quieres exportar. Este perfil genera el PDF sin cantidades monetarias."
                : "Ejemplo: para generar solo asistencias del departamento de edición en días específicos, selecciona ese departamento, elige “Solo asistencias” y marca únicamente los días que quieres exportar. Si quieres una versión de nómina, activa salario, descuentos y total de nómina."}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPdfConfigOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={exportPDF}
              disabled={exportingPdf}
              style={{ background: "oklch(0.22 0.06 240)", color: "white" }}
            >
              {exportingPdf ? "Generando..." : "Generar PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={sabadosOpen} onOpenChange={setSabadosOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar sábados · {data.periodo.nombre}</DialogTitle>
            <DialogDescription>
              Selecciona uno o varios sábados y cambia su estado final a asistencia, falta o descanso. El cambio puede aplicarse globalmente a todos los empleados del reporte o únicamente a los empleados que selecciones.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <section className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">Sábados encontrados</p>
                {sabados.length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const todos = sabados.map((s) => s.fecha);
                      setSabadosSeleccionados(sabadosSeleccionados.length === todos.length ? [] : todos);
                    }}
                  >
                    {sabadosSeleccionados.length === sabados.length ? "Quitar todos" : "Seleccionar todos"}
                  </Button>
                )}
              </div>
              {sabados.length === 0 ? (
                <p className="text-sm text-muted-foreground rounded-md border p-3">Este período no tiene sábados registrados en asistencias.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {sabados.map((s) => (
                    <label key={s.fecha} className="flex items-start gap-2 rounded-md border p-3 text-sm cursor-pointer hover:bg-muted/40">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={sabadosSeleccionados.includes(s.fecha)}
                        onChange={() => toggleSabado(s.fecha)}
                      />
                      <span>
                        <span className="font-semibold block">{formatFecha(s.fecha)}</span>
                        <span className="text-xs text-muted-foreground">
                          {s.asistencias} asistencia(s), {s.faltas} falta(s), {s.descansos} descanso(s)
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </section>

            <section className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Estado final</label>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={estadoSabado}
                  onChange={(e) => setEstadoSabado(e.target.value as "asistencia" | "falta" | "descanso")}
                >
                  <option value="asistencia">Cambiar a asistencia</option>
                  <option value="falta">Cambiar a falta</option>
                  <option value="descanso">Cambiar a descanso</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Alcance</label>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={sabadoScope}
                  onChange={(e) => setSabadoScope(e.target.value as "global" | "seleccionados")}
                >
                  <option value="global">Global: todos los empleados</option>
                  <option value="seleccionados">Solo empleados seleccionados</option>
                </select>
              </div>
            </section>

            {sabadoScope === "seleccionados" && (
              <section className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">Empleados</p>
                  {empleadosFiltrados.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const todos = empleadosFiltrados.map((e: any) => e.id);
                        const todosSeleccionados = todos.every((id: number) => empleadosSeleccionados.includes(id));
                        setEmpleadosSeleccionados((prev) =>
                          todosSeleccionados
                            ? prev.filter((id) => !todos.includes(id))
                            : Array.from(new Set([...prev, ...todos]))
                        );
                      }}
                    >
                      {empleadosFiltrados.every((emp: any) => empleadosSeleccionados.includes(emp.id)) ? "Quitar visibles" : "Seleccionar visibles"}
                    </Button>
                  )}
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar empleado..."
                    value={empleadoSearch}
                    onChange={(e) => setEmpleadoSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="max-h-56 overflow-y-auto rounded-md border divide-y">
                  {empleadosFiltrados.map((emp: any) => (
                    <label key={emp.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted/40">
                      <input
                        type="checkbox"
                        checked={empleadosSeleccionados.includes(emp.id)}
                        onChange={() => toggleEmpleado(emp.id)}
                      />
                      <span className="font-medium">{emp.nombre}</span>
                    </label>
                  ))}
                  {empleados.length === 0 && (
                    <p className="p-3 text-sm text-muted-foreground">No hay empleados para este período.</p>
                  )}
                  {empleados.length > 0 && empleadosFiltrados.length === 0 && (
                    <p className="p-3 text-sm text-muted-foreground">No se encontraron empleados con esa búsqueda.</p>
                  )}
                </div>
              </section>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSabadosOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={aplicarSabados}
              disabled={actualizarSabadosMutation.isPending || sabadosSeleccionados.length === 0}
              style={{ background: "oklch(0.22 0.06 240)", color: "white" }}
            >
              {actualizarSabadosMutation.isPending ? "Aplicando..." : "Aplicar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
