import { trpc } from "@/lib/trpc";
import { BarChart3, FileText, TrendingDown, Users, AlertTriangle, Upload, ArrowRight, Trash2, Pencil, Check, X } from "lucide-react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const { data: empleados, isLoading: loadingEmp } = trpc.empleados.list.useQuery();
  const { data: periodos, isLoading: loadingPer } = trpc.periodos.list.useQuery();

  const ultimoPeriodo = periodos?.[0];
  const { data: reporteData, isLoading: loadingReporte } = trpc.reportes.getReportePeriodo.useQuery(
    { periodoId: ultimoPeriodo?.id ?? 0 },
    { enabled: !!ultimoPeriodo?.id }
  );

  // Estado para renombrar
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Mutaciones
  const deleteMutation = trpc.periodos.delete.useMutation({
    onSuccess: () => {
      utils.periodos.list.invalidate();
      utils.reportes.getReportePeriodo.invalidate();
      toast.success("Reporte eliminado correctamente");
    },
    onError: (e) => toast.error("Error al eliminar: " + e.message),
  });

  const renameMutation = trpc.periodos.rename.useMutation({
    onSuccess: () => {
      utils.periodos.list.invalidate();
      setRenamingId(null);
      toast.success("Reporte renombrado correctamente");
    },
    onError: (e) => toast.error("Error al renombrar: " + e.message),
  });

  const handleDelete = (e: React.MouseEvent, id: number, nombre: string) => {
    e.stopPropagation();
    if (!confirm(`¿Eliminar el reporte "${nombre}"? Esta acción no se puede deshacer.`)) return;
    deleteMutation.mutate({ id });
  };

  const handleStartRename = (e: React.MouseEvent, id: number, nombre: string) => {
    e.stopPropagation();
    setRenamingId(id);
    setRenameValue(nombre);
  };

  const handleConfirmRename = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!renameValue.trim()) return;
    renameMutation.mutate({ id, nombre: renameValue.trim() });
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(null);
  };

  const totalEmpleados = empleados?.length ?? 0;
  const totalPeriodos = periodos?.length ?? 0;
  const promedioAsistencia = reporteData?.promedioAsistencia ?? 0;
  const empleadosCriticos = reporteData?.empleadosCriticos ?? [];

  const totalDescuentos = reporteData?.calculos.reduce(
    (sum, c) => sum + parseFloat(c.descuento as string || "0"), 0
  ) ?? 0;

  // Total nómina: suma de (salario/30 * dias_laborados + bonos - descuentos) de todos los empleados del período
  const totalNomina = (() => {
    if (!reporteData || !empleados) return 0;
    return reporteData.calculos.reduce((sum, c) => {
      const emp = empleados.find((e) => e.id === c.empleadoId);
      if (!emp) return sum + parseFloat(c.salarioAPagar as string || "0");
      const salarioMensual = parseFloat(emp.salarioMensual as string || "0");
      const bonos = parseFloat(emp.bonos as string || "0");
      const diasLaborados = emp.diasLaborados ?? c.diasAsistidos ?? 0;
      const descuentosAdicionales = parseFloat(emp.descuentosAdicionales as string || "0");
      const descuento = parseFloat(c.descuento as string || "0");
      const salario = (salarioMensual / 30) * diasLaborados + bonos - descuento - descuentosAdicionales;
      return sum + Math.max(0, salario);
    }, 0);
  })();

  const stats = [
    {
      label: "Total Empleados",
      value: totalEmpleados,
      icon: Users,
      color: "oklch(0.22 0.06 240)",
      bg: "oklch(0.95 0.02 240)",
      change: "Activos en el sistema",
    },
    {
      label: "Períodos Procesados",
      value: totalPeriodos,
      icon: FileText,
      color: "oklch(0.45 0.15 270)",
      bg: "oklch(0.96 0.02 270)",
      change: "Archivos cargados",
    },
    {
      label: "Promedio Asistencia",
      value: `${promedioAsistencia.toFixed(1)}%`,
      icon: BarChart3,
      color: promedioAsistencia >= 80 ? "oklch(0.45 0.15 145)" : "oklch(0.55 0.18 65)",
      bg: promedioAsistencia >= 80 ? "oklch(0.96 0.03 145)" : "oklch(0.97 0.04 65)",
      change: ultimoPeriodo ? `Período: ${ultimoPeriodo.nombre}` : "Sin período",
    },
    {
      label: "Total Descuentos",
      value: formatCurrency(totalDescuentos),
      icon: TrendingDown,
      color: "oklch(0.52 0.20 25)",
      bg: "oklch(0.97 0.03 25)",
      change: "Por inasistencias",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: "oklch(0.15 0.02 240)" }}>
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Resumen ejecutivo del sistema de gestión de nómina y asistencias
          </p>
        </div>
        <Button
          onClick={() => setLocation("/cargar")}
          className="gap-2"
          style={{ background: "oklch(0.22 0.06 240)", color: "white" }}
        >
          <Upload className="w-4 h-4" />
          Cargar Reporte
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border border-border/60 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                  <p className="text-2xl font-bold" style={{ color: "oklch(0.15 0.02 240)" }}>
                    {loadingEmp || loadingPer || loadingReporte ? (
                      <span className="inline-block w-20 h-7 bg-muted animate-pulse rounded" />
                    ) : (
                      stat.value
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{stat.change}</p>
                </div>
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: stat.bg }}
                >
                  <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Empleados con inasistencias críticas */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Inasistencias Críticas
              </CardTitle>
              {ultimoPeriodo && (
                <Badge variant="outline" className="text-xs">
                  {ultimoPeriodo.nombre}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingReporte ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : empleadosCriticos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">
                  {ultimoPeriodo ? "Sin inasistencias críticas" : "Carga un reporte para ver datos"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {empleadosCriticos.slice(0, 6).map((emp) => (
                  <div
                    key={emp.empleadoId}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ background: "oklch(0.97 0.03 25)" }}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "oklch(0.15 0.02 240)" }}>
                        {emp.empleadoNombre}
                      </p>
                      <p className="text-xs" style={{ color: "oklch(0.52 0.18 25)" }}>
                        {emp.diasAsistidos} de {emp.diasLaborables} días asistidos
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <span className="text-sm font-bold" style={{ color: "oklch(0.45 0.18 25)" }}>
                        {emp.diasFalta} {emp.diasFalta === 1 ? "falta" : "faltas"}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        -{formatCurrency(parseFloat(emp.descuento as string || "0"))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Períodos recientes */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4" style={{ color: "oklch(0.22 0.06 240)" }} />
                Períodos Recientes
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/reportes")}
                className="text-xs gap-1 h-7"
              >
                Ver todos <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingPer ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : (periodos?.length ?? 0) === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Upload className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No hay períodos cargados</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setLocation("/cargar")}
                >
                  Cargar primer reporte
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {periodos?.slice(0, 5).map((periodo) => (
                  <div
                    key={periodo.id}
                    className="flex items-center gap-2 p-3 rounded-lg border border-border/40 hover:border-border transition-colors group"
                  >
                    {renamingId === periodo.id ? (
                      /* Modo edición de nombre */
                      <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                        <Input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") renameMutation.mutate({ id: periodo.id, nombre: renameValue.trim() });
                            if (e.key === "Escape") setRenamingId(null);
                          }}
                          className="h-7 text-sm flex-1"
                          autoFocus
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-green-600 hover:text-green-700"
                          onClick={(e) => handleConfirmRename(e, periodo.id)}
                          disabled={renameMutation.isPending}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground"
                          onClick={handleCancelRename}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      /* Modo normal */
                      <>
                        <div
                          className="min-w-0 flex-1 cursor-pointer"
                          onClick={() => setLocation(`/reportes/${periodo.id}`)}
                        >
                          <p className="text-sm font-medium truncate" style={{ color: "oklch(0.15 0.02 240)" }}>
                            {periodo.nombre}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {periodo.archivoNombre || "Archivo cargado"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            title="Renombrar"
                            onClick={(e) => handleStartRename(e, periodo.id, periodo.nombre)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-red-600"
                            title="Eliminar"
                            onClick={(e) => handleDelete(e, periodo.id, periodo.nombre)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                          <ArrowRight
                            className="w-4 h-4 text-muted-foreground cursor-pointer"
                            onClick={() => setLocation(`/reportes/${periodo.id}`)}
                          />
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Nómina total */}
      {reporteData && (
        <Card
          className="border-0 shadow-md"
          style={{ background: "linear-gradient(135deg, oklch(0.22 0.06 240) 0%, oklch(0.35 0.10 240) 100%)" }}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: "oklch(0.75 0.03 240)" }}>
                  Total Nómina a Pagar — {ultimoPeriodo?.nombre}
                </p>
                <p className="text-3xl font-bold text-white mt-1">{formatCurrency(totalNomina)}</p>
                <p className="text-sm mt-1" style={{ color: "oklch(0.75 0.03 240)" }}>
                  {reporteData.totalEmpleados} empleados · {formatCurrency(totalDescuentos)} en descuentos
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setLocation(`/reportes/${ultimoPeriodo?.id}`)}
                className="gap-2 border-white/30 text-white hover:bg-white/10"
                style={{ background: "transparent" }}
              >
                Ver Detalle <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
