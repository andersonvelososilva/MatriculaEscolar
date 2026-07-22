"use client";

import { useState, useEffect, useRef } from "react";
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
  setDoc,
  addDoc,
  updateDoc,
  runTransaction,
  serverTimestamp,
} from "@/lib/firebase";

type Tab = "home" | "classes" | "pending" | "period";

export default function CoordenacaoDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [loading, setLoading] = useState(true);

  // Firestore Data
  const [classesList, setClassesList] = useState<any[]>([]);
  const [pendingReservations, setPendingReservations] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allReservations, setAllReservations] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({ startDate: "", endDate: "", announced: false });
  const [sendingNotification, setSendingNotification] = useState(false);

  const [mountTime] = useState(() => Date.now());
  const notifiedResIds = useRef<Set<string>>(new Set());

  // Solicitar permissão de notificação no carregamento do painel
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  // Monitorar novas solicitações pendentes e exibir notificações
  useEffect(() => {
    if (pendingReservations.length === 0) return;

    pendingReservations.forEach((res) => {
      const resTime = res.createdAt?.seconds ? res.createdAt.seconds * 1000 : Date.now();
      
      // Se a solicitação foi criada depois do carregamento da página E ainda não notificamos
      if (resTime > mountTime - 10000 && !notifiedResIds.current.has(res.id)) {
        notifiedResIds.current.add(res.id);
        
        // Disparar notificação nativa
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          const title = "Nova Solicitação de Matrícula";
          const body = `O aluno ${res.studentName} solicitou vaga na turma ${res.className}.`;
          
          if ("serviceWorker" in navigator) {
            navigator.serviceWorker.ready.then((reg) => {
              reg.showNotification(title, {
                body,
                icon: "/icons/icon-192.png",
                vibrate: [200, 100, 200],
                badge: "/icons/icon-192.png",
              } as any);
            }).catch(() => {
              new Notification(title, { body, icon: "/icons/icon-192.png" });
            });
          } else {
            new Notification(title, { body, icon: "/icons/icon-192.png" });
          }
        }
      } else {
        // Registrar as já existentes para evitar notificação retroativa
        notifiedResIds.current.add(res.id);
      }
    });
  }, [pendingReservations, mountTime]);


  // Class Form State (New / Edit)
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [className, setClassName] = useState("");
  const [classPeriod, setClassPeriod] = useState("Manhã");
  const [classTotalSpots, setClassTotalSpots] = useState(30);
  const [classActive, setClassActive] = useState(true);

  // Rejection State
  const [rejectingResId, setRejectingResId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Check auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser: any) => {
      if (!currentUser) {
        router.push("/");
        return;
      }

      // Check role
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (userDoc.exists() && userDoc.data().role !== "admin") {
        router.push("/pai");
        return;
      }

      setUser(userDoc.data() || { uid: currentUser.uid, name: "Coordenação" });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Firestore Listeners
  useEffect(() => {
    if (!user) return;

    // Listen to all classes
    const unsubscribeClasses = onSnapshot(collection(db, "classes"), (snapshot: any) => {
      const list = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      setClassesList(list);
    });

    // Listen to pending reservations (ordered oldest first)
    const pendingQuery = query(collection(db, "reservations"), where("status", "==", "PENDING"));
    const unsubscribePending = onSnapshot(pendingQuery, (snapshot: any) => {
      const list = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      list.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeA - timeB;
      });
      setPendingReservations(list);
    });

    // Listen to settings/enrollmentPeriod doc
    const unsubscribeSettings = onSnapshot(doc(db, "settings", "enrollmentPeriod"), (snapshot: any) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setSettings({
          startDate: data.startDate ? new Date(data.startDate.seconds * 1000).toISOString().split("T")[0] : "",
          endDate: data.endDate ? new Date(data.endDate.seconds * 1000).toISOString().split("T")[0] : "",
          announced: data.announced || false,
        });
      }
    });

    // Listen to all users (for bulk notifications target identification)
    const unsubscribeUsers = onSnapshot(collection(db, "users"), (snapshot: any) => {
      const list = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      setAllUsers(list);
    });

    // Listen to all reservations (to identify who has not registered yet)
    const unsubscribeAllReservations = onSnapshot(collection(db, "reservations"), (snapshot: any) => {
      const list = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      setAllReservations(list);
    });

    return () => {
      unsubscribeClasses();
      unsubscribePending();
      unsubscribeSettings();
      unsubscribeUsers();
      unsubscribeAllReservations();
    };
  }, [user]);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/");
  };

  // Class Actions
  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className) return;

    try {
      const classData = {
        name: className,
        period: classPeriod,
        totalSpots: Number(classTotalSpots),
        active: classActive,
      };

      if (editingClass) {
        // Edit existing class
        await updateDoc(doc(db, "classes", editingClass.id), classData);
      } else {
        // Create new class
        await addDoc(collection(db, "classes"), {
          ...classData,
          occupiedSpots: 0,
          createdAt: serverTimestamp(),
        });
      }

      // Reset form
      setClassName("");
      setClassPeriod("Manhã");
      setClassTotalSpots(30);
      setClassActive(true);
      setEditingClass(null);
      setIsClassModalOpen(false);
    } catch (err) {
      console.error("Erro ao salvar turma:", err);
      alert("Erro ao salvar dados da turma.");
    }
  };

  const handleEditClassClick = (cls: any) => {
    setEditingClass(cls);
    setClassName(cls.name);
    setClassPeriod(cls.period);
    setClassTotalSpots(cls.totalSpots);
    setClassActive(cls.active);
    setIsClassModalOpen(true);
  };

  // Approval/Rejection Actions
  const handleApprove = async (res: any) => {
    try {
      await runTransaction(db, async (transaction: any) => {
        const classRef = doc(db, "classes", res.classId);
        const resRef = doc(db, "reservations", res.id);

        const classDoc = await transaction.get(classRef);
        if (!classDoc.exists()) {
          throw new Error("Turma não existe.");
        }

        const classData = classDoc.data();
        const currentOccupied = classData.occupiedSpots || 0;
        const total = classData.totalSpots || 0;

        // Check capacity
        const isOverCapacity = currentOccupied >= total;

        // Increment spots
        transaction.update(classRef, {
          occupiedSpots: currentOccupied + 1,
        });

        // Approve reservation
        transaction.update(resRef, {
          status: "APPROVED",
          overCapacity: isOverCapacity,
          reviewedBy: user.uid,
          updatedAt: serverTimestamp(),
        });

        // Add Notification
        const notificationRef = doc(db, "notifications", "notif-" + Math.random().toString(36).substring(2, 9));
        transaction.set(notificationRef, {
          userId: res.parentId,
          title: "Reserva de Matrícula Aprovada!",
          body: `A solicitação para o aluno ${res.studentName} na turma ${res.className} foi aprovada.`,
          type: "APPROVED",
          reservationId: res.id,
          read: false,
          createdAt: serverTimestamp(),
        });
      });
    } catch (err) {
      console.error("Erro na aprovação:", err);
      alert("Erro ao aprovar solicitação.");
    }
  };

  const handleConfirmRejection = async () => {
    if (!rejectingResId || !rejectionReason.trim()) return;

    try {
      const res = pendingReservations.find((r: any) => r.id === rejectingResId);
      if (!res) return;

      const resRef = doc(db, "reservations", res.id);

      // Update reservation to rejected
      await updateDoc(resRef, {
        status: "REJECTED",
        rejectionReason: rejectionReason.trim(),
        reviewedBy: user.uid,
        updatedAt: serverTimestamp(),
      });

      // Add Notification
      await addDoc(collection(db, "notifications"), {
        userId: res.parentId,
        title: "Reserva de Matrícula Recusada",
        body: `A solicitação para o aluno ${res.studentName} foi recusada pelo motivo: ${rejectionReason.trim()}`,
        type: "REJECTED",
        reservationId: res.id,
        read: false,
        createdAt: serverTimestamp(),
      });

      setRejectingResId(null);
      setRejectionReason("");
    } catch (err) {
      console.error("Erro na recusa:", err);
      alert("Erro ao recusar solicitação.");
    }
  };

  // Period Settings Actions
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings.startDate || !settings.endDate) {
      alert("Defina as datas de início e fim.");
      return;
    }

    try {
      await setDoc(doc(db, "settings", "enrollmentPeriod"), {
        startDate: new Date(settings.startDate),
        endDate: new Date(settings.endDate),
        announced: settings.announced,
      });

      // Helper para formatar data yyyy-mm-dd para dd/mm/yyyy
      const formatDateBr = (dateStr: string) => {
        if (!dateStr) return "";
        const parts = dateStr.split("-");
        return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr;
      };

      const startBr = formatDateBr(settings.startDate);
      const endBr = formatDateBr(settings.endDate);

      // Obter todos os responsáveis cadastrados
      const parents = allUsers.filter((u: any) => u.role === "parent");

      // Enviar notificação de alteração para cada pai no banco
      for (const parent of parents) {
        const parentId = parent.uid || parent.id;
        await addDoc(collection(db, "notifications"), {
          userId: parentId,
          title: "⚠️ Período de matrícula alterado",
          body: `Atenção: O novo período de matrícula foi definido de ${startBr} a ${endBr}.`,
          type: "PERIOD_CHANGED",
          read: false,
          createdAt: serverTimestamp(),
        });
      }

      alert("Configurações salvas e todos os responsáveis notificados com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar configurações e notificar:", err);
      alert("Erro ao salvar período.");
    }
  };

  // Envio de Notificações em Massa
  const handleSendBulkNotification = async (type: string) => {
    let title = "";
    let body = "";
    let target: "all" | "no-reservation" = "all";

    switch (type) {
      case "closing":
        title = "⚠️ Matrículas se Encerrando!";
        body = "O prazo para realizar a matrícula está chegando ao fim. Garanta a vaga do seu filho o quanto antes!";
        target = "all";
        break;
      case "remind-signup":
        title = "📝 Lembrete: Faça a Matrícula";
        body = "Identificamos que você ainda não cadastrou a matrícula do seu filho. Acesse o app para concluir.";
        target = "no-reservation";
        break;
      case "classes-soon":
        title = "🎒 Aulas Começando em Breve!";
        body = "As aulas começarão em breve! Lembre-se de regularizar a matrícula do seu filho para garantir tudo pronto.";
        target = "all";
        break;
      case "check-status":
        title = "🔍 Situação da Matrícula";
        body = "Acesse o aplicativo para verificar se você já visualizou e regularizou a situação da matrícula do seu filho.";
        target = "all";
        break;
      default:
        return;
    }

    const parents = allUsers.filter((u: any) => u.role === "parent");
    let targetParents = parents;

    if (target === "no-reservation") {
      targetParents = parents.filter((p: any) => {
        const pId = p.uid || p.id;
        const hasRes = allReservations.some((r: any) => r.parentId === pId);
        return !hasRes;
      });
    }

    if (targetParents.length === 0) {
      alert("Nenhum responsável elegível encontrado para esta notificação.");
      return;
    }

    if (!confirm(`Deseja enviar esta notificação para ${targetParents.length} responsável(eis)?\n\nTítulo: ${title}\nMensagem: ${body}`)) {
      return;
    }

    setSendingNotification(true);
    try {
      for (const parent of targetParents) {
        const parentId = parent.uid || parent.id;
        await addDoc(collection(db, "notifications"), {
          userId: parentId,
          title,
          body,
          type: "SYSTEM_ALERT",
          read: false,
          createdAt: serverTimestamp(),
        });
      }
      alert("Notificações enviadas com sucesso!");
    } catch (err) {
      console.error("Erro ao enviar notificações em massa:", err);
      alert("Erro ao enviar notificações.");
    } finally {
      setSendingNotification(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flex: 1, alignItems: "center", justifySelf: "center", justifyContent: "center", minHeight: "100vh" }}>
        <p style={{ fontWeight: "600", color: "var(--secondary)" }}>Carregando painel...</p>
      </div>
    );
  }

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: "80px" }}>
      {/* Top Header */}
      <div className="header" style={{ borderBottom: "1px solid var(--card-border)", paddingBottom: "12px" }}>
        <div>
          <h1 className="header-title" style={{ fontSize: "18px" }}>Olá, {user?.name}</h1>
          <p style={{ fontSize: "12px", color: "var(--secondary)" }}>Perfil Coordenação</p>
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
          <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "16px" }}>Painel</h2>
          <p style={{ color: "var(--secondary)", marginBottom: "20px", fontSize: "14px" }}>
            Existem {pendingReservations.length} solicitações de matrícula aguardando revisão.
          </p>

          {pendingReservations.length === 0 ? (
            <div style={{
              textAlign: "center",
              padding: "40px 20px",
              backgroundColor: "var(--card)",
              borderRadius: "var(--radius-md)",
              border: "1px dashed var(--card-border)"
            }}>
              <span style={{ fontSize: "36px" }}>🎉</span>
              <p style={{ marginTop: "12px", fontWeight: "500", color: "var(--success)" }}>Nenhuma solicitação pendente!</p>
            </div>
          ) : (
            pendingReservations.map((res) => (
              <div 
                key={res.id} 
                className="card"
                style={{ cursor: "pointer" }}
                onClick={() => setActiveTab("pending")}
              >
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: "600" }}>{res.studentName}</h3>
                  <p style={{ fontSize: "14px", color: "var(--secondary)", marginTop: "2px" }}>
                    Turma: {res.className}
                  </p>
                  <p style={{ fontSize: "12px", color: "var(--secondary)" }}>
                    Responsável: {res.parentName}
                  </p>
                </div>
                <div style={{ color: "var(--primary)", fontSize: "12px", fontWeight: "600", textAlign: "right" }}>
                  Toque para gerenciar →
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "classes" && (
        <div className="animate-fade-in">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "700" }}>Gestão de Turmas</h2>
          </div>

          {isClassModalOpen ? (
            <form onSubmit={handleSaveClass} className="card">
              <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "12px" }}>
                {editingClass ? "Editar Turma" : "Nova Turma"}
              </h3>

              <div className="form-group">
                <label className="label">Nome da Turma</label>
                <input 
                  type="text" 
                  className="input" 
                  value={className} 
                  onChange={(e) => setClassName(e.target.value)} 
                  placeholder="Ex: 1º Ano A" 
                  required
                />
              </div>

              <div className="form-group">
                <label className="label">Período / Turno</label>
                <select 
                  className="input" 
                  value={classPeriod} 
                  onChange={(e) => setClassPeriod(e.target.value)}
                >
                  <option value="Manhã">Manhã</option>
                  <option value="Tarde">Tarde</option>
                  <option value="Integral">Integral</option>
                </select>
              </div>

              <div className="form-group">
                <label className="label">Total de Vagas</label>
                <input 
                  type="number" 
                  className="input" 
                  value={classTotalSpots} 
                  onChange={(e) => setClassTotalSpots(Number(e.target.value))} 
                  min={1} 
                  required
                />
              </div>

              <div className="form-group" style={{ flexDirection: "row", alignItems: "center", gap: "10px" }}>
                <input 
                  type="checkbox" 
                  id="classActive"
                  checked={classActive} 
                  onChange={(e) => setClassActive(e.target.checked)} 
                  style={{ width: "20px", height: "20px" }}
                />
                <label className="label" htmlFor="classActive">Turma Ativa (permite solicitações)</label>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Salvar</button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ flex: 1 }}
                  onClick={() => setIsClassModalOpen(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            classesList.map((cls) => (
              <div 
                key={cls.id} 
                className="card"
                style={{ borderLeft: cls.active ? "4px solid var(--success)" : "4px solid var(--secondary)" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ fontSize: "16px", fontWeight: "600" }}>{cls.name}</h3>
                    <p style={{ fontSize: "14px", color: "var(--secondary)", marginTop: "2px" }}>
                      Turno: {cls.period} | Vagas: {cls.occupiedSpots || 0} / {cls.totalSpots}
                    </p>
                  </div>
                  <span className={`badge ${cls.active ? "badge-approved" : "badge-cancelled"}`}>
                    {cls.active ? "Ativa" : "Inativa"}
                  </span>
                </div>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => handleEditClassClick(cls)}
                  style={{ alignSelf: "flex-end", width: "fit-content", padding: "8px 16px", fontSize: "13px" }}
                >
                  Editar Turma
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "pending" && (
        <div className="animate-fade-in">
          <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "16px" }}>Solicitações Pendentes</h2>

          {pendingReservations.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--secondary)", padding: "20px" }}>Não há solicitações pendentes no momento.</p>
          ) : (
            pendingReservations.map((res) => (
              <div key={res.id} className="card">
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: "600" }}>{res.studentName}</h3>
                  <p style={{ fontSize: "14px", color: "var(--foreground)", marginTop: "4px" }}>
                    Turma solicitada: <strong>{res.className}</strong>
                  </p>
                  <p style={{ fontSize: "13px", color: "var(--secondary)" }}>
                    Responsável: {res.parentName}
                  </p>
                </div>

                {rejectingResId === res.id ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
                    <label className="label">Motivo da Recusa (Obrigatório)</label>
                    <textarea 
                      className="input" 
                      rows={3} 
                      value={rejectionReason} 
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Informe o motivo da recusa..."
                    />
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button 
                        className="btn btn-primary" 
                        disabled={!rejectionReason.trim()}
                        onClick={handleConfirmRejection}
                        style={{ backgroundColor: "var(--danger)" }}
                      >
                        Confirmar recusa
                      </button>
                      <button 
                        className="btn btn-secondary"
                        onClick={() => setRejectingResId(null)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                    <button 
                      className="btn btn-primary" 
                      onClick={() => handleApprove(res)}
                      style={{ flex: 1 }}
                    >
                      Aprovar
                    </button>
                    <button 
                      className="btn btn-outline" 
                      onClick={() => {
                        setRejectingResId(res.id);
                        setRejectionReason("");
                      }}
                      style={{ flex: 1, color: "var(--danger)", borderColor: "var(--danger)" }}
                    >
                      Recusar
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "period" && (
        <div className="animate-fade-in">
          <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "16px" }}>Período de Matrícula</h2>

          <form onSubmit={handleSaveSettings} className="card">
            <div className="form-group">
              <label className="label">Data de Início</label>
              <input 
                type="date" 
                className="input"
                value={settings.startDate}
                onChange={(e) => setSettings({ ...settings, startDate: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="label">Data de Término</label>
              <input 
                type="date" 
                className="input"
                value={settings.endDate}
                onChange={(e) => setSettings({ ...settings, endDate: e.target.value })}
                required
              />
            </div>

            <div className="form-group" style={{ flexDirection: "row", alignItems: "center", gap: "10px", margin: "10px 0" }}>
              <input 
                type="checkbox" 
                id="announced"
                checked={settings.announced}
                onChange={(e) => setSettings({ ...settings, announced: e.target.checked })}
                style={{ width: "20px", height: "20px" }}
              />
              <label className="label" htmlFor="announced">Anunciar abertura do período</label>
            </div>

            <button type="submit" className="btn btn-primary">
              Salvar Configurações
            </button>
          </form>

          <div className="card" style={{ marginTop: "24px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "8px" }}>Disparo de Alertas PWA</h3>
            <p style={{ color: "var(--secondary)", fontSize: "13px", marginBottom: "20px", lineHeight: "1.4" }}>
              Envie alertas diretamente para os aparelhos dos responsáveis. As notificações irão vibrar, aparecer no painel do sistema e atualizar a indicação visual (badge) no ícone do aplicativo.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                <button 
                  onClick={() => handleSendBulkNotification("closing")}
                  disabled={sendingNotification}
                  className="btn btn-outline"
                  style={{ display: "flex", alignItems: "center", gap: "8px", flex: "1 1 200px", justifyContent: "center" }}
                >
                  ⏳ Encerramento de Matrículas
                </button>
                <button 
                  onClick={() => handleSendBulkNotification("remind-signup")}
                  disabled={sendingNotification}
                  className="btn btn-outline"
                  style={{ display: "flex", alignItems: "center", gap: "8px", flex: "1 1 200px", justifyContent: "center" }}
                >
                  📝 Lembrete de Inscrição
                </button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                <button 
                  onClick={() => handleSendBulkNotification("classes-soon")}
                  disabled={sendingNotification}
                  className="btn btn-outline"
                  style={{ display: "flex", alignItems: "center", gap: "8px", flex: "1 1 200px", justifyContent: "center" }}
                >
                  🎒 Início de Aulas Próximo
                </button>
                <button 
                  onClick={() => handleSendBulkNotification("check-status")}
                  disabled={sendingNotification}
                  className="btn btn-outline"
                  style={{ display: "flex", alignItems: "center", gap: "8px", flex: "1 1 200px", justifyContent: "center" }}
                >
                  🔍 Verificar Situação
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "classes" && !isClassModalOpen && (
        <button 
          className="fab" 
          onClick={() => {
            setEditingClass(null);
            setClassName("");
            setClassPeriod("Manhã");
            setClassTotalSpots(30);
            setClassActive(true);
            setIsClassModalOpen(true);
          }}
          aria-label="Nova turma"
        >
          +
        </button>
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
          className={`nav-item ${activeTab === "classes" ? "nav-item-active" : ""}`}
          style={{ background: "none", border: "none", cursor: "pointer" }}
        >
          <span>📚</span>
          Turmas
        </button>
        <button 
          onClick={() => setActiveTab("pending")} 
          className={`nav-item ${activeTab === "pending" ? "nav-item-active" : ""}`}
          style={{ background: "none", border: "none", cursor: "pointer", position: "relative" }}
        >
          <span>📄</span>
          Solicitações
          {pendingReservations.length > 0 && (
            <span style={{
              position: "absolute",
              top: "4px",
              right: "20px",
              backgroundColor: "var(--danger)",
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
              {pendingReservations.length}
            </span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab("period")} 
          className={`nav-item ${activeTab === "period" ? "nav-item-active" : ""}`}
          style={{ background: "none", border: "none", cursor: "pointer" }}
        >
          <span>📅</span>
          Período
        </button>
      </div>
    </div>
  );
}
