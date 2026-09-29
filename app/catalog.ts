export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  image: string;
  description: string;
  material: string;
  dimensions: string;
  tag: string;
  color?: string;
  size?: string;
  seoTitle?: string;
  seoDescription?: string;
  imageSwitchTime?: number;
};
export const initialProducts: Product[] = [
  {
    id: "cushion-marigold",
    color: "Yellow",
    size: "40 × 40 cm",
    name: "Marigold Morning Cushion Cover",
    category: "Cushion covers",
    price: 795,
    stock: 20,
    image: "/marigold.png",
    description: "Brighten up your living space with this vibrant yellow cushion cover. The marigold hue adds a touch of warmth and energy to any room.",
    material: "100% Cotton",
    dimensions: "40 × 40 cm",
    tag: "NEW"
  },
  {
    id: "cushion-dancing-cranes",
    color: "Multi",
    size: "45 × 45 cm",
    name: "Dancing Cranes Cushion Cover",
    category: "Cushion covers",
    price: 950,
    stock: 15,
    image: "/cranes.png",
    description: "An elegant cushion cover featuring a subtle dancing cranes motif. Adds a sophisticated touch to neutral sofas.",
    material: "Linen Blend",
    dimensions: "45 × 45 cm",
    tag: "BESTSELLER"
  },
  {
    id: "apron-everyday-linen",
    color: "Oatmeal",
    size: "One Size",
    name: "Everyday Linen Apron",
    category: "Aprons",
    price: 1250,
    stock: 30,
    image: "/apron.png",
    description: "A durable, lightweight linen apron perfect for daily kitchen tasks. Features a deep pocket for utensils.",
    material: "100% Linen",
    dimensions: "80 cm length, adjustable neck",
    tag: "ESSENTIAL"
  },
  {
    id: "cushion-terra-stripe",
    color: "Terracotta",
    size: "50 × 50 cm",
    name: "Terra Stripe Cushion Cover",
    category: "Cushion covers",
    price: 850,
    stock: 25,
    image: "/terracotta_cushion.jpg",
    description: "Earthy terracotta stripes on a textured background. A cozy addition to armchairs and reading nooks.",
    material: "Cotton Canvas",
    dimensions: "50 × 50 cm",
    tag: ""
  },
  {
    id: "table-cover-sunday-linen",
    color: "Natural",
    size: "150 × 220 cm",
    name: "Sunday Linen Table Cover",
    category: "Table covers",
    price: 2400,
    stock: 10,
    image: "/table-cover.png",
    description: "A classic natural linen table cover that drapes beautifully. Ideal for family gatherings and Sunday brunches.",
    material: "100% Linen",
    dimensions: "150 × 220 cm",
    tag: "PREMIUM"
  },
  {
    id: "cushion-vintage-floral",
    color: "Blue",
    size: "40 × 40 cm",
    name: "Vintage Blue Floral Cushion Cover",
    category: "Cushion covers",
    price: 890,
    stock: 18,
    image: "/blue_floral_cushion.jpg",
    description: "Delicate vintage-inspired blue floral pattern. Brings a touch of classic charm to your decor.",
    material: "Cotton Blend",
    dimensions: "40 × 40 cm",
    tag: ""
  },
  {
    id: "apron-chef-denim",
    color: "Indigo",
    size: "One Size",
    name: "Chef's Denim Apron",
    category: "Aprons",
    price: 1450,
    stock: 22,
    image: "/denim_apron.jpg",
    description: "Heavy-duty denim apron for the serious home cook. Includes multiple pockets and sturdy brass hardware.",
    material: "100% Cotton Denim",
    dimensions: "85 cm length, adjustable cross-back straps",
    tag: "NEW"
  },
  {
    id: "table-cover-heritage-floral",
    color: "Multi",
    size: "140 × 180 cm",
    name: "Heritage Floral Table Cover",
    category: "Table covers",
    price: 1850,
    stock: 12,
    image: "/floral_table_cover.jpg",
    description: "A vibrant floral table cover inspired by traditional heritage prints. Instantly brightens up your dining area.",
    material: "Cotton Canvas",
    dimensions: "140 × 180 cm",
    tag: ""
  },
  {
    id: "table-cover-classic-white-lace",
    color: "White",
    size: "160 × 240 cm",
    name: "Classic White Lace Table Cover",
    category: "Table covers",
    price: 2900,
    stock: 8,
    image: "/white_lace_table_cover.jpg",
    description: "An exquisite white table cover featuring intricate lace details. Perfect for elegant dinners and special occasions.",
    material: "Cotton with Lace Trim",
    dimensions: "160 × 240 cm",
    tag: "LUXURY"
  },
  {
    id: "cushion-minimalist-geo",
    color: "Monochrome",
    size: "45 × 45 cm",
    name: "Minimalist Geometric Cushion Cover",
    category: "Cushion covers",
    price: 750,
    stock: 35,
    image: "/beige_geometric_cushion.jpg",
    description: "Clean lines and a bold monochrome pattern. A modern accent for contemporary living spaces.",
    material: "Cotton Canvas",
    dimensions: "45 × 45 cm",
    tag: "BESTSELLER"
  },
  {
    id: "cushion-vibrant-linen",
    color: "Mustard",
    size: "50 × 50 cm",
    name: "Vibrant Linen Cushion Cover",
    category: "Cushion covers",
    price: 1100,
    stock: 14,
    image: "/mustard_cushion.jpg",
    description: "Rich mustard yellow linen that adds a warm pop of color. Soft, breathable, and timeless.",
    material: "100% Linen",
    dimensions: "50 × 50 cm",
    tag: ""
  },
  {
    id: "apron-classic-baker",
    color: "White",
    size: "One Size",
    name: "Classic Baker's Canvas Apron",
    category: "Aprons",
    price: 950,
    stock: 40,
    image: "/white_bakers_apron.jpg",
    description: "A simple, classic white canvas apron. Easy to wash and perfect for baking days.",
    material: "Cotton Canvas",
    dimensions: "75 cm length, fixed neck loop",
    tag: "ESSENTIAL"
  },
  {
    id: "table-cover-sophisticated-linen",
    color: "Charcoal",
    size: "150 × 220 cm",
    name: "Sophisticated Linen Table Cover",
    category: "Table covers",
    price: 2600,
    stock: 9,
    image: "/charcoal_table_cover.jpg",
    description: "Deep charcoal linen for a dramatic, modern table setting. Beautifully contrasts with white dinnerware.",
    material: "100% Linen",
    dimensions: "150 × 220 cm",
    tag: ""
  },
  {
    id: "cushion-sage-velvet",
    name: "Lush Sage Velvet Cushion Cover",
    category: "Cushion covers",
    price: 1250,
    stock: 15,
    image: "/sage_velvet_cushion.jpg",
    description: "Luxuriously soft sage green velvet cushion cover. Adds instant texture and elegance to any sofa.",
    material: "Premium Velvet",
    dimensions: "45 × 45 cm",
    tag: "LUXURY",
    color: "Sage Green",
    size: "45 × 45 cm"
  },
  {
    id: "apron-bistro-stripe",
    name: "Bistro Striped Apron",
    category: "Aprons",
    price: 1100,
    stock: 25,
    image: "/striped_apron.jpg",
    description: "Classic French bistro-inspired striped apron. Durable and stylish for serious home cooks.",
    material: "Heavyweight Cotton",
    dimensions: "85 cm length",
    tag: "BESTSELLER",
    color: "Navy/White",
    size: "One Size"
  },
  {
    id: "table-cover-picnic-check",
    name: "Picnic Checkered Table Cover",
    category: "Table covers",
    price: 1650,
    stock: 12,
    image: "/checkered_table_cover.jpg",
    description: "Red and white checkered table cover, perfect for outdoor dining or bringing a cheerful vibe indoors.",
    material: "Cotton Blend",
    dimensions: "140 × 200 cm",
    tag: "SUMMER",
    color: "Red/White",
    size: "140 × 200 cm"
  }
];
export const money = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
