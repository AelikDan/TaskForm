"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/auth/${isRegister ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(isRegister ? { name } : {}), email, password }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Não foi possível autenticar. Tente novamente.");
        return;
      }
      router.replace("/");
    } catch {
      setError("Não foi possível conectar ao servidor. Verifique sua conexão.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-decoration auth-decoration-one" />
      <div className="auth-decoration auth-decoration-two" />
      <Link className="auth-brand" href="/" aria-label="taskform início"><span className="auth-brand-mark">t</span><span>taskform<span>.</span></span></Link>
      <section className="auth-layout">
        <div className="auth-copy">
          <span className="auth-eyebrow">DEV SOLUTIONS · WORKSPACE</span>
          <h1>Boas ideias<br />merecem <em>ritmo.</em></h1>
          <p>Seu time, seus projetos e cada próximo passo no mesmo lugar.</p>
          <div className="auth-preview" aria-hidden="true">
            <div className="preview-top"><span /><span /><span /><i>Identidade Studio Noma</i></div>
            <div className="preview-columns"><div><b /> <span /><span /></div><div><b /> <span /><span /></div><div><b /> <span /><span /></div></div>
            <div className="preview-stamp">DS<span>✳</span></div>
          </div>
        </div>
        <div className="auth-form-panel">
          <div className="auth-tabs" role="tablist" aria-label="Acesso à conta">
            <button type="button" role="tab" aria-selected={!isRegister} className={!isRegister ? "selected" : ""} onClick={() => { setIsRegister(false); setError(""); }}>Entrar</button>
            <button type="button" role="tab" aria-selected={isRegister} className={isRegister ? "selected" : ""} onClick={() => { setIsRegister(true); setError(""); }}>Criar conta</button>
          </div>
          <div className="auth-heading"><span>{isRegister ? "COMECE POR AQUI" : "BEM-VINDA DE VOLTA"}</span><h2>{isRegister ? "Crie seu acesso" : "Acesse seu workspace"}</h2><p>{isRegister ? "Entre para organizar o trabalho do seu time." : "Entre com seus dados para continuar."}</p></div>
          <form className="auth-form" onSubmit={handleSubmit}>
            {isRegister && <label className="auth-field"><span>Nome</span><input autoComplete="name" required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Seu nome" /></label>}
            <label className="auth-field"><span>E-mail</span><input type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@empresa.com" /></label>
            <label className="auth-field"><span>Senha</span><input type="password" autoComplete={isRegister ? "new-password" : "current-password"} required minLength={isRegister ? 10 : 1} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isRegister ? "Pelo menos 10 caracteres" : "Sua senha"} /></label>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? "Aguarde..." : isRegister ? "Criar conta" : "Entrar no workspace"}<span aria-hidden="true">↗</span></button>
          </form>
          <p className="auth-footnote">Acesso protegido. Suas credenciais são armazenadas com segurança.</p>
        </div>
      </section>
      <footer className="auth-footer"><span>© 2026 DevSolutions</span><span>Feito para times que fazem acontecer.</span></footer>
    </main>
  );
}