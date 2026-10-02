import { useEffect, useEffectEvent, useState, type FormEvent } from 'react'
import { Building2, Save, Wallet } from 'lucide-react'
import { toast } from 'react-toastify'
import { createSettings, getSettings, updateSettings, type AppLanguage } from '../../api/accounting'

type Language = AppLanguage

interface BusinessProfile {
  name: string
  email: string
  phone: string
  taxNumber: string
  address: string
}

export interface SettingsPageCopy {
  locale: string
  settings: string
  settingsSubtitle: string
  businessDetails: string
  businessName: string
  businessEmail: string
  businessPhone: string
  taxNumber: string
  businessAddress: string
  invoiceDefaults: string
  defaultDueDays: string
  languagePreference: string
  arabic: string
  english: string
  saveSettings: string
  saving: string
  settingsSaved: string
  settingsSaveError: string
  settingsLoadError: string
  loading: string
  retry: string
}

interface SettingsPageProps {
  copy: SettingsPageCopy
  language: Language
  defaultDueDays: number
  onSave: (settings: { language: Language; defaultDueDays: number }) => void
}

const profileStorageKey = 'daftar-business-profile'

function readBusinessProfile(): BusinessProfile {
  const defaults: BusinessProfile = { name: '', email: '', phone: '', taxNumber: '', address: '' }
  try {
    const stored = localStorage.getItem(profileStorageKey)
    return stored ? { ...defaults, ...JSON.parse(stored) as Partial<BusinessProfile> } : defaults
  } catch {
    return defaults
  }
}

function SettingsPage({ copy, language, defaultDueDays, onSave }: SettingsPageProps) {
  const [profile, setProfile] = useState<BusinessProfile>(readBusinessProfile)
  const [selectedLanguage, setSelectedLanguage] = useState(language)
  const [dueDays, setDueDays] = useState(String(defaultDueDays))
  const [settingsId, setSettingsId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasLoadError, setHasLoadError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [isSaving, setIsSaving] = useState(false)

  const syncSettingsToApp = useEffectEvent((savedLanguage: Language, savedDueDays: number) => {
    onSave({ language: savedLanguage, defaultDueDays: savedDueDays })
  })

  useEffect(() => {
    const controller = new AbortController()
    getSettings(controller.signal)
      .then(([settings]) => {
        if (!settings) return
        setSettingsId(settings.id)
        setProfile(settings.businessProfile)
        setSelectedLanguage(settings.language)
        setDueDays(String(settings.defaultDueDays))
        syncSettingsToApp(settings.language, settings.defaultDueDays)
      })
      .catch(() => {
        if (!controller.signal.aborted) setHasLoadError(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [retryCount])

  function updateProfile(field: keyof BusinessProfile, value: string) {
    setProfile((current) => ({ ...current, [field]: value }))
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsedDueDays = Number(dueDays)
    if (isLoading || hasLoadError || !Number.isInteger(parsedDueDays) || parsedDueDays < 1 || parsedDueDays > 365) return

    setIsSaving(true)
    try {
      const settingsInput = {
        language: selectedLanguage,
        defaultDueDays: parsedDueDays,
        businessProfile: profile,
      }
      const savedSettings = settingsId
        ? await updateSettings(settingsId, settingsInput)
        : await createSettings(settingsInput)
      setSettingsId(savedSettings.id)
      onSave({ language: selectedLanguage, defaultDueDays: parsedDueDays })
      toast.success(copy.settingsSaved)
    } catch {
      toast.error(copy.settingsSaveError)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="mx-auto max-w-5xl">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-slate-900">{copy.settings}</h1>
        <p className="mt-2 text-sm text-slate-500">{copy.settingsSubtitle}</p>
      </div>

      {hasLoadError ? (
        <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white text-center">
          <p className="text-sm text-rose-700">{copy.settingsLoadError}</p>
          <button type="button" onClick={() => { setHasLoadError(false); setIsLoading(true); setRetryCount((count) => count + 1) }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">{copy.retry}</button>
        </div>
      ) : isLoading ? (
        <p className="py-12 text-center text-sm text-slate-500" aria-live="polite">{copy.loading}</p>
      ) : (

      <form onSubmit={handleSave} className="space-y-6">
        <section className="rounded-xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.02]">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
            <span className="grid size-9 place-items-center rounded-lg bg-emerald-50 text-emerald-800"><Building2 size={18} /></span>
            <h2 className="font-bold text-slate-800">{copy.businessDetails}</h2>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              {copy.businessName}
              <input value={profile.name} onChange={(event) => updateProfile('name', event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 font-normal outline-none focus:border-emerald-600" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              {copy.businessEmail}
              <input type="email" value={profile.email} onChange={(event) => updateProfile('email', event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 font-normal outline-none focus:border-emerald-600" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              {copy.businessPhone}
              <input type="tel" value={profile.phone} onChange={(event) => updateProfile('phone', event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 font-normal outline-none focus:border-emerald-600" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              {copy.taxNumber}
              <input value={profile.taxNumber} onChange={(event) => updateProfile('taxNumber', event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 font-normal outline-none focus:border-emerald-600" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
              {copy.businessAddress}
              <input value={profile.address} onChange={(event) => updateProfile('address', event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 font-normal outline-none focus:border-emerald-600" />
            </label>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.02]">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
            <span className="grid size-9 place-items-center rounded-lg bg-amber-50 text-amber-800"><Wallet size={18} /></span>
            <h2 className="font-bold text-slate-800">{copy.invoiceDefaults}</h2>
          </div>
          <div className="grid gap-5 p-5 sm:grid-cols-2">
            <label className="grid max-w-xs gap-1.5 text-sm font-medium text-slate-700">
              {copy.defaultDueDays}
              <input required type="number" min="1" max="365" step="1" value={dueDays} onChange={(event) => setDueDays(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 font-normal outline-none focus:border-emerald-600" />
            </label>
            <fieldset className="grid gap-2">
              <legend className="mb-1 text-sm font-medium text-slate-700">{copy.languagePreference}</legend>
              <div className="inline-flex h-10 w-fit items-center rounded-lg border border-slate-200 bg-slate-50 p-1">
                <button type="button" onClick={() => setSelectedLanguage('ar')} aria-pressed={selectedLanguage === 'ar'} className={`h-8 rounded-md px-3 text-sm font-semibold ${selectedLanguage === 'ar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
                  {copy.arabic}
                </button>
                <button type="button" onClick={() => setSelectedLanguage('en')} aria-pressed={selectedLanguage === 'en'} className={`h-8 rounded-md px-3 text-sm font-semibold ${selectedLanguage === 'en' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
                  {copy.english}
                </button>
              </div>
            </fieldset>
          </div>
        </section>

        <div className="flex justify-end">
          <button type="submit" disabled={isSaving} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#17352f] px-4 text-sm font-semibold text-white hover:bg-[#21483e] disabled:opacity-60">
            <Save size={16} />
            {isSaving ? copy.saving : copy.saveSettings}
          </button>
        </div>
      </form>
      )}
    </section>
  )
}

export default SettingsPage