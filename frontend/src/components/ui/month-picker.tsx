import * as React from "react"
import { format } from "date-fns"
import { es } from 'date-fns/locale'
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface MonthPickerProps {
  selected: Date | undefined
  onSelect: (date: Date | undefined) => void
  onClose?: () => void
  fromYear?: number
  toYear?: number
}

export function MonthPicker({
  selected,
  onSelect,
  onClose,
  fromYear = 2000,
  toYear = new Date().getFullYear() + 1,
}: MonthPickerProps) {
  const [date, setDate] = React.useState<Date | undefined>(selected)

  const years = React.useMemo(() => {
    const years = []
    for (let year = fromYear; year <= toYear; year++) {
      years.push(year)
    }
    return years
  }, [fromYear, toYear])

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(2000, i, 1), 'MMMM', { locale: es })
  }))

  return (
    <div className="grid grid-cols-4 gap-2 p-2 w-[300px]">
      <div className="col-span-4 flex justify-end">
        <Button variant="ghost" className="h-8 w-8 p-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      {years.map((year) => (
        <Button
          key={year}
          variant={
            date && date.getFullYear() === year ? "default" : "ghost"
          }
          onClick={() => {
            const newDate = date ? new Date(date) : new Date()
            newDate.setFullYear(year)
            setDate(newDate)
            onSelect(newDate)
          }}
          className="h-8 w-full"
        >
          {year}
        </Button>
      ))}
      
      <div className="col-span-4 grid grid-cols-4 gap-2 mt-2">
        {months.map((month) => (
          <Button
            key={month.value}
            variant={
              date && date.getMonth() === month.value ? "default" : "outline"
            }
            onClick={() => {
              const newDate = date ? new Date(date) : new Date()
              newDate.setMonth(month.value)
              setDate(newDate)
              onSelect(newDate)
            }}
            className="h-8"
          >
            {month.label.charAt(0).toUpperCase() + month.label.slice(1, 3)}
          </Button>
        ))}
      </div>
    </div>
  )
}
