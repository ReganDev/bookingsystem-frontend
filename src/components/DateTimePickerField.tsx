import { useState } from 'react'
import {
  DateTimePickerModal,
  formatDateTimeLabel,
} from './DateTimePickerModal'

export function DateTimePickerField({
  id,
  label,
  value,
  onChange,
  required = false,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
}) {
  const [open, setOpen] = useState(false)
  const display = formatDateTimeLabel(value)

  return (
    <>
      <div className="form-row">
        <label htmlFor={id}>{label}</label>
        <button
          id={id}
          type="button"
          className={`datetime-picker-trigger${display ? ' has-value' : ''}`}
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-required={required || undefined}
        >
          {display || 'Select date & time'}
        </button>
      </div>

      <DateTimePickerModal
        open={open}
        value={value}
        onClose={() => setOpen(false)}
        onConfirm={onChange}
      />
    </>
  )
}
