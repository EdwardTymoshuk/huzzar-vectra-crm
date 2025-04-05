'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/app/components/ui/accordion'
import { Badge } from '@/app/components/ui/badge'
import { useSearch } from '@/app/context/SearchContext'
import { devicesStatusMap } from '@/lib/constants'
import { WarehouseWithRelations } from '@/types'
import { format } from 'date-fns'
import Highlight from 'react-highlight-words'
import ItemHistoryList from './ItemHistoryList'

type Props = {
  items: WarehouseWithRelations[]
  mode?: 'warehouse' | 'technicians' | 'orders'
}

/**
 * Accordion listing each item with serial number and status.
 * Clicking expands to show full history.
 */
const ItemAccordionList = ({ items, mode }: Props) => {
  const { searchTerm } = useSearch()

  return (
    <div className="w-full">
      {/* Table header */}
      {mode === 'orders' ? (
        <div className="grid grid-cols-[0.5fr_1fr_0.5fr_1fr_1.5fr_0.5fr] gap-2 text-center text-xs px-2 py-1 font-medium text-muted-foreground border-b">
          <span className="text-left">Lp</span>
          <span>Numer seryjny</span>
          <span>Data wydania</span>
          <span>Technik</span>
          <span>Zlecenie</span>
          <span /> {/* Placeholder for chevron */}
        </div>
      ) : (
        <div className="grid grid-cols-[0.5fr_1fr_1fr_1fr_0.5fr] gap-2 text-center text-xs px-2 py-1 font-medium text-muted-foreground border-b">
          <span className="text-left">Lp</span>
          <span>Numer seryjny</span>
          <span>Data przyjęcia</span>
          <span>Status</span>
          <span />
        </div>
      )}

      {/* Accordion list */}
      <Accordion type="single" collapsible className="w-full">
        {items
          .filter((item) =>
            item.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .map((item, idx) => (
            <AccordionItem key={item.id} value={item.id}>
              {mode === 'orders' ? (
                <AccordionTrigger className="grid grid-cols-[0.5fr_1fr_0.5fr_1fr_1.5fr_0.5fr] gap-2 text-center text-sm px-2">
                  <span className="text-left">{idx + 1}</span>
                  <span>
                    {
                      <Highlight
                        highlightClassName="bg-yellow-200"
                        searchWords={[searchTerm]}
                        autoEscape={true}
                        textToHighlight={item.serialNumber ?? '—'}
                      />
                    }
                  </span>
                  <span>{format(item.updatedAt, 'dd.MM.yyyy')}</span>
                  <span>
                    <Highlight
                      highlightClassName="bg-yellow-200"
                      searchWords={[searchTerm]}
                      autoEscape={true}
                      textToHighlight={item.assignedTo?.name ?? '—'}
                    />
                  </span>
                </AccordionTrigger>
              ) : (
                <AccordionTrigger className="grid grid-cols-[0.5fr_1fr_1fr_1fr_0.5fr] gap-2 text-center text-sm px-2">
                  <span className="text-left">{idx + 1}</span>
                  <span>
                    {
                      <Highlight
                        highlightClassName="bg-yellow-200"
                        searchWords={[searchTerm]}
                        autoEscape={true}
                        textToHighlight={item.serialNumber ?? '—'}
                      />
                    }
                  </span>
                  <span>{format(item.createdAt, 'dd.MM.yyyy')}</span>
                  <span>
                    <Badge variant="outline">
                      {devicesStatusMap[item.status]}
                    </Badge>
                  </span>
                </AccordionTrigger>
              )}
              <AccordionContent>
                <ItemHistoryList warehouseItemId={item.id} />
              </AccordionContent>
            </AccordionItem>
          ))}
      </Accordion>
    </div>
  )
}

export default ItemAccordionList
