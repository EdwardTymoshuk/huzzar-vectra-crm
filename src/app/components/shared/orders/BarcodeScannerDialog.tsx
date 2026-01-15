'use client'

import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { useEffect, useRef } from 'react'

interface Props {
  open: boolean
  onScan: (value: string) => void
  onClose: () => void
}

/**
 * BarcodeScannerDialog
 * ------------------------------------------------------
 * Camera-based barcode scanner for mobile technician workflows.
 * Properly starts and stops camera stream on open/close.
 */
const BarcodeScannerDialog = ({ open, onScan, onClose }: Props) => {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)

  useEffect(() => {
    if (!open) return

    let cancelled = false

    const startCamera = async (): Promise<void> => {
      // Wait for Dialog content to be mounted in DOM
      await new Promise((resolve) => requestAnimationFrame(resolve))

      if (cancelled || !videoRef.current) return

      const reader = new BrowserMultiFormatReader()
      readerRef.current = reader

      reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
        if (!result) return

        playBeep()
        vibrate()

        onScan(result.getText())
        stopCamera()
        onClose()
      })
    }

    startCamera()

    return () => {
      cancelled = true
      stopCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  /**
   * Stops all active video tracks to release camera properly.
   */
  const stopCamera = (): void => {
    const video = videoRef.current
    if (!video) return

    const stream = video.srcObject
    if (!(stream instanceof MediaStream)) return

    stream.getTracks().forEach((track) => track.stop())
    video.srcObject = null
  }

  /**
   * Plays a short confirmation beep using Web Audio API.
   */
  const playBeep = (): void => {
    try {
      const AudioContext =
        window.AudioContext ||
        (
          window as unknown as {
            webkitAudioContext?: typeof window.AudioContext
          }
        ).webkitAudioContext

      if (!AudioContext) return

      const context = new AudioContext()
      const oscillator = context.createOscillator()
      const gain = context.createGain()

      oscillator.type = 'sine'
      oscillator.frequency.value = 880 // Hz – short confirmation tone
      gain.gain.value = 0.1

      oscillator.connect(gain)
      gain.connect(context.destination)

      oscillator.start()
      oscillator.stop(context.currentTime + 0.12)

      oscillator.onended = () => {
        context.close()
      }
    } catch {
      // Silently ignore audio errors (e.g. browser restrictions)
    }
  }

  /**
   * Triggers short device vibration if supported.
   */
  const vibrate = (): void => {
    if ('vibrate' in navigator) {
      navigator.vibrate(80)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>Skanuj kod</DialogTitle>
        </DialogHeader>

        <video
          ref={videoRef}
          className="w-full h-[320px] object-cover bg-black"
          playsInline
        />

        <div className="p-4">
          <Button variant="outline" className="w-full" onClick={onClose}>
            Anuluj
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default BarcodeScannerDialog
