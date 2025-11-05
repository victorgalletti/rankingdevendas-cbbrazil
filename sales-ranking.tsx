"use client";

import { useEffect, useState, Fragment, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Users,
  Crown,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Calendar,
  CalendarDays,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";

import { NewPointPopup } from "@/components/popups/newpoint-popup";
import {
  AudioController,
  type AudioEvent,
} from "@/components/audio-controller";
import { OvertakePopup } from "@/components/popups/overtake-popup";
import { PodiumPopup } from "@/components/popups/podium-popup";
import { FirstPlacePopup } from "@/components/popups/firstplace-popup";
import { Awards } from "@/components/award-badge";

// -------------------- Tipos --------------------
interface EventObject {
  type: AudioEvent;
  message: string;
  imageUrl?: string;
}

interface Vendedor {
  rank: number;
  nome: string;
  avatarUrl: string;
  pontuacao: number; // mensal
  pontuacaoDiaria: number;
  pontuacaoSemanal: number;
  metrica_nome: string;
  metrica_valor: number; // mensal
  metrica_total: number;
}

type VendedorSupabase = {
  id: number;
  nome: string;
  avatarurl: string;
};

type VendaSupabase = {
  id: number;
  vendedor: string;
  status: string;
  comissaoempresa: number;
  datavendaganha: string;
};

// -------------------- Utils --------------------
const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value || 0
  );

