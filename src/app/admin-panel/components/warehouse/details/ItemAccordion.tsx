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
  mode?: 'warehouse' | 'technicians' | 'orders' | 'returned'
}

/**
 * ItemAccordionList:
 * - Renders an accordion list of warehouse items (devices or materials).
 * - Devices use serial number as identifier; materials use quantity and index.
 * - Expands each row to show full history using ItemHistoryList.
 */
const ItemAccordionList = ({ items }: Props) => {
  const { searchTerm } = useSearch()

  const isMaterial = items?.[0]?.itemType === 'MATERIAL'

  return (
    <div className="w-full">
      {/* Table header */}
      <div
        className={`grid ${
          isMaterial
            ? 'grid-cols-[0.5fr_2fr_1fr_1fr_0.5fr]'
            : 'grid-cols-[0.5fr_1fr_1fr_1fr_0.5fr]'
        } gap-2 text-center text-xs px-2 py-1 font-medium text-muted-foreground border-b`}
      >
        <span className="text-left">Lp</span>
        <span>{isMaterial ? 'Indeks' : 'Numer seryjny'}</span>
        <span>{isMaterial ? 'Ilość' : 'Data przyjęcia'}</span>
        <span>Status</span>
        <span />
      </div>

      {/* Accordion list */}
      <Accordion type="single" collapsible className="w-full">
        {items
          .filter((item) =>
            isMaterial
              ? item.index
                  ?.toLowerCase()
                  .includes(searchTerm.trim().toLowerCase())
              : item.serialNumber
                  ?.toLowerCase()
                  .includes(searchTerm.trim().toLowerCase())
          )
          .map((item, idx) => (
            <AccordionItem key={item.id} value={item.id}>
              <AccordionTrigger
                className={`grid ${
                  isMaterial
                    ? 'grid-cols-[0.5fr_2fr_1fr_1fr_0.5fr]'
                    : 'grid-cols-[0.5fr_1fr_1fr_1fr_0.5fr]'
                } gap-2 text-center text-sm px-2`}
              >
                <span className="text-left">{idx + 1}</span>
                <span>
                  <Highlight
                    highlightClassName="bg-yellow-200"
                    searchWords={[searchTerm]}
                    autoEscape={true}
                    textToHighlight={
                      isMaterial
                        ? item.index ?? item.name
                        : item.serialNumber ?? '—'
                    }
                  />
                </span>
                <span>
                  {isMaterial
                    ? `${item.quantity} ${item.unit.toLowerCase()}`
                    : format(item.createdAt, 'dd.MM.yyyy')}
                </span>
                <span>
                  <Badge variant="outline">
                    {devicesStatusMap[item.status]}
                  </Badge>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <ItemHistoryList
                  {...(isMaterial
                    ? { name: item.name }
                    : { warehouseItemId: item.id })}
                />
              </AccordionContent>
            </AccordionItem>
          ))}
      </Accordion>
    </div>
  )
}

export default ItemAccordionList
