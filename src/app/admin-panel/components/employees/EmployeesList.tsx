'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/app/components/ui/accordion'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { Skeleton } from '@/app/components/ui/skeleton'
import { userStatusColorMap, userStatusNameMap } from '@/lib/constants'
import { trpc } from '@/utils/trpc'
import { Prisma } from '@prisma/client'
import { useState } from 'react'
import Highlight from 'react-highlight-words'
import { FaLock, FaLockOpen } from 'react-icons/fa6'
import { MdDelete, MdEdit } from 'react-icons/md'
import { toast } from 'sonner'
import EmployeeEditDialog from './EmployeeEditDialog'

/**
 * This type reflects the shape of user data returned by Prisma's findMany
 * with the given 'select'. It ensures no usage of 'any' for users.
 */
type EmployeeUser = Prisma.UserGetPayload<{
  select: {
    id: true
    email: true
    phoneNumber: true
    name: true
    role: true
    status: true
  }
}>

/**
 * EmployeesList component:
 * - Displays a list of employees as an accordion.
 * - Allows searching employees based on name, email, and phone number.
 * - Provides edit, lock, and delete options for each employee.
 */
const EmployeesList = ({ searchTerm }: { searchTerm: string }) => {
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null)
  const [editingEmployee, setEditingEmployee] = useState<string | null>(null)
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<EmployeeUser | null>(null)

  const utils = trpc.useUtils()

  // Fetch employees from API
  const { data: employees = [], isLoading: isLoadingEmployee } =
    trpc.user.getTechnicians.useQuery()

  // Filter employees based on search term
  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.phoneNumber.includes(searchTerm)
  )

  // Toggle status mutation (ACTIVE <-> SUSPENDED)
  const toggleStatusMutation = trpc.user.toggleUserStatus.useMutation({
    onSuccess: () => {
      toast.success('Status użytkownika został zaktualizowany.')
      utils.user.getTechnicians.invalidate()
    },
    onError: () => toast.error('Błąd podczas aktualizacji statusu.'),
  })

  // Delete mutation
  const deleteUserMutation = trpc.user.deleteUser.useMutation({
    onSuccess: () => {
      toast.success('Użytkownik został usunięty.')
      utils.user.getTechnicians.invalidate()
      setDeleteDialogOpen(false)
    },
    onError: () => toast.error('Błąd podczas usuwania użytkownika.'),
  })

  // Render loading state
  if (isLoadingEmployee) {
    return (
      <div className="space-y-4 pt-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-md" />
        ))}
      </div>
    )
  }

  return (
    <div className="w-full bg-card p-4 rounded-lg shadow-sm">
      {filteredEmployees.length === 0 ? (
        <p className="text-center text-gray-500">Brak wyników</p>
      ) : (
        <Accordion
          type="single"
          collapsible
          className="w-full"
          value={expandedEmployee || ''}
          onValueChange={(value) => setExpandedEmployee(value || null)}
        >
          {filteredEmployees.map((employee) => (
            <AccordionItem key={employee.id} value={employee.id}>
              <AccordionTrigger>
                <div className="flex justify-between w-full">
                  <span>
                    <Highlight
                      highlightClassName="bg-yellow-200"
                      searchWords={[searchTerm]}
                      autoEscape={true}
                      textToHighlight={employee.name}
                    />
                  </span>
                  <span className="text-gray-500 text-sm">
                    {employee.phoneNumber}
                  </span>
                  <span className="text-gray-500 text-sm pr-4">
                    {employee.email}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="p-4 space-y-3 border rounded-lg">
                  <p>
                    <strong>Imię i nazwisko:</strong> {employee.name}
                  </p>
                  <p>
                    <strong>Rola:</strong> {employee.role}
                  </p>
                  <p>
                    <strong>Identyfikator:</strong>{' '}
                    {employee.identyficator ?? 'Brak'}
                  </p>
                  <p>
                    <strong>Login:</strong> {employee.email}
                  </p>
                  <div>
                    <strong>Status:</strong>{' '}
                    <Badge className={userStatusColorMap[employee.status]}>
                      {userStatusNameMap[employee.status]}
                    </Badge>
                  </div>

                  {/* Buttons */}
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="success"
                      onClick={() => {
                        setSelectedUser(employee)
                        setEditingEmployee(employee.id)
                      }}
                    >
                      <MdEdit className="" />
                      Edytuj
                    </Button>
                    <Button
                      variant="warning"
                      onClick={() =>
                        toggleStatusMutation.mutate({ id: employee.id })
                      }
                    >
                      {employee.status === 'ACTIVE' ? (
                        <>
                          <FaLock className="" />
                          Zablokuj
                        </>
                      ) : (
                        <>
                          <FaLockOpen className="" />
                          Odblokuj
                        </>
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setSelectedUser(employee)
                        setDeleteDialogOpen(true)
                      }}
                    >
                      <MdDelete className="" />
                      Usuń
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* Employee Edit Dialog */}
      {editingEmployee && selectedUser && (
        <EmployeeEditDialog
          employee={selectedUser}
          onClose={() => {
            setSelectedUser(null)
            setEditingEmployee(null)
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Czy na pewno chcesz usunąć tego użytkownika?
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Anuluj
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!selectedUser) return
                deleteUserMutation.mutate({ id: selectedUser.id })
              }}
            >
              Usuń
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default EmployeesList
