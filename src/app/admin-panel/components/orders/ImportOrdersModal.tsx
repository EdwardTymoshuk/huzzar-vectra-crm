'use client'

import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { DragEvent, useState } from 'react'
import { MdFileUpload } from 'react-icons/md'

/**
 * ImportOrdersModal component:
 * - Allows file upload using drag & drop or file picker
 */
const ImportOrdersModal = ({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setSelectedFile(file)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) setSelectedFile(file)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Wczytaj plik ze zleceniami</DialogTitle>
          <DialogDescription>
            Przeciągnij plik Excel lub kliknij, aby wybrać z komputera.
          </DialogDescription>
        </DialogHeader>

        {/* Drag & Drop Area */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center cursor-pointer"
          onClick={() => document.getElementById('fileInput')?.click()}
        >
          <MdFileUpload className="text-5xl mx-auto text-gray-400" />
          <p className="mt-2 text-gray-500">
            {selectedFile
              ? selectedFile.name
              : 'Przeciągnij plik lub kliknij tutaj'}
          </p>
          <input
            id="fileInput"
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Action Button */}
        <Button
          className="w-full"
          disabled={!selectedFile}
          onClick={() => {
            if (selectedFile) {
              console.log('Wczytano plik:', selectedFile.name)
              onClose()
            }
          }}
        >
          Wczytaj plik
        </Button>
      </DialogContent>
    </Dialog>
  )
}

export default ImportOrdersModal
