import { useId, useState } from 'react'
import { uploadSiteAsset } from '../lib/api'
import { getErrorMessage } from '../lib/utils'
import { Field, adminInput } from './AdminUI'

const MAX_BYTES = 5 * 1024 * 1024
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']

/**
 * Image field that always picks a file from the device.
 *
 * There is deliberately no URL box: an admin should not have to host an image
 * somewhere else to use it. The chosen file is uploaded to the public
 * `site-assets` bucket and the resulting public URL is written back to the form.
 */
export default function ImagePicker({ label, hint, value, onChange, previewClass = 'h-40', empty = '/images/placeholder-collection.svg' }) {
  const inputId = useId()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const pick = async (event) => {
    const file = event.target.files?.[0]
    // Let the same file be re-selected after a failure.
    event.target.value = ''
    if (!file) return

    setError('')
    if (!ACCEPTED.includes(file.type)) {
      setError('Formats acceptés : JPEG, PNG, WebP ou SVG.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError("L'image dépasse 5 Mo. Choisissez un fichier plus léger.")
      return
    }

    setBusy(true)
    try {
      const url = await uploadSiteAsset(file)
      onChange(url)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Field label={label} hint={hint} className="sm:col-span-2">
      <div className="border border-neutral-800 p-3">
        <div className={`flex ${previewClass} items-center justify-center overflow-hidden bg-neutral-900`}>
          {value ? (
            <img
              src={value}
              alt=""
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.src = empty
              }}
            />
          ) : (
            <span className="px-4 text-center text-[11px] text-neutral-500">Aucune image sélectionnée</span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/svg+xml"
            className="hidden"
            onChange={pick}
            disabled={busy}
          />
          <label
            htmlFor={inputId}
            className={`btn-secondary cursor-pointer ${busy ? 'pointer-events-none opacity-50' : ''}`}
          >
            {busy ? 'Téléversement…' : value ? "Changer l'image" : 'Choisir une image'}
          </label>

          {value && (
            <>
              <button
                type="button"
                onClick={() => onChange('')}
                disabled={busy}
                className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 hover:text-white disabled:opacity-50"
              >
                Retirer
              </button>
              <input
                className={`${adminInput} min-w-0 flex-1 truncate text-[11px] text-neutral-500`}
                value={value}
                readOnly
                tabIndex={-1}
                aria-label="Adresse de l'image enregistrée"
              />
            </>
          )}
        </div>

        {error && (
          <p className="mt-2 text-[11px] text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>
    </Field>
  )
}
