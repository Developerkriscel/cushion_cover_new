import mongoose from 'mongoose';
import { readFileSync } from 'fs';


const ProductSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  stock: { type: Number, required: true },
  image: { type: String, required: true },
  description: { type: String, required: true },
  material: { type: String, required: true },
  dimensions: { type: String, required: true },
  tag: { type: String, required: true },
  color: { type: String },
  size: { type: String },
  seoTitle: { type: String },
  seoDescription: { type: String }
});

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

const catalogStr = readFileSync('app/catalog.ts', 'utf8');
const initialProductsMatch = catalogStr.match(/export const initialProducts: Product\[\] = (\[[\s\S]*?\]);/);
let initialProducts = [];
if (initialProductsMatch && initialProductsMatch[1]) {
  const jsCode = `(function() { return ${initialProductsMatch[1]}; })()`;
  initialProducts = eval(jsCode);
} else {
  console.log("Could not find initialProducts in catalog.ts");
  process.exit(1);
}

async function seed() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI missing in .env');
  }
  
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'velto_store' });
  console.log('Connected to MongoDB');
  
  for (const p of initialProducts) {
    await Product.findOneAndUpdate({ id: p.id }, p, { upsert: true, new: true });
    console.log(`Upserted ${p.name}`);
  }
  
  console.log('Seed completed successfully');
  process.exit(0);
}

seed().catch(console.error);
