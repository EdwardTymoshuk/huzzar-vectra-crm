'use client'

import { Button } from '@/app/components/ui/button'
import { useState } from 'react'
import { MdFileUpload } from 'react-icons/md'
import ImportOrdersModal from './ImportOrdersModal'

/**
 * ImportOrders component:
 * - Opens modal with drag & drop and file picker
 */
const ImportOrders = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <Button variant="warning" onClick={() => setIsModalOpen(true)}>
        <MdFileUpload />
        <span className="hidden lg:inline">Wczytaj z pliku</span>
      </Button>
      <ImportOrdersModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}

export default ImportOrders
