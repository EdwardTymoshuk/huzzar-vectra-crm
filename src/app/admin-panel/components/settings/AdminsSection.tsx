import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/app/components/ui/accordion'
import AddAdminDialog from './AddAdminDialog'
import AdminsTable from './AdminsTable'

const AdminsSection = () => {
  return (
    <Accordion type="single" collapsible className="w-full font-bold">
      <AccordionItem value="admin-list">
        <AccordionTrigger>Administratorzy</AccordionTrigger>
        <AccordionContent>
          <AdminsTable />
          <div className="flex justify-end mt-4">
            <AddAdminDialog />
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

export default AdminsSection
