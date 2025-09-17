import { supabase } from '../lib/supabase'
import type { Database } from '../lib/supabase'

export interface MenuItem {
  id: string
  name: string
  ingredients: string
  unitSize: string
  abv: number
  price: number
  imageUrl: string
  category: string
  inStock: boolean
  assignmentType: 'all_users' | 'specific_users'
  createdAt: Date
}

export interface CreateMenuItemData {
  name: string
  ingredients: string
  unitSize: string
  abv?: number
  price: number
  imageUrl?: string
  category: string
  inStock?: boolean
  isDraft?: boolean
  assignmentType?: 'all_users' | 'specific_users'
}

export interface UpdateMenuItemData {
  name?: string
  ingredients?: string
  unitSize?: string
  abv?: number
  price?: number
  imageUrl?: string
  category?: string
  inStock?: boolean
  isDraft?: boolean
  assignmentType?: 'all_users' | 'specific_users'
}

class MenuService {
  // Get all menu items (live or draft)
  async getAllMenuItems(isDraft: boolean = false): Promise<MenuItem[]> {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_draft', isDraft)
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching menu items:', error)
        throw error
      }

      return data?.map(this.mapDatabaseItemToMenuItem) || []
    } catch (error) {
      console.error('Error in getAllMenuItems:', error)
      return []
    }
  }

  // Get menu items by category
  async getMenuItemsByCategory(category: string, isDraft: boolean = false): Promise<MenuItem[]> {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('category', category)
        .eq('is_draft', isDraft)
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching menu items by category:', error)
        throw error
      }

      return data?.map(this.mapDatabaseItemToMenuItem) || []
    } catch (error) {
      console.error('Error in getMenuItemsByCategory:', error)
      return []
    }
  }

  // Get menu item by ID
  async getMenuItemById(id: string): Promise<MenuItem | null> {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching menu item:', error)
        return null
      }

      return data ? this.mapDatabaseItemToMenuItem(data) : null
    } catch (error) {
      console.error('Error in getMenuItemById:', error)
      return null
    }
  }

  // Create new menu item
  async createMenuItem(itemData: CreateMenuItemData): Promise<MenuItem | null> {
    try {
      const insertData = {
        name: itemData.name,
        ingredients: itemData.ingredients,
        unit_size: itemData.unitSize,
        abv: itemData.abv ?? 0,
        price: itemData.price,
        image_url: itemData.imageUrl,
        category: itemData.category,
        in_stock: itemData.inStock ?? true,
        is_draft: itemData.isDraft ?? false,
        assignment_type: itemData.assignmentType ?? 'all_users',
      }

      const { data, error } = await supabase
        .from('menu_items')
        .insert([insertData])
        .select()
        .single()

      if (error) {
        console.error('Error creating menu item:', error)
        throw error
      }

      return data ? this.mapDatabaseItemToMenuItem(data) : null
    } catch (error) {
      console.error('Error in createMenuItem:', error)
      throw error
    }
  }

  // Update menu item
  async updateMenuItem(id: string, updates: UpdateMenuItemData): Promise<MenuItem | null> {
    try {
      const updateData: Record<string, unknown> = {}

      if (updates.name !== undefined) updateData.name = updates.name
      if (updates.ingredients !== undefined) updateData.ingredients = updates.ingredients
      if (updates.unitSize !== undefined) updateData.unit_size = updates.unitSize
      if (updates.abv !== undefined) updateData.abv = updates.abv
      if (updates.price !== undefined) updateData.price = updates.price
      if (updates.imageUrl !== undefined) updateData.image_url = updates.imageUrl
      if (updates.category !== undefined) updateData.category = updates.category
      if (updates.inStock !== undefined) updateData.in_stock = updates.inStock
      if (updates.isDraft !== undefined) updateData.is_draft = updates.isDraft
      if (updates.assignmentType !== undefined) updateData.assignment_type = updates.assignmentType

      const { data, error } = await supabase
        .from('menu_items')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating menu item:', error)
        throw error
      }

      return data ? this.mapDatabaseItemToMenuItem(data) : null
    } catch (error) {
      console.error('Error in updateMenuItem:', error)
      throw error
    }
  }

  // Delete menu item
  async deleteMenuItem(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting menu item:', error)
        throw error
      }

      return true
    } catch (error) {
      console.error('Error in deleteMenuItem:', error)
      return false
    }
  }

  // Publish draft items to live
  async publishDraftItems(itemIds: string[]): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_draft: false })
        .in('id', itemIds)

      if (error) {
        console.error('Error publishing draft items:', error)
        throw error
      }

      return true
    } catch (error) {
      console.error('Error in publishDraftItems:', error)
      return false
    }
  }

  // Copy live items to draft
  async copyLiveToDraft(): Promise<boolean> {
    try {
      // First, get all live items
      const { data: liveItems, error: fetchError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_draft', false)

      if (fetchError) {
        console.error('Error fetching live items:', fetchError)
        throw fetchError
      }

      if (!liveItems || liveItems.length === 0) {
        return true // Nothing to copy
      }

      // Create draft copies
      const draftItems = liveItems.map(item => ({
        name: item.name,
        ingredients: item.ingredients,
        unit_size: item.unit_size,
        abv: item.abv,
        price: item.price,
        image_url: item.image_url,
        category: item.category,
        in_stock: item.in_stock,
        is_draft: true,
      }))

      // Delete existing draft items first
      await supabase
        .from('menu_items')
        .delete()
        .eq('is_draft', true)

      // Insert new draft items
      const { error: insertError } = await supabase
        .from('menu_items')
        .insert(draftItems)

      if (insertError) {
        console.error('Error inserting draft items:', insertError)
        throw insertError
      }

      return true
    } catch (error) {
      console.error('Error in copyLiveToDraft:', error)
      return false
    }
  }

  // Get menu items by assignment type
  async getMenuItemsByAssignmentType(assignmentType: 'all_users' | 'specific_users', isDraft: boolean = false): Promise<MenuItem[]> {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('assignment_type', assignmentType)
        .eq('is_draft', isDraft)
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching menu items by assignment type:', error)
        throw error
      }

      return data?.map(this.mapDatabaseItemToMenuItem) || []
    } catch (error) {
      console.error('Error in getMenuItemsByAssignmentType:', error)
      return []
    }
  }

  // Assign specific drinks to specific users
  async assignDrinkToUsers(menuItemId: string, userIds: string[]): Promise<boolean> {
    try {
      // First, remove existing assignments for this menu item
      await supabase
        .from('user_menus')
        .delete()
        .eq('menu_item_id', menuItemId)

      // Then, add new assignments if any users specified
      if (userIds.length > 0) {
        const assignments = userIds.map(userId => ({
          user_id: userId,
          menu_item_id: menuItemId,
          is_active: true,
        }))

        const { error } = await supabase
          .from('user_menus')
          .insert(assignments)

        if (error) {
          console.error('Error assigning drink to users:', error)
          throw error
        }
      }

      return true
    } catch (error) {
      console.error('Error in assignDrinkToUsers:', error)
      return false
    }
  }

  // Get users assigned to a specific drink
  async getUsersForDrink(menuItemId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('user_menus')
        .select('user_id')
        .eq('menu_item_id', menuItemId)
        .eq('is_active', true)

      if (error) {
        console.error('Error fetching users for drink:', error)
        return []
      }

      return data?.map(item => item.user_id) || []
    } catch (error) {
      console.error('Error in getUsersForDrink:', error)
      return []
    }
  }

  // Helper function to map database item to app item
  private mapDatabaseItemToMenuItem(
    dbItem: Database['public']['Tables']['menu_items']['Row']
  ): MenuItem {
    return {
      id: dbItem.id,
      name: dbItem.name,
      ingredients: dbItem.ingredients,
      unitSize: dbItem.unit_size,
      abv: dbItem.abv,
      price: dbItem.price,
      imageUrl: dbItem.image_url || '',
      category: dbItem.category,
      inStock: dbItem.in_stock,
      assignmentType: (dbItem.assignment_type as 'all_users' | 'specific_users') || 'all_users',
      createdAt: new Date(dbItem.created_at),
    }
  }

  // Migrate localStorage data to Supabase (one-time migration)
  async migrateFromLocalStorage(): Promise<void> {
    try {
      // Migrate live menu items
      const liveItems = localStorage.getItem('menuItems')
      if (liveItems) {
        const parsedLiveItems = JSON.parse(liveItems)
        for (const item of parsedLiveItems) {
          await this.createMenuItem({
            name: item.name,
            ingredients: item.ingredients,
            unitSize: item.unitSize,
            abv: item.abv,
            price: item.price,
            imageUrl: item.imageUrl,
            category: item.category,
            inStock: item.inStock,
            isDraft: false,
            assignmentType: 'all_users', // Default for migrated items
          })
        }
      }

      // Migrate draft menu items
      const draftItems = localStorage.getItem('draftMenuItems')
      if (draftItems) {
        const parsedDraftItems = JSON.parse(draftItems)
        for (const item of parsedDraftItems) {
          await this.createMenuItem({
            name: item.name,
            ingredients: item.ingredients,
            unitSize: item.unitSize,
            abv: item.abv,
            price: item.price,
            imageUrl: item.imageUrl,
            category: item.category,
            inStock: item.inStock,
            isDraft: true,
            assignmentType: 'all_users', // Default for migrated items
          })
        }
      }

      console.log('Successfully migrated menu items from localStorage to Supabase')
    } catch (error) {
      console.error('Error migrating from localStorage:', error)
      throw error
    }
  }
}

export const menuService = new MenuService()
