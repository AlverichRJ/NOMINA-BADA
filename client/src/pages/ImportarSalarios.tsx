import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Download, X, ArrowRight, Lock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect } from "react";
import { useLocation } from "wouter";

type FilaPreview = {
  nombre: string;
  salarioMensual: number;
  bonos: number;
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
}

export default function ImportarSalarios() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!loading && user && !isAdmin) {
      setLocation("/");
    }
  }, [user, loading, isAdmin, setLocation]);

  if (!loading && user && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Lock className="w-12 h-12 text-muted-foreground opacity-40" />
        <p className="text-muted-foreground">No tienes permisos para acceder a esta sección.</p>
      </div>
    );
  }

  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<FilaPreview[] | null>(null);
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [resultados, setResultados] = useState<{ actualizados: number; creados: number } | null>(null);

  const previewMutation = trpc.salarios.preview.useMutation();
  const importarMutation = trpc.salarios.importar.useMutation();

  const procesarArchivo = useCallback(async (file: File) => {
    setFileName(file.name);
    const ext = file.name.split(".").pop()?.toLowerCase();

    try {
      let contenido = "";
      let formato: "csv" | "xlsx_base64" = "csv";

      if (ext === "csv" || ext === "txt") {
        contenido = await file.text();
        formato = "csv";
      } else if (ext === "xlsx" || ext === "xls") {
        const buf = await file.arrayBuffer();
        const uint8 = new Uint8Array(buf);
        let binary = "";
        for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
        contenido = btoa(binary);
        formato = "xlsx_base64";
      } else {
        toast.error("Formato no soportado", { description: "Usa un archivo .csv, .xlsx o .xls" });
        return;
      }

      const res = await previewMutation.mutateAsync({ contenido, formato });
      setPreview(res.filas);
      setStep("preview");
    } catch (e: any) {
      toast.error("Error al leer el archivo", { description: e.message });
    }
  }, [previewMutation, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) procesarArchivo(file);
  }, [procesarArchivo]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) procesarArchivo(file);
  };

  const confirmarImportacion = async () => {
    if (!preview) return;
    try {
      const res = await importarMutation.mutateAsync({ filas: preview });
      const actualizados = res.resultados.filter((r) => r.accion === "actualizado").length;
      const creados = res.resultados.filter((r) => r.accion === "creado").length;
      setResultados({ actualizados, creados });
      setStep("done");
      toast.success("¡Importación exitosa!", { description: `${actualizados} actualizados, ${creados} nuevos.` });
    } catch (e: any) {
      toast.error("Error al importar", { description: e.message });
    }
  };

  const reiniciar = () => {
    setStep("upload");
    setPreview(null);
    setFileName(null);
    setResultados(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  // Generar plantilla CSV de ejemplo
  const descargarPlantilla = () => {
    const csv = "Nombre,Salario Mensual,Bonos\nJuan Perez Lopez,18000,0\nMaria Garcia Sanchez,22000,500\nCarlos Hernandez,15000,0";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_salarios.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Importar Salarios</h1>
          <p className="text-muted-foreground mt-1">
            Carga un archivo Excel o CSV con los salarios mensuales de tus empleados.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={descargarPlantilla} className="gap-2">
          <Download className="w-4 h-4" />
          Descargar plantilla
        </Button>
      </div>

      {/* Pasos */}
      <div className="flex items-center gap-2 text-sm">
        {["Cargar archivo", "Revisar datos", "Confirmar"].map((label, i) => {
          const stepIdx = ["upload", "preview", "done"].indexOf(step);
          const active = i === stepIdx;
          const done = i < stepIdx;
          return (
            <div key={i} className="flex items-center gap-2">
              <span
                className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold border-2 transition-colors ${
                  done
                    ? "bg-primary border-primary text-primary-foreground"
                    : active
                    ? "border-primary text-primary"
                    : "border-muted-foreground/30 text-muted-foreground"
                }`}
              >
                {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
              </span>
              <span className={active ? "font-semibold text-foreground" : "text-muted-foreground"}>{label}</span>
              {i < 2 && <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50" />}
            </div>
          );
        })}
      </div>

      {/* PASO 1: Cargar archivo */}
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Selecciona el archivo de salarios</CardTitle>
            <CardDescription>
              Formatos aceptados: <strong>.csv</strong>, <strong>.xlsx</strong>, <strong>.xls</strong>
              <br />
              El archivo debe tener columnas: <code className="bg-muted px-1 rounded text-xs">Nombre</code>,{" "}
              <code className="bg-muted px-1 rounded text-xs">Salario Mensual</code> y opcionalmente{" "}
              <code className="bg-muted px-1 rounded text-xs">Bonos</code>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-base font-medium text-foreground">
                {dragging ? "Suelta el archivo aquí" : "Arrastra tu archivo aquí"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">o haz clic para seleccionar</p>
              {previewMutation.isPending && (
                <p className="text-sm text-primary mt-3 animate-pulse">Procesando archivo...</p>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls,.txt"
              className="hidden"
              onChange={handleFileChange}
            />
          </CardContent>
        </Card>
      )}

      {/* PASO 2: Preview */}
      {step === "preview" && preview && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-primary" />
                  {fileName}
                </CardTitle>
                <CardDescription className="mt-1">
                  Se encontraron <strong>{preview.length} empleados</strong>. Revisa los datos antes de confirmar.
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={reiniciar}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tabla preview */}
            <div className="rounded-lg border overflow-hidden">
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">#</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Nombre</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Salario Mensual</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Bonos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((fila, i) => (
                      <tr key={i} className="border-t hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                        <td className="px-4 py-2.5 font-medium">{fila.nombre}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-green-700 dark:text-green-400">
                          {formatCurrency(fila.salarioMensual)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">
                          {fila.bonos > 0 ? formatCurrency(fila.bonos) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="sticky bottom-0 bg-muted/90 backdrop-blur border-t-2">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-xs font-bold uppercase text-muted-foreground">
                        Total ({preview.length} empleados)
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-green-700 dark:text-green-400">
                        {formatCurrency(preview.reduce((s, f) => s + f.salarioMensual, 0))}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-muted-foreground">
                        {formatCurrency(preview.reduce((s, f) => s + (f.bonos ?? 0), 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Aviso */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                Los empleados que ya existan en el sistema tendrán su salario <strong>actualizado</strong>. Los nuevos serán creados automáticamente.
              </span>
            </div>

            {/* Botones */}
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={reiniciar}>
                Cancelar
              </Button>
              <Button onClick={confirmarImportacion} disabled={importarMutation.isPending} className="gap-2">
                {importarMutation.isPending ? (
                  <span className="animate-pulse">Importando...</span>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Confirmar importación
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PASO 3: Resultado */}
      {step === "done" && resultados && (
        <Card>
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 mx-auto text-green-500" />
            <h2 className="text-xl font-bold">¡Importación completada!</h2>
            <p className="text-muted-foreground">Los salarios han sido actualizados en el sistema.</p>
            <div className="flex justify-center gap-4 mt-2">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">{resultados.actualizados}</p>
                <p className="text-sm text-muted-foreground">Actualizados</p>
              </div>
              <div className="w-px bg-border" />
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">{resultados.creados}</p>
                <p className="text-sm text-muted-foreground">Nuevos</p>
              </div>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <Button variant="outline" onClick={reiniciar}>
                Importar otro archivo
              </Button>
              <Button onClick={() => window.location.href = "/empleados"}>
                Ver empleados
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instrucciones de formato */}
      {step === "upload" && (
        <Card className="bg-muted/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Formato esperado del archivo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md bg-background border p-3 font-mono text-xs overflow-x-auto">
              <p className="text-muted-foreground">Nombre,Salario Mensual,Bonos</p>
              <p>Juan Perez Lopez,18000,0</p>
              <p>Maria Garcia Sanchez,22000,500</p>
              <p>Carlos Hernandez,15000,</p>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>La primera fila debe ser el encabezado (se ignora al importar).</li>
              <li>La columna <strong>Bonos</strong> es opcional; si no la incluyes se asume $0.</li>
              <li>Los nombres no necesitan coincidir exactamente con los del sistema — el sistema hace match automático.</li>
              <li>Para Excel, guarda como <strong>.xlsx</strong> y asegúrate de que los datos estén en la primera hoja.</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
