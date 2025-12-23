
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Filtros } from '@/types';

interface FilterContextType {
  filtros: Filtros;
  setFiltros: (filtros: Filtros) => void;
  aplicarFiltros: (nuevosFiltros: Filtros) => void;
  limpiarFiltros: () => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filtros, setFiltrosState] = useState<Filtros>({});

  const setFiltros = useCallback((nuevosFiltros: Filtros) => {
    console.log('[FilterContext] 🔄 Setting filters:', nuevosFiltros);
    setFiltrosState(nuevosFiltros);
  }, []);

  const aplicarFiltros = useCallback((nuevosFiltros: Filtros) => {
    console.log('[FilterContext] ✅ Applying filters:', nuevosFiltros);
    setFiltrosState(nuevosFiltros);
  }, []);

  const limpiarFiltros = useCallback(() => {
    console.log('[FilterContext] 🧹 Clearing all filters');
    setFiltrosState({});
  }, []);

  return (
    <FilterContext.Provider value={{ filtros, setFiltros, aplicarFiltros, limpiarFiltros }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
}
