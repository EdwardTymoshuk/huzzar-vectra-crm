// src/app/(technician)/components/warehouse/details/TechItemAccordion.tsx
'use client'

import ItemHistoryList from '@/app/components/shared/warehouse/ItemHistoryList'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/app/components/ui/accordion'
import { useSearch } from '@/app/context/SearchContext'
import { WarehouseWithRelations } from '@/types'
import { format } from 'date-fns'
import Highlight from 'react-highlight-words'

type Props = {
  items: WarehouseWithRelations[]
}

/**
 * TechItemAccordion
 * -----------------
 * • Reusable accordion list for technician view.
 * • Devices show single-instance history via warehouseItemId.
 * • Materials show scoped technician history via item name.
 * • Uses SearchContext to filter items by serial/index.
 */
const TechItemAccordion = ({ items }: Props) => {
  const { searchTerm } = useSearch()
  const isMaterial = items?.[0]?.itemType === 'MATERIAL'

  return (
    <div className="w-full">
      {/* Table header */}
      <div
        className={`grid ${
          isMaterial
            ? 'grid-cols-[0.5fr_2fr_1fr_1fr_0.5fr]'
            : 'grid-cols-[0.5fr_1fr_1fr_0.5fr]'
        } gap-2 text-center text-xs px-2 py-1 font-medium text-muted-foreground border-b`}
      >
        <span className="text-left">Lp</span>
        <span>{isMaterial ? 'Indeks' : 'Numer seryjny'}</span>
        <span>{isMaterial ? 'Ilość' : 'Data przyjęcia'}</span>
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
                    : 'grid-cols-[0.5fr_1fr_1fr_0.5fr]'
                } gap-2 text-center text-sm px-2`}
              >
                <span className="text-left">{idx + 1}</span>
                <span>
                  <Highlight
                    highlightClassName="bg-yellow-200"
                    searchWords={[searchTerm]}
                    autoEscape
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
                    : format(item.updatedAt, 'dd.MM.yyyy')}
                </span>
              </AccordionTrigger>

              {/* Accordion content with item history */}
              <AccordionContent>
                {isMaterial ? (
                  <ItemHistoryList name={item.name} dataOverride={undefined} />
                ) : (
                  <ItemHistoryList warehouseItemId={item.id} />
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
      </Accordion>
    </div>
  )
}

export default TechItemAccordion
