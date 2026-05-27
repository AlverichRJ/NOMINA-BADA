import { trpc } from "@/lib/trpc";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, FileText, Loader2, Upload, X, Lock } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function CargarReporte() {
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const canLoadReports = user?.role === "admin" || user?.role === "reportes" || user?.role === "user";

  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<{
    periodoId: number;
    nombrePeriodo: string;
    totalEmpleados: number;
    empleadosNoRegistrados?: string[];
  } | null>(null);

  useEffect(() => {
    if (!loading && user && !canLoadReports) {
      setLocation("/");
    }
  }, [user, loading, canLoadReports, setLocation]);

  const procesarMutation = trpc.reportes.procesarArchivo.useMutation({
    onSuccess: (data) => {
      setResult(data);
      const omitidos = data.empleadosNoRegistrados?.length ?? 0;
      toast.success(`Reporte procesado: ${data.totalEmpleados} empleados${omitidos ? `, ${omitidos} no registrados` : ""}`);
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const handleFile = useCallback((f: File) => {
    if (!f.name.toLowerCase().endsWith(".txt")) {
      toast.error("Solo se aceptan archivos .txt");
      return;
    }
    setFile(f);
    setResult(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const leerTxtLatin1 = async (archivo: File): Promise<string> => {
    const buffer = await archivo.arrayBuffer();
    return new TextDecoder("iso-8859-1").decode(buffer);
  };

  const handleProcess = async () => {
    if (!file) return;
    const text = await leerTxtLatin1(file);
    procesarMutation.mutate({ contenido: text, nombreArchivo: file.name });
  };

  if (!loading && user && !canLoadReports) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4" translate="no">
        <Lock className="w-12 h-12 text-muted-foreground opacity-40" />
        <p className="text-muted-foreground">No tienes permisos para acceder a esta sección.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto" translate="no">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: "oklch(0.15 0.02 240)" }}>
          Cargar Reporte
        </h1>
        <p className="text-muted-foreground mt-1">
          Sube el archivo TXT exportado del reloj checador para procesar las asistencias
        </p>
      </div>

      {/* Drop Zone */}
      <Card className="border border-border/60 shadow-sm">
        <CardContent className="p-8">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => document.getElementById("file-input")?.click()}
            className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all"
            style={{
              borderColor: dragOver ? "oklch(0.22 0.06 240)" : "oklch(0.85 0.01 240)",
              background: dragOver ? "oklch(0.96 0.02 240)" : "oklch(0.99 0.002 240)",
            }}
          >
            <input
              id="file-input"
              type="file"
              accept=".txt"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            {file ? (
              <div className="flex flex-col items-center gap-3">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: "oklch(0.95 0.03 145)" }}
                >
                  <FileText className="w-7 h-7" style={{ color: "oklch(0.45 0.15 145)" }} />
                </div>
                <div>
                  <p className="font-semibold" style={{ color: "oklch(0.15 0.02 240)" }}>
                    {file.name}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); }}
                  className="gap-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" /> Cambiar archivo
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: "oklch(0.95 0.02 240)" }}
                >
                  <Upload className="w-7 h-7" style={{ color: "oklch(0.45 0.06 240)" }} />
                </div>
                <div>
                  <p className="font-semibold" style={{ color: "oklch(0.15 0.02 240)" }}>
                    Arrastra el archivo aquí
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    o haz clic para seleccionar un archivo .txt
                  </p>
                </div>
              </div>
            )}
          </div>

          {file && !result && (
            <div className="mt-4">
              <Button
                onClick={handleProcess}
                disabled={procesarMutation.isPending}
                className="w-full gap-2 h-11"
                style={{ background: "oklch(0.22 0.06 240)", color: "white" }}
              >
                {procesarMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Procesar Reporte
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <Card className="border-0 shadow-md" style={{ background: "oklch(0.95 0.05 145)" }}>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "oklch(0.45 0.15 145)" }}>
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-lg" style={{ color: "oklch(0.25 0.10 145)" }}>
                  ¡Reporte procesado exitosamente!
                </p>
                <p className="text-sm mt-1" style={{ color: "oklch(0.38 0.12 145)" }}>
                  <strong>Período:</strong> {result.nombrePeriodo}
                </p>
                <p className="text-sm" style={{ color: "oklch(0.38 0.12 145)" }}>
                  <strong>Empleados procesados:</strong> {result.totalEmpleados}
                </p>
                {(result.empleadosNoRegistrados?.length ?? 0) > 0 && (
                  <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                      <div>
                        <p className="font-semibold">Hay personas que se encontraron en el archivo TXT pero no en el sistema.</p>
                        <p className="mt-1 text-sm">No se agregaron automáticamente. Para incluirlas, primero agrégalas desde el módulo de Empleados y después vuelve a cargar el TXT si corresponde.</p>
                        <ul className="mt-2 max-h-40 list-disc overflow-y-auto pl-5 text-sm">
                          {result.empleadosNoRegistrados?.map((nombre) => (
                            <li key={nombre}>{nombre}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex gap-3 mt-4">
                  <Button
                    onClick={() => setLocation(`/reportes/${result.periodoId}`)}
                    size="sm"
                    style={{ background: "oklch(0.38 0.12 145)", color: "white" }}
                  >
                    Ver Reporte
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setFile(null); setResult(null); }}
                    style={{ borderColor: "oklch(0.65 0.10 145)", color: "oklch(0.38 0.12 145)" }}
                  >
                    Cargar Otro
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="border border-border/60 shadow-sm">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-3" style={{ color: "oklch(0.15 0.02 240)" }}>
            Instrucciones
          </h3>
          <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
            <li>Exporta el reporte de asistencias del reloj checador en formato TXT</li>
            <li>Sube el archivo usando el área de carga o arrastrándolo</li>
            <li>El sistema detectará asistencias, faltas y horarios del TXT</li>
            <li>El TXT no agrega empleados ni información extra; las altas y datos bancarios se gestionan solo desde Empleados</li>
          </ol>
          <div
            className="mt-4 p-3 rounded-lg text-xs"
            style={{ background: "oklch(0.97 0.02 240)", color: "oklch(0.45 0.04 240)" }}
          >
            <strong>Nota:</strong> Cualquier línea del archivo que contenga la palabra "Falta" se registrará como falta obligatoria. Si el TXT incluye personas no registradas, se mostrará una advertencia roja y esas personas no se crearán automáticamente.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
