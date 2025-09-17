// User Menu Service for managing user-specific menus with Supabase

import { supabase } from '../lib/supabase'
import { menuService } from './menuService'
import type { MenuItem } from './menuService'

export interface UserMenu {
  id: string;
  userId: string;
  menuItems: MenuItem[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export class UserMenuService {
  // Get menu for a specific user (combines general + specialized drinks)
  static async getUserMenu(userId: string): Promise<MenuItem[]> {
    try {
      // Get all general drinks (available to all users)
      const generalDrinks = await menuService.getMenuItemsByAssignmentType('all_users', false)

      // Get user's specialized drinks
      const { data: userMenuData, error: userMenuError } = await supabase
        .from('user_menus')
        .select(`
          menu_item_id,
          menu_items (*)
        `)
        .eq('user_id', userId)
        .eq('is_active', true)

      if (userMenuError) {
        console.error('Error fetching user specialized drinks:', userMenuError)
        // Fall back to just general drinks
        return generalDrinks
      }

      let specializedDrinks: MenuItem[] = []
      if (userMenuData && userMenuData.length > 0) {
        specializedDrinks = userMenuData
          .map((item: any) => item.menu_items)
          .filter(Boolean)
          .filter((dbItem: any) => dbItem.assignment_type === 'specific_users') // Only include drinks that are assigned to specific users
          .map((dbItem: any) => ({
            id: dbItem.id,
            name: dbItem.name,
            ingredients: dbItem.ingredients,
            unitSize: dbItem.unit_size,
            abv: dbItem.abv,
            price: dbItem.price,
            imageUrl: dbItem.image_url || '',
            category: dbItem.category,
            inStock: dbItem.in_stock,
            assignmentType: dbItem.assignment_type as 'all_users' | 'specific_users',
            createdAt: new Date(dbItem.created_at),
          }))
      }

      // Combine general + specialized drinks, removing duplicates by ID
      const allDrinks = [...generalDrinks, ...specializedDrinks]
      const uniqueDrinks = allDrinks.filter((drink, index, self) => 
        index === self.findIndex(d => d.id === drink.id)
      )

      return uniqueDrinks
    } catch (error) {
      console.error('Error loading user menu:', error)
      // Fall back to general menu only
      return await menuService.getMenuItemsByAssignmentType('all_users', false)
    }
  }

  // Save specialized drinks for a specific user
  static async saveUserSpecializedDrinks(userId: string, menuItemIds: string[]): Promise<void> {
    try {
      // First, remove existing specialized drink assignments for this user
      await supabase
        .from('user_menus')
        .delete()
        .eq('user_id', userId)

      // Then, add new specialized drink assignments
      if (menuItemIds.length > 0) {
        const userMenuItems = menuItemIds.map(menuItemId => ({
          user_id: userId,
          menu_item_id: menuItemId,
          is_active: true,
        }))

        const { error } = await supabase
          .from('user_menus')
          .insert(userMenuItems)

        if (error) {
          console.error('Error saving user specialized drinks:', error)
          throw error
        }
      }
    } catch (error) {
      console.error('Error saving user specialized drinks:', error)
      throw error
    }
  }

  // Get all user menus for admin management
  static async getAllUserMenus(): Promise<{ [userId: string]: MenuItem[] }> {
    try {
      const { data: userMenuData, error } = await supabase
        .from('user_menus')
        .select(`
          user_id,
          menu_item_id,
          menu_items (*)
        `)
        .eq('is_active', true)

      if (error) {
        console.error('Error loading all user menus:', error)
        return {}
      }

      const userMenus: { [userId: string]: MenuItem[] } = {}

      if (userMenuData) {
        userMenuData.forEach((item: any) => {
          if (!userMenus[item.user_id]) {
            userMenus[item.user_id] = []
          }

          if (item.menu_items) {
            userMenus[item.user_id].push({
              id: item.menu_items.id,
              name: item.menu_items.name,
              ingredients: item.menu_items.ingredients,
              unitSize: item.menu_items.unit_size,
              abv: item.menu_items.abv,
              price: item.menu_items.price,
              imageUrl: item.menu_items.image_url || '',
              category: item.menu_items.category,
              inStock: item.menu_items.in_stock,
              assignmentType: item.menu_items.assignment_type as 'all_users' | 'specific_users' || 'all_users',
              createdAt: new Date(item.menu_items.created_at),
            })
          }
        })
      }

      return userMenus
    } catch (error) {
      console.error('Error loading all user menus:', error)
      return {}
    }
  }

  // Get specialized drinks assigned to users (for admin display)
  static async getSpecializedDrinksAssignments(): Promise<{ [drinkId: string]: string[] }> {
    try {
      const { data: userMenuData, error } = await supabase
        .from('user_menus')
        .select(`
          user_id,
          menu_item_id,
          menu_items!inner(assignment_type)
        `)
        .eq('is_active', true)
        .eq('menu_items.assignment_type', 'specific_users')

      if (error) {
        console.error('Error loading specialized drink assignments:', error)
        return {}
      }

      const assignments: { [drinkId: string]: string[] } = {}

      if (userMenuData) {
        userMenuData.forEach((item: any) => {
          if (!assignments[item.menu_item_id]) {
            assignments[item.menu_item_id] = []
          }
          assignments[item.menu_item_id].push(item.user_id)
        })
      }

      return assignments
    } catch (error) {
      console.error('Error loading specialized drink assignments:', error)
      return {}
    }
  }

  // Get all specialized drinks with their assignments (for admin UI)
  static async getAllSpecializedDrinksWithUsers(): Promise<{ [drinkId: string]: { drink: MenuItem, userIds: string[] } }> {
    try {
      // Get all specialized drinks
      const specializedDrinks = await menuService.getMenuItemsByAssignmentType('specific_users', false)
      
      // Get assignments
      const assignments = await this.getSpecializedDrinksAssignments()

      const result: { [drinkId: string]: { drink: MenuItem, userIds: string[] } } = {}

      specializedDrinks.forEach(drink => {
        result[drink.id] = {
          drink,
          userIds: assignments[drink.id] || []
        }
      })

      return result
    } catch (error) {
      console.error('Error loading specialized drinks with users:', error)
      return {}
    }
  }

  // Check if user has specialized drinks assigned
  static async hasSpecializedDrinks(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_menus')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(1)

      if (error) {
        console.error('Error checking specialized drinks:', error)
        return false
      }

      return data && data.length > 0
    } catch (error) {
      console.error('Error checking specialized drinks:', error)
      return false
    }
  }

  // Migrate localStorage user menus to Supabase (one-time migration)
  static async migrateFromLocalStorage(): Promise<void> {
    try {
      // Get all localStorage keys that start with 'userMenu_'
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('userMenu_')) {
          const userId = key.replace('userMenu_', '')
          const menuData = localStorage.getItem(key)
          
          if (menuData) {
            const menuItems = JSON.parse(menuData)
            
            // First, create menu items in the database if they don't exist
            const menuItemIds: string[] = []
            for (const item of menuItems) {
              const existingItem = await menuService.getMenuItemById(item.id)
              if (!existingItem) {
                const newItem = await menuService.createMenuItem({
                  name: item.name,
                  ingredients: item.ingredients,
                  unitSize: item.unitSize,
                  abv: item.abv,
                  price: item.price,
                  imageUrl: item.imageUrl,
                  category: item.category,
                  inStock: item.inStock,
                  isDraft: false,
                })
                if (newItem) {
                  menuItemIds.push(newItem.id)
                }
              } else {
                menuItemIds.push(item.id)
              }
            }

            // Then create the user menu with specialized drinks
            await this.saveUserSpecializedDrinks(userId, menuItemIds)
          }
        }
      }

      console.log('Successfully migrated user menus from localStorage to Supabase')
    } catch (error) {
      console.error('Error migrating user menus from localStorage:', error)
      throw error
    }
  }
}
