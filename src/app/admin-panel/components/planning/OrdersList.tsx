'use client'

import SearchInput from '@/app/components/SearchInput'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/app/components/ui/tabs'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import OrderTable from './OrdersTable'

// Dynamically import MapView to disable server-side rendering.
const MapView = dynamic(() => import('../../components/planning/MapView'), {
  ssr: false,
})

/**
 * OrdersList displays unassigned orders in two views:
 * a table view and a map view. Users can switch between tabs.
 *
 */
const OrdersList = () => {
  const [activeTab, setActiveTab] = useState<'list' | 'assignments'>('list')
  const [searchTerm, setSearchTerm] = useState('')

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col w-full items-center gap-4">
        <h2 className="text-lg font-semibold">Nieprzypisane zlecenia</h2>
        <Tabs
          defaultValue="list"
          className="w-full space-y-4"
          onValueChange={(value) =>
            setActiveTab(value as 'list' | 'assignments')
          }
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
          <TabsContent value="assignments" className="space-y-4 "></TabsContent>
        </Tabs>
        {activeTab === 'assignments' && <MapView isVisible={true} />}
      </div>
    </div>
  )
}

export default OrdersList
