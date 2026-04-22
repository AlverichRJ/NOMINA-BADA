import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { trpc } from "@/lib/trpc";
import {
  BarChart3,
  Building2,
  Check,
  DollarSign,
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Pencil,
  Upload,
  Users,
  X,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "sonner";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Users, label: "Empleados", path: "/empleados" },
  { icon: DollarSign, label: "Importar Salarios", path: "/importar-salarios" },
  { icon: Upload, label: "Cargar Reporte", path: "/cargar" },
  { icon: BarChart3, label: "Reportes", path: "/reportes" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ background: "linear-gradient(135deg, oklch(0.18 0.05 240) 0%, oklch(0.28 0.08 240) 100%)" }}
      >
        <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md w-full mx-4 flex flex-col items-center gap-8">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "oklch(0.22 0.06 240)" }}>
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-center" style={{ color: "oklch(0.15 0.02 240)" }}>
              Sistema de Nómina
            </h1>
            <p className="text-sm text-center" style={{ color: "oklch(0.52 0.02 240)" }}>
              Gestión de asistencias y cálculo de nómina empresarial
            </p>
          </div>
          <Button
            onClick={() => { window.location.href = getLoginUrl(); }}
            size="lg"
            className="w-full font-semibold"
            style={{ background: "oklch(0.22 0.06 240)", color: "white" }}
          >
            Iniciar Sesión
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: {
  children: React.ReactNode;
  setSidebarWidth: (w: number) => void;
}) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const activeMenuItem = menuItems.find((item) => item.path === location);

  // Config de la app (nombre y logo)
  const utils = trpc.useUtils();
  const { data: config } = trpc.config.get.useQuery();
  const setConfigMutation = trpc.config.set.useMutation({
    onSuccess: () => utils.config.get.invalidate(),
    onError: (e) => toast.error("Error al guardar: " + e.message),
  });
  const uploadLogoMutation = trpc.config.uploadLogo.useMutation({
    onSuccess: () => {
      utils.config.get.invalidate();
      toast.success("Logo actualizado");
    },
    onError: (e) => toast.error("Error al subir logo: " + e.message),
  });

  const appName = config?.app_name || "NóminaApp";
  const appLogo = config?.app_logo || "";

  // Estado para editar nombre
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Estado para editar logo
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleStartEditName = () => {
    setNameValue(appName);
    setEditingName(true);
  };

  const handleSaveName = () => {
    if (!nameValue.trim()) return;
    setConfigMutation.mutate({ key: "app_name", value: nameValue.trim() });
    setEditingName(false);
    toast.success("Nombre actualizado");
  };

  const handleCancelName = () => setEditingName(false);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen debe ser menor a 5MB");
      return;
    }
    setUploadingLogo(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      uploadLogoMutation.mutate(
        { dataUrl, mimeType: file.type || "image/png" },
        { onSettled: () => setUploadingLogo(false) }
      );
    };
    reader.readAsDataURL(file);
    // Reset input
    e.target.value = "";
  };

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r border-border/60" disableTransition={isResizing}>
          {/* Header */}
          <SidebarHeader className="h-16 justify-center border-b border-border/40 px-3">
            <div className="flex items-center gap-3 w-full">
              <button
                onClick={toggleSidebar}
                className="h-9 w-9 flex items-center justify-center hover:bg-accent rounded-lg transition-colors shrink-0"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed && (
                <div className="flex items-center gap-2.5 min-w-0 flex-1 group/header">
                  {/* Logo */}
                  <button
                    className="relative shrink-0 group/logo"
                    title={uploadingLogo ? "Subiendo..." : "Cambiar logo"}
                    onClick={() => !uploadingLogo && logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                  >
                    {appLogo ? (
                      <img
                        src={appLogo}
                        alt="Logo"
                        className="w-7 h-7 rounded-lg object-cover"
                      />
                    ) : (
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: "oklch(0.22 0.06 240)" }}
                      >
                        <Building2 className="w-4 h-4 text-white" />
                      </div>
                    )}
                    {uploadingLogo ? (
                      <div className="absolute inset-0 rounded-lg bg-black/60 flex items-center justify-center">
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : (
                      <div className="absolute inset-0 rounded-lg bg-black/40 opacity-0 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center">
                        <Upload className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoChange}
                  />

                  {/* Nombre editable */}
                  {editingName ? (
                    <div className="flex items-center gap-1 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                      <Input
                        value={nameValue}
                        onChange={(e) => setNameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveName();
                          if (e.key === "Escape") handleCancelName();
                        }}
                        className="h-6 text-xs px-1 flex-1"
                        autoFocus
                      />
                      <button onClick={handleSaveName} className="text-green-600 hover:text-green-700">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={handleCancelName} className="text-muted-foreground hover:text-foreground">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="min-w-0 flex-1 flex items-center gap-1 group/name">
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: "oklch(0.15 0.02 240)" }}>
                          {appName}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">Gestión Empresarial</p>
                      </div>
                      <button
                        onClick={handleStartEditName}
                        className="opacity-0 group-hover/header:opacity-100 transition-opacity text-muted-foreground hover:text-foreground ml-1 shrink-0"
                        title="Editar nombre"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </SidebarHeader>

          {/* Navigation */}
          <SidebarContent className="gap-0 pt-3">
            {!isCollapsed && (
              <p className="px-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Menú Principal
              </p>
            )}
            <SidebarMenu className="px-2 gap-0.5">
              {menuItems.map((item) => {
                const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className="h-10 font-medium"
                    >
                      <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`} />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          {/* Footer */}
          <SidebarFooter className="p-3 border-t border-border/40">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent/50 transition-colors w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-8 w-8 border shrink-0">
                    <AvatarFallback className="text-xs font-semibold" style={{ background: "oklch(0.22 0.06 240)", color: "white" }}>
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate leading-none">{user?.name || "Usuario"}</p>
                      <p className="text-xs text-muted-foreground truncate mt-1">{user?.email || ""}</p>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar Sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Resize handle */}
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => { if (!isCollapsed) setIsResizing(true); }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-3 backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg" />
              <span className="font-semibold text-sm">{activeMenuItem?.label ?? "Menú"}</span>
            </div>
          </div>
        )}
        <main className="flex-1 p-6 min-h-screen">{children}</main>
      </SidebarInset>
    </>
  );
}
