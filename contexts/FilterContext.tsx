
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface FilterContextType {
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  selectedProvince: string;
  setSelectedProvince: (province: string) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [selectedCategory, setSelectedCategory] = useState('todas');
  const [selectedProvince, setSelectedProvince] = useState('Todas');

  return (
    <FilterContext.Provider value={{
      selectedCategory,
      setSelectedCategory,
      selectedProvince,
      setSelectedProvince,
    }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilter() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilter must be used within a FilterProvider');
  }
  return context;
}
