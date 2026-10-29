import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { assertAuthConfiguration, createSessionToken, getPublicSession, setSessionCookie } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/user";

export async function POST(request: Request) {
  let body: { name?: unknown; email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo da solicitação inválido." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (name.length < 2 || name.length > 80) return NextResponse.json({ error: "Informe um nome entre 2 e 80 caracteres." }, { status: 400 });
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
  if (password.length < 10 || password.length > 128) return NextResponse.json({ error: "A senha deve ter entre 10 e 128 caracteres." }, { status: 400 });

  try {
    assertAuthConfiguration();
    await connectToDatabase();
    if (await User.exists({ email })) return NextResponse.json({ error: "Não foi possível criar a conta com esses dados." }, { status: 409 });

    const user = await User.create({ name, email, passwordHash: await hash(password, 12), role: "member" });
    const session = getPublicSession({ id: user.id, name: user.name, email: user.email, role: user.role });
    await setSessionCookie(await createSessionToken(session));
    return NextResponse.json({ user: session }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      return NextResponse.json({ error: "Não foi possível criar a conta com esses dados." }, { status: 409 });
    }
    console.error("Registration failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Não foi possível concluir o cadastro. Confira a configuração do servidor." }, { status: 503 });
  }
}