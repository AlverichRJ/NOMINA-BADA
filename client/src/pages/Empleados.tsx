import { trpc } from "@/lib/trpc";
import { useState, useRef, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { usePeriodoActivo } from "@/contexts/PeriodoActivoContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, Check, CheckCircle2, ChevronDown, Circle, DollarSign, Edit2, Eye, EyeOff, FileText, History, MessageSquare, Plus, RotateCcw, Search, Trash2, Users, X } from "lucide-react";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);
}

function formatFecha(fecha: string) {
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const [y, m, d] = fecha.split("-");
  return `${d} ${meses[parseInt(m) - 1]} ${y}`;
}

function safeNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const cleaned = trimmed.replace(/[$,\s]/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return 0;
  if (cleaned.replace(/[-.]/g, "").length > 12) return 0;
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDateTime(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
  return date.toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const DIAS_LABORADOS_MANUALES_STORAGE_KEY = "nomina_dias_laborados_manuales_v1";

const CATALOGO_BONOS_FIJOS = [
  { nombre: "Tellez Jimenez Noemi Isabel", bono: 2000, salarioMensual: 25000 },
  { nombre: "Vizcarra Soto Elizabeth", bono: 7000, salarioMensual: 20000 },
  { nombre: "Ceseña Romero Braulio", bono: 4000, salarioMensual: 20000 },
  { nombre: "Lucia Elizabeth Figueroa Garcia", bono: 4000, salarioMensual: 20000 },
  { nombre: "David Alejandro Valencia Valdez", bono: 4000, salarioMensual: 20000 },
  { nombre: "Palacios Ramirez Abigail", bono: 4000, salarioMensual: 20000 },
  { nombre: "Cesar Andre Lozano Lemus", bono: 2000, salarioMensual: 20000 },
  { nombre: "Selene Sofia Dominguez Tellez", bono: 4000, salarioMensual: 20000 },
  { nombre: "Alejandra Gutierrez Sanchez", bono: 4000, salarioMensual: 20000 },
  { nombre: "Diego Alberto Rodriguez Garcia", bono: 2000, salarioMensual: 20000 },
  { nombre: "Jesus Emmanuel Alvares Medina", bono: 2000, salarioMensual: 20000 },
  { nombre: "Luis Daniel Garcia Jaramillo", bono: 2000, salarioMensual: 18000 },
  { nombre: "Brando Hernandez Quiñonez", bono: 2000, salarioMensual: 20000 },
] as const;

const MONTOS_BONOS_FIJOS = Array.from(new Set(CATALOGO_BONOS_FIJOS.map((item) => item.bono))).sort((a, b) => a - b);

type OrdenEmpleados = "banco" | "nombre" | "apellido" | "departamento" | "salario";
type DireccionOrden = "asc" | "desc";

function obtenerApellidoOrden(nombre: string) {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  return partes[0] ?? nombre;
}

function normalizarBusqueda(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function obtenerPrioridadBanco(banco?: string | null) {
  const bancoNormalizado = normalizarBusqueda(banco ?? "");
  if (bancoNormalizado.includes("santander")) return 0;
  if (bancoNormalizado.includes("bbva") || bancoNormalizado.includes("bancomer")) return 1;
  if (bancoNormalizado.includes("banamex") || bancoNormalizado.includes("citibanamex") || bancoNormalizado.includes("citi banamex")) return 2;
  return 3;
}

type Empleado = {
  id: number;
  nombre: string;
  salarioMensual: string | number;
  bonos: string | number;
  diasLaborados?: number | null;
  diasLaboradosManual?: boolean | number | null;
  descuentosAdicionales?: string | number | null;
  nominaLista?: boolean | number | null;
  dias_falta_periodo?: number | null;
  departamentoId?: number | null;
  departamentoNombre?: string | null;
  notas?: string | null;
  banco?: string | null;
  numeroCuenta?: string | null;
  tarjeta?: string | null;
  clabeInterbancaria?: string | null;
  activo?: boolean;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
};

// Celda editable inline
function EditableCell({
  value,
  type = "number",
  onSave,
  format,
}: {
  value: string | number;
  type?: string;
  onSave: (val: number) => void;
  format: (val: number) => string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setDraft(String(value));
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 50);
  }

  function commit() {
    const n = parseFloat(draft);
    if (!isNaN(n) && n >= 0) {
      onSave(n);
    }
    setEditing(false);
  }

  function cancel() {
    setEditing(false);
    setDraft(String(value));
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 justify-end">
        <Input
          ref={inputRef}
          type={type}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") cancel();
          }}
          className="h-7 w-28 text-right text-sm px-2"
          min={0}
        />
        <button onClick={commit} className="text-green-600 hover:text-green-700 p-0.5">
          <Check className="w-3.5 h-3.5" />
        </button>
        <button onClick={cancel} className="text-muted-foreground hover:text-foreground p-0.5">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  const num = parseFloat(String(value)) || 0;
  return (
    <button
      onClick={startEdit}
      className="group flex items-center gap-1 justify-end w-full text-right hover:text-primary transition-colors"
      title="Clic para editar"
    >
      <span className="text-sm font-medium">{format(num)}</span>
      <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity shrink-0" />
    </button>
  );
}

function EditableTextCell({
  value,
  placeholder = "—",
  onSave,
  className = "",
  inputClassName = "",
}: {
  value?: string | null;
  placeholder?: string;
  onSave: (val: string) => void;
  className?: string;
  inputClassName?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ""));
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setDraft(String(value ?? ""));
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 50);
  }

  function commit() {
    const next = draft.trim();
    if (next !== String(value ?? "").trim()) {
      onSave(next);
    }
    setEditing(false);
  }

  function cancel() {
    setEditing(false);
    setDraft(String(value ?? ""));
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") cancel();
          }}
          onBlur={commit}
          className={`h-7 text-xs px-2 ${inputClassName}`}
        />
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={commit} className="text-green-600 hover:text-green-700 p-0.5">
          <Check className="w-3.5 h-3.5" />
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={cancel} className="text-muted-foreground hover:text-foreground p-0.5">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  const text = String(value ?? "").trim();
  return (
    <button
      type="button"
      onClick={startEdit}
      className={`group inline-flex min-w-0 items-center gap-1 text-left hover:text-primary transition-colors ${className}`}
      title="Clic para editar"
    >
      <span className="truncate">{text || placeholder}</span>
      <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity shrink-0" />
    </button>
  );
}

