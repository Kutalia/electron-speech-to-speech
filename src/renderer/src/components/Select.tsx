import { useMemo } from 'react'

type Options = { value: string; label: string }[] | string[]

const hasPrimitiveOptions = (options: Options): options is string[] => {
  return typeof options[0] === 'string'
}

interface Props {
  label: string
  onChange: (value: string) => void
  value?: string | null | undefined
  options: Options
  disabledOptions?: string[]
  disabled?: boolean
}

export const Select: React.FC<Props> = ({
  label,
  onChange,
  value,
  options: _options,
  disabledOptions = [],
  disabled
}) => {
  const options = useMemo(
    () =>
      hasPrimitiveOptions(_options) ? _options.map((o) => ({ value: o, label: o })) : _options,
    [_options]
  )

  return (
    <fieldset className="fieldset block w-full">
      <legend className="fieldset-legend text-white">{label}</legend>
      <select
        value={value || ''}
        className="select"
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {options.map(({ value, label }) => (
          <option disabled={disabledOptions?.includes(value)} key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </fieldset>
  )
}
