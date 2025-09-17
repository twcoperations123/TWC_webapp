import { isDemoMode } from '../lib/supabase'
import type { User } from './userService'

// Mock users for demo mode
const DEMO_USERS: User[] = [
  {
    id: 'demo-user-1',
    name: 'Demo User',
    address: '123 Demo Street, Demo City, DC 12345',
    username: 'user',
    password: 'password', // In demo mode, we can show the password
    email: 'user@restaurantapp.com',
    phoneNumber: '(555) 123-4567',
    profileImage: undefined,
    role: 'user',
    comments: 'Demo user account for testing'
  },
  {
    id: 'demo-admin-1',
    name: 'Demo Admin',
    address: '456 Admin Avenue, Admin City, AC 54321',
    username: 'admin',
    password: 'admin123',
    email: 'admin@restaurantapp.com',
    phoneNumber: '(555) 987-6543',
    profileImage: undefined,
    role: 'admin',
    comments: 'Demo admin account for testing'
  }
]

// Mock menu items for demo mode
export const DEMO_MENU_ITEMS = [
  {
    id: 'demo-item-1',
    name: 'Craft Beer Sampler',
    ingredients: 'IPA, Lager, Stout - 3 x 6oz pours',
    unitSize: '18 oz total',
    abv: '5.5%',
    price: 15.99,
    category: 'Beer Flights',
    available: true
  },
  {
    id: 'demo-item-2',
    name: 'Premium Whiskey',
    ingredients: 'Aged 12 years, small batch',
    unitSize: '2 oz',
    abv: '43%',
    price: 18.50,
    category: 'Spirits',
    available: true
  },
  {
    id: 'demo-item-3',
    name: 'Wine Tasting Set',
    ingredients: 'Cabernet, Chardonnay, Pinot - 3 x 3oz pours',
    unitSize: '9 oz total',
    abv: '12.5%',
    price: 22.00,
    category: 'Wine',
    available: true
  }
]

export class DemoDataService {
  static getUsers(): User[] {
    if (!isDemoMode) return []
    return [...DEMO_USERS]
  }

  static getUser(id: string): User | null {
    if (!isDemoMode) return null
    return DEMO_USERS.find(user => user.id === id) || null
  }

  static getUserByUsername(username: string): User | null {
    if (!isDemoMode) return null
    return DEMO_USERS.find(user => user.username === username) || null
  }

  static getUserByEmail(email: string): User | null {
    if (!isDemoMode) return null
    return DEMO_USERS.find(user => user.email === email) || null
  }

  static authenticateUser(username: string, password: string): User | null {
    if (!isDemoMode) return null
    return DEMO_USERS.find(user => 
      (user.username === username || user.email === username) && 
      user.password === password
    ) || null
  }

  static createUser(userData: Partial<User>): User {
    if (!isDemoMode) throw new Error('Demo mode required')
    
    const newUser: User = {
      id: `demo-user-${Date.now()}`,
      name: userData.name || 'New User',
      address: userData.address || 'Demo Address',
      username: userData.username || `user${Date.now()}`,
      password: userData.password || 'password',
      email: userData.email || `user${Date.now()}@demo.com`,
      phoneNumber: userData.phoneNumber || '(555) 000-0000',
      profileImage: userData.profileImage || undefined,
      role: userData.role || 'user',
      comments: userData.comments || 'Demo user account'
    }

    DEMO_USERS.push(newUser)
    return newUser
  }

  static updateUser(id: string, updates: Partial<User>): User | null {
    if (!isDemoMode) return null
    
    const userIndex = DEMO_USERS.findIndex(user => user.id === id)
    if (userIndex === -1) return null

    DEMO_USERS[userIndex] = { ...DEMO_USERS[userIndex], ...updates }
    return DEMO_USERS[userIndex]
  }

  static deleteUser(id: string): boolean {
    if (!isDemoMode) return false
    
    const userIndex = DEMO_USERS.findIndex(user => user.id === id)
    if (userIndex === -1) return false

    DEMO_USERS.splice(userIndex, 1)
    return true
  }

  static getMenuItems() {
    if (!isDemoMode) return []
    return [...DEMO_MENU_ITEMS]
  }
}

// Log demo mode status
if (isDemoMode) {
  console.log('🎭 Demo Data Service initialized with mock data')
  console.log('👤 Demo users available:', DEMO_USERS.map(u => ({username: u.username, password: u.password})))
}
