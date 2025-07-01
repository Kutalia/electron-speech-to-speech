function Footer(): React.JSX.Element {
  return (
    <ul>
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
