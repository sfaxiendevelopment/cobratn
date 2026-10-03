import { useCallback, useEffect, useMemo, useState } from 'react'
import { AdminPage, AdminCard, Badge, EmptyRow, adminInput } from './AdminUI'
import { adminListCustomers, adminUpdateCustomerRole } from '../lib/api'
import { useUI } from '../contexts/UIContext'
import { useDocumentMeta, useDebounce } from '../hooks/useDocumentMeta'
import { formatDate, getInitials, getErrorMessage } from '../lib/utils'
import { TableSkeleton } from '../components/LoadingSkeleton'
import { IconSearch } from '../components/icons'

const ROLES = [
  { value: 'customer', label: 'Client' },
  { value: 'admin', label: 'Administrateur' },
]

function fullName(profile) {
  const joined = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim()
  return joined || profile.display_name || profile.email || 'Compte sans nom'
}

export default function Customers() {
  useDocumentMeta('Clients — COBRA TN Admin')
  const { toast } = useUI()

  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState(null)

  const debouncedSearch = useDebounce(search, 250)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setCustomers(await adminListCustomers())
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const visible = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase()
    if (!term) return customers
    return customers.filter((profile) =>
      [fullName(profile), profile.email, profile.phone, profile.role]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    )
  }, [customers, debouncedSearch])

  const changeRole = async (profile, role) => {
    if (role === profile.role) return
    setBusyId(profile.id)
    try {
      await adminUpdateCustomerRole(profile.id, role)
      setCustomers((prev) => prev.map((row) => (row.id === profile.id ? { ...row, role } : row)))
      toast(`${fullName(profile)} est maintenant ${role === 'admin' ? 'administrateur' : 'client'}`)
    } catch (err) {
      toast(getErrorMessage(err), 'error')
      await load()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <AdminPage
      eyebrow="Personnes"
      title="Clients"
      subtitle={`${customers.length} compte${customers.length === 1 ? '' : 's'} Supabase. Les commandes sont passées en tant qu'invité, donc le nombre de commandes n'est pas stocké par compte.`}
    >
      {error && (
        <p className="mb-4 border border-red-600/40 bg-red-600/5 p-3 text-xs text-red-300" role="alert">
          {error}
        </p>
      )}

      <AdminCard>
        <div className="relative">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-600" />
          <input
            className={`${adminInput} pl-9`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un nom, un e-mail ou un téléphone…"
            aria-label="Rechercher des clients"
          />
        </div>
      </AdminCard>

      <div className="mt-6">
        {loading ? (
          <TableSkeleton rows={8} cols={5} />
        ) : visible.length === 0 ? (
          <AdminCard>
            <EmptyRow>Aucun compte ne correspond à cette recherche.</EmptyRow>
          </AdminCard>
        ) : (
          <AdminCard title={`Comptes (${visible.length})`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-neutral-800 text-[9px] uppercase tracking-widest text-neutral-500">
                    <th className="py-2 pr-3 font-bold">Nom</th>
                    <th className="py-2 pr-3 font-bold">E-mail</th>
                    <th className="py-2 pr-3 font-bold">Téléphone</th>
                    <th className="py-2 pr-3 font-bold">Rôle</th>
                    <th className="py-2 font-bold">Inscrit le</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {visible.map((profile) => (
                    <tr key={profile.id} className="hover:bg-neutral-900">
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-800 text-[11px] font-bold uppercase text-neutral-300">
                            {profile.avatar_url ? (
                              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              getInitials(fullName(profile))
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-white">{fullName(profile)}</p>
                            {profile.display_name && (
                              <p className="truncate text-[10px] text-neutral-500">@{profile.display_name}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-xs text-neutral-300">
                        {profile.email ? (
                          <a href={`mailto:${profile.email}`} className="hover:underline">
                            {profile.email}
                          </a>
                        ) : (
                          <span className="text-neutral-600">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-3 text-xs text-neutral-400">
                        {profile.phone || <span className="text-neutral-600">—</span>}
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2">
                          <Badge tone={profile.role === 'admin' ? 'green' : 'neutral'}>
                            {profile.role === 'admin' ? 'Administrateur' : 'Client'}
                          </Badge>
                          <select
                            className={`${adminInput} w-32 py-1.5 text-[11px]`}
                            value={profile.role === 'admin' ? 'admin' : 'customer'}
                            disabled={busyId === profile.id}
                            onChange={(e) => changeRole(profile, e.target.value)}
                            aria-label={`Rôle pour ${fullName(profile)}`}
                          >
                            {ROLES.map((role) => (
                              <option key={role.value} value={role.value}>
                                {role.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="py-3 text-xs text-neutral-400">{formatDate(profile.created_at) || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AdminCard>
        )}
      </div>
    </AdminPage>
  )
}
