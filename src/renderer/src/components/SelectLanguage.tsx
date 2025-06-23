interface Props {
  label: string
  onChange: (lang: string) => void
  defaultValue: string
  options: { value: string, label: string }[]
  disabledOptions?: string[]
}

export const SelectLanguage: React.FC<Props> = ({ label, onChange, defaultValue, options, disabledOptions = [] }) => {
  return <fieldset className="fieldset block">
    <legend className="fieldset-legend text-white">{label}</legend>
    <select defaultValue={defaultValue} className="select" onChange={(e) => onChange(e.target.value)}>
      {options.map(({ value, label }) => (
        <option disabled={disabledOptions.indexOf(value) !== -1} key={value} value={value}>{label}</option>
      ))}
    </select >
    <span className="label text-white">{label}</span>
  </fieldset>
}