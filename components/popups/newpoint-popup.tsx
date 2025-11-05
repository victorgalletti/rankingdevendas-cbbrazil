// Arquivo: components/popups/newpoint-popup.tsx

"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { X, DollarSign } from "lucide-react";
import Image from "next/image";

interface PopupProps {
  message: string;
  onClose: () => void;
  imageUrl?: string;
}

// 1. Função renomeada para NewPointPopup
export function NewPointPopup({ message, onClose, imageUrl }: PopupProps) {
  useEffect(() => {
    const timer = setTimeout(() => onClose(), 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <>
      {/* Backdrop with blur */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Popup */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 50 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="fixed top-[20vw] left-[38vw] -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md p-4"
      >
        {/* Money rain animation */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ y: -20, opacity: 0 }}
              animate={{
                y: [0, 150, 300],
                x: [0, Math.random() * 80 - 40],
                opacity: [0, 1, 0],
                rotate: [0, Math.random() * 360],
              }}
              transition={{
                duration: 2.5,
                delay: i * 0.15,
                repeat: Number.POSITIVE_INFINITY,
                repeatDelay: 1.5,
              }}
              className="absolute text-3xl"
              style={{
                left: `${Math.random() * 100}%`,
                top: "0%",
              }}
            >
              💰
            </motion.div>
          ))}
        </div>

        {/* Card content */}
        <div className="relative bg-gradient-to-br from-green-900 via-emerald-950 to-black border-2 border-green-500 rounded-xl shadow-2xl shadow-green-500/40 p-6 text-center flex flex-col items-center">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-green-300/50 hover:text-green-300 transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Dollar sign icon */}
          <div className="absolute -top-8 left-1/2 -translate-x-1/2">
            <div className="relative">
              <DollarSign className="w-16 h-16 text-green-500 stroke-[3] drop-shadow-[0_0_15px_rgba(34,197,94,0.8)]" />
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
                className="absolute inset-0 bg-green-500/30 blur-xl rounded-full"
              />
            </div>
          </div>

          {imageUrl && (
            <div className="w-24 h-24 rounded-full mb-4 mt-6 border-4 border-green-500 overflow-hidden shadow-lg shadow-green-500/50">
              <Image
                src={imageUrl || "/placeholder.svg"}
                alt="Vendedor"
                width={96}
                height={96}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <h4 className="font-bold text-2xl text-white mb-1">NOVA VENDA!</h4>
          <p className="text-lg text-green-200/80">{message}</p>
        </div>
      </motion.div>
    </>
  );
}