export default function Empleados() {
  const utils = trpc.useUtils();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const puedeEditarNomina = Boolean(user && user.role !== "reportes");
  const { periodoActivoId, setPeriodoActivo } = usePeriodoActivo();
  const { data: periodos } = trpc.periodos.list.useQuery();
  const { data: departamentos } = trpc.departamentos.list.useQuery();
  const periodoActivo = periodos?.find((p) => p.id === periodoActivoId) ?? periodos?.[0] ?? null;
  const periodoActivoIdReal = periodoActivo?.id;
  const [sabadosOpen, setSabadosOpen] = useState(false);
  const [sabadosSeleccionados, setSabadosSeleccionados] = useState<string[]>([]);
  const [sabadoScope, setSabadoScope] = useState<"global" | "seleccionados">("global");
  const [estadoSabado, setEstadoSabado] = useState<"asistencia" | "falta" | "descanso">("asistencia");
  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState<number[]>([]);
  const [empleadoSearch, setEmpleadoSearch] = useState("");
  const [festivosOpen, setFestivosOpen] = useState(false);
  const [festivoDias, setFestivoDias] = useState("1");
  const [festivoScope, setFestivoScope] = useState<"global" | "seleccionados">("global");
  const [festivoEmpleadoIds, setFestivoEmpleadoIds] = useState<number[]>([]);
  const [festivoEmpleadoSearch, setFestivoEmpleadoSearch] = useState("");
  const [bonosOpen, setBonosOpen] = useState(false);
  const [bonoSearch, setBonoSearch] = useState("");
  const [bonoEmpleadoId, setBonoEmpleadoId] = useState<number | null>(null);
  const [bonoMontoSeleccionado, setBonoMontoSeleccionado] = useState<number | null>(null);
  const [bonoMontoManual, setBonoMontoManual] = useState("");
  const { data: diasPeriodoData } = trpc.periodos.getDias.useQuery(
    { periodoId: periodoActivoIdReal ?? 0 },
    { enabled: !!periodoActivoIdReal }
  );

  const { data: empleados, isLoading } = trpc.empleados.list.useQuery(
    periodoActivoIdReal ? { periodoId: periodoActivoIdReal } : undefined
  );
  const { data: sabados = [] } = trpc.periodos.getSabados.useQuery(
    { periodoId: periodoActivoIdReal ?? 0 },
    { enabled: !!periodoActivoIdReal && sabadosOpen }
  );
  const { data: empleadosEliminados, isLoading: isLoadingEliminados } = trpc.empleados.listEliminados.useQuery();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [historialOpen, setHistorialOpen] = useState(false);
  const [confirmLimpiarHistorial, setConfirmLimpiarHistorial] = useState(false);
  const [editEmpleado, setEditEmpleado] = useState<Empleado | null>(null);
  const [form, setForm] = useState({ nombre: "", salarioMensual: "", bonos: "", departamentoId: "", banco: "", numeroCuenta: "", tarjeta: "", clabeInterbancaria: "" });
  const [notasEmpleado, setNotasEmpleado] = useState<Empleado | null>(null);
  const [notasDraft, setNotasDraft] = useState("");
  const [departamentoActivo, setDepartamentoActivo] = useState<number | "todos">("todos");
  const [bancoActivo, setBancoActivo] = useState<string>("todos");
  const [ordenEmpleados, setOrdenEmpleados] = useState<OrdenEmpleados>("banco");
  const [direccionOrden, setDireccionOrden] = useState<DireccionOrden>("asc");
  const [bancosVisibles, setBancosVisibles] = useState<Record<number, boolean>>({});
  const [nuevoDepartamento, setNuevoDepartamento] = useState("");
  const [editDeptoId, setEditDeptoId] = useState<number | null>(null);
  const [editDeptoNombre, setEditDeptoNombre] = useState("");
  const [localOverrides, setLocalOverrides] = useState<Record<number, Partial<Empleado>>>({});
  const [diasLaboradosManuales, setDiasLaboradosManuales] = useState<Record<string, true>>(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(window.localStorage.getItem(DIAS_LABORADOS_MANUALES_STORAGE_KEY) ?? "{}") as Record<string, true>;
    } catch {
      return {};
    }
  });

  const queryInput = useMemo(
    () => (periodoActivoIdReal ? { periodoId: periodoActivoIdReal } : undefined),
    [periodoActivoIdReal]
  );

  useEffect(() => {
    setLocalOverrides({});
  }, [periodoActivoIdReal]);

  async function exportarPagosBancosPDF() {
    if (!periodoActivoIdReal) {
      toast.error("Selecciona un período activo antes de exportar");
      return;
    }

    try {
      const params = new URLSearchParams();
      if (departamentoActivo !== "todos") params.set("departamentoId", String(departamentoActivo));
      if (bancoActivo !== "todos") params.set("banco", bancoActivo);
      const query = params.toString();
      const response = await fetch(`/api/export/pdf-pagos-bancos/${periodoActivoIdReal}${query ? `?${query}` : ""}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "No se pudo exportar el PDF" }));
        throw new Error(error.error || "No se pudo exportar el PDF");
      }
      const contentType = response.headers.get("content-type") ?? "";
      const blob = await response.blob();
      const buffer = await blob.arrayBuffer();
      const firma = new TextDecoder().decode(buffer.slice(0, 4));
      if (!contentType.toLowerCase().includes("application/pdf") || firma !== "%PDF") {
        let detalle = "El servidor no devolvió un PDF válido";
        try {
          const texto = new TextDecoder().decode(buffer);
          const json = JSON.parse(texto);
          detalle = json.error || detalle;
        } catch {
          // Mantener mensaje genérico cuando la respuesta no sea JSON.
        }
        throw new Error(detalle);
      }
      const pdfBlob = new Blob([buffer], { type: "application/pdf" });
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Pagos_Bancos_${periodoActivoIdReal}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      toast.success("PDF de pagos a bancos exportado");
    } catch (error: any) {
      toast.error(error.message ?? "Error al exportar PDF");
    }
  }

  function aplicarCambioLocal(id: number, cambios: Partial<Empleado>) {
    setLocalOverrides((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? {}), ...cambios },
    }));
  }

  function limpiarCambioLocal(id: number) {
    setLocalOverrides((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  const empleadosVisiblesSabados = useMemo(() => {
    const q = empleadoSearch.trim().toLowerCase();
    return (empleados ?? []).filter((emp) => !q || emp.nombre.toLowerCase().includes(q));
  }, [empleados, empleadoSearch]);

  function diasLaboradosManualKey(id: number) {
    return `${periodoActivoIdReal ?? "sin_periodo"}:${id}`;
  }

  function registrarDiasLaboradosManual(id: number) {
    const key = diasLaboradosManualKey(id);
    setDiasLaboradosManuales((prev) => {
      const next = { ...prev, [key]: true as const };
      if (typeof window !== "undefined") {
        window.localStorage.setItem(DIAS_LABORADOS_MANUALES_STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
  }

  function tieneDiasLaboradosManual(emp: Empleado) {
    return Boolean(emp.diasLaboradosManual || diasLaboradosManuales[diasLaboradosManualKey(emp.id)] || localOverrides[emp.id]?.diasLaborados !== undefined);
  }

  const createMutation = trpc.empleados.create.useMutation({
    onSuccess: () => {
      utils.empleados.list.invalidate();
      toast.success("Empleado creado correctamente");
      setDialogOpen(false);
      setForm({ nombre: "", salarioMensual: "", bonos: "", departamentoId: "", banco: "", numeroCuenta: "", tarjeta: "", clabeInterbancaria: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.empleados.update.useMutation({
    onMutate: (variables) => {
      aplicarCambioLocal(variables.id, {
        ...(variables.nombre !== undefined ? { nombre: variables.nombre } : {}),
        ...(variables.salarioMensual !== undefined ? { salarioMensual: variables.salarioMensual } : {}),
        ...(variables.bonos !== undefined ? { bonos: variables.bonos } : {}),
        ...(variables.diasLaborados !== undefined ? { diasLaborados: variables.diasLaborados } : {}),
        ...(variables.descuentosAdicionales !== undefined ? { descuentosAdicionales: variables.descuentosAdicionales } : {}),
        ...(variables.nominaLista !== undefined ? { nominaLista: variables.nominaLista } : {}),
        ...(variables.departamentoId !== undefined ? { departamentoId: variables.departamentoId } : {}),
        ...(variables.notas !== undefined ? { notas: variables.notas } : {}),
        ...(variables.banco !== undefined ? { banco: variables.banco } : {}),
        ...(variables.numeroCuenta !== undefined ? { numeroCuenta: variables.numeroCuenta } : {}),
        ...(variables.tarjeta !== undefined ? { tarjeta: variables.tarjeta } : {}),
        ...(variables.clabeInterbancaria !== undefined ? { clabeInterbancaria: variables.clabeInterbancaria } : {}),
      });
    },
    onSuccess: async (_data, variables) => {
      await utils.empleados.list.invalidate(queryInput);
      limpiarCambioLocal(variables.id);
      toast.success("Guardado");
    },
    onError: (e, variables) => {
      limpiarCambioLocal(variables.id);
      utils.empleados.list.invalidate(queryInput);
      toast.error(e.message);
    },
  });

  const updateDiasMutation = trpc.periodos.updateDiasSeleccionados.useMutation({
    onSuccess: () => {
      if (periodoActivoIdReal) utils.periodos.getDias.invalidate({ periodoId: periodoActivoIdReal });
      utils.empleados.list.invalidate();
      toast.success("Días actualizados");
    },
    onError: (e) => toast.error(e.message),
  });

  const actualizarSabadosMutation = trpc.periodos.actualizarSabados.useMutation({
    onSuccess: async (result) => {
      if (periodoActivoIdReal) {
        await utils.periodos.getSabados.invalidate({ periodoId: periodoActivoIdReal });
        await utils.periodos.getDias.invalidate({ periodoId: periodoActivoIdReal });
        await utils.empleados.list.invalidate({ periodoId: periodoActivoIdReal });
        await utils.reportes.getReportePeriodo.invalidate({ periodoId: periodoActivoIdReal });
      }
      await utils.periodos.list.invalidate();
      toast.success(`Sábados actualizados (${result.affectedRows ?? 0} registros)`);
      setSabadosOpen(false);
    },
    onError: (e) => toast.error("Error al actualizar sábados: " + e.message),
  });

  const sumarDiasFestivosMutation = trpc.empleados.sumarDiasFestivos.useMutation({
    onSuccess: async (result, variables) => {
      const dias = variables.dias;
      await utils.empleados.list.invalidate();
      if (periodoActivoIdReal) {
        await utils.empleados.list.invalidate({ periodoId: periodoActivoIdReal });
        await utils.reportes.getReportePeriodo.invalidate({ periodoId: periodoActivoIdReal });
      }
      toast.success(`Días festivos aplicados: +${dias} día${dias === 1 ? "" : "s"} a ${result.affectedRows ?? 0} empleado${(result.affectedRows ?? 0) === 1 ? "" : "s"}`);
      setFestivosOpen(false);
      setFestivoDias("1");
      setFestivoScope("global");
      setFestivoEmpleadoIds([]);
      setFestivoEmpleadoSearch("");
    },
    onError: (e) => toast.error("Error al aplicar días festivos: " + e.message),
  });

  const deleteMutation = trpc.empleados.delete.useMutation({
    onSuccess: () => {
      utils.empleados.list.invalidate();
      utils.empleados.listEliminados.invalidate();
      toast.success("Empleado enviado al historial de eliminados");
      setDeleteId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const restoreMutation = trpc.empleados.restore.useMutation({
    onSuccess: () => {
      utils.empleados.list.invalidate();
      utils.empleados.listEliminados.invalidate();
      toast.success("Empleado restaurado correctamente");
    },
    onError: (e) => toast.error(e.message),
  });

  const clearHistorialMutation = trpc.empleados.clearHistorial.useMutation({
    onSuccess: () => {
      utils.empleados.listEliminados.invalidate();
      toast.success("Historial de personas eliminadas limpiado correctamente");
      setConfirmLimpiarHistorial(false);
      setHistorialOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const createDepartamentoMutation = trpc.departamentos.create.useMutation({
    onSuccess: () => {
      utils.departamentos.list.invalidate();
      toast.success("Departamento creado");
      setNuevoDepartamento("");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateDepartamentoMutation = trpc.departamentos.update.useMutation({
    onSuccess: () => {
      utils.departamentos.list.invalidate();
      utils.empleados.list.invalidate();
      toast.success("Departamento actualizado");
      setEditDeptoId(null);
      setEditDeptoNombre("");
    },
    onError: (e) => toast.error(e.message),
  });

  const empleadosConCambiosLocales = (empleados ?? []).map((e) => ({
    ...e,
    ...(localOverrides[e.id] ?? {}),
  }));

  const bancosDisponibles = Array.from(
    new Set(
      empleadosConCambiosLocales
        .map((e) => (e.banco ?? "").trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, "es"));

  const filtered = empleadosConCambiosLocales
    .filter((e) => {
      const q = normalizarBusqueda(search);
      const matchesSearch = !q || normalizarBusqueda(`${e.nombre} ${e.departamentoNombre ?? ""} ${e.banco ?? ""}`).includes(q);
      const matchesDepto = departamentoActivo === "todos" || e.departamentoId === departamentoActivo;
      const matchesBanco = bancoActivo === "todos" || (e.banco ?? "").trim() === bancoActivo;
      return matchesSearch && matchesDepto && matchesBanco;
    })
    .sort((a, b) => {
      const dir = direccionOrden === "asc" ? 1 : -1;
      if (ordenEmpleados === "salario") {
        const salarioA = safeNumber(a.salarioMensual);
        const salarioB = safeNumber(b.salarioMensual);
        if (salarioA !== salarioB) return (salarioA - salarioB) * dir;
        return a.nombre.localeCompare(b.nombre, "es") * dir;
      }
      if (ordenEmpleados === "banco") {
        const prioridadA = obtenerPrioridadBanco(a.banco);
        const prioridadB = obtenerPrioridadBanco(b.banco);
        if (prioridadA !== prioridadB) return prioridadA - prioridadB;
        const bancoA = a.banco?.trim() || "Otros bancos";
        const bancoB = b.banco?.trim() || "Otros bancos";
        const bancoCompare = bancoA.localeCompare(bancoB, "es", { numeric: true, sensitivity: "base" });
        if (bancoCompare !== 0) return bancoCompare;
        return a.nombre.localeCompare(b.nombre, "es", { numeric: true, sensitivity: "base" }) * dir;
      }
      const textA = ordenEmpleados === "departamento"
        ? `${a.departamentoNombre || "Sin departamento"} ${a.nombre}`
        : ordenEmpleados === "apellido"
          ? `${obtenerApellidoOrden(a.nombre)} ${a.nombre}`
          : a.nombre;
      const textB = ordenEmpleados === "departamento"
        ? `${b.departamentoNombre || "Sin departamento"} ${b.nombre}`
        : ordenEmpleados === "apellido"
          ? `${obtenerApellidoOrden(b.nombre)} ${b.nombre}`
          : b.nombre;
      return textA.localeCompare(textB, "es", { numeric: true, sensitivity: "base" }) * dir;
    });

  const eliminadosFiltrados = (empleadosEliminados ?? []).filter((e) => {
    const matchesSearch = e.nombre.toLowerCase().includes(search.toLowerCase());
    const matchesDepto = departamentoActivo === "todos" || e.departamentoId === departamentoActivo;
    return matchesSearch && matchesDepto;
  });

  const empleadosSabadoFiltrados = empleadosConCambiosLocales.filter((emp) =>
    emp.nombre.toLowerCase().includes(empleadoSearch.trim().toLowerCase())
  );

  const empleadosFestivoFiltrados = empleadosConCambiosLocales.filter((emp) =>
    emp.nombre.toLowerCase().includes(festivoEmpleadoSearch.trim().toLowerCase())
  );

  const bonosPorNombre = useMemo(() => {
    const map = new Map<string, { nombre: string; bono: number; salarioMensual: number; orden: number }>();
    CATALOGO_BONOS_FIJOS.forEach((item, orden) => {
      map.set(normalizarBusqueda(item.nombre), { ...item, orden });
    });
    return map;
  }, []);

  const empleadosBonosFiltrados = useMemo(() => {
    const q = normalizarBusqueda(bonoSearch);
    return empleadosConCambiosLocales
      .map((emp) => ({ emp, catalogo: bonosPorNombre.get(normalizarBusqueda(emp.nombre)) }))
      .filter(({ emp, catalogo }) => {
        if (!q) return Boolean(catalogo);
        return normalizarBusqueda(emp.nombre).includes(q);
      })
      .sort((a, b) => {
        const ordenA = a.catalogo?.orden ?? 9999;
        const ordenB = b.catalogo?.orden ?? 9999;
        if (ordenA !== ordenB) return ordenA - ordenB;
        return a.emp.nombre.localeCompare(b.emp.nombre, "es");
      });
  }, [bonoSearch, bonosPorNombre, empleadosConCambiosLocales]);

  const empleadoBonoSeleccionado = empleadosConCambiosLocales.find((emp) => emp.id === bonoEmpleadoId) ?? null;
  const catalogoBonoSeleccionado = empleadoBonoSeleccionado
    ? bonosPorNombre.get(normalizarBusqueda(empleadoBonoSeleccionado.nombre))
    : undefined;
  const bonoActualSeleccionado = empleadoBonoSeleccionado ? safeNumber(empleadoBonoSeleccionado.bonos) : 0;
  const empleadoTieneBonoActual = bonoActualSeleccionado > 0;

  function openCreate() {
    setEditEmpleado(null);
    setForm({ nombre: "", salarioMensual: "", bonos: "", departamentoId: "", banco: "", numeroCuenta: "", tarjeta: "", clabeInterbancaria: "" });
    setDialogOpen(true);
  }

  function openEdit(emp: Empleado) {
    setEditEmpleado(emp);
    setForm({
      nombre: emp.nombre,
      salarioMensual: String(emp.salarioMensual),
      bonos: String(emp.bonos),
      departamentoId: emp.departamentoId ? String(emp.departamentoId) : "",
      banco: emp.banco ?? "",
      numeroCuenta: emp.numeroCuenta ?? "",
      tarjeta: emp.tarjeta ?? "",
      clabeInterbancaria: emp.clabeInterbancaria ?? "",
    });
    setDialogOpen(true);
  }

  function openNotas(emp: Empleado) {
    setNotasEmpleado(emp);
    setNotasDraft(emp.notas ?? "");
  }

  function guardarNotas() {
    if (!notasEmpleado) return;
    updateMutation.mutate({ id: notasEmpleado.id, notas: notasDraft });
    setNotasEmpleado(null);
    setNotasDraft("");
  }

  function toggleDia(fecha: string) {
    if (!periodoActivoIdReal || !diasPeriodoData) return;
    const actuales = new Set(diasPeriodoData.seleccionados ?? diasPeriodoData.dias ?? []);
    if (actuales.has(fecha)) actuales.delete(fecha);
    else actuales.add(fecha);
    const dias = (diasPeriodoData.dias ?? []).filter((d: string) => actuales.has(d));
    if (dias.length === 0) return toast.error("Debes seleccionar al menos un día");
    updateDiasMutation.mutate({ periodoId: periodoActivoIdReal, dias });
  }

  function toggleSabado(fecha: string) {
    setSabadosSeleccionados((prev) =>
      prev.includes(fecha) ? prev.filter((d) => d !== fecha) : [...prev, fecha]
    );
  }

  function toggleEmpleadoSabado(id: number) {
    setEmpleadosSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((empleadoId) => empleadoId !== id) : [...prev, id]
    );
  }

  function toggleEmpleadoFestivo(id: number) {
    setFestivoEmpleadoIds((prev) =>
      prev.includes(id) ? prev.filter((empleadoId) => empleadoId !== id) : [...prev, id]
    );
  }

  function abrirSabados() {
    if (!periodoActivoIdReal) return toast.error("Selecciona un período primero");
    setSabadosSeleccionados([]);
    setEmpleadosSeleccionados([]);
    setEmpleadoSearch("");
    setSabadoScope("global");
    setEstadoSabado("asistencia");
    setSabadosOpen(true);
  }

  function aplicarSabados() {
    if (!periodoActivoIdReal) return toast.error("Selecciona un período primero");
    if (sabadosSeleccionados.length === 0) return toast.error("Selecciona al menos un sábado");
    if (sabadoScope === "seleccionados" && empleadosSeleccionados.length === 0) {
      return toast.error("Selecciona al menos un empleado o usa la opción global");
    }
    actualizarSabadosMutation.mutate({
      periodoId: periodoActivoIdReal,
      fechas: sabadosSeleccionados,
      estado: estadoSabado,
      empleadoIds: sabadoScope === "seleccionados" ? empleadosSeleccionados : undefined,
    });
  }

  function abrirFestivos() {
    setFestivoDias("1");
    setFestivoScope("global");
    setFestivoEmpleadoIds([]);
    setFestivoEmpleadoSearch("");
    setFestivosOpen(true);
  }

  function abrirBonos() {
    if (!periodoActivoIdReal) return toast.error("Selecciona un período primero");
    setBonoSearch("");
    setBonoEmpleadoId(null);
    setBonoMontoSeleccionado(null);
    setBonoMontoManual("");
    setBonosOpen(true);
  }

  function seleccionarEmpleadoBono(id: number) {
    setBonoEmpleadoId(id);
    setBonoMontoSeleccionado(null);
    setBonoMontoManual("");
  }

  function toggleBonoMonto(monto: number) {
    if (monto === 0 && empleadoBonoSeleccionado && !empleadoTieneBonoActual) {
      return toast.info("Este empleado no tiene bono para quitar en el período activo");
    }
    setBonoMontoSeleccionado((prev) => (prev === monto ? null : monto));
    setBonoMontoManual("");
  }

  function seleccionarBonoManual() {
    const monto = Number(String(bonoMontoManual).replace(/[$,\s]/g, ""));
    if (!Number.isFinite(monto) || monto < 0) return toast.error("Ingresa una cantidad manual válida");
    setBonoMontoSeleccionado((prev) => (prev === monto ? null : monto));
  }

  function aplicarBonoSeleccionado() {
    if (!periodoActivoIdReal) return toast.error("Selecciona un período primero");
    if (!bonoEmpleadoId) return toast.error("Selecciona un empleado");
    if (bonoMontoSeleccionado === null) return toast.error("Selecciona un monto de bono antes de aplicar");
    updateMutation.mutate(
      { id: bonoEmpleadoId, bonos: bonoMontoSeleccionado, periodoId: periodoActivoIdReal },
      {
        onSuccess: () => {
          setBonoMontoSeleccionado(null);
          setBonoMontoManual("");
        },
      },
    );
  }

  function aplicarFestivos() {
    const dias = Math.round(Number(festivoDias));
    if (!Number.isFinite(dias) || dias <= 0) return toast.error("Ingresa cuántos días festivos se van a sumar");
    if (dias > 31) return toast.error("No puedes agregar más de 31 días en una sola operación");
    if (festivoScope === "seleccionados" && festivoEmpleadoIds.length === 0) {
      return toast.error("Selecciona al menos un empleado o usa la opción global");
    }
    if (!periodoActivoIdReal) return toast.error("Selecciona un período primero");
    sumarDiasFestivosMutation.mutate({
      periodoId: periodoActivoIdReal,
      dias,
      empleadoIds: festivoScope === "seleccionados" ? festivoEmpleadoIds : undefined,
    });
  }

  function handleSubmit() {
    const salario = parseFloat(form.salarioMensual);
    const bonos = parseFloat(form.bonos || "0");
    if (!form.nombre.trim()) return toast.error("El nombre es requerido");
    if (isNaN(salario) || salario < 0) return toast.error("Salario inválido");
    const departamentoId = form.departamentoId ? parseInt(form.departamentoId, 10) : null;
    if (editEmpleado) {
      updateMutation.mutate({ id: editEmpleado.id, nombre: form.nombre, salarioMensual: salario, bonos, periodoId: periodoActivoIdReal, departamentoId, banco: form.banco, numeroCuenta: form.numeroCuenta, tarjeta: form.tarjeta, clabeInterbancaria: form.clabeInterbancaria });
      setDialogOpen(false);
      setEditEmpleado(null);
    } else {
      createMutation.mutate({ nombre: form.nombre, salarioMensual: salario, bonos, departamentoId, banco: form.banco, numeroCuenta: form.numeroCuenta, tarjeta: form.tarjeta, clabeInterbancaria: form.clabeInterbancaria });
    }
  }

  const diasCalculoSeleccionados = (diasPeriodoData?.seleccionados ?? diasPeriodoData?.dias ?? []).length;

  function limitarDiasLaborados(value: unknown): number {
    return Math.max(0, Math.round(safeNumber(value)));
  }

  function calcularDiasAutomaticos(emp: Empleado): number {
    const faltas = Math.max(0, Math.round(safeNumber(emp.dias_falta_periodo)));
    if (diasCalculoSeleccionados > 0) {
      return Math.max(0, diasCalculoSeleccionados - faltas);
    }
    return limitarDiasLaborados(emp.diasLaborados ?? 0);
  }

  function calcularDiasPagables(emp: Empleado): number {
    if (tieneDiasLaboradosManual(emp)) {
      return limitarDiasLaborados(emp.diasLaborados ?? calcularDiasAutomaticos(emp));
    }
    return calcularDiasAutomaticos(emp);
  }

  // Fórmula exacta del Excel: =B/30*C+D-E
  // Salario Semanal = (Salario_Mensual / 30 × Días_Pagables) + Bonos - Descuentos
  function calcularSalarioSemanal(emp: Empleado): number {
    const salario = parseFloat(String(emp.salarioMensual)) || 0;
    const dias = calcularDiasPagables(emp);
    const bonos = parseFloat(String(emp.bonos)) || 0;
    const descuentos = parseFloat(String(emp.descuentosAdicionales)) || 0;
    const resultado = (salario / 30) * dias + bonos - descuentos;
    return Math.max(0, resultado);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: "oklch(0.15 0.02 240)" }}>
            Empleados
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestiona la nómina y datos de cada empleado. Haz clic en cualquier celda numérica editable para modificarla.
          </p>
          {(periodos?.length ?? 0) > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Período activo:</span>
              <Select
                value={String(periodoActivoIdReal ?? "")}
                onValueChange={(val) => {
                  const id = parseInt(val, 10);
                  setPeriodoActivo(id);
                  const nombre = periodos?.find((p) => p.id === id)?.nombre ?? "";
                  toast.success(`Período activo: ${nombre}`);
                }}
              >
                <SelectTrigger
                  className="h-7 text-xs w-auto min-w-[180px] max-w-xs"
                  style={{ borderColor: "oklch(0.22 0.06 240)", color: "oklch(0.15 0.02 240)" }}
                >
                  <SelectValue placeholder="Seleccionar período" />
                </SelectTrigger>
                <SelectContent>
                  {periodos?.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">Las faltas corresponden a este período</span>
            </div>
          )}
          {(diasPeriodoData?.dias?.length ?? 0) > 0 && (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <span className="text-xs text-muted-foreground font-medium">Días del cálculo:</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="justify-between gap-2 min-w-[240px]" disabled={updateDiasMutation.isPending}>
                    {(diasPeriodoData?.seleccionados ?? diasPeriodoData?.dias ?? []).length} de {diasPeriodoData?.dias?.length ?? 0} días seleccionados
                    <ChevronDown className="w-4 h-4 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72 max-h-80 overflow-y-auto">
                  <DropdownMenuLabel>Días del archivo TXT</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {(diasPeriodoData?.dias ?? []).map((fecha: string) => {
                    const activo = (diasPeriodoData?.seleccionados ?? diasPeriodoData?.dias ?? []).includes(fecha);
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
              <span className="text-xs text-muted-foreground">También afecta faltas, días laborados y salario semanal.</span>
            </div>
          )}
        </div>
        {isAdmin && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              onClick={abrirSabados}
              variant="outline"
              className="gap-2"
              disabled={!periodoActivoIdReal}
              title="Editar sábados del período activo"
            >
              <Calendar className="w-4 h-4" />
              Sábados
            </Button>
            <Button
              type="button"
              onClick={abrirFestivos}
              variant="outline"
              className="gap-2"
              title="Sumar días festivos a días laborados del período activo"
            >
              <Calendar className="w-4 h-4" />
              Días festivos
            </Button>
            <Button
              type="button"
              onClick={abrirBonos}
              variant="outline"
              className="gap-2"
              disabled={!periodoActivoIdReal}
              title="Aplicar bonos fijos al período activo"
            >
              <DollarSign className="w-4 h-4" />
              BONOS
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  disabled={!periodoActivoIdReal}
                  title="Exportar PDF de empleados"
                >
                  <FileText className="w-4 h-4" />
                  PDF
                  <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel>Exportar empleados</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={exportarPagosBancosPDF} className="cursor-pointer">
                  <FileText className="mr-2 h-4 w-4" />
                  Exportar pagos a bancos
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              onClick={openCreate}
              className="gap-2"
              style={{ background: "oklch(0.22 0.06 240)", color: "white" }}
            >
              <Plus className="w-4 h-4" />
              Nuevo Empleado
            </Button>
          </div>
        )}
      </div>

      {/* Search + Stats */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={departamentoActivo === "todos" ? "default" : "outline"}
          size="sm"
          onClick={() => setDepartamentoActivo("todos")}
          className="h-8"
        >
          Todos
        </Button>
        {departamentos?.map((d) => (
          <Button
            key={d.id}
            type="button"
            variant={departamentoActivo === d.id ? "default" : "outline"}
            size="sm"
            onClick={() => setDepartamentoActivo(d.id)}
            className="h-8"
          >
            {d.nombre}
          </Button>
        ))}
      </div>

      {isAdmin && (
        <Card className="border border-border/60 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold">Departamentos</p>
              <p className="text-xs text-muted-foreground">
                Puedes crear departamentos o renombrarlos. Al cambiar un nombre, se actualiza para todos los empleados asignados.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {departamentos?.map((d) => (
                <div key={d.id} className="flex items-center gap-1 rounded-md border px-2 py-1">
                  {editDeptoId === d.id ? (
                    <>
                      <Input
                        value={editDeptoNombre}
                        onChange={(e) => setEditDeptoNombre(e.target.value)}
                        className="h-7 w-40 text-xs"
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => {
                          const nombre = editDeptoNombre.trim();
                          if (!nombre) return toast.error("Nombre requerido");
                          updateDepartamentoMutation.mutate({ id: d.id, nombre });
                        }}
                      >
                        Guardar
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="text-xs font-medium">{d.nombre}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => {
                          setEditDeptoId(d.id);
                          setEditDeptoNombre(d.nombre);
                        }}
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 max-w-md">
              <Input
                placeholder="Nuevo departamento"
                value={nuevoDepartamento}
                onChange={(e) => setNuevoDepartamento(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const nombre = nuevoDepartamento.trim();
                  if (!nombre) return toast.error("Nombre requerido");
                  createDepartamentoMutation.mutate({ nombre });
                }}
                disabled={createDepartamentoMutation.isPending}
              >
                Crear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar empleado..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={bancoActivo} onValueChange={setBancoActivo}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filtrar por banco" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los bancos</SelectItem>
            {bancosDisponibles.map((banco) => (
              <SelectItem key={banco} value={banco}>{banco}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={ordenEmpleados} onValueChange={(value) => setOrdenEmpleados(value as OrdenEmpleados)}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Acomodar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="banco">Acomodar por banco</SelectItem>
            <SelectItem value="nombre">Acomodar por nombre</SelectItem>
            <SelectItem value="apellido">Acomodar por apellido</SelectItem>
            <SelectItem value="departamento">Acomodar por departamento</SelectItem>
            <SelectItem value="salario">Acomodar por salario</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          className="h-10 px-3"
          onClick={() => setDireccionOrden((prev) => (prev === "asc" ? "desc" : "asc"))}
          title={direccionOrden === "asc" ? "Cambiar a mayor a menor" : "Cambiar a menor a mayor"}
        >
          {direccionOrden === "asc" ? "A-Z / menor" : "Z-A / mayor"}
        </Button>
        <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
          <Users className="w-3.5 h-3.5" />
          {filtered.length} empleados
        </Badge>
      </div>

      {/* Leyenda — solo admin */}
      {isAdmin && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Edit2 className="w-3 h-3" />
          Las columnas <strong>Salario Mensual</strong>, <strong>Bonos</strong>, <strong>Días Laborados</strong> y <strong>Descuentos</strong> son editables directamente en la tabla. El <strong>Salario Semanal</strong> se recalcula de inmediato con la fórmula: días × salario diario + bonos - descuentos.
        </p>
      )}

      {/* Table */}
      <Card className="border border-border/60 shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">
                {search ? "No se encontraron empleados" : "No hay empleados registrados"}
              </p>
              {!search && (
                <Button variant="outline" size="sm" className="mt-3" onClick={openCreate}>
                  Agregar primer empleado
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed min-w-[1320px]">
                <colgroup>
                  <col className="w-[18%]" />
                  <col className="w-[14%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[8%]" />
                  <col className="w-[7%]" />
                  <col className="w-[9%]" />
                  <col className="w-[10%]" />
                  <col className="w-[5%]" />
                  <col className="w-[11%]" />
                  <col className="w-[7%]" />
                  {isAdmin && <col className="w-[5%]" />}
                </colgroup>
                <thead>
                  <tr style={{ background: "oklch(0.975 0.004 240)" }}>
                    <th className="text-left px-2 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Nombre
                    </th>
                    <th className="text-left px-2 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Banco
                    </th>
                    <th className="text-right px-2 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <span className="inline-flex items-center gap-1 justify-end">
                        Salario Mensual
                        {isAdmin && <Edit2 className="w-3 h-3 text-primary/60" />}
                      </span>
                    </th>
                    <th className="text-right px-2 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Salario Diario
                    </th>
                    <th className="text-right px-2 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <span className="inline-flex items-center gap-1 justify-end">
                        Bonos
                        {isAdmin && <Edit2 className="w-3 h-3 text-primary/60" />}
                      </span>
                    </th>
                    <th className="text-center px-2 py-3 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "oklch(0.50 0.18 25)" }}>
                      Faltas
                    </th>
                    <th className="text-right px-2 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <span className="inline-flex items-center gap-1 justify-end">
                        Días Lab.
                        {isAdmin && <Edit2 className="w-3 h-3 text-primary/60" />}
                      </span>
                    </th>
                    <th className="text-right px-2 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <span className="inline-flex items-center gap-1 justify-end">
                        Descuentos
                        {isAdmin && <Edit2 className="w-3 h-3 text-primary/60" />}
                      </span>
                    </th>
                    <th className="text-center px-2 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Nómina ✓
                    </th>
                    <th className="text-right px-2 py-3 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "oklch(0.35 0.12 145)" }}>
                      Salario Sem.
                    </th>
                    <th className="text-center px-2 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Notas
                    </th>
                    {isAdmin && (
                      <th className="px-2 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-center">
                        Acciones
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filtered.map((emp) => {
                    const salario = parseFloat(String(emp.salarioMensual)) || 0;
                    const diasLaborados = calcularDiasPagables(emp);
                    const bonos = parseFloat(String(emp.bonos)) || 0;
                    const descuentos = parseFloat(String(emp.descuentosAdicionales)) || 0;
                    const salarioSemanal = calcularSalarioSemanal(emp);

                    return (
                      <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                        {/* Nombre */}
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                              style={{ background: "oklch(0.22 0.06 240)" }}
                            >
                              {emp.nombre.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="font-medium text-sm block truncate" style={{ color: "oklch(0.15 0.02 240)" }}>
                                {emp.nombre}
                              </span>
                              <span className="text-xs text-muted-foreground block truncate">
                                {emp.departamentoNombre || "Sin departamento"}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Datos bancarios */}
                        <td className="px-2 py-3 align-top">
                          <div className="space-y-2 text-center">
                            <div className="grid grid-cols-[minmax(96px,128px)_24px] items-center justify-center gap-2 mx-auto">
                              <div className="min-w-0 flex justify-center">
                                {isAdmin ? (
                                  <EditableTextCell
                                    value={emp.banco}
                                    placeholder="Sin banco"
                                    className="w-full justify-center text-center text-sm font-semibold"
                                    inputClassName="w-32 text-center font-semibold uppercase"
                                    onSave={(val) => updateMutation.mutate({ id: emp.id, banco: val })}
                                  />
                                ) : (
                                  <span className="block w-full truncate text-center text-sm font-semibold">{emp.banco?.trim() || "Sin banco"}</span>
                                )}
                              </div>
                              {(isAdmin || emp.numeroCuenta || emp.tarjeta || emp.clabeInterbancaria) ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 justify-self-center text-muted-foreground/70 hover:text-primary"
                                  onClick={() => setBancosVisibles((prev) => ({ ...prev, [emp.id]: !prev[emp.id] }))}
                                  title={bancosVisibles[emp.id] ? "Ocultar datos bancarios" : isAdmin ? "Ver o editar datos bancarios" : "Ver datos bancarios"}
                                  aria-label={bancosVisibles[emp.id] ? "Ocultar datos bancarios" : isAdmin ? "Ver o editar datos bancarios" : "Ver datos bancarios"}
                                >
                                  {bancosVisibles[emp.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                </Button>
                              ) : (
                                <span className="h-6 w-6" aria-hidden="true" />
                              )}
                            </div>
                            {bancosVisibles[emp.id] && (
                              <div className="rounded-md bg-muted/50 p-2 text-[11px] leading-5 text-muted-foreground space-y-1.5">
                                {isAdmin ? (
                                  <>
                                    <div className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-1">
                                      <span>Cuenta:</span>
                                      <EditableTextCell
                                        value={emp.numeroCuenta}
                                        placeholder="Agregar cuenta"
                                        className="min-w-0 font-medium text-foreground"
                                        inputClassName="w-full"
                                        onSave={(val) => updateMutation.mutate({ id: emp.id, numeroCuenta: val })}
                                      />
                                    </div>
                                    <div className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-1">
                                      <span>Tarjeta:</span>
                                      <EditableTextCell
                                        value={emp.tarjeta}
                                        placeholder="Agregar tarjeta"
                                        className="min-w-0 font-medium text-foreground"
                                        inputClassName="w-full"
                                        onSave={(val) => updateMutation.mutate({ id: emp.id, tarjeta: val })}
                                      />
                                    </div>
                                    <div className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-1">
                                      <span>CLABE:</span>
                                      <EditableTextCell
                                        value={emp.clabeInterbancaria}
                                        placeholder="Agregar CLABE"
                                        className="min-w-0 font-medium text-foreground"
                                        inputClassName="w-full"
                                        onSave={(val) => updateMutation.mutate({ id: emp.id, clabeInterbancaria: val })}
                                      />
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div>Cuenta: <span className="font-medium text-foreground">{emp.numeroCuenta || "—"}</span></div>
                                    <div>Tarjeta: <span className="font-medium text-foreground">{emp.tarjeta || "—"}</span></div>
                                    <div>CLABE: <span className="font-medium text-foreground">{emp.clabeInterbancaria || "—"}</span></div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Salario Mensual */}
                        <td className="px-2 py-3">
                          {isAdmin ? (
                            <EditableCell
                              value={salario}
                              type="number"
                              format={(v) => formatCurrency(v)}
                              onSave={(val) =>
                                updateMutation.mutate({ id: emp.id, salarioMensual: val })
                              }
                            />
                          ) : (
                            <span className="font-semibold text-sm text-right block">{formatCurrency(salario)}</span>
                          )}
                        </td>

                        {/* Salario Diario */}
                        <td className="px-2 py-3 text-right">
                          <span className="text-sm text-muted-foreground">
                            {formatCurrency(salario / 30)}
                          </span>
                        </td>

                        {/* Bonos */}
                        <td className="px-2 py-3">
                          {isAdmin ? (
                            <EditableCell
                              value={bonos}
                              type="number"
                              format={(v) => v > 0 ? formatCurrency(v) : "—"}
                              onSave={(val) =>
                                updateMutation.mutate({ id: emp.id, bonos: val, periodoId: periodoActivoIdReal })
                              }
                            />
                          ) : (
                            <span className="text-sm text-right block">{bonos > 0 ? formatCurrency(bonos) : "—"}</span>
                          )}
                        </td>

                        {/* Faltas */}
                        <td className="px-2 py-3 text-center">
                          {(() => {
                            const faltas = emp.dias_falta_periodo ?? 0;
                            if (faltas === 0) return <span className="text-sm font-semibold text-muted-foreground">0</span>;
                            return (
                              <span
                                className="inline-flex items-center justify-center min-w-[1.75rem] h-7 px-2 rounded-full text-xs font-bold"
                                style={{
                                  background: faltas >= 5 ? "oklch(0.95 0.06 25)" : "oklch(0.97 0.03 50)",
                                  color: faltas >= 5 ? "oklch(0.45 0.20 25)" : "oklch(0.50 0.15 50)",
                                }}
                              >
                                {faltas}
                              </span>
                            );
                          })()}
                        </td>

                        {/* Días Laborados */}
                        <td className="px-2 py-3">
                          {isAdmin ? (
                            <EditableCell
                              value={diasLaborados}
                              type="number"
                              format={(v) => `${v} días`}
                              onSave={(val) => {
                                const dias = limitarDiasLaborados(val);
                                registrarDiasLaboradosManual(emp.id);
                                updateMutation.mutate({ id: emp.id, diasLaborados: dias, periodoId: periodoActivoIdReal });
                              }}
                            />
                          ) : (
                            <span
                              className="text-sm text-right block font-semibold"
                              title={diasCalculoSeleccionados > 0 ? `${diasCalculoSeleccionados} días seleccionados - ${safeNumber(emp.dias_falta_periodo)} faltas = ${diasLaborados} días laborados` : undefined}
                            >
                              {diasLaborados} días
                            </span>
                          )}
                        </td>

                        {/* Descuentos */}
                        <td className="px-2 py-3">
                          {isAdmin ? (
                            <EditableCell
                              value={descuentos}
                              type="number"
                              format={(v) => v > 0 ? formatCurrency(v) : "—"}
                              onSave={(val) =>
                                updateMutation.mutate({ id: emp.id, descuentosAdicionales: val, periodoId: periodoActivoIdReal })
                              }
                            />
                          ) : (
                            <span className="text-sm text-right block">{descuentos > 0 ? formatCurrency(descuentos) : "—"}</span>
                          )}
                        </td>

                        {/* Nómina lista */}
                        <td className="px-2 py-3 text-center">
                          {(() => {
                            const nominaLista = emp.nominaLista === true || emp.nominaLista === 1;
                            const IconoNomina = nominaLista ? CheckCircle2 : Circle;
                            return (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={`h-8 w-8 rounded-full transition-colors ${nominaLista ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" : "text-muted-foreground/45 hover:text-muted-foreground"}`}
                                onClick={() => {
                                  if (!puedeEditarNomina) return;
                                  updateMutation.mutate({ id: emp.id, nominaLista: !nominaLista, periodoId: periodoActivoIdReal });
                                }}
                                disabled={!puedeEditarNomina || updateMutation.isPending}
                                title={nominaLista ? "Nómina lista" : puedeEditarNomina ? "Marcar nómina como lista" : "Nómina pendiente"}
                                aria-label={nominaLista ? `Nómina lista para ${emp.nombre}` : `Nómina pendiente para ${emp.nombre}`}
                              >
                                <IconoNomina className="h-5 w-5" />
                              </Button>
                            );
                          })()}
                        </td>

                        {/* Salario Semanal — calculado */}
                        <td className="px-2 py-3 text-right">
                          <span
                            className="font-bold text-sm"
                            style={{ color: salarioSemanal > 0 ? "oklch(0.40 0.15 145)" : "oklch(0.6 0.01 240)" }}
                          >
                            {formatCurrency(salarioSemanal)}
                          </span>
                        </td>

                        {/* Notas — compacto y no invasivo */}
                        <td className="px-2 py-3 text-center">
                          <Button
                            type="button"
                            variant={emp.notas?.trim() ? "secondary" : "ghost"}
                            size="sm"
                            className="h-8 px-2 gap-1 max-w-full"
                            onClick={() => openNotas(emp)}
                            title={emp.notas?.trim() ? emp.notas : "Agregar nota"}
                          >
                            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                            {emp.notas?.trim() ? (
                              <span className="hidden xl:inline max-w-[72px] truncate text-xs">Ver</span>
                            ) : (
                              <span className="hidden xl:inline text-xs">Nota</span>
                            )}
                          </Button>
                        </td>

                        {/* Acciones — solo admin */}
                        {isAdmin && (
                         <td className="px-2 py-3">
                            <div className="flex items-center justify-center gap-0.5">                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEdit(emp)}
                                className="h-8 w-8 p-0"
                                title="Editar nombre y salario"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteId(emp.id)}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                title="Eliminar empleado"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>

                {/* Totales */}
                {filtered.length > 0 && (
                  <tfoot>
                    <tr style={{ background: "oklch(0.97 0.005 240)", borderTop: "2px solid oklch(0.88 0.01 240)" }}>
                      <td className="px-2 py-3 text-xs font-bold uppercase text-muted-foreground" colSpan={4}>
                        Totales ({filtered.length} empleados)
                      </td>
                      <td className="px-2 py-3 text-right text-xs font-semibold">
                        {formatCurrency(filtered.reduce((s, e) => s + safeNumber(e.bonos), 0))}
                      </td>
                      <td className="px-2 py-3 text-center text-xs font-semibold" style={{ color: "oklch(0.45 0.20 25)" }}>
                        {filtered.reduce((s, e) => s + safeNumber(e.dias_falta_periodo), 0)}
                      </td>
                      <td className="px-2 py-3 text-right text-xs font-semibold">
                        {filtered.reduce((s, e) => s + calcularDiasPagables(e), 0)} días
                      </td>
                      <td className="px-2 py-3 text-right text-xs font-semibold text-destructive">
                        {formatCurrency(
                          filtered.reduce((s, e) => s + safeNumber(e.descuentosAdicionales), 0)
                        )}
                      </td>
                      <td className="px-2 py-3 text-right text-sm font-bold" style={{ color: "oklch(0.35 0.15 145)" }}>
                        {formatCurrency(filtered.reduce((s, e) => s + calcularSalarioSemanal(e), 0))}
                      </td>
                      <td />
                      {isAdmin && <td />}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!notasEmpleado} onOpenChange={(open) => {
        if (!open) {
          setNotasEmpleado(null);
          setNotasDraft("");
        }
      }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Notas del empleado</DialogTitle>
            <DialogDescription>
              {notasEmpleado?.nombre ? `Agrega observaciones internas para ${notasEmpleado.nombre}.` : "Agrega observaciones internas del empleado."} Este espacio sirve para registrar faltas justificadas, acuerdos o aclaraciones sin ocupar espacio en la tabla principal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="notas-empleado">Notas</Label>
            <Textarea
              id="notas-empleado"
              value={notasDraft}
              onChange={(e) => setNotasDraft(e.target.value)}
              placeholder="Ejemplo: Falta justificada por permiso médico. Pendiente entregar comprobante."
              className="min-h-[180px] max-h-[45vh] resize-y leading-relaxed"
              maxLength={10000}
            />
            <p className="text-xs text-muted-foreground text-right">{notasDraft.length}/10000 caracteres</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setNotasEmpleado(null)}>
              Cancelar
            </Button>
            <Button type="button" onClick={guardarNotas} disabled={updateMutation.isPending}>
              Guardar nota
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Historial de eliminados */}
      <Card className="border border-destructive/20 bg-destructive/[0.02] shadow-sm">
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b border-destructive/10 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <History className="h-4 w-4 text-destructive" />
                <h2 className="text-sm font-semibold" style={{ color: "oklch(0.22 0.06 240)" }}>
                  Historial de personas eliminadas
                </h2>
                <Badge variant="outline" className="text-xs">
                  {eliminadosFiltrados.length}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Los empleados eliminados se conservan aquí como registro histórico. Usa el desplegable solo cuando necesites consultar, restaurar o limpiar registros eliminados.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              {isAdmin && (empleadosEliminados?.length ?? 0) > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 border-destructive/30 text-destructive hover:text-destructive"
                  onClick={() => setConfirmLimpiarHistorial(true)}
                  disabled={clearHistorialMutation.isPending}
                  title="Eliminar definitivamente todo el historial de personas eliminadas"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Eliminar todo el historial
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 justify-between gap-2"
                onClick={() => setHistorialOpen((prev) => !prev)}
                aria-expanded={historialOpen}
                aria-controls="historial-personas-eliminadas"
              >
                {historialOpen ? "Ocultar historial" : "Mostrar historial"}
                <ChevronDown className={`h-4 w-4 transition-transform ${historialOpen ? "rotate-180" : ""}`} />
              </Button>
            </div>
          </div>

          {historialOpen && (
            <div id="historial-personas-eliminadas">
              {isLoadingEliminados ? (
                <div className="p-6 space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : eliminadosFiltrados.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No hay personas eliminadas en el historial{search || departamentoActivo !== "todos" ? " con los filtros actuales" : ""}.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px]">
                    <thead>
                      <tr style={{ background: "oklch(0.985 0.003 240)" }}>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Nombre</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Departamento</th>
                        <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Salario mensual</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Fecha de eliminación</th>
                        {isAdmin && <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Acción</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {eliminadosFiltrados.map((emp) => (
                        <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                                {emp.nombre.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <span className="block truncate text-sm font-medium">{emp.nombre}</span>
                                <span className="block truncate text-xs text-muted-foreground">ID #{emp.id}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{emp.departamentoNombre || "Sin departamento"}</td>
                          <td className="px-4 py-3 text-right text-sm font-semibold">{formatCurrency(safeNumber(emp.salarioMensual))}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{formatDateTime(emp.updatedAt)}</td>
                          {isAdmin && (
                            <td className="px-4 py-3 text-center">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5"
                                onClick={() => restoreMutation.mutate({ id: emp.id })}
                                disabled={restoreMutation.isPending}
                                title="Restaurar empleado a la lista activa"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Restaurar
                              </Button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={sabadosOpen} onOpenChange={setSabadosOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar sábados{periodoActivo?.nombre ? ` · ${periodoActivo.nombre}` : ""}</DialogTitle>
            <DialogDescription>
              Selecciona uno o varios sábados y cambia su estado final a asistencia, falta o descanso. El cambio puede aplicarse globalmente a todos los empleados del período activo o únicamente a los empleados que selecciones.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <section className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">Sábados encontrados</p>
                {sabados.length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const todos = sabados.map((s: any) => s.fecha);
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
                  {sabados.map((s: any) => (
                    <label key={s.fecha} className="flex items-start gap-2 rounded-md border p-3 text-sm cursor-pointer hover:bg-muted/40">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={sabadosSeleccionados.includes(s.fecha)}
                        onChange={() => toggleSabado(s.fecha)}
                      />
                      <span>
                        <span className="block font-semibold">{formatFecha(s.fecha)}</span>
                        <span className="text-xs text-muted-foreground">
                          {s.asistencias} asistencia(s), {s.faltas} falta(s), {s.descansos} descanso(s)
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </section>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Estado final</label>
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={estadoSabado}
                  onChange={(e) => setEstadoSabado(e.target.value as typeof estadoSabado)}
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
                  onChange={(e) => setSabadoScope(e.target.value as typeof sabadoScope)}
                >
                  <option value="global">Todos los empleados del período</option>
                  <option value="seleccionados">Solo empleados seleccionados</option>
                </select>
              </div>
            </div>

            {sabadoScope === "seleccionados" && (
              <section className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">Empleados</p>
                  {empleadosSabadoFiltrados.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const todos = empleadosSabadoFiltrados.map((e) => e.id);
                        const todosSeleccionados = todos.every((id: number) => empleadosSeleccionados.includes(id));
                        setEmpleadosSeleccionados((prev) =>
                          todosSeleccionados
                            ? prev.filter((id) => !todos.includes(id))
                            : Array.from(new Set([...prev, ...todos]))
                        );
                      }}
                    >
                      {empleadosSabadoFiltrados.every((emp) => empleadosSeleccionados.includes(emp.id)) ? "Quitar visibles" : "Seleccionar visibles"}
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
                  {empleadosSabadoFiltrados.map((emp) => (
                    <label key={emp.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted/40">
                      <input
                        type="checkbox"
                        checked={empleadosSeleccionados.includes(emp.id)}
                        onChange={() => toggleEmpleadoSabado(emp.id)}
                      />
                      <span className="font-medium">{emp.nombre}</span>
                    </label>
                  ))}
                  {empleadosConCambiosLocales.length === 0 && (
                    <p className="p-3 text-sm text-muted-foreground">No hay empleados para este período.</p>
                  )}
                  {empleadosConCambiosLocales.length > 0 && empleadosSabadoFiltrados.length === 0 && (
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
              Aplicar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={festivosOpen} onOpenChange={setFestivosOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Días festivos</DialogTitle>
            <DialogDescription>
              Suma días festivos directamente a la columna de días laborados. El salario semanal se recalcula automáticamente con la fórmula actual del sistema.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-md border bg-amber-50/70 p-3 text-sm text-amber-900">
              Esta acción agrega días sobre los días laborados actuales y deja esos días como ajuste manual para que no se borren al recalcular o importar información.
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="festivo-dias">¿Cuántos días festivos se agregarán?</Label>
                <Input
                  id="festivo-dias"
                  type="number"
                  min={1}
                  max={31}
                  value={festivoDias}
                  onChange={(e) => setFestivoDias(e.target.value)}
                  placeholder="Ejemplo: 2"
                />
                <p className="text-xs text-muted-foreground">
                  Ejemplo: si un empleado tiene 6 días laborados y agregas 2, quedará con 8 días laborados.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="festivo-alcance">¿A quién se aplicará?</Label>
                <select
                  id="festivo-alcance"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={festivoScope}
                  onChange={(e) => setFestivoScope(e.target.value as typeof festivoScope)}
                >
                  <option value="global">Aplicar a todos los empleados activos</option>
                  <option value="seleccionados">Seleccionar empleados</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Usa selección individual cuando algunos empleados descansaron el festivo y otros sí lo trabajaron.
                </p>
              </div>
            </div>

            {festivoScope === "seleccionados" && (
              <section className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">Empleados seleccionados: {festivoEmpleadoIds.length}</p>
                    <p className="text-xs text-muted-foreground">Busca y marca solo a quienes se les sumarán los días festivos.</p>
                  </div>
                  {empleadosFestivoFiltrados.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const visibles = empleadosFestivoFiltrados.map((e) => e.id);
                        const todosSeleccionados = visibles.every((id: number) => festivoEmpleadoIds.includes(id));
                        setFestivoEmpleadoIds((prev) =>
                          todosSeleccionados
                            ? prev.filter((id) => !visibles.includes(id))
                            : Array.from(new Set([...prev, ...visibles]))
                        );
                      }}
                    >
                      {empleadosFestivoFiltrados.every((emp) => festivoEmpleadoIds.includes(emp.id)) ? "Quitar visibles" : "Seleccionar visibles"}
                    </Button>
                  )}
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar empleado..."
                    value={festivoEmpleadoSearch}
                    onChange={(e) => setFestivoEmpleadoSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="max-h-56 overflow-y-auto rounded-md border divide-y">
                  {empleadosFestivoFiltrados.map((emp) => (
                    <label key={emp.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-muted/40">
                      <span className="flex min-w-0 items-center gap-2">
                        <input
                          type="checkbox"
                          checked={festivoEmpleadoIds.includes(emp.id)}
                          onChange={() => toggleEmpleadoFestivo(emp.id)}
                        />
                        <span className="truncate font-medium">{emp.nombre}</span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        Actual: {calcularDiasPagables(emp)} días
                      </span>
                    </label>
                  ))}
                  {empleadosConCambiosLocales.length === 0 && (
                    <p className="p-3 text-sm text-muted-foreground">No hay empleados activos.</p>
                  )}
                  {empleadosConCambiosLocales.length > 0 && empleadosFestivoFiltrados.length === 0 && (
                    <p className="p-3 text-sm text-muted-foreground">No se encontraron empleados con esa búsqueda.</p>
                  )}
                </div>
              </section>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setFestivosOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={aplicarFestivos}
              disabled={sumarDiasFestivosMutation.isPending}
              style={{ background: "oklch(0.22 0.06 240)", color: "white" }}
            >
              {sumarDiasFestivosMutation.isPending ? "Aplicando..." : "Aplicar días festivos"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bonosOpen} onOpenChange={setBonosOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>BONOS{periodoActivo?.nombre ? ` · ${periodoActivo.nombre}` : ""}</DialogTitle>
            <DialogDescription>
              Selecciona un empleado, marca el monto del bono y confirma con Aplicar bono. El cambio se guarda en la columna Bonos del período TXT activo, sin copiarse a otros períodos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
              De forma inicial se muestran los empleados del catálogo fijo tomado del archivo de bonos. Si necesitas agregar un bono nuevo, usa el buscador para localizar cualquier empleado activo y, si el monto no aparece, captura otra cantidad manualmente.
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <section className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">Empleados con bono</p>
                    <p className="text-xs text-muted-foreground">Mostrando {empleadosBonosFiltrados.length} resultado(s)</p>
                  </div>
                  <Badge variant="outline">{CATALOGO_BONOS_FIJOS.length} fijos</Badge>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar empleado para agregar o cambiar bono..."
                    value={bonoSearch}
                    onChange={(e) => setBonoSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="max-h-80 overflow-y-auto rounded-md border divide-y">
                  {empleadosBonosFiltrados.map(({ emp, catalogo }) => {
                    const activo = bonoEmpleadoId === emp.id;
                    return (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => seleccionarEmpleadoBono(emp.id)}
                        className={`w-full px-3 py-2 text-left transition-colors hover:bg-muted/50 ${activo ? "bg-muted" : ""}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{emp.nombre}</p>
                            <p className="text-xs text-muted-foreground">
                              Bono actual: {formatCurrency(safeNumber(emp.bonos))}
                              {catalogo ? ` · Bono fijo sugerido: ${formatCurrency(catalogo.bono)}` : " · empleado encontrado por búsqueda"}
                            </p>
                          </div>
                          {catalogo ? (
                            <Badge variant="secondary" className="shrink-0">Fijo</Badge>
                          ) : (
                            <Badge variant="outline" className="shrink-0">Nuevo</Badge>
                          )}
                        </div>
                      </button>
                    );
                  })}
                  {empleadosConCambiosLocales.length === 0 && (
                    <p className="p-3 text-sm text-muted-foreground">No hay empleados para este período.</p>
                  )}
                  {empleadosConCambiosLocales.length > 0 && empleadosBonosFiltrados.length === 0 && (
                    <p className="p-3 text-sm text-muted-foreground">No se encontraron empleados con esa búsqueda.</p>
                  )}
                </div>
              </section>

              <section className="space-y-3 rounded-md border p-3">
                <div>
                  <p className="text-sm font-semibold">Aplicar monto</p>
                  <p className="text-xs text-muted-foreground">Selecciona un monto fijo o captura otra cantidad; quedará pendiente hasta presionar Aplicar bono.</p>
                </div>

                {empleadoBonoSeleccionado ? (
                  <div className="rounded-md bg-muted/40 p-3">
                    <p className="text-sm font-semibold">{empleadoBonoSeleccionado.nombre}</p>
                    <p className="text-xs text-muted-foreground">Bono actual: {formatCurrency(safeNumber(empleadoBonoSeleccionado.bonos))}</p>
                    {catalogoBonoSeleccionado && (
                      <p className="text-xs text-muted-foreground">Sugerido del catálogo: {formatCurrency(catalogoBonoSeleccionado.bono)}</p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
                    Selecciona un empleado de la lista para activar los botones de bono.
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {MONTOS_BONOS_FIJOS.map((monto) => (
                    <Button
                      key={monto}
                      type="button"
                      variant={bonoMontoSeleccionado === monto ? "default" : "outline"}
                      onClick={() => toggleBonoMonto(monto)}
                      disabled={!empleadoBonoSeleccionado || updateMutation.isPending}
                      className="justify-center"
                    >
                      {formatCurrency(monto)}
                    </Button>
                  ))}
                </div>

                <div className="space-y-2 rounded-md border bg-muted/20 p-3">
                  <Label htmlFor="bono-monto-manual" className="text-xs font-medium">Otra cantidad manual</Label>
                  <div className="flex gap-2">
                    <Input
                      id="bono-monto-manual"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Ej: 3500"
                      value={bonoMontoManual}
                      onChange={(e) => {
                        setBonoMontoManual(e.target.value);
                        setBonoMontoSeleccionado(null);
                      }}
                      disabled={!empleadoBonoSeleccionado || updateMutation.isPending}
                    />
                    <Button
                      type="button"
                      variant={bonoMontoSeleccionado !== null && bonoMontoManual.trim() !== "" && Number(bonoMontoManual) === bonoMontoSeleccionado ? "default" : "outline"}
                      onClick={seleccionarBonoManual}
                      disabled={!empleadoBonoSeleccionado || !bonoMontoManual.trim() || updateMutation.isPending}
                    >
                      Usar
                    </Button>
                  </div>
                  {bonoMontoSeleccionado !== null && bonoMontoManual.trim() !== "" && Number(bonoMontoManual) === bonoMontoSeleccionado && (
                    <p className="text-xs font-medium" style={{ color: "oklch(0.45 0.16 145)" }}>
                      Cantidad manual pendiente: {formatCurrency(bonoMontoSeleccionado)}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Button
                    type="button"
                    variant={bonoMontoSeleccionado === 0 ? "default" : "ghost"}
                    className={bonoMontoSeleccionado === 0 ? "w-full" : "w-full text-muted-foreground"}
                    onClick={() => toggleBonoMonto(0)}
                    disabled={!empleadoBonoSeleccionado || !empleadoTieneBonoActual || updateMutation.isPending}
                  >
                    {empleadoBonoSeleccionado
                      ? empleadoTieneBonoActual
                        ? bonoMontoSeleccionado === 0
                          ? "Quitar bono seleccionado"
                          : `Quitar bono actual (${formatCurrency(bonoActualSeleccionado)})`
                        : "Sin bono que quitar"
                      : "Quitar bono"}
                  </Button>
                  {empleadoBonoSeleccionado && empleadoTieneBonoActual && bonoMontoSeleccionado === 0 && (
                    <p className="text-center text-xs font-medium text-destructive">
                      Remoción pendiente: al presionar Aplicar bono, el bono quedará en $0.00.
                    </p>
                  )}
                </div>

                <Button
                  type="button"
                  className="w-full"
                  onClick={aplicarBonoSeleccionado}
                  disabled={!empleadoBonoSeleccionado || bonoMontoSeleccionado === null || updateMutation.isPending}
                  style={{ background: "oklch(0.22 0.06 240)", color: "white" }}
                >
                  {bonoMontoSeleccionado === 0 ? "Aplicar: quitar bono" : "Aplicar bono"}
                </Button>
              </section>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBonosOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editEmpleado ? "Editar Empleado" : "Nuevo Empleado"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="nombre">Nombre completo</Label>
              <Input
                id="nombre"
                placeholder="Ej: García López Juan"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="salario">Salario Mensual (MXN)</Label>
              <Input
                id="salario"
                type="number"
                placeholder="Ej: 20000"
                value={form.salarioMensual}
                onChange={(e) => setForm({ ...form, salarioMensual: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="departamento">Departamento</Label>
              <Select
                value={form.departamentoId || "sin"}
                onValueChange={(value) => setForm({ ...form, departamentoId: value === "sin" ? "" : value })}
              >
                <SelectTrigger id="departamento">
                  <SelectValue placeholder="Seleccionar departamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sin">Sin departamento</SelectItem>
                  {departamentos?.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bonos">Bonos (MXN)</Label>
              <Input
                id="bonos"
                type="number"
                placeholder="Ej: 500"
                value={form.bonos}
                onChange={(e) => setForm({ ...form, bonos: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Los días laborados y descuentos se editan directamente en la tabla.
              </p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
              <div>
                <p className="text-sm font-semibold">Datos bancarios</p>
                <p className="text-xs text-muted-foreground">Estos datos se muestran ocultos en la tabla para mantener el módulo ordenado.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="banco">Banco</Label>
                <Input id="banco" placeholder="Ej: BBVA, SANTANDER, BANAMEX" value={form.banco} onChange={(e) => setForm({ ...form, banco: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="numeroCuenta">Cuenta</Label>
                  <Input id="numeroCuenta" value={form.numeroCuenta} onChange={(e) => setForm({ ...form, numeroCuenta: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tarjeta">Tarjeta</Label>
                  <Input id="tarjeta" value={form.tarjeta} onChange={(e) => setForm({ ...form, tarjeta: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="clabeInterbancaria">CLABE interbancaria</Label>
                <Input id="clabeInterbancaria" value={form.clabeInterbancaria} onChange={(e) => setForm({ ...form, clabeInterbancaria: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              style={{ background: "oklch(0.22 0.06 240)", color: "white" }}
            >
              {editEmpleado ? "Guardar Cambios" : "Crear Empleado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar empleado?</AlertDialogTitle>
            <AlertDialogDescription>
              El empleado dejará de aparecer en la nómina activa, pero sus datos se conservarán en el historial de personas eliminadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear Deleted History Dialog */}
      <AlertDialog open={confirmLimpiarHistorial} onOpenChange={setConfirmLimpiarHistorial}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar todo el historial?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará definitivamente todos los registros de personas eliminadas. No afectará a los empleados activos, pero el historial borrado ya no podrá consultarse ni restaurarse desde esta pantalla.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearHistorialMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => clearHistorialMutation.mutate()}
              disabled={clearHistorialMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {clearHistorialMutation.isPending ? "Eliminando..." : "Eliminar todo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
