"use client"

// 1. Imports (Adicionado 'createPortal')
import { useEffect, useState, Fragment, useRef } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Clock, Users, Crown, ChevronLeft, ChevronRight, TrendingUp, Calendar, CalendarDays } from "lucide-react"
import { createClient } from "@supabase/supabase-js"

// 🔴 MUDANÇA 1: Importa o componente com o nome correto
import { NewPointPopup } from "@/components/popups/newpoint-popup"

// 2. Importa os novos componentes (sem mudanças)
import { AudioController, type AudioEvent } from "@/components/audio-controller"
import { OvertakePopup } from "@/components/popups/overtake-popup"
import { PodiumPopup } from "@/components/popups/podium-popup"
import { FirstPlacePopup } from "@/components/popups/firstplace-popup"
import { Awards } from "@/components/award-badge" // Seu componente de prêmio

// Interfaces e Config
interface Vendedor {
  rank: number
  nome: string
  avatarUrl: string
  pontuacao: number // <-- Isso agora será a contagem DO MÊS
  metrica_nome: string
  metrica_valor: number // <-- Isso também será a contagem DO MÊS
  metrica_total: number
}

// Tipo para os dados que vêm da tabela de Vendedores
type VendedorSupabase = {
  id: number
  nome: string
  avatarUrl: string // A coluna que você adicionou
}

// Tipo para os dados que vêm da tabela de Logs
type LeadSupabase = {
  id: number
  vendedorid: number
  created_at: string
}

