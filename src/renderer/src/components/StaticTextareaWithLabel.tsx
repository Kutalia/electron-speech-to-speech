interface Props {
  label: string
  text: string
}

export const StaticTextareaWithLabel: React.FC<Props> = ({ label, text }) => {
  return (
    <fieldset className="fieldset">
      <legend className="fieldset-legend text-white">{label}</legend>
      <textarea
        className="textarea h-24 text-black resize-none"
        onChange={() => {}}
        value={text}
      ></textarea>
    </fieldset>
  )
}
