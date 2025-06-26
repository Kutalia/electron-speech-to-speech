import { useState } from 'react'

function Footer(): React.JSX.Element {
  const [versions] = useState(window.electron.process.versions)

  return (
    <ul>
      <li>Electron v{versions.electron}</li>
      <li>Chromium v{versions.chrome}</li>
      <li>Node v{versions.node}</li>
      <li>
        Made by&nbsp;
        <a href="https://linktr.ee/kutalia" target="_blank" rel="noreferrer">
          Kote Kutalia
        </a>
        &nbsp;&copy;&nbsp;
        {new Date().getFullYear()}
      </li>
    </ul>
  )
}

export default Footer
