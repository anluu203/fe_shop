"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { orderApi } from "../lib/api/orders";
import type { Order } from "../lib/types";
import { cartItemCount } from "../lib/utils/format";
import { useAuth } from "./AuthContext";

interface CartContextValue {
  cart: Order | null;
  itemCount: number;
  isLoading: boolean;
  refreshCart: () => Promise<void>;
  addItem: (productId: string, quantity: number) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  checkout: () => Promise<Order>;
}

const CartContext = createContext<CartContextValue | null>(null);

const EMPTY_CART: Order = {
  id: null,
  status: "AddingItem",
  totalPrice: "0",
  items: [],
};

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [cart, setCart] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshCart = useCallback(async () => {
    if (!user) {
      setCart(null);
      return;
    }
    try {
      const data = await orderApi.getCart();
      setCart(data);
    } catch {
      setCart(EMPTY_CART);
    }
  }, [user]);

  // Load cart khi user đăng nhập
  useEffect(() => {
    if (!authLoading) {
      refreshCart();
    }
  }, [authLoading, refreshCart]);

  const addItem = useCallback(
    async (productId: string, quantity: number) => {
      setIsLoading(true);
      try {
        const updated = await orderApi.addItem({ productId, quantity });
        setCart(updated);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const updateItem = useCallback(
    async (itemId: string, quantity: number) => {
      setIsLoading(true);
      try {
        const updated = await orderApi.updateItem(itemId, { quantity });
        setCart(updated);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const removeItem = useCallback(async (itemId: string) => {
    setIsLoading(true);
    try {
      const updated = await orderApi.removeItem(itemId);
      setCart(updated);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearCart = useCallback(async () => {
    setIsLoading(true);
    try {
      await orderApi.clearCart();
      setCart(EMPTY_CART);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkout = useCallback(async (): Promise<Order> => {
    setIsLoading(true);
    try {
      const order = await orderApi.checkout();
      setCart(EMPTY_CART);
      return order;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <CartContext.Provider
      value={{
        cart,
        itemCount: cart ? cartItemCount(cart.items) : 0,
        isLoading,
        refreshCart,
        addItem,
        updateItem,
        removeItem,
        clearCart,
        checkout,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
