import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, Product, Customizations } from "@/types";

interface CartState {
  items: CartItem[];
  open: boolean;
  add: (product: Product, customizations: Customizations) => void;
  setItems: (items: CartItem[]) => void;
  remove: (id: string) => void;
  clear: () => void;
  setOpen: (open: boolean) => void;
  total: () => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      open: false,

      add: (product, customizations) =>
        set((state) => {
          const key = JSON.stringify(customizations);

          const found = state.items.find(
            (item) =>
              item.id === product.id &&
              JSON.stringify(item.customizations) === key,
          );

          if (found) {
            return {
              items: state.items.map((item) =>
                item === found
                  ? {
                      ...item,
                      quantity: Math.min(10, item.quantity + 1),
                    }
                  : item,
              ),
              open: false,
            };
          }

          const newItem: CartItem = {
            ...product,
            quantity: 1,
            customizations,
          };

          return {
            items: [...state.items, newItem],
            open: false,
          };
        }),

      setItems: (items) =>
        set({
          items,
          open: true,
        }),

      remove: (id) =>
        set((state) => ({
          items: state.items.flatMap((item) => {
            if (item.id !== id) return [item];

            if (item.quantity > 1) {
              return [
                {
                  ...item,
                  quantity: item.quantity - 1,
                },
              ];
            }

            return [];
          }),
        })),

      clear: () =>
        set({
          items: [],
        }),

      setOpen: (open) =>
        set({
          open,
        }),

      total: () =>
        get().items.reduce(
          (total, item) =>
            total +
            (item.price + item.customizations.shots * 50) * item.quantity,
          0,
        ),
    }),
    {
      name: "oat-ember-cart",
    },
  ),
);
