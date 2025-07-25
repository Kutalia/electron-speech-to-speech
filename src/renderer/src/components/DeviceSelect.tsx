import { useEffect, useState } from 'react'

interface Props {
  kind: MediaDeviceKind
  value?: string | null | undefined
  onChange: (deviceId: MediaDeviceInfo['deviceId']) => void
  disabled?: boolean
}

export const DeviceSelect: React.FC<Props> = ({ kind, value, onChange, disabled }) => {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>()

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((result) => {
      setDevices(result.filter((d) => d.kind === 'audioinput' || d.kind === 'audiooutput'))
    })
  }, [])

  useEffect(() => {
    if (devices && value && !devices.find((device) => device.deviceId === value)) {
      onChange('default')
    }
  }, [devices, onChange, value])

  return (
    devices && (
      <select
        value={value == null ? 'default' : value}
        onChange={(e) => onChange(e.target.value)}
        className="select"
        disabled={disabled}
      >
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
