import mongoose from "mongoose";
import { env } from "../config/env.js";

let connected = false;

export async function connectDb(): Promise<void> {
  if (connected) return;
  if (!env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not set — required to run the API server (not required for `npm run evaluate`).");
  }
  await mongoose.connect(env.MONGODB_URI);
  connected = true;
}
