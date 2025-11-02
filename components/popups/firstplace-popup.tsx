"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { X, Crown } from "lucide-react";
import Image from "next/image";

interface PopupProps {
  message: string;
  onClose: () => void;
  imageUrl?: string;
}

export function FirstPlacePopup({ message, onClose, imageUrl }: PopupProps) {
  useEffect(() => {
    const timer = setTimeout(() => onClose(), 10000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    // 1. Usar um Fragment (<>) para agrupar o backdrop e o popup
    <>
      {/* 2. O BACKDROP com blur */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        // Cobre a tela, z-40 (abaixo do popup), e aplica o blur
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        // Adiciona o fechamento ao clicar no fundo
        onClick={onClose}
      />

      {/* 3. O POPUP */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        // Centralização (já estava correta)
        // z-50 (acima do backdrop)
        // max-w-sm (mais estreito/vertical)
        className="fixed top-[20vw] left-[40vw] -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm p-4"
      >
        {/* Animação de confete (sem alteração) */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ y: -20, opacity: 0 }}
              animate={{
                y: [0, 100, 200],
                x: [0, Math.random() * 100 - 50],
                opacity: [0, 1, 0],
                rotate: [0, Math.random() * 360],
              }}
              transition={{
                duration: 2,
                delay: i * 0.1,
                repeat: Number.POSITIVE_INFINITY,
                repeatDelay: 1,
              }}
              className="absolute text-2xl"
              style={{
                left: `${Math.random() * 100}%`,
                top: "0%",
              }}
            >
              {["🎉", "🎊", "✨", "⭐"][Math.floor(Math.random() * 4)]}
            </motion.div>
          ))}
        </div>

        {/* Conteúdo do Card */}
        {/* Adicionado flex flex-col items-center para forçar alinhamento vertical */}
        <div className="relative bg-gradient-to-br from-yellow-900 via-yellow-950 to-black border-2 border-yellow-500 rounded-xl shadow-2xl shadow-yellow-500/40 p-6 text-center flex flex-col items-center">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-yellow-300/50 hover:text-yellow-300 transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="absolute -top-8 left-1/2 -translate-x-1/2">
            <Crown className="w-16 h-16 text-yellow-500 fill-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.8)]" />
          </div>

          {imageUrl && (
            // mx-auto não é mais necessário por causa do 'items-center' no pai
            <div className="w-24 h-24 rounded-full mb-4 mt-6 border-4 border-yellow-500 overflow-hidden shadow-lg shadow-yellow-500/50">
              <Image
                src={imageUrl || "/placeholder.svg"}
                alt="Primeiro lugar"
                width={96}
                height={96}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <h4 className="font-bold text-2xl text-white mb-1">NOVO LÍDER!</h4>
          <p className="text-lg text-yellow-200/80">{message}</p>
        </div>
      </motion.div>
    </>
  );
}
