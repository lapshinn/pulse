import { ArrowRight, FolderArchive, HeartPulse, ShieldCheck, Sparkles, Upload } from 'lucide-react'

export function WelcomeScreen({
  onDemo,
  onUpload,
  demoPending = false,
  message,
}: {
  onDemo: () => void
  onUpload: () => void
  demoPending?: boolean
  message?: string
}) {
  return (
    <main className="welcome">
      <div className="welcome__aurora" aria-hidden="true" />
      <section className="welcome__content" aria-labelledby="welcome-title">
        <div className="welcome__brand">
          <span><HeartPulse size={20} aria-hidden="true" /></span>
          Пульс
        </div>
        <p className="eyebrow">Локальная панель здоровья</p>
        <h1 id="welcome-title">Ваши сигналы.<br />В едином ритме.</h1>
        <p className="welcome__lead">
          Соедините данные сна, тренировок и восстановления. Всё остаётся на вашем компьютере.
        </p>
        {message && <div className="welcome__notice" role="status">{message}</div>}
        <div className="welcome__actions">
          <button className="button button--primary button--large" type="button" onClick={onDemo} disabled={demoPending}>
            <Sparkles size={18} aria-hidden="true" />
            {demoPending ? 'Готовим демо…' : 'Открыть демо'}
            {!demoPending && <ArrowRight size={17} aria-hidden="true" />}
          </button>
          <button className="button button--ghost button--large" type="button" onClick={onUpload}>
            <Upload size={18} aria-hidden="true" />
            Загрузить данные
          </button>
        </div>
        <div className="welcome__features">
          <div><ShieldCheck aria-hidden="true" /><span>Только localhost</span></div>
          <div><FolderArchive aria-hidden="true" /><span>ZIP или CSV</span></div>
        </div>
      </section>
      <aside className="welcome__preview" aria-label="Предпросмотр показателей">
        <div className="preview-orb">
          <span>Готовность</span>
          <strong>82</strong>
          <small>Оптимально</small>
        </div>
        <div className="preview-metric preview-metric--sleep"><span>Сон</span><strong>88</strong></div>
        <div className="preview-metric preview-metric--load"><span>Нагрузка</span><strong>64</strong></div>
        <div className="preview-line" aria-hidden="true"><span /><i /><b /><em /></div>
      </aside>
    </main>
  )
}
