'use client'

import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MdDeleteOutline, MdQrCodeScanner } from 'react-icons/md'
import { toast } from 'sonner'

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
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const lastEmitRef = useRef<{ value: string; ts: number } | null>(null)
  const [detectedCodes, setDetectedCodes] = useState<string[]>([])
  const [selectedCode, setSelectedCode] = useState<string>('')

  useEffect(() => {
    if (!open) return

    // Reset session state on open.
    setDetectedCodes([])
    setSelectedCode('')
    lastEmitRef.current = null
  }, [open])

  useEffect(() => {
    if (!open) {
      stopCamera()
      return
    }

    const start = async () => {
      if (!videoEl) return

      const reader = new BrowserMultiFormatReader()
      readerRef.current = reader

      try {
        await reader.decodeFromVideoDevice(undefined, videoEl, (result) => {
          if (!result) return

          const code = result.getText().trim()
          if (!code) return

          // Debounce very fast repeats from same frame.
          const now = Date.now()
          if (
            lastEmitRef.current &&
            lastEmitRef.current.value === code &&
            now - lastEmitRef.current.ts < 900
          ) {
            return
          }
          lastEmitRef.current = { value: code, ts: now }

          setDetectedCodes((prev) => {
            if (prev.includes(code)) return prev
            playBeep()
            vibrate()
            return [code, ...prev].slice(0, 12)
          })
          setSelectedCode((prev) => prev || code)
        })
      } catch (error) {
        console.error('Camera start failed:', error)
        toast.error(
          'Nie udało się uruchomić kamery. Sprawdź uprawnienia do aparatu.'
        )
      }
    }
    void start()

    return () => stopCamera()
  }, [open, videoEl])

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

  const hasCodes = detectedCodes.length > 0
  const canApply = Boolean(selectedCode)
  const selectedLabel = useMemo(
    () => detectedCodes.find((code) => code === selectedCode) ?? selectedCode,
    [detectedCodes, selectedCode]
  )

  const handleApply = () => {
    if (!selectedCode) return
    onScan(selectedCode)
    onClose()
  }

  const handleDeleteCode = (code: string) => {
    setDetectedCodes((prev) => prev.filter((value) => value !== code))
    setSelectedCode((prev) => (prev === code ? '' : prev))
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="p-0 overflow-hidden max-w-md">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>Skanuj kod</DialogTitle>
        </DialogHeader>

        <div className="px-4">
          <div className="relative overflow-hidden rounded-md border border-border">
            <video
              ref={(el) => {
                videoRef.current = el
                setVideoEl(el)
              }}
              className="w-full h-[300px] object-cover bg-black"
              playsInline
              autoPlay
              muted
            />

            {/* Center guide line */}
            <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2">
              <div className="h-[2px] bg-primary/85 shadow-[0_0_10px_hsl(var(--primary))]" />
            </div>

            {/* Subtle frame */}
            <div className="pointer-events-none absolute inset-3 border border-primary/40 rounded-md" />
          </div>
        </div>

        <div className="px-4 pb-4 space-y-3">
          <div className="rounded-md border border-border/70 bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground mb-2">
              Wykryte kody ({detectedCodes.length})
            </p>

            {hasCodes ? (
              <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                {detectedCodes.map((code) => {
                  const active = selectedCode === code
                  return (
                    <div
                      key={code}
                      className={`flex items-center gap-2 rounded-md border px-2 py-1.5 ${
                        active
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-background'
                      }`}
                    >
                      <button
                        type="button"
                        className="flex-1 text-left text-sm font-mono truncate"
                        onClick={() => setSelectedCode(code)}
                        title={code}
                      >
                        {code}
                      </button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-danger hover:text-danger"
                        onClick={() => handleDeleteCode(code)}
                      >
                        <MdDeleteOutline className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Zeskanuj kod i wybierz właściwy z listy.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDetectedCodes([])
                setSelectedCode('')
              }}
              disabled={!hasCodes}
            >
              Wyczyść listę
            </Button>
            <Button
              type="button"
              onClick={handleApply}
              disabled={!canApply}
              title={selectedLabel}
            >
              Wybierz kod
            </Button>
          </div>

          <Button variant="outline" className="w-full gap-2" onClick={onClose}>
            <MdQrCodeScanner className="h-4 w-4" />
            Anuluj
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default BarcodeScannerDialog
