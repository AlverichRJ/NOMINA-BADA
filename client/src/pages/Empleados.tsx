import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
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
import { Edit2, Plus, Search, Trash2, Users } from "lucide-react";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);
}

type Empleado = {
  id: number;
  nombre: string;
  salarioMensual: string | number;
  bonos: string | number;
};

export default function Empleados() {
  const utils = trpc.useUtils();
  const { data: empleados, isLoading } = trpc.empleados.list.useQuery();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editEmpleado, setEditEmpleado] = useState<Empleado | null>(null);
  const [form, setForm] = useState({ nombre: "", salarioMensual: "", bonos: "" });

  const createMutation = trpc.empleados.create.useMutation({
    onSuccess: () => {
      utils.empleados.list.invalidate();
      toast.success("Empleado creado correctamente");
      setDialogOpen(false);
      setForm({ nombre: "", salarioMensual: "", bonos: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.empleados.update.useMutation({
    onSuccess: () => {
      utils.empleados.list.invalidate();
      toast.success("Empleado actualizado correctamente");
      setDialogOpen(false);
      setEditEmpleado(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.empleados.delete.useMutation({
    onSuccess: () => {
      utils.empleados.list.invalidate();
      toast.success("Empleado eliminado");
      setDeleteId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = (empleados ?? []).filter((e) =>
    e.nombre.toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() {
    setEditEmpleado(null);
    setForm({ nombre: "", salarioMensual: "", bonos: "" });
    setDialogOpen(true);
  }

  function openEdit(emp: Empleado) {
    setEditEmpleado(emp);
    setForm({
      nombre: emp.nombre,
      salarioMensual: String(emp.salarioMensual),
      bonos: String(emp.bonos),
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    const salario = parseFloat(form.salarioMensual);
    const bonos = parseFloat(form.bonos || "0");
    if (!form.nombre.trim()) return toast.error("El nombre es requerido");
    if (isNaN(salario) || salario < 0) return toast.error("Salario inválido");
    if (editEmpleado) {
      updateMutation.mutate({ id: editEmpleado.id, nombre: form.nombre, salarioMensual: salario, bonos });
    } else {
      createMutation.mutate({ nombre: form.nombre, salarioMensual: salario, bonos });
    }
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
            Gestiona la nómina y datos de cada empleado
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="gap-2"
          style={{ background: "oklch(0.22 0.06 240)", color: "white" }}
        >
          <Plus className="w-4 h-4" />
          Nuevo Empleado
        </Button>
      </div>

      {/* Search + Stats */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar empleado..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
          <Users className="w-3.5 h-3.5" />
          {filtered.length} empleados
        </Badge>
      </div>

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
              <table className="w-full">
                <thead>
                  <tr style={{ background: "oklch(0.975 0.004 240)" }}>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Nombre
                    </th>
                    <th className="text-right px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Salario Mensual
                    </th>
                    <th className="text-right px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Bonos
                    </th>
                    <th className="text-right px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Salario Diario
                    </th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filtered.map((emp) => {
                    const salario = parseFloat(String(emp.salarioMensual)) || 0;
                    const bonos = parseFloat(String(emp.bonos)) || 0;
                    return (
                      <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                              style={{ background: "oklch(0.22 0.06 240)" }}
                            >
                              {emp.nombre.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-sm" style={{ color: "oklch(0.15 0.02 240)" }}>
                              {emp.nombre}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-semibold text-sm">{formatCurrency(salario)}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {bonos > 0 ? (
                            <span className="text-sm font-medium" style={{ color: "oklch(0.45 0.15 145)" }}>
                              {formatCurrency(bonos)}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm text-muted-foreground">
                            {formatCurrency(salario / 30)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(emp)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteId(emp.id)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
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
              <Label htmlFor="bonos">Bonos (MXN)</Label>
              <Input
                id="bonos"
                type="number"
                placeholder="Ej: 5000"
                value={form.bonos}
                onChange={(e) => setForm({ ...form, bonos: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Bonos adicionales para este período</p>
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
              Esta acción no se puede deshacer. Se eliminarán todos los datos del empleado.
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
    </div>
  );
}
