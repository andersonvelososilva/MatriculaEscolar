"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Redireciona automaticamente se já estiver logado
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setLoading(true);
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.role === "admin") {
              router.push("/coordenacao");
            } else {
              router.push("/pai");
            }
          }
        } catch (err) {
          console.error("Erro ao buscar perfil do usuário:", err);
        } finally {
          setLoading(false);
        }
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Por favor, preencha todos os campos.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, "users", credential.user.uid));
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.role === "admin") {
          router.push("/coordenacao");
        } else {
          router.push("/pai");
        }
      } else {
        setError("Perfil de usuário não encontrado no sistema.");
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        setError("E-mail ou senha incorretos.");
      } else {
        setError("Erro ao tentar entrar. Verifique sua conexão.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container animate-fade-in" style={{ justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <div style={{
          width: "80px",
          height: "80px",
          backgroundColor: "var(--primary)",
          borderRadius: "var(--radius-lg)",
          margin: "0 auto 20px auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ffffff",
          fontSize: "32px",
          fontWeight: "bold",
          boxShadow: "var(--shadow-md)"
        }}>
          🏫
        </div>
        <h1 style={{ fontSize: "28px", fontWeight: "700", marginBottom: "8px" }}>Matrícula Escolar</h1>
        <p style={{ color: "var(--secondary)" }}>Entre para gerenciar suas solicitações</p>
      </div>

      <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
            placeholder="Digite sua senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </div>

        <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: "10px" }}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <div style={{ textAlign: "center", marginTop: "30px" }}>
        <p style={{ color: "var(--secondary)", fontSize: "14px" }}>
          Não tem conta?{" "}
          <a href="/cadastro" style={{ color: "var(--primary)", fontWeight: "600", textDecoration: "none" }}>
            Cadastre-se
          </a>
        </p>
      </div>
    </div>
  );
}
