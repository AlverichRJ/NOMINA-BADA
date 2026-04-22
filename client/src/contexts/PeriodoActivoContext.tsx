import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "periodo_activo_id";

interface PeriodoActivoContextType {
  periodoActivoId: number | null;
  setPeriodoActivo: (id: number) => void;
}

const PeriodoActivoContext = createContext<PeriodoActivoContextType | undefined>(undefined);

export function PeriodoActivoProvider({ children }: { children: React.ReactNode }) {
  const [periodoActivoId, setPeriodoActivoId] = useState<number | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseInt(stored, 10) : null;
  });

  const setPeriodoActivo = useCallback((id: number) => {
    setPeriodoActivoId(id);
    localStorage.setItem(STORAGE_KEY, String(id));
  }, []);

  return (
    <PeriodoActivoContext.Provider value={{ periodoActivoId, setPeriodoActivo }}>
      {children}
    </PeriodoActivoContext.Provider>
  );
}

export function usePeriodoActivo() {
  const ctx = useContext(PeriodoActivoContext);
  if (!ctx) throw new Error("usePeriodoActivo must be used within PeriodoActivoProvider");
  return ctx;
}
