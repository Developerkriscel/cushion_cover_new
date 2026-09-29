import mongoose from "mongoose";

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

const Product = mongoose.models.Product || mongoose.model("Product", ProductSchema);

export default Product;