// Config Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export default function SalesRanking() {
  // States de eventos
  const [activeEvent, setActiveEvent] = useState<AudioEvent | null>(null)
  const [eventMessage, setEventMessage] = useState<string>("")
  const [eventImageUrl, setEventImageUrl] = useState<string | undefined>(undefined)
  const [playRequest, setPlayRequest] = useState<AudioEvent | null>(null)
  const previousVendedoresRef = useRef<Vendedor[]>([])

  // States de dados
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [totalPontosDia, setTotalPontosDia] = useState(0)
  const [totalPontosMes, setTotalPontosMes] = useState(0)
  const [totalPontosAno, setTotalPontosAno] = useState(0)

  // States de UI
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [isMounted, setIsMounted] = useState(false)

  // Constantes
  const ITEMS_PER_PAGE = 14
  const META_TOTAL = 40
  const VALOR_FIXO_ANUAL = 104718

  // Hook para manter o Ref
  useEffect(() => {
    previousVendedoresRef.current = vendedores
  }, [vendedores])

  // Hook para 'isMounted'
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Função formatarVendedores
  const formatarVendedores = (listaVendedores: VendedorSupabase[], leadsDoMes: LeadSupabase[]): Vendedor[] => {
    const vendedoresFormatados = listaVendedores.map((vendedor) => {
      const contagemMes = leadsDoMes.filter((lead) => lead.vendedorid === vendedor.id).length

      return {
        rank: 0,
        nome: vendedor.nome,
        avatarUrl: vendedor.avatarUrl,
        pontuacao: contagemMes,
        metrica_valor: contagemMes,
        metrica_total: META_TOTAL,
        metrica_nome: contagemMes >= META_TOTAL ? "Meta Atingida" : "Faltam",
      }
    })

    const ordenados = vendedoresFormatados.sort((a, b) => b.pontuacao - a.pontuacao)

    return ordenados.map((vendedor, index) => ({
      ...vendedor,
      rank: index + 1,
    }))
  }

  // Função checkForEvents
  const checkForEvents = (oldRanking: Vendedor[], newRanking: Vendedor[]): boolean => {
    if (oldRanking.length === 0) return false

    const newFirst = newRanking[0]
    const oldFirst = oldRanking[0]
    if (newFirst && oldFirst && newFirst.nome !== oldFirst.nome) {
      setEventMessage(`${newFirst.nome} assumiu a primeira posição!`)
      setEventImageUrl(newFirst.avatarUrl)
      setActiveEvent("first-place")
      setPlayRequest("first-place")
      return true // Evento encontrado
    }

    const newPodium = newRanking.slice(0, 3).map((v) => v.nome)
    const oldPodium = oldRanking.slice(0, 3).map((v) => v.nome)
    const novoMembroPodium = newPodium.find((nome) => !oldPodium.includes(nome))

    if (novoMembroPodium) {
      const seller = newRanking.find((v) => v.nome === novoMembroPodium)
      setEventMessage(`${novoMembroPodium} entrou no Top 3!`)
      setEventImageUrl(seller?.avatarUrl)
      setActiveEvent("podium")
      setPlayRequest("podium")
      return true // Evento encontrado
    }

    for (const newSeller of newRanking) {
      const oldSeller = oldRanking.find((s) => s.nome === newSeller.nome)
      if (oldSeller && newSeller.rank < oldSeller.rank) {
        const overtakenSeller = oldRanking.find((s) => s.rank === newSeller.rank)
        setEventMessage(`${newSeller.nome} passou ${overtakenSeller?.nome || "um oponente"}!`)
        setEventImageUrl(newSeller.avatarUrl)
        setActiveEvent("overtake")
        setPlayRequest("overtake")
        return true // Evento encontrado
      }
    }

    return false // Nenhum evento especial encontrado
  }

  // Função fetchData
  const fetchData = async () => {
    try {
      const hoje = new Date()
      const inicioDoDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
      const inicioDoAno = new Date(hoje.getFullYear(), 0, 1)

      const [vendedoresResponse, leadsDoAnoResponse] = await Promise.all([
        supabase.from("ranking_vendedores").select("id, nome, avatarUrl"),
        supabase
          .from("ranking_leads_vendedores")
          .select("id, created_at, vendedorid")
          .gte("created_at", inicioDoAno.toISOString()),
      ])

      if (vendedoresResponse.error) throw vendedoresResponse.error
      if (leadsDoAnoResponse.error) throw leadsDoAnoResponse.error

      if (vendedoresResponse.data && leadsDoAnoResponse.data) {
        const listaVendedores = vendedoresResponse.data as VendedorSupabase[]
        const leadsDoAno = leadsDoAnoResponse.data as LeadSupabase[]

        const stringHoje = hoje.toISOString().split("T")[0]
        const stringMes = hoje.toISOString().slice(0, 7)

        const leadsDoMes = leadsDoAno.filter((lead) => lead.created_at.slice(0, 7) === stringMes)
        const leadsDoDia = leadsDoMes.filter((lead) => lead.created_at.split("T")[0] === stringHoje)
        const totalAnoCorrigido = VALOR_FIXO_ANUAL + leadsDoAno.length

        setTotalPontosAno(totalAnoCorrigido)
        setTotalPontosMes(leadsDoMes.length)
        setTotalPontosDia(leadsDoDia.length)

        const novosVendedores = formatarVendedores(listaVendedores, leadsDoMes)

        if (previousVendedoresRef.current.length > 0) {
          console.log("[v0] Checking for events...")
          console.log("[v0] Previous rankings:", previousVendedoresRef.current.length)
          console.log("[v0] New rankings:", novosVendedores.length)

          const eventoEspecialEncontrado = checkForEvents(previousVendedoresRef.current, novosVendedores)

          if (!eventoEspecialEncontrado) {
            const sellerWithNewPoint = novosVendedores.find((newSeller) => {
              const oldSeller = previousVendedoresRef.current.find((s) => s.nome === newSeller.nome)
              return oldSeller && newSeller.pontuacao > oldSeller.pontuacao
            })

            if (sellerWithNewPoint) {
              console.log("[v0] New point detected for:", sellerWithNewPoint.nome)
              setEventMessage(`${sellerWithNewPoint.nome} fechou um novo contrato!`)
              setEventImageUrl(sellerWithNewPoint.avatarUrl)
              setActiveEvent("new-point")
              setPlayRequest("new-point")
            } else {
              console.log("[v0] No new points detected")
            }
          }
        } else {
          console.log("[v0] Skipping event check - first load")
        }

        setVendedores(novosVendedores)
        setLastUpdate(new Date())
        setError(null)
      }
    } catch (err) {
      let errorMessage = "Não foi possível carregar o ranking."
      if (err instanceof Error) {
        errorMessage = `Erro ao buscar dados: ${err.message}`
      }
      setError(errorMessage)
      console.error("[SalesRanking] Error fetching data:", err)
    } finally {
      setLoading(false)
    }
  }

  // useEffect Realtime
  useEffect(() => {
    fetchData() // Busca inicial

    const handleInserts = (payload: any) => {
      console.log("Novo lead! Recalculando tudo...", payload)
      fetchData()
      setLastUpdate(new Date())
    }

    const leadsChannel = supabase
      .channel("ranking_leads_vendedores_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ranking_leads_vendedores",
        },
        handleInserts,
      )
      .subscribe()

    const vendedoresChannel = supabase
      .channel("ranking_vendedores_changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "ranking_vendedores",
        },
        handleInserts,
      )
      .subscribe()

    return () => {
      supabase.removeChannel(leadsChannel)
      supabase.removeChannel(vendedoresChannel)
    }
  }, []) // Array vazio, roda só uma vez.

  // -----------------------------------------------------------------
  // 🔴 MUDANÇA 2: useEffect de Teste CORRIGIDO
  // -----------------------------------------------------------------
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("Modo de teste ativado. Use window.testEvent(tipo, mensagem, imageUrl)")
      console.log("Tipos: 'new-point', 'overtake', 'podium', 'first-place'")
      ;(window as any).testEvent = (
        type: AudioEvent,
        message = "Mensagem de Teste",
        imageUrl: string | undefined = undefined,
      ) => {
        setPlayRequest(type) // Toca o som

        // Lógica CORRIGIDA: agora todos os tipos ativam um popup
        if (type === "new-point") {
          setEventMessage(message || "Novo contrato fechado!")
          setEventImageUrl(imageUrl)
          setActiveEvent("new-point")
        } else if (type === "overtake") {
          setEventMessage(message)
          setEventImageUrl(imageUrl)
          setActiveEvent("overtake")
        } else if (type === "podium") {
          setEventMessage(message)
          setEventImageUrl(imageUrl)
          setActiveEvent("podium")
        } else if (type === "first-place") {
          setEventMessage(message)
          setEventImageUrl(imageUrl)
          setActiveEvent("first-place")
        }
      }
    }
  }, [])

  // --- O RESTO DO CÓDIGO (RENDERIZAÇÃO) ---

  const top3 = vendedores.slice(0, 3)
  const allSellers = vendedores
  const totalPages = allSellers.length > 0 ? Math.ceil(allSellers.length / ITEMS_PER_PAGE) : 1
  const paginatedVendedores = allSellers.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE)

  useEffect(() => {
    if (totalPages <= 1) return
    const interval = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % totalPages)
    }, 10000)
    return () => clearInterval(interval)
  }, [totalPages, currentPage])

  const getProgressColor = (metrica_valor: number, metrica_total: number) => {
    const percentage = (metrica_valor / metrica_total) * 100
    if (percentage < 100) return "from-yellow-500 to-yellow-400"
    if (percentage >= 100 && percentage < 150) return "from-blue-500 to-cyan-400"
    return "from-green-500 to-emerald-400"
  }

  // -----------------------------------------------------------------
  // 🔴 MUDANÇA 3: renderActivePopup CORRIGIDO
  // -----------------------------------------------------------------
  const renderActivePopup = () => {
    if (!activeEvent || !eventMessage) return null

    const closePopup = () => {
      setActiveEvent(null)
      setEventMessage("")
      setEventImageUrl(undefined)
    }

    switch (activeEvent) {
      case "overtake":
        return <OvertakePopup message={eventMessage} onClose={closePopup} imageUrl={eventImageUrl} />
      case "podium":
        return <PodiumPopup message={eventMessage} onClose={closePopup} imageUrl={eventImageUrl} />
      case "first-place":
        return <FirstPlacePopup message={eventMessage} onClose={closePopup} imageUrl={eventImageUrl} />
      case "new-point":
        return (
          // Usa o NewPointPopup (com o nome corrigido)
          <NewPointPopup message={eventMessage} onClose={closePopup} imageUrl={eventImageUrl} />
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center overflow-hidden">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/60">Carregando ranking...</p>
        </div>
      </div>
    )
  }

  // JSX
  return (
    <Fragment>
      {isMounted && createPortal(<AnimatePresence>{renderActivePopup()}</AnimatePresence>, document.body)}

      <AudioController playRequest={playRequest} onPlayComplete={() => setPlayRequest(null)} />

      <div className="w-full h-screen overflow-hidden flex flex-col pt-1 px-6 pb-16 gap-2">
        {/* CABEÇALHO */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <img
                src="/images/design-mode/ChatGPT_Image_30_de_out._de_2025__18_38_48-removebg-preview.png"
                alt="CB Icon"
                className="h-12 w-auto"
              />
              <span className="text-white font-bold text-xl whitespace-nowrap">CB NEGÓCIOS IMOBILIÁRIOS</span>
            </div>
            <div className="flex items-center gap-6 text-xs mt-2 ml-2.5">
              <div className="flex items-center gap-2 text-blue-400">
                <Users className="w-3 h-3" />
                <span>
                  Total: <span className="font-bold text-white">{totalPontosMes}</span>
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
            className="flex flex-col gap-4 rounded-2xl p-3 bg-cover bg-center bg-no-repeat overflow-hidden border border-blue-500/20 h-full"
            style={{
              backgroundImage:
                'linear-gradient(rgba(15, 40, 100, 0.35), rgba(15, 40, 100, 0.35)), url("/images/podium.png")',
            }}
          >
            {/* Stats (Diário, Mensal, Anual) */}
            <div className="grid grid-cols-3 gap-4">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-slate-900/50 backdrop-blur-md border border-blue-500/30 rounded-xl p-4 hover:border-blue-500/50 transition-colors"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xs text-white/60">Diário</div>
                    <div className="text-xl font-bold text-white">{totalPontosDia}</div>
                  </div>
                </div>
                <div className="text-xs text-blue-400">Total de hoje</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-slate-900/50 backdrop-blur-md border border-purple-500/30 rounded-xl p-4 hover:border-purple-500/50 transition-colors"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xs text-white/60">Mensal</div>
                    <div className="text-xl font-bold text-white">{totalPontosMes}</div>
                  </div>
                </div>
                <div className="text-xs text-purple-400">Total do mês</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-slate-900/50 backdrop-blur-md border border-yellow-500/30 rounded-xl p-4 hover:border-yellow-500/50 transition-colors"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                    <CalendarDays className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xs text-white/60">Anual</div>
                    <div className="text-xl font-bold text-white">{totalPontosAno}</div>
                  </div>
                </div>
                <div className="text-xs text-yellow-400">Total do ano</div>
              </motion.div>
            </div>

            {/* Pódio (Top 3) */}
            <div className="relative flex-1 flex items-end justify-between px-12 pb-16">
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
          <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-blue-500/20 overflow-hidden flex flex-col h-full">
            <div className="bg-slate-900/80 border-b border-blue-500/20 px-4 py-2.5 flex items-center justify-between">
              <h2 className="text-blue-400 text-sm font-semibold">RANKING COMPLETO (MENSAL)</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages)}
                  className="p-1 hover:bg-blue-500/20 rounded transition-colors"
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="w-5 h-5 text-blue-400" />
                </button>
                <span className="text-xs text-white/60">
                  {currentPage + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((prev) => (prev + 1) % totalPages)}
                  className="p-1 hover:bg-blue-500/20 rounded transition-colors"
                  aria-label="Próxima página"
                >
                  <ChevronRight className="w-5 h-5 text-blue-400" />
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
                    className="bg-slate-800/30 rounded-lg p-1.5 border border-blue-500/10 hover:border-blue-500/30 transition-colors"
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

                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden bg-slate-700 border-2 border-blue-500/30 shrink-0">
                        <img
                          src={vendedor.avatarUrl || "/placeholder.svg?height=32&width=32" || "/placeholder.svg"}
                          alt={vendedor.nome}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium text-xs md:text-sm truncate">{vendedor.nome}</div>
                        <div className="text-blue-400 text-[10px] md:text-xs">
                          <span className="font-bold">{vendedor.pontuacao}</span> pts
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="w-full h-1.5 md:h-2 bg-slate-700/50 rounded-full overflow-hidden relative">
                        <div
                          className={`h-full bg-gradient-to-r ${getProgressColor(
                            vendedor.metrica_valor,
                            vendedor.metrica_total,
                          )} rounded-full transition-all duration-500`}
                          style={{
                            width: `${Math.min((vendedor.metrica_valor / vendedor.metrica_total) * 100, 100)}%`,
                          }}
                        />
                      </div>
                      <div className="text-[9px] md:text-[10px] text-white/50">
                        {vendedor.metrica_nome}: {vendedor.metrica_valor}/{vendedor.metrica_total}
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
  )
}

