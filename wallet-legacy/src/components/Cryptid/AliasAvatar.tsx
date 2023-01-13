interface AliasAvatarInterface {
  alias: string
  altColor?: boolean
}

export default function AliasAvatar({alias, altColor}: AliasAvatarInterface) {
  return (
    <svg className="h-full w-full" fill="currentColor" viewBox='0 0 24 24' data-testid="profileIcon">
      <circle cx="125" cy="125" r="100" fill="currentColor" />
      <text x="50%" y="50%" text-anchor="middle" fill="dark-grey" font-size="1.3em" font-family="Arial" dy=".35em" >{alias.charAt(0)}</text>
      Sorry, your browser does not support inline SVG.
    </svg>)
}