// -------------------- Supabase --------------------
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// -------------------- Componente --------------------
export default function SalesRanking() {
  // fila de eventos + audio
  const [eventQueue, setEventQueue] = useState<EventObject[]>([]);
  const [audioPlayRequest, setAudioPlayRequest] = useState<AudioEvent | null>(
    null
  );
  const previousVendedoresRef = useRef<Vendedor[]>([]);

  // dados
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [top3Vendedores, setTop3Vendedores] = useState<Vendedor[]>([]); // pódio semanal
  const [totalPontosDia, setTotalPontosDia] = useState(0);
  const [totalPontosSemana, setTotalPontosSemana] = useState(0);
  const [totalPontosMes, setTotalPontosMes] = useState(0);
  const [totalPontosAno] = useState(0); // se quiser, calcule separado/assíncrono

  // UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);

  // Constantes
  const ITEMS_PER_PAGE = 14;
  const META_MENSAL = 30000;

  // manter previous ref
  useEffect(() => {
    previousVendedoresRef.current = vendedores;
  }, [vendedores]);

  useEffect(() => setIsMounted(true), []);

  // desbloqueio de áudio
  useEffect(() => {
    const unlockAudio = () => {
      setIsAudioUnlocked(true);
      window.removeEventListener("click", unlockAudio);
    };
    window.addEventListener("click", unlockAudio);
    return () => window.removeEventListener("click", unlockAudio);
  }, []);

  // tocar áudio quando há evento e áudio liberado
  useEffect(() => {
    if (eventQueue.length > 0 && isAudioUnlocked) {
      setAudioPlayRequest(eventQueue[0].type);
    }
  }, [eventQueue, isAudioUnlocked]);

  // formatação dos vendedores (mensal como base)
  const formatarVendedores = useCallback(
    (
      listaVendedoresSupabase: VendedorSupabase[],
      vendasDiarias: VendaSupabase[],
      vendasSemanais: VendaSupabase[],
      vendasMensais: VendaSupabase[]
    ): Vendedor[] => {
      const calcularPontuacao = (vendas: VendaSupabase[]) => {
        const pontuacao: Record<string, number> = {};
        for (const venda of vendas) {
          pontuacao[venda.vendedor] =
            (pontuacao[venda.vendedor] || 0) + (venda.comissaoempresa || 0);
        }
        return pontuacao;
      };

      const pontDia = calcularPontuacao(vendasDiarias);
      const pontSem = calcularPontuacao(vendasSemanais);
      const pontMes = calcularPontuacao(vendasMensais);

      const vendidos = listaVendedoresSupabase.map((v) => {
        const pm = pontMes[v.nome] || 0;
        const pd = pontDia[v.nome] || 0;
        const ps = pontSem[v.nome] || 0;

        return {
          rank: 0,
          nome: v.nome,
          avatarUrl: v.avatarurl || "/placeholder.svg",
          pontuacao: pm, // ranking principal = mensal
          pontuacaoDiaria: pd,
          pontuacaoSemanal: ps,
          metrica_valor: pm, // barra baseada na meta mensal
          metrica_total: META_MENSAL,
          metrica_nome: pm >= META_MENSAL ? "Meta Atingida" : "Faltam",
        } as Vendedor;
      });

      const ordenados = vendidos.sort((a, b) => b.pontuacao - a.pontuacao);
      return ordenados.map((v, i) => ({ ...v, rank: i + 1 }));
    },
    []
  );

  // detecção de eventos
  const checkForEvents = useCallback(
    (oldRanking: Vendedor[], newRanking: Vendedor[]): EventObject[] => {
      const events: EventObject[] = [];
      if (oldRanking.length === 0) return events;

      const newFirst = newRanking[0];
      const oldFirst = oldRanking[0];
      if (newFirst && oldFirst && newFirst.nome !== oldFirst.nome) {
        events.push({
          type: "first-place",
          message: `${newFirst.nome} assumiu a primeira posição!`,
          imageUrl: newFirst.avatarUrl,
        });
      }

      const newPodium = newRanking.slice(0, 3).map((v) => v.nome);
      const oldPodium = oldRanking.slice(0, 3).map((v) => v.nome);
      const novoMembroPodium = newPodium.find((n) => !oldPodium.includes(n));
      if (novoMembroPodium) {
        const seller = newRanking.find((v) => v.nome === novoMembroPodium);
        events.push({
          type: "podium",
          message: `${novoMembroPodium} entrou no Top 3!`,
          imageUrl: seller?.avatarUrl,
        });
      }

      for (const n of newRanking) {
        const o = oldRanking.find((s) => s.nome === n.nome);
        if (o && n.rank < o.rank) {
          const overtaken = oldRanking.find((s) => s.rank === n.rank);
          events.push({
            type: "overtake",
            message: `${n.nome} passou ${overtaken?.nome || "um oponente"}!`,
            imageUrl: n.avatarUrl,
          });
          return events; // apenas a primeira ultrapassagem
        }
      }

      return events;
    },
    []
  );

  // fetchData ESTÁVEL (mês atual)
  const fetchData = useCallback(async () => {
    try {
      const hoje = new Date();
      const inicioDoDia = new Date(
        hoje.getFullYear(),
        hoje.getMonth(),
        hoje.getDate()
      );
      const inicioDaSemana = new Date(
        hoje.getFullYear(),
        hoje.getMonth(),
        hoje.getDate() - hoje.getDay()
      );
      const inicioDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

      const [vendedoresResponse, vendasDoMesResponse] = await Promise.all([
        supabase.from("ranking_vendedores").select("id, nome, avatarurl"),
        supabase
          .from("relatorio_leads")
          .select("vendedor, status, comissaoempresa, datavendaganha")
          .eq("status", "Venda Ganha")
          .gte("datavendaganha", inicioDoMes.toISOString()),
      ]);
      if (vendedoresResponse.error) throw vendedoresResponse.error;
      if (vendasDoMesResponse.error) throw vendasDoMesResponse.error;

      const listaVendedores = (vendedoresResponse.data ??
        []) as VendedorSupabase[];
      const vendasDoMes = (vendasDoMesResponse.data ?? []) as VendaSupabase[];

      const vendasDaSemana = vendasDoMes.filter(
        (v) => new Date(v.datavendaganha) >= inicioDaSemana
      );
      const vendasDoDia = vendasDoMes.filter(
        (v) => new Date(v.datavendaganha) >= inicioDoDia
      );

      const soma = (arr: VendaSupabase[]) =>
        arr.reduce((a, v) => a + (v.comissaoempresa || 0), 0);

      setTotalPontosDia(soma(vendasDoDia));
      setTotalPontosSemana(soma(vendasDaSemana));
      setTotalPontosMes(soma(vendasDoMes));

      const novosVendedores = formatarVendedores(
        listaVendedores,
        vendasDoDia,
        vendasDaSemana,
        vendasDoMes
      );

      // >>>>>>>>>>>> PÓDIO SEMANAL <<<<<<<<<<<<<<
      const top3Semanal = [...novosVendedores]
        .sort((a, b) => b.pontuacaoSemanal - a.pontuacaoSemanal)
        .slice(0, 3);
      setTop3Vendedores(top3Semanal);

      // Eventos
      if (previousVendedoresRef.current.length > 0) {
        const newEventQueue: EventObject[] = [];

        const sellerWithNewPoint = novosVendedores.find((n) => {
          const o = previousVendedoresRef.current.find(
            (s) => s.nome === n.nome
          );
          return o && n.pontuacao > o.pontuacao;
        });
        if (sellerWithNewPoint) {
          newEventQueue.push({
            type: "new-point",
            message: `${sellerWithNewPoint.nome} fechou uma nova venda!`,
            imageUrl: sellerWithNewPoint.avatarUrl,
          });
        }

        const special = checkForEvents(
          previousVendedoresRef.current,
          novosVendedores
        );
        const highest =
          special.find((e) => e.type === "first-place") ||
          special.find((e) => e.type === "podium") ||
          special.find((e) => e.type === "overtake");
        if (highest) newEventQueue.push(highest);

        if (newEventQueue.length)
          setEventQueue((prev) => [...prev, ...newEventQueue]);
      }

      setVendedores(novosVendedores);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Erro ao buscar dados: ${err.message}`
          : "Não foi possível carregar o ranking."
      );
      console.error("[SalesRanking] Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, [formatarVendedores, checkForEvents]);

  // Realtime com throttle
  useEffect(() => {
    fetchData(); // carga inicial

    // throttle para agrupar bursts
    let throttleId: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefetch = () => {
      if (throttleId) return;
      throttleId = setTimeout(() => {
        throttleId = null;
        // se quiser manter economia, pode deixar o guard de aba oculta – mas pra debug, vamos sempre buscar:
        fetchData();
      }, 1200);
    };

    // handler genérico: dispara apenas quando o NEW.status é "Venda Ganha" e é do mês atual.
    const handleChange = (payload: any) => {
      const row = payload.new as { status?: string; datavendaganha?: string };
      if (!row) return;
      if (row.status !== "Venda Ganha") return;

      const now = new Date();
      const inicioDoMes = new Date(now.getFullYear(), now.getMonth(), 1);
      if (!row.datavendaganha || new Date(row.datavendaganha) < inicioDoMes)
        return;

      scheduleRefetch();
    };

    // IMPORTANTE: escuta INSERT **e** UPDATE
    const vendasChannel = supabase
      .channel("vendas_changes")
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT e UPDATE
          schema: "public",
          table: "relatorio_leads",
          filter: "status=eq.Venda Ganha", // server-side (NEW.status)
        },
        (payload) => {
          const n = payload.new as { status?: string; datavendaganha?: string };
          const o = payload.old as { status?: string } | undefined;

          if (!n || n.status !== "Venda Ganha") return;

          // opcional: só quando mudou para 'Venda Ganha'
          if (payload.eventType === "UPDATE" && o?.status === "Venda Ganha")
            return;

          const inicioDoMes = new Date(
            new Date().getFullYear(),
            new Date().getMonth(),
            1
          );
          if (!n.datavendaganha || new Date(n.datavendaganha) < inicioDoMes)
            return;

          scheduleRefetch(); // seu throttle
        }
      )
      .subscribe();

    const vendedoresChannel = supabase
      .channel("ranking_vendedores_changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "ranking_vendedores" },
        () => scheduleRefetch()
      )
      .subscribe();

    return () => {
      if (throttleId) clearTimeout(throttleId);
      supabase.removeChannel(vendasChannel);
      supabase.removeChannel(vendedoresChannel);
    };
  }, [fetchData]);

  // -----------------------------------------------------------------
  // 🔴 MUDANÇA 2: useEffect de Teste CORRIGIDO
  // -----------------------------------------------------------------
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log(
        "Modo de teste ativado. Use window.testEvent(tipo, mensagem, imageUrl)"
      );
      console.log("Tipos: 'new-point', 'overtake', 'podium', 'first-place'");
      (window as any).testEvent = (
        type: AudioEvent,
        message = "Mensagem de Teste",
        imageUrl: string | undefined = undefined
      ) => {
        // Adiciona o evento de teste à fila
        setEventQueue((prev) => [
          ...prev,
          { type, message: message, imageUrl },
        ]);
      };
    }
  }, []);

  // --- O RESTO DO CÓDIGO (RENDERIZAÇÃO) ---

  const top3 = top3Vendedores; // 🔴 MUDANÇA: Pódio agora usa o estado semanal
  const allSellers = vendedores;
  const totalPages =
    allSellers.length > 0 ? Math.ceil(allSellers.length / ITEMS_PER_PAGE) : 1;
  const paginatedVendedores = allSellers.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  useEffect(() => {
    if (totalPages <= 1) return;
    const interval = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % totalPages);
    }, 10000);
    return () => clearInterval(interval);
  }, [totalPages, currentPage]);

  const getProgressColor = (metrica_valor: number, metrica_total: number) => {
    const percentage = (metrica_valor / metrica_total) * 100;
    if (percentage < 100) return "from-yellow-500 to-yellow-400";
    if (percentage >= 100 && percentage < 150)
      return "from-blue-500 to-cyan-400";
    return "from-green-500 to-emerald-400";
  };

  // -----------------------------------------------------------------
  // 🔴 MUDANÇA 3: renderActivePopup CORRIGIDO
  // -----------------------------------------------------------------
  const closeCurrentPopup = useCallback(() => {
    // Remove o primeiro item da fila e atualiza o estado
    setEventQueue((prevQueue) => prevQueue.slice(1));
  }, []);

  const renderActivePopup = () => {
    // Pega o primeiro evento da fila, se houver
    const currentEvent = eventQueue[0];
    if (!currentEvent) return null;

    switch (currentEvent.type) {
      case "overtake":
        return (
          <OvertakePopup
            message={currentEvent.message}
            onClose={closeCurrentPopup}
            imageUrl={currentEvent.imageUrl}
          />
        );
      case "podium":
        return (
          <PodiumPopup
            message={currentEvent.message}
            onClose={closeCurrentPopup}
            imageUrl={currentEvent.imageUrl}
          />
        );
      case "first-place":
        return (
          <FirstPlacePopup
            message={currentEvent.message}
            onClose={closeCurrentPopup}
            imageUrl={currentEvent.imageUrl}
          />
        );
      case "new-point":
        return (
          // Usa o NewPointPopup (com o nome corrigido)
          <NewPointPopup
            message={currentEvent.message}
            onClose={closeCurrentPopup}
            imageUrl={currentEvent.imageUrl}
          />
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center overflow-hidden">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/60">Carregando ranking...</p>
        </div>
      </div>
    );
  }

  // JSX
  return (
    <Fragment>
      {isMounted &&
        createPortal(
          <AnimatePresence>{renderActivePopup()}</AnimatePresence>,
          document.body
        )}

      <AudioController
        playRequest={audioPlayRequest}
        onPlayComplete={() => setAudioPlayRequest(null)} // Limpa o pedido após tocar
      />

      <div className="w-full h-screen overflow-hidden flex flex-col pt-1 px-6 pb-16 gap-2">
        {/* CABEÇALHO */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <img
                src="/images/cbbrazil.webp"
                alt="CB Icon"
                className="h-12 w-auto"
              />
            </div>
            <div className="flex items-center gap-6 text-xs mt-2 ml-2.5">
              <div className="flex items-center gap-2 text-green-400">
                <Users className="w-3 h-3" />
                <span>
                  Total:{" "}
                  <span className="font-bold text-white">
                    {formatCurrency(totalPontosMes)}
                  </span>
                </span>
              </div>
              {lastUpdate && (
                <div className="flex items-center gap-2 text-white/60">
                  <Clock className="w-3 h-3" />
                  <span>{lastUpdate.toLocaleTimeString("pt-BR")}</span>
                </div>
              )}
            </div>
          </div>
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-3 py-1 rounded-lg text-xs">
              {error}
            </div>
          )}
        </div>

        {/* CORPO PRINCIPAL (PÓDIO + LISTA) */}
        <div className="flex-1 grid grid-cols-[900px_1fr] gap-4 overflow-hidden">
          {/* COLUNA ESQUERDA: PÓDIO E STATS */}
          <div
            className="flex flex-col gap-4 rounded-2xl p-3 bg-cover bg-center bg-no-repeat overflow-hidden border border-green-500/20 h-full"
            style={{
              backgroundImage:
                'linear-gradient(rgba(5, 20, 25, 0.35), rgba(5, 20, 25, 0.35)), url("/images/podium.png")',
            }}
          >
            {/* Stats (Diário, Mensal, Anual) */}
            <div className="grid grid-cols-3 gap-4">
              {" "}
              {/* 🔴 MUDANÇA: Mantido 3 colunas */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-slate-900/50 backdrop-blur-md border border-green-500/30 rounded-xl p-4 hover:border-green-500/50 transition-colors"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-500 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xs text-white/60">Diário</div>
                    <div className="text-xl font-bold text-white">
                      {formatCurrency(totalPontosDia)}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-green-400">Total de hoje</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-slate-900/50 backdrop-blur-md border border-blue-500/30 rounded-xl p-4 hover:border-blue-500/50 transition-colors"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <CalendarDays className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xs text-white/60">Semanal</div>
                    <div className="text-xl font-bold text-white">
                      {formatCurrency(totalPontosSemana)}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-blue-400">Total da semana</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-slate-900/50 backdrop-blur-md border border-purple-500/30 rounded-xl p-4 hover:border-purple-500/50 transition-colors"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xs text-white/60">Mensal</div>
                    <div className="text-xl font-bold text-white">
                      {formatCurrency(totalPontosMes)}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-purple-400">Total do mês</div>
              </motion.div>
            </div>

            {/* Pódio (Top 3) */}
            <div className="relative flex-1 flex items-center justify-between px-12 pb-4">
              <AnimatePresence>
                {top3.length >= 3 && (
                  <>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: 100 }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                        y: [0, -12, 0],
                      }}
                      transition={{
                        delay: 0.4,
                        y: {
                          duration: 3.5,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: "easeInOut",
                          delay: 0.5,
                        },
                      }}
                      className="z-20"
                    >
                      <PodiumCard vendedor={top3[1]} position={2} />
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: 100 }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                        y: [0, -15, 0],
                      }}
                      transition={{
                        delay: 0.2,
                        y: {
                          duration: 4,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: "easeInOut",
                          delay: 1,
                        },
                      }}
                      className="z-30"
                    >
                      <PodiumCard vendedor={top3[0]} position={1} />
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: 100 }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                        y: [0, -10, 0],
                      }}
                      transition={{
                        delay: 0.6,
                        y: {
                          duration: 3,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: "easeInOut",
                        },
                      }}
                      className="z-10"
                    >
                      <PodiumCard vendedor={top3[2]} position={3} />
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[200px] bg-blue-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-[100px] left-[20%] w-[150px] h-[150px] bg-cyan-500/5 rounded-full blur-2xl" />
                <div className="absolute bottom-[100px] right-[20%] w-[150px] h-[150px] bg-yellow-500/5 rounded-full blur-2xl" />
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA: LISTA DO RANKING */}
          <div className="bg-gray-900/30 backdrop-blur-sm rounded-xl border border-green-500/20 overflow-hidden flex flex-col h-full">
            <div className="bg-gray-900/25 border-b border-green-500/20 px-4 py-2.5 flex items-center justify-between">
              <h2 className="text-green-400 text-sm font-semibold">
                RANKING COMPLETO (MENSAL)
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setCurrentPage(
                      (prev) => (prev - 1 + totalPages) % totalPages
                    )
                  }
                  className="p-1 hover:bg-green-500/20 rounded transition-colors"
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="w-5 h-5 text-green-400" />
                </button>
                <span className="text-xs text-white/60">
                  {currentPage + 1} / {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => (prev + 1) % totalPages)
                  }
                  className="p-1 hover:bg-blue-500/20 rounded transition-colors"
                  aria-label="Próxima página"
                >
                  <ChevronRight className="w-5 h-5 text-green-400" />
                </button>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-2 auto-rows-min gap-2 p-3 overflow-hidden items-start">
              {/* Removido 'mode="wait"' */}
              <AnimatePresence>
                {paginatedVendedores.map((vendedor, index) => (
                  <motion.div
                    key={`${vendedor.rank}-${currentPage}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-gray-800/20 rounded-lg p-1.5 border border-green-500/10 hover:border-green-500/30 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className={`
                        w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center font-bold text-xs md:text-sm shrink-0
                        ${
                          vendedor.rank <= 3
                            ? "bg-gradient-to-br from-yellow-400 to-yellow-600 text-black"
                            : "bg-slate-700/50 text-white"
                        }
                      `}
                      >
                        {vendedor.rank}
                      </div>

                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden bg-slate-700 border-2 border-green-500/30 shrink-0">
                        <img
                          src={
                            vendedor.avatarUrl ||
                            "/placeholder.svg?height=32&width=32" ||
                            "/placeholder.svg"
                          }
                          alt={vendedor.nome}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium text-xs md:text-sm truncate">
                          {vendedor.nome}
                        </div>
                        {/* 🔴 MUDANÇA: Exibe os 3 valores (Diário, Semanal, Mensal) */}
                        <div className="flex items-center gap-2 text-[10px] md:text-[11px]">
                          <span className="flex items-center gap-0.5 text-green-400 font-bold">
                            <TrendingUp className="w-2.5 h-2.5" />
                            {formatCurrency(vendedor.pontuacaoDiaria)}
                          </span>
                          <span className="flex items-center gap-0.5 text-blue-400 font-bold">
                            <CalendarDays className="w-2.5 h-2.5" />
                            {formatCurrency(vendedor.pontuacaoSemanal)}
                          </span>
                          <span className="flex items-center gap-0.5 text-purple-400 font-bold">
                            <Calendar className="w-2.5 h-2.5" />
                            {formatCurrency(vendedor.pontuacao)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="w-full h-1.5 md:h-2 bg-slate-700/50 rounded-full overflow-hidden relative">
                        <div
                          className={`h-full bg-gradient-to-r ${getProgressColor(
                            vendedor.metrica_valor,
                            vendedor.metrica_total
                          )} rounded-full transition-all duration-500`}
                          style={{
                            width: `${Math.min(
                              (vendedor.metrica_valor /
                                vendedor.metrica_total) *
                                100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                      <div className="text-[9px] md:text-[10px] text-white/50">
                        {/* 🔴 MUDANÇA: Exibe valores em R$ na meta */}
                        {vendedor.metrica_nome}:{" "}
                        {formatCurrency(vendedor.metrica_valor)}/
                        {formatCurrency(vendedor.metrica_total)}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
}

// =================================================================
// SUB-COMPONENTE: CARD DO PÓDIO (Atualizado com <Awards />)
// =================================================================
function PodiumCard({
  vendedor,
  position,
}: {
  vendedor: Vendedor;
  position: number;
}) {
  const styles = {
    1: {
      bg: "bg-slate-900/40",
      border: "border-yellow-500",
      shadow: "shadow-yellow-500",
      badge: "from-yellow-400 to-yellow-600",
      size: "w-[220px]",
      height: "h-[445px]",
      glow: "from-yellow-500/30 to-yellow-600/10",
      diamond: "from-yellow-400 to-yellow-600",
      accentGlow: "from-yellow-500/20 to-yellow-600/5",
    },
    2: {
      bg: "bg-slate-900/40",
      border: "border-cyan-500",
      shadow: "shadow-cyan-500",
      badge: "from-cyan-400 to-teal-600",
      size: "w-[200px]",
      height: "h-[410px]",
      glow: "from-cyan-500/30 to-teal-600/10",
      diamond: "from-cyan-400 to-teal-500",
      accentGlow: "from-cyan-500/20 to-teal-600/5",
    },
    3: {
      bg: "bg-slate-900/40",
      border: "border-orange-500",
      shadow: "shadow-orange-500",
      badge: "from-orange-400 to-red-600",
      size: "w-[200px]",
      height: "h-[390px]",
      glow: "from-orange-500/30 to-red-600/10",
      diamond: "from-orange-400 to-red-500",
      accentGlow: "from-orange-500/20 to-red-600/5",
    },
  };
  const style = styles[position as keyof typeof styles];

  const getProgressColor = (metrica_valor: number, metrica_total: number) => {
    const percentage = (metrica_valor / metrica_total) * 100;
    if (percentage < 100) return "from-yellow-500 to-yellow-400";
    if (percentage >= 100 && percentage < 150)
      return "from-blue-400 to-cyan-300";
    return "from-green-500 to-emerald-400";
  };

  const prizeDetails = {
    1: { name: "Prêmio a definir", color: "text-yellow-400" },
    2: { name: "Prêmio a definir", color: "text-cyan-400" },
    3: { name: "Prêmio a definir", color: "text-orange-400" },
  };

  return (
    <div className={`${style.size} relative`}>
      {position === 1 && (
        <div className="absolute -top-14 left-1/2 -translate-x-1/2 z-20">
          <div className="relative">
            <Crown className="w-12 h-12 text-yellow-400 fill-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]" />
            <div className="absolute inset-0 bg-yellow-400/30 blur-xl rounded-full" />
          </div>
        </div>
      )}

      <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-10">
        <div
          className={`w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-b-[28px] bg-gradient-to-b ${style.diamond} shadow-lg`}
          style={{
            borderBottomColor:
              position === 1
                ? "#facc15"
                : position === 2
                ? "#22d3ee"
                : "#fb923c",
            filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.3))",
          }}
        />
      </div>

      <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-10">
        <div
          className={`w-12 h-16 bg-gradient-to-b ${style.badge} clip-badge flex items-center justify-center shadow-lg`}
        >
          <span className="text-black font-bold text-xl mt-2">{position}</span>
        </div>
      </div>

      <div
        className={`
        relative ${style.height} ${style.bg} backdrop-blur-md
        border-2 ${style.border} rounded-2xl p-6 pt-8
        shadow-2xl ${style.shadow}
        transform hover:scale-105 transition-all duration-300
        flex flex-col justify-center
      `}
      >
        <div
          className={`absolute inset-0 bg-gradient-to-b ${style.accentGlow} rounded-2xl pointer-events-none`}
        />

        <div className="relative z-10">
          <div className="flex flex-col items-center mb-2 translate-y-2">
            <div className="text-center mb-4 h-5">
              <span
                className={`font-bold text-sm ${
                  prizeDetails[position as keyof typeof prizeDetails].color
                }`}
              >
                {prizeDetails[position as keyof typeof prizeDetails].name}
              </span>
            </div>
            <div className="relative">
              <div className="w-[118px] h-[118px] rounded-full overflow-hidden border-4 border-white/20 shadow-xl">
                <img
                  src={
                    vendedor.avatarUrl ||
                    "/placeholder.svg?height=128&width=128" ||
                    "/placeholder.svg"
                  }
                  alt={vendedor.nome}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* 🔴 MUDANÇA 6: Usando seu componente <Awards /> */}
              <Awards position={position} />
            </div>
          </div>

          <h3 className="text-white font-bold text-xl text-center mb-2 translate-y-5">
            {vendedor.nome}
          </h3>

          <div className="text-center mb-4 translate-y-4">
            <div className="text-2xl font-bold text-white">
              {formatCurrency(vendedor.pontuacao)}
            </div>
            <div className="text-sm text-white/60">Vendidos</div>
          </div>

          <div className="space-y-2 translate-y-4">
            <div className="flex items-center justify-center text-sm">
              <span className="text-white/60">{vendedor.metrica_nome}:</span>
              {vendedor.metrica_valor < vendedor.metrica_total ? (
                <span className="text-white font-semibold">
                  {formatCurrency(
                    vendedor.metrica_total - vendedor.metrica_valor
                  )}
                </span>
              ) : (
                <span className="text-white font-semibold">
                  {formatCurrency(vendedor.metrica_valor)}/
                  {formatCurrency(vendedor.metrica_total)}
                </span>
              )}
            </div>
            <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-visible relative">
              <div
                className={`h-full bg-gradient-to-r ${getProgressColor(
                  vendedor.metrica_valor,
                  vendedor.metrica_total
                )} rounded-full transition-all duration-500`}
                style={{
                  width: `${Math.min(
                    (vendedor.metrica_valor / vendedor.metrica_total) * 100,
                    100
                  )}%`,
                }}
              />
              {position === 1 && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 transition-all duration-500"
                  style={{
                    left: `${Math.min(
                      (vendedor.metrica_valor / vendedor.metrica_total) * 100,
                      100
                    )}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <span className="text-2xl drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]">
                    🚀
                  </span>
                </div>
              )}
            </div>
            <div className="text-center text-xs text-white/60">
              {(
                (vendedor.metrica_valor / vendedor.metrica_total) *
                100
              ).toFixed(1)}
              %
            </div>
          </div>
        </div>
      </div>

      <div
        className={`absolute inset-0 bg-gradient-to-b ${style.glow} opacity-30 blur-3xl -z-10 rounded-2xl scale-110`}
      />
    </div>
  );
}
