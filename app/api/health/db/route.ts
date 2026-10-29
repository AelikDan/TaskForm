import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET() {
  try {
    await connectToDatabase();
    await mongoose.connection.db?.admin().ping();
    return NextResponse.json({ status: "ok", database: "connected" });
  } catch (error) {
    const notConfigured = error instanceof Error && error.message === "MONGODB_URI is not configured.";
    return NextResponse.json(
      { status: "error", database: "disconnected", message: notConfigured ? "MONGODB_URI não está configurada." : "Não foi possível conectar ao MongoDB." },
      { status: 503 },
    );
  }
}