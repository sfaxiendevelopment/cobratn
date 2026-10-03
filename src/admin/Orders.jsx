import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminPage, AdminCard, AdminButton, Badge, EmptyRow, adminInput } from './AdminUI'
import { adminListOrders, adminClearAllOrders } from '../lib/api'
import { useUI } from '../contexts/UIContext'
import { useDocumentMeta, useDebounce } from '../hooks/useDocumentMeta'
import { formatPrice, formatDate, ORDER_STATUSES, paymentStatusLabel, getErrorMessage } from '../lib/utils'
import { TableSkeleton } from '../components/LoadingSkeleton'
import { IconSearch, IconChevronRight } from '../components/icons'

function orderStatusTone(status) {
  if (status === 'delivered' || status === 'shipped') return 'green'
  if (status === 'cancelled' || status === 'returned') return 'red'
  if (status === 'preparing' || status === 'confirmed') return 'black'
  return 'amber'
}

function paymentStatusTone(status) {
  if (status === 'paid') return 'green'
  if (status === 'failed' || status === 'refunded') return 'red'
  return 'amber'
}

function orderStatusLabel(status) {
  return ORDER_STATUSES.find((entry) => entry.value === status)?.label || status
}

const itemCount = (order) => (order.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)

export default function Orders() {
  useDocumentMeta('Commandes — COBRA TN Admin')
  const navigate = useNavigate()
  const { toast } = useUI()

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [clearing, setClearing] = useState(false)

  const debouncedSearch = useDebounce(search, 300)

  const load = useCallback(async (nextStatus, term) => {
    setLoading(true)
    setError('')
    try {
      setOrders(await adminListOrders({ status: nextStatus, search: term }))
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(status, debouncedSearch)
  }, [status, debouncedSearch, load])

  const clearAll = async () => {
    const count = orders.length
    if (!window.confirm(`${count === 1 ? 'Supprimer cette commande' : `Supprimer les ${count} commandes`} ? Cela supprime définitivement les articles, les totaux et toute utilisation de code promo correspondants — action irréversible.`)) {
      return
    }
    setClearing(true)
    try {
      const result = await adminClearAllOrders()
      if (result?.error) {
        toast(result.error, 'error')
      } else {
        toast('Toutes les commandes ont été supprimées')
        setStatus('all')
        setSearch('')
        await load('all', '')
      }
    } catch (err) {
      toast(getErrorMessage(err), 'error')
    } finally {
      setClearing(false)
    }
  }

  return (
    <AdminPage
      eyebrow="Ventes"
      title="Commandes"
      subtitle={`${orders.length} commande${orders.length === 1 ? '' : 's'} — le paiement à la livraison est encaissé par le livreur.`}
      actions={
        orders.length > 0 ? (
          <AdminButton
            variant="ghost"
            onClick={clearAll}
            disabled={clearing}
            className="border border-red-600/50 text-red-400 hover:bg-red-600/10"
          >
            {clearing ? 'Suppression…' : 'Effacer toutes les commandes'}
          </AdminButton>
        ) : undefined
      }
    >
      <AdminCard>
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-600" />
            <input
              className={`${adminInput} pl-9`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Numéro de commande, nom, email ou téléphone…"
              aria-label="Rechercher des commandes"
            />
          </div>
          <select
            className={`${adminInput} md:w-48`}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filtrer par statut de commande"
          >
            <option value="all">Tous les statuts</option>
            {ORDER_STATUSES.map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
          </select>
        </div>
      </AdminCard>

      <div className="mt-6">
        {error ? (
          <AdminCard>
            <p className="text-xs text-red-400">{error}</p>
          </AdminCard>
        ) : loading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : orders.length === 0 ? (
          <AdminCard>
            <EmptyRow>Aucune commande ne correspond à ce filtre.</EmptyRow>
          </AdminCard>
        ) : (
          <AdminCard title="Toutes les commandes">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-neutral-800 text-[9px] uppercase tracking-widest text-neutral-500">
                    <th className="py-2 pr-3 font-bold">Commande</th>
                    <th className="py-2 pr-3 font-bold">Client</th>
                    <th className="py-2 pr-3 font-bold">Téléphone</th>
                    <th className="py-2 pr-3 font-bold">Articles</th>
                    <th className="py-2 pr-3 font-bold">Total</th>
                    <th className="py-2 pr-3 font-bold">Paiement</th>
                    <th className="py-2 pr-3 font-bold">Statut</th>
                    <th className="py-2 pr-3 font-bold">Date</th>
                    <th className="py-2 font-bold" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      onClick={() => navigate(`/admin/orders/${order.id}`)}
                      className="cursor-pointer hover:bg-neutral-900"
                    >
                      <td className="py-3 pr-3 text-xs font-bold text-white">{order.order_number}</td>
                      <td className="py-3 pr-3 text-xs text-neutral-300">{order.customer_name}</td>
                      <td className="py-3 pr-3 text-xs text-neutral-400">{order.phone}</td>
                      <td className="py-3 pr-3 text-xs text-neutral-400">{itemCount(order)}</td>
                      <td className="py-3 pr-3 text-xs font-bold text-white">{formatPrice(order.total)}</td>
                      <td className="py-3 pr-3">
                        <Badge tone={paymentStatusTone(order.payment_status)}>{paymentStatusLabel(order.payment_status)}</Badge>
                      </td>
                      <td className="py-3 pr-3">
                        <Badge tone={orderStatusTone(order.order_status)}>{orderStatusLabel(order.order_status)}</Badge>
                      </td>
                      <td className="py-3 pr-3 text-xs text-neutral-400">{formatDate(order.created_at)}</td>
                      <td className="py-3 text-right">
                        <IconChevronRight className="inline h-3.5 w-3.5 text-neutral-600" />
                      </td>
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
