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

export function PodiumPopup({ message, onClose, imageUrl }: PopupProps) {
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
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.5 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        // Alterado para z-50 e max-w-sm (vertical)
        className="fixed top-[20vw] left-[40vw] -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm p-4"
      >
        <div className="relative bg-gradient-to-br from-slate-800 to-slate-950 border-2 border-purple-500 rounded-xl shadow-2xl shadow-purple-500/30 p-6 overflow-hidden">
          {/* ... (Animações de fundo SVG - sem mudanças) ... */}
          <div className="absolute -left-4 -top-4 opacity-20 pointer-events-none">
            {/* ... (svg 1) ... */}
          </div>
          <div className="absolute -right-4 -top-4 opacity-20 pointer-events-none">
            {/* ... (svg 2) ... */}
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
              <div className="flex-shrink-0 w-20 h-20 rounded-full border-4 border-purple-500 overflow-hidden shadow-lg shadow-purple-500/50 mb-2">
                <Image
                  src={imageUrl || "/placeholder.svg"}
                  alt="Pódio"
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-2xl text-white mb-1 flex items-center justify-center gap-2">
                <span className="text-3xl">🏁</span>
                NOVO NO PÓDIO!
              </h4>
              <p className="text-base text-white/80">{message}</p>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
