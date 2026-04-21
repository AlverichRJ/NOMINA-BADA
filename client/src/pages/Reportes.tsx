import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, Calendar, Upload } from "lucide-react";

export default function Reportes() {
  const [, setLocation] = useLocation();
  const { data: periodos, isLoading } = trpc.periodos.list.useQuery();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: "oklch(0.15 0.02 240)" }}>
            Reportes
          </h1>
          <p className="text-muted-foreground mt-1">
            Historial de períodos procesados y reportes de asistencia
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
          {periodos?.map((periodo) => (
            <Card
              key={periodo.id}
              className="border border-border/60 shadow-sm hover:shadow-md transition-all cursor-pointer"
              onClick={() => setLocation(`/reportes/${periodo.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "oklch(0.95 0.02 240)" }}
                    >
                      <Calendar className="w-5 h-5" style={{ color: "oklch(0.22 0.06 240)" }} />
                    </div>
                    <div>
                      <p className="font-semibold" style={{ color: "oklch(0.15 0.02 240)" }}>
                        {periodo.nombre}
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {periodo.archivoNombre || "Archivo procesado"} ·{" "}
                        {new Date(periodo.createdAt).toLocaleDateString("es-MX", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
