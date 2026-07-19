"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db, createUserWithEmailAndPassword, doc, setDoc, serverTimestamp } from "@/lib/firebase";

export default function Cadastro() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError("Por favor, preencha todos os campos.");
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Cria o documento do usuário no Firestore com a role de pai
      await setDoc(doc(db, "users", credential.user.uid), {
        uid: credential.user.uid,
        name,
        email,
        role: "parent",
        createdAt: serverTimestamp(),
      });

      router.push("/pai");
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        setError("Este e-mail já está cadastrado.");
      } else {
        setError("Erro ao criar conta. Verifique sua conexão.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container animate-fade-in">
      <div className="header" style={{ marginBottom: "30px" }}>
        <button 
          onClick={() => router.push("/")}
          style={{
            background: "none",
            border: "none",
            fontSize: "24px",
            cursor: "pointer",
            color: "var(--foreground)"
          }}
          aria-label="Voltar"
        >
          ←
        </button>
        <span style={{ fontSize: "18px", fontWeight: "600" }}>Criar conta</span>
        <div style={{ width: "24px" }}></div> {/* Espaçador */}
      </div>

      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "8px" }}>Cadastro de Responsável</h1>
        <p style={{ color: "var(--secondary)" }}>Crie sua conta para solicitar matrículas escolares</p>
      </div>

      <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {error && (
          <div style={{
            padding: "12px",
            backgroundColor: "var(--danger-light)",
            color: "var(--danger)",
            borderRadius: "var(--radius-sm)",
            fontSize: "14px",
            fontWeight: "500",
            border: "1px solid rgba(239, 68, 68, 0.2)"
          }}>
            {error}
          </div>
        )}

        <div className="form-group">
          <label className="label" htmlFor="name">Nome Completo</label>
          <input
            className="input"
            type="text"
            id="name"
            placeholder="Seu nome completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label className="label" htmlFor="email">E-mail</label>
          <input
            className="input"
            type="email"
            id="email"
            placeholder="seuemail@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label className="label" htmlFor="password">Senha</label>
          <input
            className="input"
            type="password"
            id="password"
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </div>

        <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: "10px" }}>
          {loading ? "Criando conta..." : "Criar conta"}
        </button>
      </form>
    </div>
  );
}
