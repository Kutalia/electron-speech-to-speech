import whisperLanguages from '@renderer/utils/whisper-languages.json'

function titleCase(str: string) {
  str = str.toLowerCase()
  return (str.match(/\w+.?/g) || [])
    .map((word: string) => {
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join('')
}

export function WhisperLanguageSelector({ language, setLanguage }) {
  const handleLanguageChange: React.ChangeEventHandler<HTMLSelectElement> = (event) => {
    setLanguage(event.target.value || null)
  }

  const names = Object.values(whisperLanguages).map(titleCase)

  return (
    <select
      className="border rounded-lg p-2 max-w-[100px]"
      value={language || undefined}
      onChange={handleLanguageChange}
    >
      <option value={''}>Auto-detect</option>
      {Object.keys(whisperLanguages).map((key, i) => (
        <option key={key} value={key}>
          {names[i]}
        </option>
      ))}
    </select>
  )
}
