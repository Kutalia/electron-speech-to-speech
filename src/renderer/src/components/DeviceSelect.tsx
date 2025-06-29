import { useEffect, useState } from 'react'

interface Props {
  kind: MediaDeviceKind
  onChange: (deviceId: MediaDeviceInfo['deviceId']) => void
}

export const DeviceSelect: React.FC<Props> = ({ kind, onChange }) => {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>()

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((result) => {
      setDevices(result.filter((d) => d.kind === 'audioinput' || d.kind === 'audiooutput'))
    })
  }, [])

  return (
    devices && (
      <select defaultValue="default" onChange={(e) => onChange(e.target.value)} className="select">
        {devices
          .filter((d) => d.kind === kind)
          .map(({ label, deviceId }) => (
            <option key={deviceId} value={deviceId}>
              {label}
            </option>
          ))}
      </select>
    )
  )
}
