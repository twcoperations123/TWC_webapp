import { useState, useEffect, useMemo } from 'react';
import { menuService, type MenuItem } from '../../services/menuService';
import { UserMenuService } from '../../services/userMenuService';
import { useUsers } from '../../contexts/UsersContext';

export default function Inventory() {
  const { users } = useUsers();
  const [liveMenuItems, setLiveMenuItems] = useState<MenuItem[]>([]);
  const [draftMenuItems, setDraftMenuItems] = useState<MenuItem[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'live' | 'draft' | 'user-menus'>('draft');
  const [specializedDrinksWithUsers, setSpecializedDrinksWithUsers] = useState<{ [drinkId: string]: { drink: MenuItem, userIds: string[] } }>({});

  // Combined draft view items (draft + live-only)
  const combinedDraftItems = useMemo((): MenuItem[] => {
    const combinedItems: MenuItem[] = [];
    const addedIds = new Set<string>();

    // First, add all draft items
    draftMenuItems.forEach(item => {
      combinedItems.push(item);
      addedIds.add(item.id);
    });

    // Then, add live items that aren't already in draft (these are live-only items)
    liveMenuItems.forEach(item => {
      if (!addedIds.has(item.id)) {
        combinedItems.push(item);
      }
    });

    // (no debug logs in production)
    
    return combinedItems;
  }, [draftMenuItems, liveMenuItems]);

  // Use draft items for editing, live items for viewing
  // In draft mode, combine draft items and live items (live items get "LIVE" indicator)
  const currentItems = viewMode === 'draft' ? combinedDraftItems : 
                      viewMode === 'live' ? liveMenuItems : 
                      [];

  const [newItem, setNewItem] = useState<Omit<MenuItem, 'id' | 'createdAt'>>({
    name: '',
    ingredients: '',
    unitSize: '',
    abv: 0,
    price: 0,
    imageUrl: '',
    category: 'spirits',
    inStock: true,
    assignmentType: 'all_users',
  });

  // Load menu items from Supabase
  useEffect(() => {
    const loadMenuItems = async () => {
      try {
        const [live, draft] = await Promise.all([
          menuService.getAllMenuItems(false),
          menuService.getAllMenuItems(true)
        ]);
        console.log(`Data loaded - Live: ${live.length}, Draft: ${draft.length}`);
        setLiveMenuItems(live);
        setDraftMenuItems(draft);
      } catch (error) {
        console.error('Error loading menu items:', error);
      }
    };

    loadMenuItems();
  }, []);

  // Debug data changes
  useEffect(() => {
    console.log(`Data updated: live=${liveMenuItems.length}, draft=${draftMenuItems.length}`);
  }, [liveMenuItems, draftMenuItems]);

  // Load specialized drinks with user assignments when in user-menus view
  useEffect(() => {
    if (viewMode === 'user-menus') {
      const loadSpecializedDrinks = async () => {
        const assignments = await UserMenuService.getAllSpecializedDrinksWithUsers();
        setSpecializedDrinksWithUsers(assignments);
      };
      loadSpecializedDrinks();
    }
  }, [viewMode]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setNewItem(prev => ({ ...prev, imageUrl: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newItem.name || !newItem.ingredients || !newItem.unitSize || newItem.price <= 0) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      if (editingItem) {
        // When editing an item, make sure it becomes a draft item
        const updatedItem = await menuService.updateMenuItem(editingItem.id, { ...newItem, isDraft: true });
        if (updatedItem) {
          // Update or add to draft state
          const existsInDraft = draftMenuItems.some(item => item.id === editingItem.id);
          if (existsInDraft) {
            setDraftMenuItems(prev => prev.map(item => 
              item.id === editingItem.id ? updatedItem : item
            ));
          } else {
            // Add to draft if it wasn't there before (was live-only)
            setDraftMenuItems(prev => [...prev, updatedItem]);
          }
          
          // Update live state if the item exists there
          setLiveMenuItems(prev => prev.map(item => 
            item.id === editingItem.id ? updatedItem : item
          ));
        }
        setEditingItem(null);
      } else {
        // Add new item
        const createdItem = await menuService.createMenuItem({ ...newItem, isDraft: true });
        if (createdItem) {
          setDraftMenuItems(prev => [...prev, createdItem]);
        }
      }

      // Reset form
      setNewItem({
        name: '',
        ingredients: '',
        unitSize: '',
        abv: 0,
        price: 0,
        imageUrl: '',
        category: 'spirits',
        inStock: true,
        assignmentType: 'all_users',
      });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error saving menu item:', error);
      alert('Failed to save menu item');
    }
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setNewItem({
      name: item.name,
      ingredients: item.ingredients,
      unitSize: item.unitSize,
      abv: item.abv,
      price: item.price,
      imageUrl: item.imageUrl,
      category: item.category,
      inStock: item.inStock,
      assignmentType: item.assignmentType,
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      try {
        await menuService.deleteMenuItem(id);
        
        // Remove from both draft and live state if it exists in either
        setDraftMenuItems(prev => prev.filter(item => item.id !== id));
        setLiveMenuItems(prev => prev.filter(item => item.id !== id));
      } catch (error) {
        console.error('Error deleting menu item:', error);
        alert('Failed to delete menu item');
      }
    }
  };

  const toggleStock = async (id: string) => {
    try {
      // Find item in either draft or live items
      const draftItem = draftMenuItems.find(i => i.id === id);
      const liveItem = liveMenuItems.find(i => i.id === id);
      const item = draftItem || liveItem;
      
      if (item) {
        const updatedItem = await menuService.updateMenuItem(id, { inStock: !item.inStock });
        if (updatedItem) {
          // Update both draft and live state if the item exists in either
          setDraftMenuItems(prev => prev.map(item => 
            item.id === id ? updatedItem : item
          ));
          setLiveMenuItems(prev => prev.map(item => 
            item.id === id ? updatedItem : item
          ));
        }
      }
    } catch (error) {
      console.error('Error updating stock status:', error);
      alert('Failed to update stock status');
    }
  };

  const updateLiveMenu = async () => {
    if (confirm('This will update the live menu that customers can see. Continue?')) {
      try {
        // Get all items currently visible in draft view (combination of draft and live)
  const allDraftItems = combinedDraftItems;
        
        // Copy all items to live (set isDraft: false for all)
        for (const item of allDraftItems) {
          await menuService.updateMenuItem(item.id, { isDraft: false });
        }
        
        // Reload menu items to get the latest state
        const [live, draft] = await Promise.all([
          menuService.getAllMenuItems(false),
          menuService.getAllMenuItems(true)
        ]);
        setLiveMenuItems(live);
        setDraftMenuItems(draft);
        
        alert('Live menu updated successfully!');
      } catch (error) {
        console.error('Error updating live menu:', error);
        alert('Failed to update live menu');
      }
    }
  };

  const filteredItems = currentItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.ingredients.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Debug when in draft mode
  if (viewMode === 'draft') {
    console.log(`Draft Debug - Live: ${liveMenuItems.length}, Draft: ${draftMenuItems.length}, Combined: ${currentItems.length}, Filtered: ${filteredItems.length}`);
  }

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'spirits', label: 'Spirits' },
    { value: 'wine', label: 'Wine' },
    { value: 'beer', label: 'Beer' },
    { value: 'cocktails', label: 'Cocktails' },
    { value: 'mixers', label: 'Mixers' },
  ];

  const draftChanges = (() => {
    // Check if there are any differences between what's in the combined draft view and what's live
    return combinedDraftItems.length !== liveMenuItems.length || 
      combinedDraftItems.some(draftItem => {
        const liveItem = liveMenuItems.find(l => l.id === draftItem.id);
        return !liveItem || JSON.stringify(draftItem) !== JSON.stringify(liveItem);
      });
  })();

  const draftOnlyCount = combinedDraftItems.filter(d => !liveMenuItems.some(l => l.id === d.id)).length;

  return (
    <div className="w-full">
      {viewMode === 'draft' && (
        <div className="w-full px-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Draft Menu</h1>
              <p className="text-gray-600">Make your changes here before they go live.</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('draft')}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white"
              >
                Draft Menu
              </button>
              <button
                onClick={() => {
                  setViewMode('live');
                  setShowAddForm(false);
                  setEditingItem(null);
                }}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                Live Menu
              </button>
              <button
                onClick={() => {
                  setViewMode('user-menus');
                  setShowAddForm(false);
                  setEditingItem(null);
                }}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                Drink Assignments
              </button>
              <button
                onClick={() => {
                  console.log('=== DEBUG STATE ===');
                  console.log('Live Menu Items:', liveMenuItems);
                  console.log('Draft Menu Items:', draftMenuItems);
                  // combinedDraftItems available in component
                  console.log('Current Items:', currentItems);
                  console.log('Filtered Items:', filteredItems);
                  console.log('View Mode:', viewMode);
                }}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-red-500 text-white"
              >
                DEBUG
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-6">
            <div className="bg-white p-4 rounded-lg shadow-md text-center">
              <div className="text-2xl font-bold text-blue-600">{combinedDraftItems.length}</div>
              <div className="text-sm text-gray-600">Total Items</div>
              <div className="text-xs text-gray-400">L:{liveMenuItems.length} D:{draftMenuItems.length}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md text-center">
              <div className="text-2xl font-bold text-green-600">{liveMenuItems.filter(item => combinedDraftItems.some(d => d.id === item.id)).length}</div>
              <div className="text-sm text-gray-600">Live Items</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md text-center">
              <div className="text-2xl font-bold text-orange-600">{draftOnlyCount}</div>
              <div className="text-sm text-gray-600">Draft Only</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md text-center">
              <div className="text-2xl font-bold text-emerald-600">
                {combinedDraftItems.filter(item => item.inStock).length}
              </div>
              <div className="text-sm text-gray-600">In Stock</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md text-center flex flex-col items-center">
              <div className="text-xs font-small text-gray-700">
                {draftChanges ? '⚠️ Draft changes detected' : '✅ Up to Date'}
              </div>
              <button
                onClick={updateLiveMenu}
                disabled={!draftChanges}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                  draftChanges
                    ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Update Live Menu
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white p-4 rounded-lg shadow-md mt-6 mb-6">
            <div className="flex flex-wrap gap-4 items-center">
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {categories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  setShowAddForm(true);
                  setEditingItem(null);
                  setNewItem({
                    name: '',
                    ingredients: '',
                    unitSize: '',
                    abv: 0,
                    price: 0,
                    imageUrl: '',
                    category: 'spirits',
                    inStock: true,
                    assignmentType: 'all_users',
                  });
                }}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Add New Item
              </button>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'live' && (
        <div className="w-full px-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Live Menu Preview</h1>
              <p className="text-gray-600">Customers will see these items.</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('draft')}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                Draft Menu
              </button>
              <button
                onClick={() => setViewMode('live')}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white"
              >
                Live Menu
              </button>
              <button
                onClick={() => setViewMode('user-menus')}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                Drink Assignments
              </button>
            </div>
          </div>

          {/* Live Menu Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow-md text-center">
              <div className="text-2xl font-bold text-blue-600">{liveMenuItems.length}</div>
              <div className="text-sm text-gray-600">Live Items</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md text-center">
              <div className="text-2xl font-bold text-green-600">
                {liveMenuItems.filter(item => item.inStock).length}
              </div>
              <div className="text-sm text-gray-600">In Stock</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md text-center">
              <div className="text-2xl font-bold text-red-600">
                {liveMenuItems.filter(item => !item.inStock).length}
              </div>
              <div className="text-sm text-gray-600">Out of Stock</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md text-center flex flex-col items-center">
              <div className="text-2xl font-bold text-emerald-600">LIVE</div>
              <div className="text-sm font-medium text-gray-700">Status</div>
            </div>
          </div>

          {/* Live Menu Search */}
          <div className="bg-white p-4 rounded-lg shadow-md mb-6">
            <div className="flex flex-wrap gap-4">
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {categories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Drink Assignment Management */}
      {viewMode === 'user-menus' && (
        <div className="w-full px-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Drink Assignment Management</h1>
              <p className="text-gray-600">Manage which users can access specialized drinks</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('draft')}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                Draft Menu
              </button>
              <button
                onClick={() => setViewMode('live')}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                Live Menu
              </button>
              <button
                onClick={() => setViewMode('user-menus')}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-purple-600 text-white"
              >
                Drink Assignments
              </button>
            </div>
          </div>

          {/* Assignment Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow-md text-center">
              <div className="text-2xl font-bold text-blue-600">
                {liveMenuItems.filter(item => item.assignmentType === 'all_users').length}
              </div>
              <div className="text-sm text-gray-600">General Drinks</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Object.keys(specializedDrinksWithUsers).length}
              </div>
              <div className="text-sm text-gray-600">Specialized Drinks</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md text-center">
              <div className="text-2xl font-bold text-green-600">
                {Object.values(specializedDrinksWithUsers).reduce((total, assignment) => total + assignment.userIds.length, 0)}
              </div>
              <div className="text-sm text-gray-600">Total Assignments</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md text-center">
              <div className="text-2xl font-bold text-gray-600">{users.filter(user => user.role !== 'admin').length}</div>
              <div className="text-sm text-gray-600">Users</div>
            </div>
          </div>

          {/* Specialized Drinks List */}
          <div className="bg-white rounded-lg shadow-md mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Specialized Drinks</h2>
              <p className="text-gray-600 text-sm mt-1">Drinks assigned to specific users only</p>
            </div>
            <div className="divide-y divide-gray-200">
              {Object.keys(specializedDrinksWithUsers).length === 0 ? (
                <div className="p-6 text-center">
                  <div className="text-gray-500">No specialized drinks found</div>
                  <p className="text-sm text-gray-400 mt-1">Create drinks with "specific_users" assignment type to see them here</p>
                </div>
              ) : (
                Object.entries(specializedDrinksWithUsers).map(([drinkId, { drink, userIds }]) => (
                  <div key={drinkId} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                          {drink.imageUrl ? (
                            <img src={drink.imageUrl} alt={drink.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-gray-500 text-xs">No Image</span>
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{drink.name}</h3>
                          <p className="text-sm text-gray-600">{drink.ingredients}</p>
                          <div className="flex items-center mt-1 space-x-4">
                            <span className="text-sm text-gray-500">{drink.category}</span>
                            <span className="text-sm font-medium text-gray-900">${drink.price.toFixed(2)}</span>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              drink.inStock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {drink.inStock ? 'In Stock' : 'Out of Stock'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-purple-600">
                          {userIds.length} user{userIds.length !== 1 ? 's' : ''}
                        </div>
                        <div className="text-sm text-gray-600">assigned</div>
                      </div>
                    </div>
                    
                    {userIds.length > 0 && (
                      <div className="mt-4 bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">Assigned Users:</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {userIds.map(userId => {
                            const user = users.find(u => u.id === userId);
                            return user ? (
                              <div key={userId} className="text-sm text-gray-600 truncate">
                                • {user.name} ({user.email})
                              </div>
                            ) : (
                              <div key={userId} className="text-sm text-gray-400 truncate">
                                • Unknown user ({userId})
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="w-full px-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">
              {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Name
                  </label>
                  <input
                    type="text"
                    value={newItem.name}
                    onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="spirits">Spirits</option>
                    <option value="wine">Wine</option>
                    <option value="beer">Beer</option>
                    <option value="cocktails">Cocktails</option>
                    <option value="mixers">Mixers</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assignment Type
                </label>
                <select
                  value={newItem.assignmentType}
                  onChange={(e) => setNewItem(prev => ({ ...prev, assignmentType: e.target.value as 'all_users' | 'specific_users' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="all_users">Available to All Users</option>
                  <option value="specific_users">Specialized (Assign to Specific Users)</option>
                </select>
                <p className="text-sm text-gray-600 mt-1">
                  {newItem.assignmentType === 'all_users' 
                    ? 'This drink will be available to all users on their menu.' 
                    : 'This drink will only be available to users you specifically assign it to.'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description 
                </label>
                <textarea
                  value={newItem.ingredients}
                  onChange={(e) => setNewItem(prev => ({ ...prev, ingredients: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="List the ingredients..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Size
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={newItem.unitSize.split(' ')[0] || ''}
                      onChange={(e) => {
                        const unit = newItem.unitSize.split(' ')[1] || 'ml';
                        setNewItem(prev => ({ ...prev, unitSize: `${e.target.value} ${unit}` }));
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="750"
                      required
                    />
                    <select
                      value={newItem.unitSize.split(' ')[1] || 'ml'}
                      onChange={(e) => {
                        const size = newItem.unitSize.split(' ')[0] || '';
                        setNewItem(prev => ({ ...prev, unitSize: `${size} ${e.target.value}` }));
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="ml">ml</option>
                      <option value="oz">oz</option>
                      <option value="cl">cl</option>
                      <option value="l">L</option>
                      <option value="gal">gal</option>
                      <option value="pint">pint</option>
                      <option value="shot">shot</option>
                      <option value="serving">serving</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ABV (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={newItem.abv}
                    onChange={(e) => setNewItem(prev => ({ ...prev, abv: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newItem.price}
                    onChange={(e) => setNewItem(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image Thumbnail
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                {newItem.imageUrl && (
                  <div className="mt-2">
                    <img 
                      src={newItem.imageUrl} 
                      alt="Preview" 
                      className="w-20 h-20 object-cover rounded border"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="inStock"
                  checked={newItem.inStock}
                  onChange={(e) => setNewItem(prev => ({ ...prev, inStock: e.target.checked }))}
                  className="mr-2"
                />
                <label htmlFor="inStock" className="text-sm text-gray-700">
                  In Stock
                </label>
              </div>

              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  {editingItem ? 'Update Item' : 'Add Item'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingItem(null);
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Menu Items Grid */}
      {viewMode !== 'user-menus' && (
        <div className="w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 px-4">
            {filteredItems.map((item) => (
              <div key={item.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="h-40 bg-gray-200 flex items-center justify-center overflow-hidden relative">
                  {viewMode === 'draft' && (
                    <div className="absolute top-2 left-2 z-10">
                      {liveMenuItems.some(liveItem => liveItem.id === item.id) ? (
                        <span className="px-2 py-1 bg-green-600 text-white text-xs font-bold rounded-full shadow-md">
                          LIVE
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-orange-500 text-white text-xs font-medium rounded-full">
                          Draft Only
                        </span>
                      )}
                    </div>
                  )}
                  {item.assignmentType === 'specific_users' && (
                    <div className="absolute top-2 right-2 z-10">
                      <span className="px-2 py-1 bg-purple-500 text-white text-xs font-medium rounded-full">
                        Specialized
                      </span>
                    </div>
                  )}
                  {item.imageUrl ? (
                    <img 
                      src={item.imageUrl} 
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-500">No Image</span>
                  )}
                </div>
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900 text-sm">{item.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.inStock 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {item.inStock ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2 line-clamp-2">{item.ingredients}</p>
                  <div className="space-y-1 text-xs text-gray-500">
                    <div>Size: {item.unitSize}</div>
                    {item.abv > 0 && <div>ABV: {item.abv}%</div>}
                    <div className="font-medium text-gray-900">${item.price.toFixed(2)}</div>
                    <div className={`text-xs ${item.assignmentType === 'all_users' ? 'text-blue-600' : 'text-purple-600'}`}>
                      {item.assignmentType === 'all_users' ? 'All Users' : 'Specialized'}
                    </div>
                  </div>
                  {viewMode === 'draft' && (
                    <div className="mt-4 flex space-x-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => toggleStock(item.id)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        {item.inStock ? 'Mark Out of Stock' : 'Mark In Stock'}
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {viewMode !== 'user-menus' && filteredItems.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">
            {viewMode === 'draft' ? 'No items found. Items will appear here from both draft and live menus.' : 'No live items found.'}
          </p>
          {viewMode === 'draft' && (
            <div className="mt-4 text-sm text-gray-400">
              Debug: Live Items: {liveMenuItems.length}, Draft Items: {draftMenuItems.length}, Combined: {currentItems.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
