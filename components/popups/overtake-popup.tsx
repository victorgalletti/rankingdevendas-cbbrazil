"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import Image from "next/image";

interface PopupProps {
  message: string;
  onClose: () => void;
  imageUrl?: string;
}

export function OvertakePopup({ message, onClose, imageUrl }: PopupProps) {
  useEffect(() => {
    const timer = setTimeout(() => onClose(), 8000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    // 1. Fragmento para agrupar backdrop e popup
    <>
      {/* 2. O BACKDROP com blur */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 3. O POPUP */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        // Alterado para z-50 e max-w-sm (vertical)
        className="fixed top-[20vw] left-[40vw] -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm p-4"
      >
        <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-cyan-500 rounded-xl shadow-2xl shadow-cyan-500/30 p-6 overflow-hidden">
          {/* ... (Animação de fundo SVG - sem mudanças) ... */}
          <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
            <svg
              width="200"
              height="200"
              viewBox="0 0 200 200"
              fill="currentColor"
              className="text-cyan-500"
            >
              <path d="M180 100 L160 90 L140 85 L120 83 L100 82 L80 83 L60 85 L40 90 L30 95 L25 100 L30 105 L35 108 L45 110 L60 112 L80 113 L100 113 L120 112 L140 110 L155 107 L165 103 L175 98 Z M100 70 L110 75 L115 80 L118 90 L115 95 L110 98 L100 100 L90 98 L85 95 L82 90 L85 80 L90 75 Z" />
            </svg>
          </div>

          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-white/50 hover:text-white transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* 4. Layout interno modificado para vertical */}
          <div className="flex flex-col items-center gap-4 text-center">
            {imageUrl && (
              // Ajustado margin bottom
              <div className="flex-shrink-0 w-20 h-20 rounded-full border-4 border-cyan-500 overflow-hidden shadow-lg shadow-cyan-500/50 mb-2">
                <Image
                  src={imageUrl || "/placeholder.svg"}
                  alt="Ultrapassagem"
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-2xl text-white mb-1 flex items-center justify-center gap-2">
                <span className="text-3xl">🏎️</span>
                ULTRAPASSAGEM!
              </h4>
              <p className="text-base text-white/80">{message}</p>
            </div>
          </div>

          {/* ... (Animação de linhas - sem mudanças) ... */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 400, opacity: [0, 1, 0] }}
                transition={{
                  duration: 1,
                  delay: i * 0.2,
                  repeat: Number.POSITIVE_INFINITY,
                  repeatDelay: 1,
                }}
                className="absolute h-0.5 bg-cyan-500/50"
                style={{
                  top: `${20 + i * 15}%`,
                  width: "100px",
                }}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </>
  );
}
