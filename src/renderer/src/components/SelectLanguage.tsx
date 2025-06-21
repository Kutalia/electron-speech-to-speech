import { getVoices } from '@renderer/utils/helpers'
import { useMemo } from 'react'

interface Props {
  label: string
  onChange: (lang: string) => void
  defaultValue: string
}

export const SelectLanguage: React.FC<Props> = ({ label, onChange, defaultValue }) => {
  const voices = useMemo(getVoices, [])

  return <fieldset className="fieldset block">
    <legend className="fieldset-legend text-white">{label}</legend>
    <select defaultValue={defaultValue} className="select" onChange={(e) => onChange(e.target.value)}>
      {Object.keys(voices).map((lang) => (
        <option key={lang} value={voices[lang]![0].language.family}>{lang}</option>
      ))}
    </select >
    <span className="label text-white">{label}</span>
  </fieldset>
}