// =================================================================
// SUB-COMPONENTE: CARD DO PÓDIO (Atualizado com <Awards />)
// =================================================================
function PodiumCard({
  vendedor,
  position,
}: {
  vendedor: Vendedor
  position: number
}) {
  const styles = {
    1: {
      bg: "bg-slate-900/40",
      border: "border-yellow-500",
      shadow: "shadow-yellow-500",
      badge: "from-yellow-400 to-yellow-600",
      size: "w-[220px]",
      height: "h-[420px]",
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
      height: "h-[365px]",
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
      height: "h-[355px]",
      glow: "from-orange-500/30 to-red-600/10",
      diamond: "from-orange-400 to-red-500",
      accentGlow: "from-orange-500/20 to-red-600/5",
    },
  }

  const style = styles[position as keyof typeof styles]

  const getProgressColor = (metrica_valor: number, metrica_total: number) => {
    const percentage = (metrica_valor / metrica_total) * 100
    if (percentage < 100) return "from-yellow-500 to-yellow-400"
    if (percentage >= 100 && percentage < 150) return "from-blue-400 to-cyan-300"
    return "from-green-500 to-emerald-400"
  }

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
            borderBottomColor: position === 1 ? "#facc15" : position === 2 ? "#22d3ee" : "#fb923c",
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
        <div className={`absolute inset-0 bg-gradient-to-b ${style.accentGlow} rounded-2xl pointer-events-none`} />

        <div className="relative z-10">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="w-[118px] h-[118px] rounded-full overflow-hidden border-4 border-white/20 shadow-xl">
                <img
                  src={vendedor.avatarUrl || "/placeholder.svg?height=128&width=128" || "/placeholder.svg"}
                  alt={vendedor.nome}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* 🔴 MUDANÇA 6: Usando seu componente <Awards /> */}
              <Awards position={position} />
            </div>
          </div>

          <h3 className="text-white font-bold text-xl text-center mb-2">{vendedor.nome}</h3>

          <div className="text-center mb-4">
            <div className="text-3xl font-bold text-white">{vendedor.pontuacao}</div>
            <div className="text-sm text-white/60">Contratos</div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/60">{vendedor.metrica_nome}:</span>
              <span className="text-white font-semibold">
                {vendedor.metrica_valor}/{vendedor.metrica_total}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-visible relative">
              <div
                className={`h-full bg-gradient-to-r ${getProgressColor(
                  vendedor.metrica_valor,
                  vendedor.metrica_total,
                )} rounded-full transition-all duration-500`}
                style={{
                  width: `${Math.min((vendedor.metrica_valor / vendedor.metrica_total) * 100, 100)}%`,
                }}
              />
              {position === 1 && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 transition-all duration-500"
                  style={{
                    left: `${Math.min((vendedor.metrica_valor / vendedor.metrica_total) * 100, 100)}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <span className="text-2xl drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]">🚀</span>
                </div>
              )}
            </div>
            <div className="text-center text-xs text-white/60">
              {((vendedor.metrica_valor / vendedor.metrica_total) * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      <div
        className={`absolute inset-0 bg-gradient-to-b ${style.glow} opacity-30 blur-3xl -z-10 rounded-2xl scale-110`}
      />
    </div>
  )
}
