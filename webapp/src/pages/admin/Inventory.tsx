import { useState, useEffect, useMemo } from 'react';
import { menuService, type MenuItem } from '../../services/menuService';
import { UserMenuService } from '../../services/userMenuService';
import { CacheService } from '../../services/cacheService';
import { useUsers } from '../../contexts/UsersContext';

export default function Inventory() {
  const { users } = useUsers();
  const [liveMenuItems, setLiveMenuItems] = useState<MenuItem[]>([]);
  const [draftMenuItems, setDraftMenuItems] = useState<MenuItem[]>([]);
  const [pendingDeletions, setPendingDeletions] = useState<string[]>([]);
  const [deleteCandidate, setDeleteCandidate] = useState<MenuItem | null>(null);
  const [createdDraftsForDelete, setCreatedDraftsForDelete] = useState<string[]>([]);
  // Track draft items that are copies of live items (draftId -> liveId)
  const [draftToLiveMapping, setDraftToLiveMapping] = useState<{ [draftId: string]: string }>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'live' | 'draft' | 'user-menus'>('draft');
  const [specializedDrinksWithUsers, setSpecializedDrinksWithUsers] = useState<{ [drinkId: string]: { drink: MenuItem, userIds: string[] } }>({});
  const [showCustomMenuModal, setShowCustomMenuModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [drinkSearchQuery, setDrinkSearchQuery] = useState('');
  const [selectedSpecializedDrinks, setSelectedSpecializedDrinks] = useState<string[]>([]);
  const [selectedRestaurantProfile, setSelectedRestaurantProfile] = useState<string | null>(null);
  const [showRestaurantModal, setShowRestaurantModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Helper function to show success message
  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 5000); // Auto-hide after 5 seconds
  };

  // Helper function to show error message
  const showErrorMessage = (message: string) => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(null), 5000); // Auto-hide after 5 seconds
  };

  // Combine draft + live for the draft view so admins can edit live items in the draft
  const combinedDraftItems = useMemo(() => {
  // live items that don't have a draft counterpart and are not pending deletion
  const liveOnly = liveMenuItems.filter(l => !draftMenuItems.some(d => d.id === l.id) && !pendingDeletions.includes(l.id));
  // Include all draft items (even those marked pending) so admins can see pending deletes
  return [...draftMenuItems, ...liveOnly];
  }, [draftMenuItems, liveMenuItems, pendingDeletions]);

  // Use draft view combined list, otherwise the live items
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
        setLiveMenuItems(live);
        setDraftMenuItems(draft);
      } catch (error) {
        console.error('Error loading menu items:', error);
      }
    };

    loadMenuItems();
  }, []);

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
      showErrorMessage('Please fill in all required fields');
      return;
    }

    try {
      if (editingItem) {
        // Update existing item
        const updatedItem = await menuService.updateMenuItem(editingItem.id, newItem);
        if (updatedItem) {
          setDraftMenuItems(prev => prev.map(item => 
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
      showErrorMessage('Failed to save menu item');
    }
  };

  const handleEdit = (item: MenuItem) => {
    // If this item exists only on live, create a draft copy first so edits affect draft
    const existsInDraft = draftMenuItems.some(d => d.id === item.id);
    if (!existsInDraft) {
      const draftCopy = { ...item, isDraft: true } as MenuItem;
      setDraftMenuItems(prev => [...prev, draftCopy]);
    }
    const toEdit = { ...item };
    setEditingItem(toEdit);
    setNewItem({
      name: toEdit.name,
      ingredients: toEdit.ingredients,
      unitSize: toEdit.unitSize,
      abv: toEdit.abv,
      price: toEdit.price,
      imageUrl: toEdit.imageUrl,
      category: toEdit.category,
      inStock: toEdit.inStock,
      assignmentType: toEdit.assignmentType,
    });
    setShowAddForm(true);
  };

  // Show confirmation modal before marking for deletion
  const handleDelete = (item: MenuItem) => {
    setDeleteCandidate(item);
  };

  const confirmDelete = async () => {
    if (!deleteCandidate) return;
    const id = deleteCandidate.id;
    try {
      // If the item doesn't exist in draft yet (it's live-only), create a draft copy
      const existsInDraft = draftMenuItems.some(d => d.id === id);
      if (!existsInDraft) {
        const draftCopy = { ...deleteCandidate, isDraft: true } as MenuItem;
        setDraftMenuItems(prev => [...prev, draftCopy]);
        setCreatedDraftsForDelete(prev => Array.from(new Set([...prev, id])));
      }

      // Mark item as pending deletion (keeps it visible in draft with a badge)
      setPendingDeletions(prev => Array.from(new Set([...prev, id])));
      setDeleteCandidate(null);
      showSuccessMessage('Marked for deletion. Click "Update Live Menu" to apply.');
    } catch (error) {
      console.error('Error marking menu item for deletion:', error);
      showErrorMessage('Failed to mark menu item for deletion');
    }
  };

  const cancelDelete = () => setDeleteCandidate(null);

  const cancelPendingDelete = (id: string) => {
    // Remove from pendingDeletions
    setPendingDeletions(prev => prev.filter(pid => pid !== id));

    // If we created a draft copy for deletion, remove that draft copy
    if (createdDraftsForDelete.includes(id)) {
      setDraftMenuItems(prev => prev.filter(item => item.id !== id));
      setCreatedDraftsForDelete(prev => prev.filter(pid => pid !== id));
    }

    showSuccessMessage('Pending deletion canceled.');
  };

  const toggleStock = async (id: string) => {
    try {
      // Toggle in draft state; persist changes
      const draftItem = draftMenuItems.find(i => i.id === id);
      if (draftItem) {
        const updated = await menuService.updateMenuItem(id, { inStock: !draftItem.inStock });
        if (updated) {
          setDraftMenuItems(prev => prev.map(item => item.id === id ? updated : item));
          showSuccessMessage(`Stock status updated in draft. Click "Update Live Menu" to apply changes.`);
        }
        return;
      }

      // If not in draft, create a draft copy in DB (so it has a real id) with toggled stock
      const liveItem = liveMenuItems.find(i => i.id === id);
      if (liveItem) {
        const created = await menuService.createMenuItem({
          name: liveItem.name,
          ingredients: liveItem.ingredients,
          unitSize: liveItem.unitSize,
          abv: liveItem.abv,
          price: liveItem.price,
          imageUrl: liveItem.imageUrl,
          category: liveItem.category,
          inStock: !liveItem.inStock,
          isDraft: true,
          assignmentType: liveItem.assignmentType,
        });
        if (created) {
          setDraftMenuItems(prev => [...prev, created]);
          // Track that this draft item is a copy of the live item
          setDraftToLiveMapping(prev => ({ ...prev, [created.id]: liveItem.id }));
          showSuccessMessage(`Stock status updated in draft. Click "Update Live Menu" to apply changes.`);
        }
        return;
      }
    } catch (error) {
      console.error('Error toggling stock locally:', error);
      showErrorMessage('Failed to toggle stock');
    }
  };

  // (Publishing is handled by runPublish and the publish modal)

  const [showPublishModal, setShowPublishModal] = useState(false);

  const runPublish = async () => {
    try {
      // Apply pending deletions first
      for (const id of pendingDeletions) {
        try {
          await menuService.deleteMenuItem(id);
        } catch (e) {
          console.warn('Failed to delete item during publish:', id, e);
        }
      }

      // Delete original live items that have draft copies (to prevent duplicates)
      for (const [draftId, liveId] of Object.entries(draftToLiveMapping)) {
        try {
          await menuService.deleteMenuItem(liveId);
          console.log(`Deleted original live item ${liveId} (replaced by draft ${draftId})`);
        } catch (e) {
          console.warn('Failed to delete original live item during publish:', liveId, e);
        }
      }

      // Promote all draft items to live in batch
      try {
        const idsToPublish = draftMenuItems.map(i => i.id);
        if (idsToPublish.length > 0) {
          await menuService.publishDraftItems(idsToPublish);
        }
      } catch (e) {
        console.warn('Failed to publish draft items in batch', e);
      }

      // Reload both menu types to ensure consistency and clear pending deletions
      const [live, draft] = await Promise.all([
        menuService.getAllMenuItems(false),
        menuService.getAllMenuItems(true)
      ]);
      setLiveMenuItems(live);
      setDraftMenuItems(draft);
      setPendingDeletions([]);
      setDraftToLiveMapping({}); // Clear the mapping after publishing
      
      // Clear all user menu caches so they load fresh data
      CacheService.clearUserMenuCache();
      
      setShowPublishModal(false);
      showSuccessMessage('Live menu updated successfully!');
    } catch (error) {
      console.error('Error updating live menu:', error);
      showErrorMessage('Failed to update live menu');
    }
  };

  const handleCreateCustomMenu = async () => {
    if (!selectedUserId) {
      showErrorMessage('Please select a user first');
      return;
    }

    if (selectedSpecializedDrinks.length === 0) {
      showErrorMessage('Please select at least one specialized drink');
      return;
    }

    try {
      // For each selected drink, add the user to existing assignments
      for (const drinkId of selectedSpecializedDrinks) {
        const existingUsers = await menuService.getUsersForDrink(drinkId);
        if (!existingUsers.includes(selectedUserId)) {
          await menuService.assignDrinkToUsers(drinkId, [...existingUsers, selectedUserId]);
        }
      }

      // Reload specialized drinks
      const assignments = await UserMenuService.getAllSpecializedDrinksWithUsers();
      setSpecializedDrinksWithUsers(assignments);

      // Reset and close modal
      setSelectedUserId('');
      setSelectedSpecializedDrinks([]);
      setUserSearchQuery('');
      setDrinkSearchQuery('');
      setShowCustomMenuModal(false);
      
      showSuccessMessage('Custom menu created successfully!');
    } catch (error) {
      console.error('Error creating custom menu:', error);
      showErrorMessage('Failed to create custom menu');
    }
  };

  const handleDrinkSelection = (drinkId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedSpecializedDrinks(prev => [...prev, drinkId]);
    } else {
      setSelectedSpecializedDrinks(prev => prev.filter(id => id !== drinkId));
    }
  };

  // Get specialized drinks available for assignment
  const availableSpecializedDrinks = liveMenuItems.filter(item => item.assignmentType === 'specific_users');

  // Filter specialized drinks based on search query
  const filteredSpecializedDrinks = availableSpecializedDrinks.filter(drink => {
    const searchTerm = drinkSearchQuery.toLowerCase();
    return (
      drink.name.toLowerCase().includes(searchTerm) ||
      drink.ingredients.toLowerCase().includes(searchTerm) ||
      drink.category.toLowerCase().includes(searchTerm)
    );
  });

  // Get users with custom menus (restaurant profiles)
  const getUsersWithCustomMenus = () => {
    const usersWithMenus: { user: any, customDrinks: MenuItem[] }[] = [];
    
    users.filter(user => user.role !== 'admin').forEach(user => {
      const customDrinks: MenuItem[] = [];
      
      Object.entries(specializedDrinksWithUsers).forEach(([_, { drink, userIds }]) => {
        if (userIds.includes(user.id)) {
          customDrinks.push(drink);
        }
      });
      
      if (customDrinks.length > 0) {
        usersWithMenus.push({ user, customDrinks });
      }
    });
    
    return usersWithMenus;
  };

  const restaurantProfiles = getUsersWithCustomMenus();

  // Filter users for the modal
  const filteredUsersForModal = users
    .filter(user => user.role !== 'admin')
    .filter(user => {
      const searchTerm = userSearchQuery.toLowerCase();
      return (
        user.name.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm) ||
        user.username.toLowerCase().includes(searchTerm)
      );
    });

  const draftOnlyCount = draftMenuItems.filter(
    d => !liveMenuItems.some(l => l.id === d.id)
  ).length;

  const filteredItems = currentItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.ingredients.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'spirits', label: 'Spirits' },
    { value: 'wine', label: 'Wine' },
    { value: 'beer', label: 'Beer' },
    { value: 'cocktails', label: 'Cocktails' },
    { value: 'mixers', label: 'Mixers' },
  ];

  const draftChanges = (() => {
    // If there are no draft items, no changes
    if (draftMenuItems.length === 0) return false;
    
    // If there are no live items but there are draft items, there are changes
    if (liveMenuItems.length === 0 && draftMenuItems.length > 0) return true;
    
    // Create a normalized comparison function
    const normalizeItem = (item: MenuItem) => ({
      name: String(item.name || '').trim(),
      ingredients: String(item.ingredients || '').trim(),
      unitSize: String(item.unitSize || '').trim(),
      abv: Number(item.abv || 0),
      price: Number(item.price || 0),
      imageUrl: String(item.imageUrl || '').trim(),
      category: String(item.category || '').trim(),
      inStock: Boolean(item.inStock),
      assignmentType: String(item.assignmentType || 'all_users')
    });

    // Create maps for easier comparison
    const draftMap = new Map();
    const liveMap = new Map();
    
    draftMenuItems.forEach(item => {
      draftMap.set(item.id, normalizeItem(item));
    });
    
    liveMenuItems.forEach(item => {
      liveMap.set(item.id, normalizeItem(item));
    });
    
    // Check for new items (in draft but not in live)
    for (const [draftId] of draftMap) {
      if (!liveMap.has(draftId)) {
        return true;
      }
    }
    
    // Check for deleted items (in live but not in draft)
    for (const [liveId] of liveMap) {
      if (!draftMap.has(liveId)) {
        return true;
      }
    }
    
    // Check for modified items
    for (const [id, draftItem] of draftMap) {
      const liveItem = liveMap.get(id);
      if (liveItem) {
        const draftStr = JSON.stringify(draftItem);
        const liveStr = JSON.stringify(liveItem);
        if (draftStr !== liveStr) {
          return true;
        }
      }
    }
    
    return false;
  })();

  return (
    <div className="w-full">
      {/* Success Notification */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>{successMessage}</span>
          <button 
            onClick={() => setSuccessMessage(null)}
            className="ml-2 text-green-500 hover:text-green-700"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="fixed top-4 right-4 z-50 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span>{errorMessage}</span>
          <button 
            onClick={() => setErrorMessage(null)}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

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
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white p-4 rounded-lg shadow-md text-center">
              <div className="text-2xl font-bold text-blue-600">{draftOnlyCount}</div>
              <div className="text-sm text-gray-600">Draft Items</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md text-center">
              <div className="text-2xl font-bold text-green-600">
                {draftMenuItems.filter(item => item.inStock).length}
              </div>
              <div className="text-sm text-gray-600">In Stock</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md text-center">
              <div className="text-2xl font-bold text-red-600">
                {draftMenuItems.filter(item => !item.inStock).length}
              </div>
              <div className="text-sm text-gray-600">Out of Stock</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md text-center flex flex-col items-center">
              <div className="text-xs font-small text-gray-700">
                {draftChanges ? '⚠️ Draft changes detected' : '✅ Up to Date'}
              </div>
              <button
                onClick={() => setShowPublishModal(true)}
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
              <h1 className="text-3xl font-bold">Restaurant Profiles</h1>
              <p className="text-gray-600">View restaurant profiles and their custom drink access</p>
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
                Restaurant Profiles
              </button>
            </div>
          </div>

          {/* Assignment Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
            <div className="bg-white p-4 rounded-lg shadow-md text-center flex flex-col items-center justify-center">
              <button
                onClick={() => setShowCustomMenuModal(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
              >
                Create Custom Menu
              </button>
            </div>
          </div>

          {/* Restaurant Profiles */}
          <div className="bg-white rounded-lg shadow-md mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Restaurant Profiles</h2>
            </div>
            <div className="p-6">
              {restaurantProfiles.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">No restaurant profiles found</div>
                  <p className="text-sm text-gray-400 mt-1">Create custom menus for users to see their profiles here</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {restaurantProfiles.map(({ user, customDrinks }) => (
                    <div 
                      key={user.id} 
                      className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-purple-400 hover:shadow-md cursor-pointer transition-all duration-200 aspect-square flex flex-col items-center justify-center text-center"
                      onClick={() => {
                        setSelectedRestaurantProfile(user.id);
                        setShowRestaurantModal(true);
                      }}
                    >
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center mb-3">
                        <span className="text-white font-bold text-xl">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <h3 className="font-medium text-gray-900 text-sm mb-1 line-clamp-2">{user.name}</h3>
                      <p className="text-xs text-gray-600 mb-2 line-clamp-1">{user.email}</p>
                      <div className="text-xs text-purple-600 font-medium">
                        {customDrinks.length} drink{customDrinks.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  ))}
                </div>
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
                  {viewMode === 'draft' && liveMenuItems.some(liveItem => liveItem.id === item.id) && (
                    <div className="absolute top-2 left-2 z-10">
                      <span className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded-full">
                        LIVE
                      </span>
                    </div>
                  )}
                  {/* Right-side badges: Specialized then Pending Delete (so they don't overlap) */}
                  <div className="absolute top-2 right-2 z-10 flex items-center space-x-2">
                    {item.assignmentType === 'specific_users' && (
                      <div>
                        <span className="px-2 py-1 bg-purple-500 text-white text-xs font-medium rounded-full">
                          Specialized
                        </span>
                      </div>
                    )}
                    {viewMode === 'draft' && pendingDeletions.includes(item.id) && (
                      <div>
                        <span className="px-2 py-1 bg-red-500 text-white text-xs font-medium rounded-full">
                          Pending Delete
                        </span>
                      </div>
                    )}
                  </div>
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
                      {pendingDeletions.includes(item.id) ? (
                        <button
                          onClick={() => cancelPendingDelete(item.id)}
                          className="text-gray-700 hover:text-gray-900 text-sm font-medium"
                        >
                          Cancel Delete
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDelete(item)}
                          className="text-red-600 hover:text-red-700 text-sm font-medium"
                        >
                          Delete
                        </button>
                      )}
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
            {viewMode === 'draft' ? 'No draft items found.' : 'No live items found.'}
          </p>
        </div>
      )}

      {/* Custom Menu Creation Modal */}
      {showCustomMenuModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Create Custom Menu</h2>
              <button
                onClick={() => {
                  setShowCustomMenuModal(false);
                  setSelectedUserId('');
                  setSelectedSpecializedDrinks([]);
                  setUserSearchQuery('');
                  setDrinkSearchQuery('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* User Selection */}
              <div>
                <h3 className="text-lg font-semibold mb-4">1. Select User</h3>
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search users by name, email, or username..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                  {filteredUsersForModal.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      {userSearchQuery ? 'No users found matching your search' : 'No users available'}
                    </div>
                  ) : (
                    filteredUsersForModal.map((user) => (
                      <div
                        key={user.id}
                        onClick={() => setSelectedUserId(user.id)}
                        className={`p-3 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
                          selectedUserId === user.id ? 'bg-purple-50 border-purple-200' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${selectedUserId === user.id ? 'bg-purple-600' : 'bg-gray-300'}`}></div>
                          <div>
                            <div className="font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-600">{user.email}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {selectedUserId && (
                  <div className="mt-3 p-3 bg-purple-50 rounded-lg">
                    <div className="text-sm text-purple-800">
                      Selected: {users.find(u => u.id === selectedUserId)?.name}
                    </div>
                  </div>
                )}
              </div>

              {/* Specialized Drinks Selection */}
              <div>
                <h3 className="text-lg font-semibold mb-4">2. Select Specialized Drinks</h3>
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search drinks by name, ingredients, or category..."
                    value={drinkSearchQuery}
                    onChange={(e) => setDrinkSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
                  {filteredSpecializedDrinks.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      {drinkSearchQuery ? 'No drinks found matching your search' : 'No specialized drinks available. Create drinks with "Specialized" assignment type first.'}
                    </div>
                  ) : (
                    filteredSpecializedDrinks.map((drink) => (
                      <div
                        key={drink.id}
                        className="p-3 border-b border-gray-200"
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={selectedSpecializedDrinks.includes(drink.id)}
                            onChange={(e) => handleDrinkSelection(drink.id, e.target.checked)}
                            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                                {drink.imageUrl ? (
                                  <img src={drink.imageUrl} alt={drink.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-gray-500 text-xs">No Image</span>
                                )}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{drink.name}</div>
                                <div className="text-sm text-gray-600">{drink.category} • ${drink.price.toFixed(2)}</div>
                                <div className="text-xs text-gray-500 truncate max-w-xs">{drink.ingredients}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {selectedSpecializedDrinks.length > 0 && (
                  <div className="mt-3 p-3 bg-purple-50 rounded-lg">
                    <div className="text-sm text-purple-800">
                      {selectedSpecializedDrinks.length} drink{selectedSpecializedDrinks.length !== 1 ? 's' : ''} selected
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-4 mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowCustomMenuModal(false);
                  setSelectedUserId('');
                  setSelectedSpecializedDrinks([]);
                  setUserSearchQuery('');
                  setDrinkSearchQuery('');
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCustomMenu}
                disabled={!selectedUserId || selectedSpecializedDrinks.length === 0}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  selectedUserId && selectedSpecializedDrinks.length > 0
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Create Custom Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restaurant Profile Modal */}
      {showRestaurantModal && selectedRestaurantProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {(() => {
              const profileData = restaurantProfiles.find(p => p.user.id === selectedRestaurantProfile);
              if (!profileData) return null;
              
              return (
                <>
                  <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold">{profileData.user.name}'s Custom Menu</h2>
                      <p className="text-gray-600 text-sm mt-1">Specialized drinks assigned to this restaurant</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowRestaurantModal(false);
                        setSelectedRestaurantProfile(null);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* Restaurant Info */}
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-xl">
                          {profileData.user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-lg">{profileData.user.name}</div>
                        <div className="text-sm text-gray-600">{profileData.user.email}</div>
                        <div className="text-sm text-gray-500">Username: {profileData.user.username}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {profileData.user.address && `📍 ${profileData.user.address}`}
                          {profileData.user.phone && ` • 📞 ${profileData.user.phone}`}
                        </div>
                      </div>
                      <div className="ml-auto text-right">
                        <div className="text-lg font-semibold text-purple-600">
                          {profileData.customDrinks.length} drink{profileData.customDrinks.length !== 1 ? 's' : ''}
                        </div>
                        <div className="text-sm text-gray-600">custom access</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Custom Drinks */}
                  <div className="divide-y divide-gray-200">
                    {profileData.customDrinks.length === 0 ? (
                      <div className="p-6 text-center text-gray-500">
                        No custom drinks assigned to this restaurant yet.
                      </div>
                    ) : (
                      profileData.customDrinks.map((drink) => (
                        <div key={drink.id} className="p-6">
                          <div className="flex items-center space-x-4">
                            <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                              {drink.imageUrl ? (
                                <img src={drink.imageUrl} alt={drink.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-gray-500 text-xs">No Image</span>
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="text-lg font-medium text-gray-900">{drink.name}</h4>
                              <p className="text-sm text-gray-600">{drink.ingredients}</p>
                              <div className="flex items-center mt-2 space-x-4">
                                <span className="text-sm text-gray-500">{drink.category}</span>
                                <span className="text-sm text-gray-500">{drink.unitSize}</span>
                                {drink.abv > 0 && <span className="text-sm text-gray-500">{drink.abv}% ABV</span>}
                                <span className="text-sm font-medium text-gray-900">${drink.price.toFixed(2)}</span>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  drink.inStock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {drink.inStock ? 'In Stock' : 'Out of Stock'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteCandidate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-2">Confirm Delete</h3>
            <p className="text-sm text-gray-700 mb-4">Are you sure you want to delete "{deleteCandidate.name}"? This will mark the item for deletion and it will be removed from the live menu once you click "Update Live Menu".</p>
            <div className="flex justify-end space-x-3">
              <button onClick={cancelDelete} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg">Cancel</button>
              <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg">Mark for Deletion</button>
            </div>
          </div>
        </div>
      )}

      {/* Publish Confirmation Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-2">Confirm Publish</h3>
            <p className="text-sm text-gray-700 mb-4">This will apply pending deletions and publish draft changes to the live menu. Are you sure you want to continue?</p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setShowPublishModal(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg">Cancel</button>
              <button onClick={runPublish} className="px-4 py-2 bg-yellow-600 text-white rounded-lg">Yes, Publish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
