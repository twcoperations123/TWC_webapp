import { supabase } from '../lib/supabase'
import { menuService } from './menuService'

export class MigrationService {
  // Migrate localStorage menu items to Supabase
  static async migrateMenuItems(): Promise<void> {
    try {
      console.log('Starting menu items migration...')
      
      // Check if we already have menu items in the database
      const existingItems = await menuService.getAllMenuItems(false)
      if (existingItems.length > 0) {
        console.log('Menu items already exist in database, skipping migration')
        return
      }

      // Migrate live menu items from localStorage
      const liveItems = localStorage.getItem('menuItems')
      if (liveItems) {
        const parsedLiveItems = JSON.parse(liveItems)
        console.log(`Migrating ${parsedLiveItems.length} live menu items...`)
        
        for (const item of parsedLiveItems) {
          await menuService.createMenuItem({
            name: item.name,
            ingredients: item.ingredients,
            unitSize: item.unitSize,
            abv: item.abv || 0,
            price: item.price,
            imageUrl: item.imageUrl,
            category: item.category,
            inStock: item.inStock ?? true,
            isDraft: false,
          })
        }
      }

      // Migrate draft menu items from localStorage
      const draftItems = localStorage.getItem('draftMenuItems')
      if (draftItems) {
        const parsedDraftItems = JSON.parse(draftItems)
        console.log(`Migrating ${parsedDraftItems.length} draft menu items...`)
        
        for (const item of parsedDraftItems) {
          await menuService.createMenuItem({
            name: item.name,
            ingredients: item.ingredients,
            unitSize: item.unitSize,
            abv: item.abv || 0,
            price: item.price,
            imageUrl: item.imageUrl,
            category: item.category,
            inStock: item.inStock ?? true,
            isDraft: true,
          })
        }
      }

      console.log('Menu items migration completed successfully!')
    } catch (error) {
      console.error('Error during menu items migration:', error)
      throw error
    }
  }

  // Create sample menu items for testing
  static async createSampleMenuItems(): Promise<void> {
    try {
      console.log('Creating sample menu items...')
      
      const sampleItems = [
        {
          name: 'Cabernet Sauvignon',
          ingredients: 'Premium red wine grapes',
          unitSize: '750ml',
          abv: 13.5,
          price: 24.99,
          imageUrl: '',
          category: 'wine',
          inStock: true,
          isDraft: false,
        },
        {
          name: 'IPA Craft Beer',
          ingredients: 'Hops, malt, yeast, water',
          unitSize: '355ml',
          abv: 6.2,
          price: 5.99,
          imageUrl: '',
          category: 'beer',
          inStock: true,
          isDraft: false,
        },
        {
          name: 'Premium Vodka',
          ingredients: 'Premium grain alcohol',
          unitSize: '750ml',
          abv: 40.0,
          price: 32.99,
          imageUrl: '',
          category: 'spirits',
          inStock: true,
          isDraft: false,
        },
      ]

      for (const item of sampleItems) {
        await menuService.createMenuItem(item)
      }

      console.log('Sample menu items created successfully!')
    } catch (error) {
      console.error('Error creating sample menu items:', error)
      throw error
    }
  }

  // Test database connectivity
  static async testConnection(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .select('count')
        .limit(1)

      if (error) {
        console.error('Database connection test failed:', error)
        return false
      }

      console.log('Database connection test successful!')
      return true
    } catch (error) {
      console.error('Database connection test failed:', error)
      return false
    }
  }

  // Check if tables exist
  static async checkTablesExist(): Promise<boolean> {
    try {
      // Try to query each table
      const { error: menuError } = await supabase
        .from('menu_items')
        .select('count')
        .limit(1)

      const { error: userMenuError } = await supabase
        .from('user_menus')
        .select('count')
        .limit(1)

      const { error: cartError } = await supabase
        .from('shopping_carts')
        .select('count')
        .limit(1)

      if (menuError || userMenuError || cartError) {
        console.log('Some tables do not exist yet')
        return false
      }

      console.log('All required tables exist!')
      return true
    } catch (error) {
      console.error('Error checking tables:', error)
      return false
    }
  }
}
