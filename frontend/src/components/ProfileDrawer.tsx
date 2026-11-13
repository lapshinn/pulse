import { useEffect, useId, useRef, useState } from 'react'
import { CheckCircle2, LoaderCircle, Settings2, UserRound, X } from 'lucide-react'
import { activateDemo, updateProfile } from '../api/client'
import type { Profile } from '../types/api'
import { ProfileFields } from './DataImportDialog'

export function ProfileDrawer({
  open,
  profile: initialProfile,
  demo,
  onClose,
  onSaved,
}: {
  open: boolean
  profile: Profile
  demo?: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const [profile, setProfile] = useState<Partial<Profile>>(initialProfile)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!open) return
    setProfile(initialProfile)
    setError(null)
    setSaved(false)
    const timer = window.setTimeout(() => closeRef.current?.focus(), 30)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, initialProfile, busy, onClose])

  if (!open) return null

  const save = async () => {
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      await updateProfile(profile)
      if (demo && profile.demo_scenario && profile.demo_scenario !== initialProfile.demo_scenario) {
        await activateDemo(profile.demo_scenario)
      }
      setSaved(true)
      onSaved()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось сохранить профиль.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="drawer-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onClose()
    }}>
      <aside className="profile-drawer" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header>
          <div>
            <p className="eyebrow">Настройки</p>
            <h2 id={titleId}><UserRound aria-hidden="true" />Профиль</h2>
          </div>
          <button ref={closeRef} className="icon-button" type="button" onClick={onClose} disabled={busy} aria-label="Закрыть профиль">
            <X aria-hidden="true" />
          </button>
        </header>
        <div className="profile-drawer__body">
          <div className="profile-avatar" aria-hidden="true"><UserRound /></div>
          <p className="profile-drawer__description">
            Параметры используются локально для персональных диапазонов и расчёта биологического возраста.
          </p>
          <ProfileFields profile={profile} onChange={setProfile} includeScenario={demo} />
          {demo && (
            <div className="settings-note">
              <Settings2 aria-hidden="true" />
              <span>Смена сценария заменит текущий демо-набор после сохранения.</span>
            </div>
          )}
          {error && <div className="inline-alert inline-alert--error" role="alert">{error}</div>}
          {saved && <div className="inline-alert inline-alert--success" role="status"><CheckCircle2 />Профиль сохранён</div>}
        </div>
        <footer>
          <button type="button" className="button button--ghost" onClick={onClose} disabled={busy}>Отмена</button>
          <button type="button" className="button button--primary" onClick={save} disabled={busy}>
            {busy && <LoaderCircle className="spin" size={17} />}
            Сохранить
          </button>
        </footer>
      </aside>
    </div>
  )
}
