"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  auth,
  db,
  onAuthStateChanged,
  signOut,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
} from "@/lib/firebase";

type Tab = "home" | "classes" | "reservations" | "notifications" | "new-reservation";

export default function PaiDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [loading, setLoading] = useState(true);

  // Firestore Data
  const [classesList, setClassesList] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Form states
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [studentName, setStudentName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Check auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser: any) => {
      if (!currentUser) {
        router.push("/");
        return;
      }

      // Check role
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (userDoc.exists() && userDoc.data().role !== "parent") {
        router.push("/coordenacao");
        return;
      }

      setUser(userDoc.data() || { uid: currentUser.uid, name: "Responsável" });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Firestore Listeners
  useEffect(() => {
    if (!user) return;

    // Listen to Active Classes
    const classesQuery = query(collection(db, "classes"), where("active", "==", true));
    const unsubscribeClasses = onSnapshot(classesQuery, (snapshot: any) => {
      const list = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      setClassesList(list);
    });

    // Listen to parent's reservations
    const reservationsQuery = query(
      collection(db, "reservations"),
      where("parentId", "==", user.uid)
    );
    const unsubscribeReservations = onSnapshot(reservationsQuery, (snapshot: any) => {
      const list = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      // Sort by date local
      list.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setReservations(list);
    });

    // Listen to parent's notifications
    const notificationsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid)
    );
    const unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot: any) => {
      const list = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      list.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setNotifications(list);
    });

    return () => {
      unsubscribeClasses();
      unsubscribeReservations();
      unsubscribeNotifications();
    };
  }, [user]);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/");
  };

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName || !selectedClass) {
      setFormError("Por favor, selecione uma turma e informe o nome do aluno.");
      return;
    }

    setSubmitting(true);
    setFormError("");
    setFormSuccess("");

    try {
      await addDoc(collection(db, "reservations"), {
        parentId: user.uid,
        parentName: user.name,
        studentName,
        classId: selectedClass.id,
        className: selectedClass.name,
        status: "PENDING",
        overCapacity: false,
        rejectionReason: null,
        reviewedBy: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setFormSuccess("Solicitação enviada com sucesso!");
      setStudentName("");
      setTimeout(() => {
        setActiveTab("reservations");
        setFormSuccess("");
      }, 1500);
    } catch (err) {
      console.error(err);
      setFormError("Erro ao registrar solicitação. Será sincronizado offline.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelReservation = async (resId: string) => {
    if (!confirm("Tem certeza que deseja cancelar esta solicitação?")) return;
    try {
      await updateDoc(doc(db, "reservations", resId), {
        status: "CANCELLED",
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error(err);
      alert("Erro ao tentar cancelar a solicitação.");
    }
  };

  const handleMarkAsRead = async (notifId: string) => {
    try {
      await updateDoc(doc(db, "notifications", notifId), {
        read: true,
      });
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <p style={{ fontWeight: "600", color: "var(--secondary)" }}>Carregando painel...</p>
      </div>
    );
  }

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: "80px" }}>
      {/* Top Header */}
      <div className="header" style={{ borderBottom: "1px solid var(--card-border)", paddingBottom: "12px" }}>
        <div>
          <h1 className="header-title" style={{ fontSize: "18px" }}>Olá, {user?.name}</h1>
          <p style={{ fontSize: "12px", color: "var(--secondary)" }}>Perfil Responsável</p>
        </div>
        <button
          onClick={handleSignOut}
          style={{
            background: "none",
            border: "none",
            color: "var(--danger)",
            fontWeight: "600",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          Sair
        </button>
      </div>

      {/* Main Tab Renderings */}
      {activeTab === "home" && (
        <div className="animate-fade-in">
          <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "16px" }}>Início</h2>
          <p style={{ color: "var(--secondary)", marginBottom: "20px", fontSize: "14px" }}>
            Acompanhe o andamento das solicitações de reserva abaixo.
          </p>

          {reservations.length === 0 ? (
            <div style={{
              textAlign: "center",
              padding: "40px 20px",
              backgroundColor: "var(--card)",
              borderRadius: "var(--radius-md)",
              border: "1px dashed var(--card-border)"
            }}>
              <span style={{ fontSize: "36px" }}>📝</span>
              <p style={{ marginTop: "12px", fontWeight: "500", color: "var(--secondary)" }}>Nenhuma solicitação criada ainda.</p>
              <button 
                className="btn btn-outline" 
                onClick={() => setActiveTab("classes")}
                style={{ marginTop: "16px", padding: "10px 20px", fontSize: "14px" }}
              >
                Ver turmas disponíveis
              </button>
            </div>
          ) : (
            reservations.map((res) => (
              <div key={res.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ fontSize: "16px", fontWeight: "600" }}>{res.studentName}</h3>
                    <p style={{ fontSize: "14px", color: "var(--secondary)" }}>{res.className}</p>
                  </div>
                  <span className={`badge badge-${res.status.toLowerCase()}`}>
                    {res.status === "PENDING" && "Pendente"}
                    {res.status === "APPROVED" && "Aprovada"}
                    {res.status === "REJECTED" && "Recusada"}
                    {res.status === "CANCELLED" && "Cancelada"}
                  </span>
                </div>
                {res.status === "REJECTED" && res.rejectionReason && (
                  <div style={{
                    padding: "8px 12px",
                    backgroundColor: "var(--danger-light)",
                    color: "var(--danger)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "13px",
                    marginTop: "4px"
                  }}>
                    <strong>Motivo da recusa:</strong> {res.rejectionReason}
                  </div>
                )}
              </div>
            ))
          )}

          {/* Floating Action Button */}
          <button 
            className="fab" 
            onClick={() => setActiveTab("classes")}
            aria-label="Nova solicitação"
          >
            ➕
          </button>
        </div>
      )}

      {activeTab === "classes" && (
        <div className="animate-fade-in">
          <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "16px" }}>Turmas Disponíveis</h2>
          <p style={{ color: "var(--secondary)", marginBottom: "20px", fontSize: "14px" }}>
            Selecione uma turma abaixo para iniciar a reserva da vaga.
          </p>

          {classesList.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--secondary)", padding: "20px" }}>Não há turmas abertas para matrícula no momento.</p>
          ) : (
            classesList.map((cls) => (
              <div 
                key={cls.id} 
                className="card" 
                style={{ cursor: "pointer" }}
                onClick={() => {
                  setSelectedClass(cls);
                  setActiveTab("new-reservation");
                }}
              >
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: "600", color: "var(--primary)" }}>{cls.name}</h3>
                  <p style={{ fontSize: "14px", color: "var(--secondary)", marginTop: "4px" }}>Turno: {cls.period}</p>
                </div>
                <div style={{ textAlign: "right", fontSize: "12px", color: "var(--primary)", fontWeight: "600" }}>
                  Toque para selecionar →
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "new-reservation" && (
        <div className="animate-fade-in">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <button 
              onClick={() => setActiveTab("classes")} 
              style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--foreground)" }}
            >
              ←
            </button>
            <h2 style={{ fontSize: "20px", fontWeight: "700" }}>Nova Solicitação</h2>
          </div>

          <form onSubmit={handleCreateReservation} className="card">
            {formError && (
              <div style={{ padding: "12px", backgroundColor: "var(--danger-light)", color: "var(--danger)", borderRadius: "var(--radius-sm)", fontSize: "14px" }}>
                {formError}
              </div>
            )}
            {formSuccess && (
              <div style={{ padding: "12px", backgroundColor: "var(--success-light)", color: "var(--success)", borderRadius: "var(--radius-sm)", fontSize: "14px" }}>
                {formSuccess}
              </div>
            )}

            <div style={{ borderBottom: "1px solid var(--card-border)", paddingBottom: "12px", marginBottom: "12px" }}>
              <span className="label">Turma Escolhida</span>
              <p style={{ fontSize: "16px", fontWeight: "600", color: "var(--foreground)", marginTop: "4px" }}>
                {selectedClass?.name} ({selectedClass?.period})
              </p>
            </div>

            <div className="form-group">
              <label className="label" htmlFor="student">Nome do Aluno</label>
              <input
                id="student"
                className="input"
                type="text"
                placeholder="Nome completo do estudante"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                disabled={submitting}
              />
            </div>

            {!navigator.onLine && (
              <p style={{ color: "var(--warning)", fontSize: "13px", fontWeight: "500", marginBottom: "10px" }}>
                ⚠️ Sem conexão. Sua solicitação será salva no dispositivo e enviada automaticamente ao reconectar.
              </p>
            )}

            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? "Enviando..." : "Enviar solicitação"}
            </button>
          </form>
        </div>
      )}

      {activeTab === "reservations" && (
        <div className="animate-fade-in">
          <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "16px" }}>Minhas Solicitações</h2>
          
          {reservations.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--secondary)", padding: "20px" }}>Você ainda não fez nenhuma solicitação.</p>
          ) : (
            reservations.map((res) => (
              <div key={res.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ fontSize: "16px", fontWeight: "600" }}>{res.studentName}</h3>
                    <p style={{ fontSize: "14px", color: "var(--secondary)", marginTop: "2px" }}>{res.className}</p>
                  </div>
                  <span className={`badge badge-${res.status.toLowerCase()}`}>
                    {res.status === "PENDING" && "Pendente"}
                    {res.status === "APPROVED" && "Aprovada"}
                    {res.status === "REJECTED" && "Recusada"}
                    {res.status === "CANCELLED" && "Cancelada"}
                  </span>
                </div>

                {res.status === "REJECTED" && res.rejectionReason && (
                  <div style={{
                    padding: "10px",
                    backgroundColor: "var(--danger-light)",
                    color: "var(--danger)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "13px",
                    border: "1px solid rgba(239, 68, 68, 0.15)"
                  }}>
                    <strong>Motivo da recusa:</strong> {res.rejectionReason}
                  </div>
                )}

                {res.status === "PENDING" && (
                  <button
                    className="btn btn-outline"
                    onClick={() => handleCancelReservation(res.id)}
                    style={{
                      padding: "8px 16px",
                      fontSize: "13px",
                      borderRadius: "var(--radius-sm)",
                      borderColor: "var(--danger)",
                      color: "var(--danger)",
                      marginTop: "10px",
                      width: "fit-content",
                      alignSelf: "flex-end"
                    }}
                  >
                    Cancelar solicitação
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "notifications" && (
        <div className="animate-fade-in">
          <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "16px" }}>Notificações</h2>

          {notifications.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--secondary)", padding: "20px" }}>Nenhuma notificação nova.</p>
          ) : (
            notifications.map((notif) => (
              <div 
                key={notif.id} 
                className="card"
                style={{
                  position: "relative",
                  borderLeft: notif.read ? "1px solid var(--card-border)" : "4px solid var(--primary)"
                }}
                onClick={() => !notif.read && handleMarkAsRead(notif.id)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <h3 style={{ fontSize: "15px", fontWeight: "600" }}>{notif.title}</h3>
                  {!notif.read && (
                    <span style={{
                      width: "8px",
                      height: "8px",
                      backgroundColor: "var(--primary)",
                      borderRadius: "50%"
                    }}></span>
                  )}
                </div>
                <p style={{ fontSize: "14px", color: "var(--secondary)" }}>{notif.body}</p>
                <span style={{ fontSize: "11px", color: "var(--secondary)", alignSelf: "flex-end" }}>
                  {notif.createdAt?.seconds ? new Date(notif.createdAt.seconds * 1000).toLocaleDateString() : ""}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Persistent Bottom Tab Bar */}
      <div className="bottom-nav">
        <button 
          onClick={() => setActiveTab("home")} 
          className={`nav-item ${activeTab === "home" ? "nav-item-active" : ""}`}
          style={{ background: "none", border: "none", cursor: "pointer" }}
        >
          <span>🏠</span>
          Início
        </button>
        <button 
          onClick={() => setActiveTab("classes")} 
          className={`nav-item ${activeTab === "classes" || activeTab === "new-reservation" ? "nav-item-active" : ""}`}
          style={{ background: "none", border: "none", cursor: "pointer" }}
        >
          <span>📚</span>
          Turmas
        </button>
        <button 
          onClick={() => setActiveTab("reservations")} 
          className={`nav-item ${activeTab === "reservations" ? "nav-item-active" : ""}`}
          style={{ background: "none", border: "none", cursor: "pointer" }}
        >
          <span>📄</span>
          Solicitações
        </button>
        <button 
          onClick={() => setActiveTab("notifications")} 
          className={`nav-item ${activeTab === "notifications" ? "nav-item-active" : ""}`}
          style={{ background: "none", border: "none", cursor: "pointer", position: "relative" }}
        >
          <span>🔔</span>
          Notificações
          {unreadNotificationsCount > 0 && (
            <span style={{
              position: "absolute",
              top: "4px",
              right: "20px",
              backgroundColor: "var(--primary)",
              color: "#ffffff",
              fontSize: "10px",
              fontWeight: "bold",
              borderRadius: "50%",
              width: "16px",
              height: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              {unreadNotificationsCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
