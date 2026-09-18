import { AVATAR_DEFAUT } from '@/lib/avatars'

const TAILLES = {
  sm: 'h-8 w-8 text-base',
  md: 'h-11 w-11 text-xl',
  lg: 'h-16 w-16 text-3xl',
}

export default function Avatar({ emoji, couleur, taille = 'md', className = '' }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full ${TAILLES[taille] ?? TAILLES.md} ${className}`}
      style={{ backgroundColor: couleur || AVATAR_DEFAUT.couleur }}
      aria-hidden="true"
    >
      {emoji || AVATAR_DEFAUT.emoji}
    </span>
  )
}
