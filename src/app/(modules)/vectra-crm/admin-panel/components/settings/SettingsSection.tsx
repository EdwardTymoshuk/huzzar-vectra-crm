import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/app/components/ui/accordion'
import { ReactNode } from 'react'

const SettingsSection = ({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) => {
  return (
    <Accordion type="single" collapsible className="w-full font-bold">
      <AccordionItem value={`${title}-list`}>
        <AccordionTrigger>{title}</AccordionTrigger>
        <AccordionContent>{children}</AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

export default SettingsSection
