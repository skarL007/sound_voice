import { useAppStore } from '../stores/appStore'
import { Gamepad2, UserRound } from 'lucide-react'

const ICON_FOR_ID: Record<string, typeof Gamepad2> = {
  padrao: UserRound,
  jogo: Gamepad2,
}

export default function ProfileSwitcher() {
  const profiles = useAppStore((state) => state.profiles)
  const activeProfileId = useAppStore((state) => state.activeProfileId)
  const setActiveProfile = useAppStore((state) => state.setActiveProfile)

  if (!profiles || profiles.length === 0) return null

  return (
    <div className="hud-frame p-3 space-y-2" aria-label="Trocar perfil">
      <p className="text-[10px] uppercase tracking-[0.18em] text-ink-mute">Perfil</p>
      <div className="flex flex-col gap-1.5">
        {profiles.map((profile) => {
          const Icon = ICON_FOR_ID[profile.id] ?? UserRound
          const isActive = profile.id === activeProfileId
          return (
            <button
              key={profile.id}
              onClick={() => setActiveProfile(profile.id)}
              className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition-all ${
                isActive ? 'status-pill status-pill--ready font-semibold' : 'text-ink-soft hover:text-ink-strong'
              }`}
              style={isActive ? undefined : { border: '1px solid var(--vl-hud-border)' }}
              aria-pressed={isActive}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{profile.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
