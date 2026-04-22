import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, BarChart3, Calendar, Upload, Pencil, Trash2, Check, X, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { usePeriodoActivo } from "@/contexts/PeriodoActivoContext";

export default function Reportes() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { periodoActivoId, setPeriodoActivo } = usePeriodoActivo();
  const { data: periodos, isLoading } = trpc.periodos.list.useQuery();

  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");

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

  const handleSelectPeriodo = (e: React.MouseEvent, id: number, nombre: string) => {
    e.stopPropagation();
    setPeriodoActivo(id);
    toast.success(`Período activo: ${nombre}`);
  };

  // Período activo real: el seleccionado o el primero de la lista
  const periodoActivoIdReal = periodoActivoId ?? periodos?.[0]?.id;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: "oklch(0.15 0.02 240)" }}>
            Reportes
          </h1>
          <p className="text-muted-foreground mt-1">
            Historial de períodos procesados. Haz clic en un período para seleccionarlo como activo.
          </p>
        </div>
        <Button
          onClick={() => setLocation("/cargar")}
          className="gap-2"
          style={{ background: "oklch(0.22 0.06 240)", color: "white" }}
        >
          <Upload className="w-4 h-4" />
          Cargar Nuevo
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : (periodos?.length ?? 0) === 0 ? (
        <Card className="border border-border/60 shadow-sm">
          <CardContent className="py-16 text-center">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium text-muted-foreground">No hay reportes cargados</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setLocation("/cargar")}
            >
              Cargar primer reporte
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {periodos?.map((periodo) => {
            const isActivo = periodo.id === periodoActivoIdReal;
            return (
              <Card
                key={periodo.id}
                className={`shadow-sm transition-all group cursor-pointer ${
                  isActivo
                    ? "border-2 shadow-md"
                    : "border border-border/60 hover:shadow-md hover:border-border"
                }`}
                style={isActivo ? {
                  borderColor: "oklch(0.22 0.06 240)",
                  background: "oklch(0.96 0.02 240)",
                } : {}}
                onClick={(e) => handleSelectPeriodo(e, periodo.id, periodo.nombre)}
              >
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    {/* Ícono */}
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                      style={{
                        background: isActivo ? "oklch(0.22 0.06 240)" : "oklch(0.95 0.02 240)",
                      }}
                    >
                      {isActivo ? (
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      ) : (
                        <Calendar className="w-5 h-5" style={{ color: "oklch(0.22 0.06 240)" }} />
                      )}
                    </div>

                    {/* Nombre / modo edición */}
                    {renamingId === periodo.id ? (
                      <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                        <Input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") renameMutation.mutate({ id: periodo.id, nombre: renameValue.trim() });
                            if (e.key === "Escape") setRenamingId(null);
                          }}
                          className="h-8 text-sm flex-1"
                          autoFocus
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-green-600 hover:text-green-700"
                          onClick={(e) => handleConfirmRename(e, periodo.id)}
                          disabled={renameMutation.isPending}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground"
                          onClick={handleCancelRename}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        {/* Info del período */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p
                              className="font-semibold"
                              style={{ color: isActivo ? "oklch(0.12 0.04 240)" : "oklch(0.15 0.02 240)" }}
                            >
                              {periodo.nombre}
                            </p>
                            {isActivo && (
                              <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                style={{ background: "oklch(0.22 0.06 240)", color: "white" }}
                              >
                                ACTIVO
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {periodo.archivoNombre || "Archivo procesado"} ·{" "}
                            {new Date(periodo.createdAt).toLocaleDateString("es-MX", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>

                        {/* Acciones */}
                        <div className="flex items-center gap-1 shrink-0">
                          {!isActivo && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => handleSelectPeriodo(e, periodo.id, periodo.nombre)}
                              title="Usar como período activo"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Usar
                            </Button>
                          )}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              title="Renombrar"
                              onClick={(e) => handleStartRename(e, periodo.id, periodo.nombre)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-red-600"
                              title="Eliminar"
                              onClick={(e) => handleDelete(e, periodo.id, periodo.nombre)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              title="Ver detalle"
                              onClick={(e) => { e.stopPropagation(); setLocation(`/reportes/${periodo.id}`); }}
                            >
                              <ArrowRight className="w-5 h-5" />
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
