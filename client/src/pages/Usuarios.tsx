import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ShieldCheck, User, UserCog, Clock, Mail, AlertTriangle, Lock } from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Usuarios() {
  const { user: currentUser, loading } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // Redirigir si no es admin (en useEffect para evitar navegar durante render)
  useEffect(() => {
    if (!loading && currentUser && currentUser.role !== "admin") {
      setLocation("/");
    }
  }, [currentUser, loading, setLocation]);

  // Mostrar acceso denegado si no es admin y ya cargó
  if (!loading && currentUser && currentUser.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Lock className="w-12 h-12 text-muted-foreground opacity-40" />
        <p className="text-muted-foreground">No tienes permisos para acceder a esta sección.</p>
      </div>
    );
  }

  const { data: usuarios, isLoading } = trpc.usuarios.list.useQuery();

  const updateRoleMutation = trpc.usuarios.updateRole.useMutation({
    onSuccess: (_, vars) => {
      utils.usuarios.list.invalidate();
      toast.success(
        vars.role === "admin"
          ? "Usuario promovido a Administrador"
          : "Usuario degradado a Usuario normal"
      );
    },
    onError: (e) => toast.error("Error: " + e.message),
  });

  const handleToggleRole = (id: number, currentRole: string, name: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    const msg =
      newRole === "admin"
        ? `¿Promover a "${name}" como Administrador? Tendrá acceso completo al sistema.`
        : `¿Quitar permisos de Administrador a "${name}"? Solo podrá ver datos.`;
    if (!confirm(msg)) return;
    updateRoleMutation.mutate({ id, role: newRole });
  };

  const admins = usuarios?.filter((u) => u.role === "admin") ?? [];
  const regularUsers = usuarios?.filter((u) => u.role !== "admin") ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold" style={{ color: "oklch(0.15 0.02 240)" }}>
          Gestión de Usuarios
        </h1>
        <p className="text-muted-foreground mt-1">
          Administra los roles y permisos de los usuarios del sistema.
        </p>
      </div>

      {/* Info banner */}
      <Card className="border border-amber-200 bg-amber-50">
        <CardContent className="py-3 px-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-800">
            <strong>Roles del sistema:</strong> Los <strong>Administradores</strong> pueden cargar reportes, editar empleados, importar salarios y gestionar usuarios. Los <strong>Usuarios</strong> solo pueden consultar la información.
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6">
          {/* Administradores */}
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" style={{ color: "oklch(0.22 0.06 240)" }} />
                Administradores
                <Badge
                  className="ml-1 text-xs"
                  style={{ background: "oklch(0.22 0.06 240)", color: "white" }}
                >
                  {admins.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {admins.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay administradores.</p>
              ) : (
                <div className="space-y-2">
                  {admins.map((u) => {
                    const isMe = u.id === currentUser?.id;
                    return (
                      <div
                        key={u.id}
                        className="flex items-center gap-4 p-3 rounded-xl border border-border/50 hover:bg-muted/30 transition-colors"
                      >
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarFallback
                            className="text-xs font-bold text-white"
                            style={{ background: "oklch(0.22 0.06 240)" }}
                          >
                            {(u.name || u.email || "?").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm truncate" style={{ color: "oklch(0.15 0.02 240)" }}>
                              {u.name || "Sin nombre"}
                            </p>
                            {isMe && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                                Tú
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            {u.email && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {u.email}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Último acceso: {formatDate(u.lastSignedIn)}
                            </span>
                          </div>
                        </div>
                        {!isMe && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="shrink-0 text-xs gap-1.5 text-muted-foreground hover:text-destructive hover:border-destructive"
                            onClick={() => handleToggleRole(u.id, u.role ?? "user", u.name ?? "Usuario")}
                            disabled={updateRoleMutation.isPending}
                          >
                            <User className="w-3.5 h-3.5" />
                            Quitar admin
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Usuarios normales */}
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                Usuarios
                <Badge variant="outline" className="ml-1 text-xs">
                  {regularUsers.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {regularUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserCog className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No hay usuarios registrados aún.</p>
                  <p className="text-xs mt-1">Los usuarios aparecen aquí cuando inician sesión por primera vez.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {regularUsers.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center gap-4 p-3 rounded-xl border border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className="text-xs font-semibold bg-muted text-muted-foreground">
                          {(u.name || u.email || "?").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate" style={{ color: "oklch(0.15 0.02 240)" }}>
                          {u.name || "Sin nombre"}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5">
                          {u.email && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {u.email}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Último acceso: {formatDate(u.lastSignedIn)}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="shrink-0 text-xs gap-1.5"
                        style={{ background: "oklch(0.22 0.06 240)", color: "white" }}
                        onClick={() => handleToggleRole(u.id, u.role ?? "user", u.name ?? "Usuario")}
                        disabled={updateRoleMutation.isPending}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Hacer admin
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
