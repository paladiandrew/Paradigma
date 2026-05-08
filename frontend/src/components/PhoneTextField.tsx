import { TextField } from '@mui/material'
import type { TextFieldProps } from '@mui/material'
import { formatRuPhoneInput } from '../utils/ruPhoneFormat'

export type PhoneTextFieldProps = Omit<TextFieldProps, 'onChange' | 'value' | 'type'> & {
  value: string
  onValueChange: (formatted: string) => void
}

export default function PhoneTextField({ value, onValueChange, helperText, placeholder, ...rest }: PhoneTextFieldProps) {
  return (
    <TextField
      {...rest}
      type="text"
      value={value}
      onChange={(e) => onValueChange(formatRuPhoneInput(e.target.value))}
      inputMode="tel"
      autoComplete="tel"
      placeholder={placeholder ?? '+7 (999) 123-45-67'}
      helperText={helperText}
    />
  )
}
