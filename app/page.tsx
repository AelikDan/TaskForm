import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import KanbanBoard from "./kanban-board";

export default function Home() {
  return <Suspense fallback={<main className="auth-loading">Validando acesso...</main>}><AuthenticatedBoard /></Suspense>;
}

async function AuthenticatedBoard() {
  const user = await getCurrentSession();
  if (!user) {
    redirect("/login");
  }
  return <KanbanBoard user={user} />;
}
