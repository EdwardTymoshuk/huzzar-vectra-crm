'use client'

import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { useMemo, useState } from 'react'
import { MdDelete } from 'react-icons/md'

type Props = {
  selected: string[]
  setSelected: (ids: string[]) => void
  devices: { id: string; name: string; serialNumber: string | null }[]
}

/**
 * EquipmentSelector component for searching, selecting and managing devices (equipment) used in an order.
 * - Allows searching devices by serial number.
 * - Displays suggestions after entering at least 3 characters.
 * - Supports adding and removing devices from the selection.
 *
 */
const EquipmentSelector = ({ selected, setSelected, devices }: Props) => {
  // State for current search value and suggestion box visibility
  const [search, setSearch] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  /**
   * Compute suggestions for the search input.
   * Returns devices with serial numbers that match the current search text (case-insensitive).
   */
  const suggestions = useMemo(() => {
    if (search.length < 3) return []
    const lower = search.toLowerCase()
    return devices.filter((d) => d.serialNumber?.toLowerCase().includes(lower))
  }, [search, devices])

  /**
   * Adds a device by its ID to the selected list.
   * Prevents duplicates.
   * Resets the search input and hides suggestions.
   */
  const addDevice = (id: string) => {
    if (!selected.includes(id)) {
      setSelected([...selected, id])
    }
    setSearch('')
    setShowSuggestions(false)
  }

  /**
   * Removes a device from the selected list by its ID.
   */
  const removeDevice = (id: string) => {
    setSelected(selected.filter((i) => i !== id))
  }

  return (
    <div className="space-y-4 relative">
      {/* Search input and device suggestions */}
      <div className="space-y-2">
        <h4 className="font-semibold">Wydane urządzenia</h4>
        <Input
          placeholder="Wpisz numer seryjny (min. 3 znaki)"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            if (e.target.value.length >= 3) {
              setShowSuggestions(true)
            } else {
              setShowSuggestions(false)
            }
          }}
        />
        {/* Suggestion dropdown (visible if suggestions available) */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow max-h-60 overflow-auto">
            {suggestions.map((d) => (
              <div
                key={d.id}
                onClick={() => addDevice(d.id)}
                className="cursor-pointer px-3 py-2 hover:bg-muted text-sm"
              >
                <div className="font-medium whitespace-normal break-words">
                  {d.name}
                </div>
                <div className="text-muted-foreground text-xs whitespace-normal break-words">
                  SN: {d.serialNumber}
                </div>
              </div>
            ))}
          </div>
        )}
        {/* No results message */}
        {showSuggestions && search.length >= 3 && suggestions.length === 0 && (
          <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow px-3 py-2 text-muted-foreground">
            Brak wyników
          </div>
        )}
      </div>

      {/* List of selected devices */}
      {selected.length > 0 && (
        <div className="space-y-2 pt-4">
          <p className="font-medium">Dodane urządzenia</p>
          <div className="flex flex-col gap-2">
            {selected.map((id) => {
              const device = devices.find((d) => d.id === id)
              if (!device) return null
              return (
                <div
                  key={id}
                  className="flex items-center justify-between rounded border px-4 py-2 text-sm font-medium bg-muted text-muted-foreground"
                >
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-foreground font-semibold whitespace-normal break-words">
                      {device.name}
                    </span>
                    <span className="text-xs whitespace-normal break-words">
                      SN: {device.serialNumber}
                    </span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeDevice(id)}
                    className="ml-2 text-danger hover:text-danger"
                    aria-label="Usuń urządzenie"
                  >
                    <MdDelete />
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default EquipmentSelector
