export interface MenuItem {
  id: string;
  name: string;
  ingredients: string;
  unitSize: string;
  abv: number;
  price: number;
  imageUrl: string;
  category: string;
  inStock: boolean;
  createdAt: Date;
}

export const sampleMenuItems: MenuItem[] = [
  {
    id: "1",
    name: "Premium Red Wine",
    ingredients: "Cabernet Sauvignon grapes, oak barrel aged",
    unitSize: "750 ml",
    abv: 13.5,
    price: 29.99,
    imageUrl: "",
    category: "wine",
    inStock: true,
    createdAt: new Date(),
  },
  {
    id: "2",
    name: "Craft IPA Beer",
    ingredients: "Malted barley, hops, yeast, water",
    unitSize: "330 ml",
    abv: 6.2,
    price: 12.99,
    imageUrl: "",
    category: "beer",
    inStock: true,
    createdAt: new Date(),
  },
  {
    id: "3",
    name: "Premium Vodka",
    ingredients: "Distilled grain, triple filtered",
    unitSize: "750 ml",
    abv: 40.0,
    price: 45.99,
    imageUrl: "",
    category: "spirits",
    inStock: true,
    createdAt: new Date(),
  },
  {
    id: "4",
    name: "Whiskey Collection",
    ingredients: "Aged corn, rye, barley, oak barrel",
    unitSize: "750 ml",
    abv: 43.0,
    price: 125.99,
    imageUrl: "",
    category: "spirits",
    inStock: true,
    createdAt: new Date(),
  },
  {
    id: "5",
    name: "Champagne Brut",
    ingredients: "Chardonnay, Pinot Noir, Pinot Meunier grapes",
    unitSize: "750 ml",
    abv: 12.0,
    price: 65.99,
    imageUrl: "",
    category: "wine",
    inStock: true,
    createdAt: new Date(),
  },
  {
    id: "6",
    name: "Gin & Tonic Mix",
    ingredients: "Premium gin, tonic water, lime",
    unitSize: "1 L",
    abv: 37.5,
    price: 34.99,
    imageUrl: "",
    category: "cocktails",
    inStock: true,
    createdAt: new Date(),
  },
  {
    id: "7",
    name: "Margarita Mix",
    ingredients: "Tequila, triple sec, lime juice, agave",
    unitSize: "750 ml",
    abv: 15.0,
    price: 42.99,
    imageUrl: "",
    category: "cocktails",
    inStock: true,
    createdAt: new Date(),
  },
  {
    id: "8",
    name: "Cocktail Mixer Set",
    ingredients: "Various mixers, syrups, and garnishes",
    unitSize: "1 serving",
    abv: 0.0,
    price: 89.99,
    imageUrl: "",
    category: "mixers",
    inStock: true,
    createdAt: new Date(),
  },
];

export const populateLiveMenu = () => {
  localStorage.setItem('menuItems', JSON.stringify(sampleMenuItems));
  console.log('Sample menu items added to live menu!');
}; 