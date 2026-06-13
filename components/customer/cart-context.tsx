"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { toastr } from "@/lib/toastr"

interface CartItem {
  itemId: number
  itemPriceId: number
  name: string
  sku?: string
  color: string
  country: string
  unit: string
  price: number
  quantity: number
  weight?: number
  temperature?: number
}

interface CartContextType {
  cart: CartItem[]
  addToCart: (item: any) => void
  updateCartQuantity: (itemPriceId: number, newQuantity: number) => void
  removeFromCart: (itemPriceId: number) => void
  clearCart: () => void
  getCartQuantity: (itemPriceId: number) => number
  getTotalAmount: () => number
  getTotalWeight: () => number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { getCurrentCustomer } = useAuth()
  const [cart, setCart] = useState<CartItem[]>([])

  // Get customer-specific cart key
  const getCartKey = () => {
    const currentCustomer = getCurrentCustomer()
    return currentCustomer ? `customer_cart_${currentCustomer.id}` : 'customer_cart'
  }

  // Load cart from localStorage on mount and when customer changes
  useEffect(() => {
    const cartKey = getCartKey()
    const savedCart = localStorage.getItem(cartKey)
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart))
      } catch (error) {
        console.error('Failed to parse cart data:', error)
        setCart([])
      }
    } else {
      setCart([])
    }
  }, [getCurrentCustomer])

  // Save cart to localStorage whenever cart changes
  useEffect(() => {
    const cartKey = getCartKey()
    localStorage.setItem(cartKey, JSON.stringify(cart))
  }, [cart, getCurrentCustomer])

  const addToCart = (item: any) => {
    const existingItem = cart.find(cartItem => cartItem.itemPriceId === item.id)
    
    if (existingItem) {
      setCart(cart.map(cartItem => 
        cartItem.itemPriceId === item.id 
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ))
    } else {
      const newCartItem: CartItem = {
        itemId: item.itemId || item.Item?.id,
        itemPriceId: item.id,
        name: item.Item?.name || "",
        sku: item.Item?.sku || "",
        color: item.Item?.color || "",
        country: item.Item?.country || "",
        unit: item.Item?.unit || "",
        price: item.price || 0,
        quantity: 1,
        weight: item.Item?.weight || 1,
        temperature: item.Item?.temperature,
      }
      setCart([...cart, newCartItem])
    }
    
    toastr.success(`${item.Item?.name} added to cart`)
  }

  const updateCartQuantity = (itemPriceId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(itemPriceId)
      return
    }
    
    setCart(cart.map(cartItem => 
      cartItem.itemPriceId === itemPriceId 
        ? { ...cartItem, quantity: newQuantity }
        : cartItem
    ))
  }

  const removeFromCart = (itemPriceId: number) => {
    setCart(cart.filter(cartItem => cartItem.itemPriceId !== itemPriceId))
    toastr.success("Item removed from cart")
  }

  const clearCart = () => {
    setCart([])
    const cartKey = getCartKey()
    localStorage.removeItem(cartKey)
  }

  const getCartQuantity = (itemPriceId: number) => {
    const cartItem = cart.find(item => item.itemPriceId === itemPriceId)
    return cartItem?.quantity || 0
  }

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity)*item.weight, 0)
  }

  const getTotalWeight = () => {
    return cart.reduce((total, item) => total + ((item.weight || 1) * item.quantity), 0)
  }

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      updateCartQuantity,
      removeFromCart,
      clearCart,
      getCartQuantity,
      getTotalAmount,
      getTotalWeight,
    }}>
      {children}
    </CartContext.Provider>
  )
}
