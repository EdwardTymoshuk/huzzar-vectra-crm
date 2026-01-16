'use client'

import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'
import { useEffect, useRef } from 'react'

interface Props {
  open: boolean
  onScan: (value: string) => void
  onClose: () => void
}

/**
 * BarcodeScannerDialog
 * ------------------------------------------------------
 * Camera-based barcode scanner optimized for mobile devices.
 * - Environment camera
 * - Torch (if supported)
 * - 2x zoom (if supported)
 * - Single-scan lock
 */
const BarcodeScannerDialog = ({ open, onScan, onClose }: Props) => {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const scanLockedRef = useRef(false)

  /* ----------------------------- helpers ----------------------------- */

  const enableTorchAndZoom = async (): Promise<void> => {
    const video = videoRef.current
    if (!video) return

    const stream = video.srcObject
    if (!(stream instanceof MediaStream)) return

    const track = stream.getVideoTracks()[0]
    if (!track) return

    const capabilities = track.getCapabilities() as MediaTrackCapabilities & {
      torch?: boolean
      zoom?: { min: number; max: number }
    }

    const advancedConstraints: unknown[] = []

    if (capabilities.torch) {
      advancedConstraints.push({ torch: true })
    }

    if (capabilities.zoom) {
      advancedConstraints.push({
        zoom: Math.min(2, capabilities.zoom.max),
      })
    }

    if (advancedConstraints.length === 0) return

    try {
      await track.applyConstraints({
        advanced: advancedConstraints as MediaTrackConstraintSet[],
      })
    } catch {
      // silently ignore unsupported constraints
    }
  }

  const stopCamera = (): void => {
    const video = videoRef.current
    if (!video) return

    const stream = video.srcObject
    if (stream instanceof MediaStream) {
      stream.getTracks().forEach((t) => t.stop())
    }

    video.srcObject = null
  }

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

      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.frequency.value = 880
      gain.gain.value = 0.1

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start()
      osc.stop(ctx.currentTime + 0.12)

      osc.onended = () => ctx.close()
    } catch {
      /* ignore */
    }
  }

  const vibrate = (): void => {
    if ('vibrate' in navigator) navigator.vibrate(80)
  }

  /* ----------------------------- effect ----------------------------- */

  useEffect(() => {
    if (!open) return

    scanLockedRef.current = false

    const hints = new Map()
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.EAN_13,
    ])

    const reader = new BrowserMultiFormatReader(hints, {
      delayBetweenScanAttempts: 120,
    })

    readerRef.current = reader
    let cancelled = false

    const start = async (): Promise<void> => {
      await new Promise((r) => requestAnimationFrame(r))
      if (cancelled || !videoRef.current) return

      reader.decodeFromConstraints(
        {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        videoRef.current,
        async (result) => {
          if (!result || scanLockedRef.current) return

          scanLockedRef.current = true

          playBeep()
          vibrate()

          onScan(result.getText())

          stopCamera()
          onClose()
        }
      )

      await enableTorchAndZoom()
    }

    start()

    return () => {
      cancelled = true
      stopCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  /* ----------------------------- UI ----------------------------- */

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>Skanuj kod</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <video
            ref={videoRef}
            className="w-full h-[320px] object-cover bg-black"
            playsInline
            muted
          />

          {/* Scanner frame */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="scanner-frame">
              <span className="corner tl" />
              <span className="corner tr" />
              <span className="corner bl" />
              <span className="corner br" />
            </div>
          </div>
        </div>

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
