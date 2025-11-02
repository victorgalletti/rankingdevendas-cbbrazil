"use client"

import type React from "react"

import { useEffect, useRef } from "react"

export type AudioEvent = "overtake" | "podium" | "first-place" | "new-point"

interface AudioControllerProps {
  playRequest: AudioEvent | null
  onPlayComplete: () => void
}

export function AudioController({ playRequest, onPlayComplete }: AudioControllerProps) {
  const overtakeAudioRef = useRef<HTMLAudioElement>(null)
  const specialEventAudioRef = useRef<HTMLAudioElement>(null)
  const newPointAudioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    if (!playRequest) {
      return
    }

    let audioRef: React.RefObject<HTMLAudioElement> | null = null

    switch (playRequest) {
      case "overtake":
        audioRef = overtakeAudioRef
        break
      case "podium":
        audioRef = specialEventAudioRef
        break
      case "first-place":
        audioRef = specialEventAudioRef
        break
      case "new-point":
        audioRef = newPointAudioRef
        break
    }

    if (audioRef?.current) {
      audioRef.current.play().catch((error) => {
        console.warn("Audio autoplay foi bloqueado:", error)
      })
    }

    onPlayComplete()
  }, [playRequest, onPlayComplete])

  return (
    <>
      <audio
        ref={overtakeAudioRef}
        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/git-blob/prj_BD9hbqdvwSPitpsbELS6XQGpmXjX/ibEIjALrDk5GslLPWzu7z1/public/audios/f1.m4a"
        preload="auto"
      />
      <audio
        ref={specialEventAudioRef}
        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/git-blob/prj_BD9hbqdvwSPitpsbELS6XQGpmXjX/0dz9vu9Qglx_VYlJNAXvH9/public/audios/clash.m4a"
        preload="auto"
      />
      <audio
        ref={newPointAudioRef}
        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/som_da_kiwify-GuN0bZIONBhj5sLVhVSbJOU44MugxZ.mp3"
        preload="auto"
      />
    </>
  )
}
