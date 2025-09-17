import { supabase } from '../lib/supabase'
import type { MenuItem } from './menuService'
import { menuService } from './menuService'

export interface CartItem extends MenuItem {
  quantity: number
}

class CartService {
  // Get user's shopping cart
  async getCart(userId: string): Promise<CartItem[]> {
    try {
      const { data, error } = await supabase
        .from('shopping_carts')
        .select(`
          quantity,
          menu_items (*)
        `)
        .eq('user_id', userId)

      if (error) {
        console.error('Error fetching cart:', error)
        return []
      }

      if (!data) return []

      return data
        .filter((item: any) => item.menu_items)
        .map((item: any) => ({
          id: item.menu_items.id,
          name: item.menu_items.name,
          ingredients: item.menu_items.ingredients,
          unitSize: item.menu_items.unit_size,
          abv: item.menu_items.abv,
          price: item.menu_items.price,
          imageUrl: item.menu_items.image_url || '',
          category: item.menu_items.category,
          inStock: item.menu_items.in_stock,
          assignmentType: item.menu_items.assignment_type || 'all_users',
          createdAt: new Date(item.menu_items.created_at),
          quantity: item.quantity,
        }))
    } catch (error) {
      console.error('Error in getCart:', error)
      return []
    }
  }

  // Add item to cart or update quantity
  async addToCart(userId: string, menuItemId: string, quantity: number): Promise<boolean> {
    try {
      // Server-side guard: ensure the menu item is in stock before adding
      try {
        const menuItem = await menuService.getMenuItemById(menuItemId);
        if (!menuItem || menuItem.inStock === false) {
          console.warn('Attempt to add out-of-stock item to cart:', menuItemId);
          return false
        }
      } catch (e) {
        console.warn('Failed to verify menu item stock before adding to cart', e);
        // Continue; we'll let later calls surface errors
      }
      // Check if item already exists in cart
      const { data: existingItem, error: checkError } = await supabase
        .from('shopping_carts')
        .select('*')
        .eq('user_id', userId)
        .eq('menu_item_id', menuItemId)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing cart item:', checkError)
        throw checkError
      }

      if (existingItem) {
        // Update existing item quantity
        const { error: updateError } = await supabase
          .from('shopping_carts')
          .update({ quantity: existingItem.quantity + quantity })
          .eq('id', existingItem.id)

        if (updateError) {
          console.error('Error updating cart item:', updateError)
          throw updateError
        }
      } else {
        // Add new item to cart
        const { error: insertError } = await supabase
          .from('shopping_carts')
          .insert([{
            user_id: userId,
            menu_item_id: menuItemId,
            quantity: quantity,
          }])

        if (insertError) {
          console.error('Error adding item to cart:', insertError)
          throw insertError
        }
      }

      return true
    } catch (error) {
      console.error('Error in addToCart:', error)
      return false
    }
  }

  // Update item quantity in cart
  async updateCartItem(userId: string, menuItemId: string, quantity: number): Promise<boolean> {
    try {
      if (quantity <= 0) {
        return await this.removeFromCart(userId, menuItemId)
      }

      const { error } = await supabase
        .from('shopping_carts')
        .update({ quantity })
        .eq('user_id', userId)
        .eq('menu_item_id', menuItemId)

      if (error) {
        console.error('Error updating cart item:', error)
        throw error
      }

      return true
    } catch (error) {
      console.error('Error in updateCartItem:', error)
      return false
    }
  }

  // Remove item from cart
  async removeFromCart(userId: string, menuItemId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('shopping_carts')
        .delete()
        .eq('user_id', userId)
        .eq('menu_item_id', menuItemId)

      if (error) {
        console.error('Error removing item from cart:', error)
        throw error
      }

      return true
    } catch (error) {
      console.error('Error in removeFromCart:', error)
      return false
    }
  }

  // Clear entire cart
  async clearCart(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('shopping_carts')
        .delete()
        .eq('user_id', userId)

      if (error) {
        console.error('Error clearing cart:', error)
        throw error
      }

      return true
    } catch (error) {
      console.error('Error in clearCart:', error)
      return false
    }
  }

  // Get cart item count
  async getCartItemCount(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('shopping_carts')
        .select('quantity')
        .eq('user_id', userId)

      if (error) {
        console.error('Error fetching cart count:', error)
        return 0
      }

      return data?.reduce((sum, item) => sum + item.quantity, 0) || 0
    } catch (error) {
      console.error('Error in getCartItemCount:', error)
      return 0
    }
  }

  // Get cart total
  async getCartTotal(userId: string): Promise<number> {
    try {
      const cart = await this.getCart(userId)
      return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    } catch (error) {
      console.error('Error in getCartTotal:', error)
      return 0
    }
  }
}

export const cartService = new CartService()
