'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/app/components/ui/accordion'
import { cn } from '@/lib/utils'
import { trpc } from '@/utils/trpc'
import { ChevronDown } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { MdWarehouse } from 'react-icons/md'

/**
 * WarehouseAccordionMenu:
 * - Active highlight is based on `tab=warehouse`.
 * - Selected location highlight is based on `loc=<id>`.
 */
const WarehouseAccordionMenu = () => {
  const { data: locations = [] } = trpc.warehouse.getUserLocations.useQuery()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const currentTab = searchParams.get('tab')
  const currentLoc = searchParams.get('loc')
  const isWarehouseSection =
    currentTab === 'warehouse' ||
    pathname.includes('/admin-panel/warehouse/details') ||
    pathname.includes('/admin-panel/warehouse/history')

  // ---- CASE: only one location → no accordion ----
  if (locations.length === 1) {
    const loc = locations[0]
    const isActive = isWarehouseSection // aktywny tylko gdy tab=warehouse
    return (
      <div
        onClick={() => router.push(`/admin-panel?tab=warehouse&loc=${loc.id}`)}
        className={cn(
          'flex items-center p-3 transition cursor-pointer text-background',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'hover:bg-muted hover:text-accent-foreground'
        )}
      >
        <MdWarehouse className="mr-3 h-5 w-5 shrink-0" />
        <span>Magazyn</span>
      </div>
    )
  }

  // ---- CASE: multiple locations → accordion ----
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="warehouse" className="border-none">
        <AccordionTrigger
          className={cn(
            'flex items-center justify-between p-3 transition cursor-pointer text-background hover:bg-muted hover:text-accent-foreground font-normal text-base',
            isWarehouseSection && 'bg-primary text-primary-foreground'
          )}
        >
          <div className="flex items-center">
            <MdWarehouse className="mr-3 h-5 w-5 shrink-0" />
            <span>Magazyn</span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-70 accordion-trigger-icon" />
        </AccordionTrigger>

        <AccordionContent>
          {locations.map((loc) => {
            const isLocActive = isWarehouseSection && currentLoc === loc.id
            return (
              <div
                key={loc.id}
                onClick={() =>
                  router.push(`/admin-panel?tab=warehouse&loc=${loc.id}`)
                }
                className={cn(
                  'cursor-pointer gap-0 text-base px-12 py-2 transition',
                  isLocActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-background hover:bg-muted hover:text-accent-foreground'
                )}
              >
                {loc.name}
              </div>
            )
          })}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

export default WarehouseAccordionMenu
