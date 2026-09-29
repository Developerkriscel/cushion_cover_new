import mongoose from "mongoose";

let isConnected = false;

export const connectToDB = async () => {
  mongoose.set("strictQuery", true);

  if (isConnected) {
    console.log("MongoDB is already connected");
    return;
  }

  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      console.log("MONGODB_URI is not defined");
      return;
    }
    
    await mongoose.connect(MONGODB_URI, {
      dbName: "velto_store",
    });

    isConnected = true;
    console.log("MongoDB connected");
  } catch (error) {
    console.log("MongoDB connection failed", error);
  }
};
