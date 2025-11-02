// Arquivo: components/award-badge.tsx (ou o nome que você usou)

"use client";

// 1. Não precisamos mais dos ícones do Lucide
// import { Smartphone, DollarSign, Gift } from "lucide-react";

// 2. A tag 'img' do Next/React é usada
import Image from "next/image"; // (Opcional, mas recomendado) ou use <img>

interface AwardsProps {
  position: number;
}

// Sua função 'Awards' (ou 'PrizeBadge')
export function Awards({ position }: AwardsProps) {
  // Lógica para 1º Lugar (Usa iphone.jpg)
  if (position === 1) {
    return (
      <div
        title="Prêmio: iPhone 17 Pro Max"
        className="absolute -bottom-2 -right-2 bg-gradient-to-br from-yellow-500 to-orange-400 rounded-full flex items-center justify-center border-2 border-slate-900 h-[46px] w-[46px] overflow-hidden" // Adicionado overflow-hidden
      >
        <img
          src="/images/premios/iphone.jpg" // Caminho da sua imagem
          alt="Prêmio 1º Lugar"
          className="w-full h-full object-cover" // Garante que a imagem preencha o círculo
        />
      </div>
    );
  }

  // Lógica para 2º Lugar (Usa dinheiro.webp)
  if (position === 2) {
    return (
      <div
        title="Prêmio: R$ 1000"
        className="absolute -bottom-2 -right-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center border-2 border-slate-900 h-[46px] w-[46px] overflow-hidden" // Adicionado overflow-hidden
      >
        <img
          src="/images/premios/dinheiro.webp" // Caminho da sua imagem
          alt="Prêmio 2º Lugar"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Lógica para 3º Lugar (Usa podium.png)
  if (position === 3) {
    return (
      <div
        title="Prêmio: R$ 500" // (O prêmio real, a imagem é só o ícone)
        className="absolute -bottom-2 -right-2 bg-gradient-to-br from-orange-600 to-red-600 rounded-full flex items-center justify-center border-2 border-slate-900 h-[46px] w-[46px] overflow-hidden" // Adicionado overflow-hidden
      >
        <img
          src="/images/premios/dinheiro.webp" // Caminho da sua imagem
          alt="Prêmio 3º Lugar"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Se não for pódio, não mostra nada
  return null;
}
