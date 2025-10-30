import React, { createContext, useContext, useMemo, useState } from 'react';

export type InventoryItem = {
  id: string;
  quantity: number;
  description?: string;
};

type InventoryContextValue = {
  items: InventoryItem[];
  addItem: (id: string, description?: string) => void;
  clear: () => void;
};

const InventoryContext = createContext<InventoryContextValue | undefined>(undefined);

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>([]);

  const addItem = (id: string, description?: string) => {
    setItems((prev: InventoryItem[]) => {
      const idx = prev.findIndex((i: InventoryItem) => i.id === id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + 1 };
        return copy;
      }
      return [...prev, { id, quantity: 1, description }];
    });
  };

  const clear = () => setItems([]);

  const value = useMemo(() => ({ items, addItem, clear }), [items]);

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error('useInventory must be used within InventoryProvider');
  return ctx;
}
