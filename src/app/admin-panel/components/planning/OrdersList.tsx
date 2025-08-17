'use client'

import SearchInput from '@/app/components/shared/SearchInput'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/app/components/ui/tabs'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import OrderTable from './OrdersTable'

const MapView = dynamic(() => import('../../components/planning/MapView'), {
  ssr: false,
})

const OrdersList = () => {
  const [activeTab, setActiveTab] = useState<'list' | 'assignments'>('list')
  const [searchTerm, setSearchTerm] = useState('')
  const [mapNonce, setMapNonce] = useState(0)

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col w-full items-center gap-4">
        <h2 className="text-lg font-semibold">Nieprzypisane zlecenia</h2>

        <Tabs
          defaultValue="list"
          className="w-full space-y-4"
          onValueChange={(value) => {
            const v = value as 'list' | 'assignments'
            setActiveTab(v)
            if (v === 'assignments') setMapNonce((n) => n + 1)
          }}
        >
          <TabsList>
            <TabsTrigger value="list">Lista</TabsTrigger>
            <TabsTrigger value="assignments">Mapa</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            <SearchInput
              placeholder="Szukaj zlecenie"
              value={searchTerm}
              onChange={setSearchTerm}
            />
            <OrderTable />
          </TabsContent>

          <TabsContent value="assignments" className="space-y-4" />
        </Tabs>

        {activeTab === 'assignments' && (
          <MapView key={`map-${mapNonce}`} isVisible />
        )}
      </div>
    </div>
  )
}

export default OrdersList
