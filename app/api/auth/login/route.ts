import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { assertAuthConfiguration, createSessionToken, getPublicSession, setSessionCookie } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/user";

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo da solicitação inválido." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password || email.length > 254 || password.length > 128) {
    return NextResponse.json({ error: "E-mail ou senha inválidos." }, { status: 400 });
  }

  try {
    assertAuthConfiguration();
    await connectToDatabase();
    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user || !(await compare(password, user.passwordHash))) {
      return NextResponse.json({ error: "E-mail ou senha inválidos." }, { status: 401 });
    }

    const session = getPublicSession({ id: user.id, name: user.name, email: user.email, role: user.role });
    await setSessionCookie(await createSessionToken(session));
    return NextResponse.json({ user: session });
  } catch (error) {
    console.error("Login failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Não foi possível entrar. Confira a configuração do servidor." }, { status: 503 });
  }
}