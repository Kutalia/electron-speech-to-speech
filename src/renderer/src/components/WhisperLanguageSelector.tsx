import whisperLanguages from '@renderer/utils/whisper-languages.json'
import { useCallback, useMemo } from 'react'
import { Select } from './Select'

function titleCase(str: string) {
  str = str.toLowerCase()
  return (str.match(/\w+.?/g) || [])
    .map((word: string) => {
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join('')
}

export function WhisperLanguageSelector({ language, setLanguage }) {
  const handleLanguageChange = useCallback(
    (value: string) => {
      setLanguage(value || null)
    },
    [setLanguage]
  )

  const options = useMemo(() => {
    const names = Object.values(whisperLanguages).map(titleCase)

    const opts = Object.keys(whisperLanguages).map((key, i) => ({ value: key, label: names[i] }))
    opts.unshift({
      value: '',
      label: 'Auto'
    })

    return opts
  }, [])

  return (
    <Select
      label="Select Captioned Language"
      defaultValue={language}
      onChange={handleLanguageChange}
      options={options}
    />
  )
}
