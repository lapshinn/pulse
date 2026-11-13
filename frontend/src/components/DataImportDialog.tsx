import { useEffect, useId, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  FileArchive,
  FileSpreadsheet,
  LoaderCircle,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react'
import { activateImport, inspectImport } from '../api/client'
import type { ImportInspectionResponse, Profile } from '../types/api'

type ImportStep = 1 | 2 | 3

function isAcceptedFile(file: File) {
  const lower = file.name.toLowerCase()
  return lower.endsWith('.zip') || lower.endsWith('.csv')
}

export function DataImportDialog({
  open,
  initialProfile,
  onClose,
  onActivated,
}: {
  open: boolean
  initialProfile?: Partial<Profile>
  onClose: () => void
  onActivated: () => void
}) {
  const titleId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [step, setStep] = useState<ImportStep>(1)
  const [files, setFiles] = useState<File[]>([])
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inspection, setInspection] = useState<ImportInspectionResponse | null>(null)
  const [profile, setProfile] = useState<Partial<Profile>>(initialProfile ?? {})

  useEffect(() => {
    if (!open) return
    setProfile(initialProfile ?? {})
    const timer = window.setTimeout(() => closeRef.current?.focus(), 30)
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, busy, initialProfile, onClose])

  if (!open) return null

  const applyFiles = (incoming: File[]) => {
    setError(null)
    const accepted = incoming.filter(isAcceptedFile)
    if (!accepted.length) {
      setError('Поддерживаются только ZIP и CSV.')
      return
    }
    const zipFiles = accepted.filter((file) => file.name.toLowerCase().endsWith('.zip'))
    const csvFiles = accepted.filter((file) => file.name.toLowerCase().endsWith('.csv'))
    if (zipFiles.length > 1 || (zipFiles.length && csvFiles.length)) {
      setError('Выберите один ZIP или несколько CSV — не смешивайте форматы.')
      return
    }
    setFiles(zipFiles.length ? [zipFiles[0]] : csvFiles)
    setInspection(null)
    setProgress(0)
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    applyFiles(Array.from(event.dataTransfer.files))
  }

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    applyFiles(Array.from(event.target.files ?? []))
    event.target.value = ''
  }

  const inspect = async () => {
    if (!files.length) return
    setBusy(true)
    setError(null)
    setProgress(1)
    try {
      const result = await inspectImport(files, setProgress)
      setInspection(result)
      setProfile((current) => ({ ...current, ...result.profile }))
      setStep(2)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось проверить файлы.')
    } finally {
      setBusy(false)
    }
  }

  const hasParser = Boolean(
    inspection?.parsers?.length ||
    inspection?.recognized?.some((metric) => Boolean(metric.parser) || metric.status === 'recognized'),
  )

  const activate = async () => {
    if (!inspection?.import_id || !hasParser) return
    setBusy(true)
    setError(null)
    try {
      await activateImport(inspection.import_id, profile)
      onActivated()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось активировать импорт.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="dialog-backdrop">
      <section
        className="import-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={error ? `${titleId}-error` : undefined}
      >
        <header className="import-dialog__header">
          <div className="import-dialog__brand"><UploadCloud aria-hidden="true" /><span>Импорт здоровья</span></div>
          <ol className="stepper" aria-label="Шаги импорта">
            {['Файлы', 'Проверка', 'Профиль'].map((label, index) => {
              const itemStep = (index + 1) as ImportStep
              return (
                <li key={label} className={step === itemStep ? 'is-active' : step > itemStep ? 'is-done' : ''}>
                  <span>{step > itemStep ? <Check size={14} /> : itemStep}</span>
                  {label}
                </li>
              )
            })}
          </ol>
          <button ref={closeRef} className="icon-button" type="button" onClick={onClose} disabled={busy} aria-label="Закрыть импорт">
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="import-dialog__body">
          {step === 1 && (
            <div className="import-step">
              <div className="import-step__intro">
                <p className="eyebrow">Шаг 1 из 3</p>
                <h2 id={titleId}>Добавьте данные</h2>
                <p>Один архив ZIP или набор CSV-файлов. Перед активацией мы покажем, что распознано.</p>
              </div>
              <div
                className={`dropzone ${dragging ? 'is-dragging' : ''}`}
                onDragEnter={(event) => { event.preventDefault(); setDragging(true) }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
              >
                <UploadCloud size={38} aria-hidden="true" />
                <strong>Перетащите файлы сюда</strong>
                <span>ZIP до 1 файла · CSV можно несколько</span>
                <button type="button" className="button button--ghost" onClick={() => fileInputRef.current?.click()}>
                  Выбрать файлы
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip,.csv,application/zip,text/csv"
                  multiple
                  onChange={onFileChange}
                  className="sr-only"
                  aria-label="Выбрать ZIP или CSV"
                />
              </div>
              {!!files.length && (
                <div className="file-list" aria-label="Выбранные файлы">
                  {files.map((file, index) => (
                    <div className="file-row" key={`${file.name}-${file.lastModified}`}>
                      {file.name.toLowerCase().endsWith('.zip') ? <FileArchive aria-hidden="true" /> : <FileSpreadsheet aria-hidden="true" />}
                      <div>
                        <strong>{file.name}</strong>
                        <span>{(file.size / 1024 / 1024).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} МБ</span>
                        {busy && <div className="file-progress"><span style={{ width: `${progress}%` }} /></div>}
                      </div>
                      <button
                        className="icon-button"
                        type="button"
                        aria-label={`Удалить ${file.name}`}
                        disabled={busy}
                        onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                      >
                        <Trash2 size={17} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 2 && inspection && (
            <div className="import-step">
              <div className="import-step__intro">
                <p className="eyebrow">Шаг 2 из 3</p>
                <h2 id={titleId}>Проверка структуры</h2>
                <p>Ошибки отдельных файлов не блокируют остальные распознанные метрики.</p>
              </div>
              <div className="inspection-summary">
                <div className="inspection-stat inspection-stat--ok"><CheckCircle2 /><strong>{inspection.recognized?.length ?? 0}</strong><span>Распознано</span></div>
                <div><AlertTriangle /><strong>{inspection.missing?.length ?? 0}</strong><span>Не найдено</span></div>
                <div><FileSpreadsheet /><strong>{inspection.unknown?.length ?? 0}</strong><span>Неизвестно</span></div>
                <div className="inspection-stat--error"><X /><strong>{inspection.errors?.length ?? 0}</strong><span>Ошибки</span></div>
              </div>
              <div className="inspection-groups">
                <InspectionGroup title="Распознано" items={inspection.recognized} tone="ok" />
                <InspectionGroup title="Не найдено" items={inspection.missing} />
                <InspectionGroup title="Неизвестные поля" items={inspection.unknown} />
                <InspectionGroup title="Ошибки файлов" items={inspection.errors} tone="error" />
              </div>
              {!hasParser && <div className="inline-alert"><AlertTriangle />Не найден подходящий парсер. Проверьте формат файлов.</div>}
            </div>
          )}

          {step === 3 && (
            <div className="import-step import-step--profile">
              <div className="import-step__intro">
                <p className="eyebrow">Шаг 3 из 3</p>
                <h2 id={titleId}>Подтвердите профиль</h2>
                <p>Эти параметры нужны для персональных референсов и биологического возраста.</p>
              </div>
              <ProfileFields profile={profile} onChange={setProfile} />
              {!hasParser && (
                <div className="inline-alert">
                  <AlertTriangle />
                  Профиль можно проверить, но активация станет доступна после добавления адаптера реального экспорта.
                </div>
              )}
              <div className="privacy-note">
                <CheckCircle2 aria-hidden="true" />
                <span><strong>Данные остаются локально.</strong> Запросы отправляются только на 127.0.0.1.</span>
              </div>
            </div>
          )}

          {error && <div className="inline-alert inline-alert--error" id={`${titleId}-error`} role="alert">{error}</div>}
        </div>

        <footer className="import-dialog__footer">
          <button
            className="button button--ghost"
            type="button"
            disabled={busy}
            onClick={() => step === 1 ? onClose() : setStep((step - 1) as ImportStep)}
          >
            {step > 1 && <ArrowLeft size={16} aria-hidden="true" />}
            {step === 1 ? 'Отмена' : 'Назад'}
          </button>
          {step === 1 && (
            <button className="button button--primary" type="button" disabled={!files.length || busy} onClick={inspect}>
              {busy ? <LoaderCircle className="spin" size={17} /> : <UploadCloud size={17} />}
              {busy ? `Проверяем ${progress}%` : 'Проверить файлы'}
            </button>
          )}
          {step === 2 && (
            <button className="button button--primary" type="button" onClick={() => setStep(3)}>
              Подтвердить профиль <ArrowRight size={16} aria-hidden="true" />
            </button>
          )}
          {step === 3 && (
            <button className="button button--primary" type="button" disabled={!hasParser || !inspection?.import_id || busy} onClick={activate}>
              {busy && <LoaderCircle className="spin" size={17} />}
              Активировать данные
            </button>
          )}
        </footer>
      </section>
    </div>
  )
}

function InspectionGroup({
  title,
  items = [],
  tone = 'default',
}: {
  title: string
  items?: ImportInspectionResponse['recognized']
  tone?: 'default' | 'ok' | 'error'
}) {
  if (!items.length) return null
  return (
    <section className={`inspection-group inspection-group--${tone}`}>
      <h3>{title}<span>{items.length}</span></h3>
      <ul>
        {items.map((item, index) => (
          <li key={`${item.metric}-${item.file}-${index}`}>
            <span><strong>{item.metric || 'Без названия'}</strong>{item.file && <small>{item.file}</small>}</span>
            <span>{item.parser ?? item.message ?? item.status ?? '—'}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function ProfileFields({
  profile,
  onChange,
  includeScenario = false,
}: {
  profile: Partial<Profile>
  onChange: (profile: Partial<Profile>) => void
  includeScenario?: boolean
}) {
  const set = (key: keyof Profile, value: string | number) => onChange({ ...profile, [key]: value })
  return (
    <div className="form-grid">
      <label className="field"><span>Возраст</span><input required type="number" min="18" max="100" value={profile.age ?? 35} onChange={(event) => set('age', Number(event.target.value))} /></label>
      <label className="field">
        <span>Пол</span>
        <select value={profile.sex ?? 'male'} onChange={(event) => set('sex', event.target.value)}>
          <option value="male">Мужской</option><option value="female">Женский</option>
        </select>
      </label>
      <label className="field"><span>Рост, см</span><input required type="number" min="120" max="230" value={profile.height_cm ?? 175} onChange={(event) => set('height_cm', Number(event.target.value))} /></label>
      <label className="field"><span>Вес, кг</span><input required type="number" min="30" max="300" step="0.1" value={profile.weight_kg ?? 75} onChange={(event) => set('weight_kg', Number(event.target.value))} /></label>
      <label className="field"><span>Целевой сон, ч</span><input required type="number" min="4" max="12" step="0.25" value={profile.sleep_need_hours ?? 8} onChange={(event) => set('sleep_need_hours', Number(event.target.value))} /></label>
      <label className="field"><span>Baseline, дней</span><input required type="number" min="14" max="60" value={profile.baseline_window_days ?? 14} onChange={(event) => set('baseline_window_days', Number(event.target.value))} /></label>
      <label className="field field--wide"><span>Часовой пояс IANA</span><input required value={profile.timezone ?? 'UTC'} onChange={(event) => set('timezone', event.target.value)} placeholder="Europe/Moscow" /></label>
      {includeScenario && (
        <label className="field field--wide">
          <span>Сценарий демо</span>
          <select value={profile.demo_scenario ?? 'full'} onChange={(event) => set('demo_scenario', event.target.value)}>
            <option value="full">Полные данные</option>
            <option value="short_baseline">Короткая базовая линия</option>
            <option value="missing_sensors">Нет части сенсоров</option>
          </select>
        </label>
      )}
    </div>
  )
}
