import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminPage, AdminCard, Badge, EmptyRow } from './AdminUI'
import { adminGetStats, adminListOrders } from '../lib/api'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { formatPrice, formatDateTime, ORDER_STATUSES, getErrorMessage } from '../lib/utils'
import {
  IconBag,
  IconBox,
  IconUser,
  IconTag,
  IconTruck,
  IconStar,
  IconArrowRight,
} from '../components/icons'
import { AdminDashboardSkeleton } from '../components/LoadingSkeleton'

const EMPTY_STATS = {
  orders: 0,
  revenue: 0,
  pending: 0,
  products: 0,
  outOfStock: 0,
  lowStock: 0,
  customers: 0,
}

function orderStatusTone(status) {
  if (status === 'delivered' || status === 'shipped') return 'green'
  if (status === 'cancelled' || status === 'returned') return 'red'
  if (status === 'preparing' || status === 'confirmed') return 'black'
  return 'amber'
}

function orderStatusLabel(status) {
  return ORDER_STATUSES.find((entry) => entry.value === status)?.label || status
}

function StatCard({ label, value, icon: Icon, to, tone }) {
  const body = (
    <AdminCard className="h-full p-5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">{label}</span>
        {Icon && <Icon className={`h-4 w-4 ${tone || 'text-neutral-500'}`} />}
      </div>
      <p className="mt-3 text-2xl font-black text-white">{value}</p>
    </AdminCard>
  )
  return to ? <Link to={to} className="block">{body}</Link> : body
}

export default function Dashboard() {
  useDocumentMeta('Tableau de bord — COBRA TN Admin')

  const [stats, setStats] = useState(EMPTY_STATS)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const load = async () => {
      setError('')
      try {
        const [nextStats, recent] = await Promise.all([
          adminGetStats(),
          adminListOrders({ limit: 8 }),
        ])
        if (!active) return
        setStats({ ...EMPTY_STATS, ...nextStats })
        setOrders(recent)
      } catch (err) {
        if (active) setError(getErrorMessage(err))
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [])

  if (loading) return <AdminDashboardSkeleton />

  return (
    <AdminPage eyebrow="Panneau de contrôle" title="Tableau de bord" subtitle="Ventes, catalogue et audience, directement depuis Supabase.">
      {error && (
        <p className="mb-4 border border-red-600/40 bg-red-600/5 p-3 text-xs text-red-300" role="alert">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Bénéfice net (après coût)" value={formatPrice(stats.netIncome)} icon={IconStar} to="/admin/orders" />
        <StatCard label="Chiffre d'affaires (brut)" value={formatPrice(stats.revenue)} icon={IconStar} to="/admin/orders" tone="text-neutral-400" />
        <StatCard label="Coût des marchandises" value={formatPrice(stats.costs)} icon={IconTag} to="/admin/orders" tone="text-neutral-400" />
        <StatCard label="Commandes" value={stats.orders} icon={IconBox} to="/admin/orders" />
        <StatCard label="En attente" value={stats.pending} icon={IconTruck} to="/admin/orders" tone="text-amber-400" />
        <StatCard label="Produits" value={stats.products} icon={IconBag} to="/admin/products" />
        <StatCard
          label="Rupture de stock"
          value={stats.outOfStock}
          icon={IconBox}
          to="/admin/products"
          tone="text-red-400"
        />
        <StatCard
          label="Stock faible (≤5)"
          value={stats.lowStock}
          icon={IconTag}
          to="/admin/products"
          tone="text-amber-400"
        />
        <StatCard label="Clients" value={stats.customers} icon={IconUser} to="/admin/customers" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <AdminCard title="Commandes récentes">
          <div className="mb-3 flex justify-end">
            <Link
              to="/admin/orders"
              className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-white"
            >
              Toutes les commandes
            </Link>
          </div>
          {orders.length === 0 ? (
            <EmptyRow>Aucune commande pour le moment.</EmptyRow>
          ) : (
            <ul className="divide-y divide-neutral-800">
              {orders.map((order) => (
                <li key={order.id}>
                  <Link to={`/admin/orders/${order.id}`} className="flex items-center justify-between gap-4 py-3 hover:bg-neutral-900">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-white">
                        {order.order_number} — {order.customer_name}
                      </p>
                      <p className="truncate text-[10px] text-neutral-500">
                        {order.phone} · {formatDateTime(order.created_at)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge tone={orderStatusTone(order.order_status)}>{orderStatusLabel(order.order_status)}</Badge>
                      <span className="text-xs font-bold text-white">{formatPrice(order.total)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>

        <AdminCard title="À traiter">
          <ul className="space-y-3">
            <li>
              <Link
                to="/admin/orders"
                className="flex items-center justify-between gap-4 border border-neutral-800 p-3 text-xs hover:border-neutral-500"
              >
                <span className="flex items-center gap-3 text-neutral-300">
                  <IconBox className="h-4 w-4 text-amber-400" />
                  Commandes encore en attente
                </span>
                <span className="flex items-center gap-2 font-bold text-white">
                  {stats.pending}
                  <IconArrowRight className="h-3.5 w-3.5 text-neutral-600" />
                </span>
              </Link>
            </li>
            <li>
              <Link
                to="/admin/products"
                className="flex items-center justify-between gap-4 border border-neutral-800 p-3 text-xs hover:border-neutral-500"
              >
                <span className="flex items-center gap-3 text-neutral-300">
                  <IconBag className="h-4 w-4 text-red-400" />
                  Produits en rupture de stock
                </span>
                <span className="flex items-center gap-2 font-bold text-white">
                  {stats.outOfStock}
                  <IconArrowRight className="h-3.5 w-3.5 text-neutral-600" />
                </span>
              </Link>
            </li>
            <li>
              <Link
                to="/admin/products"
                className="flex items-center justify-between gap-4 border border-neutral-800 p-3 text-xs hover:border-neutral-500"
              >
                <span className="flex items-center gap-3 text-neutral-300">
                  <IconTag className="h-4 w-4 text-amber-400" />
                  Produits à 5 unités ou moins
                </span>
                <span className="flex items-center gap-2 font-bold text-white">
                  {stats.lowStock}
                  <IconArrowRight className="h-3.5 w-3.5 text-neutral-600" />
                </span>
              </Link>
            </li>
          </ul>
          <p className="mt-4 text-[11px] leading-relaxed text-neutral-500">
            Le chiffre d'affaires compte chaque commande qui n'est ni annulée ni remboursée : il reflète donc ce qui reste
            dû par les clients en paiement à la livraison. Le coût des marchandises est la somme du prix de revient
            (Prix) de chaque unité vendue, et le bénéfice net est le chiffre d'affaires moins ce coût. Exemple : 10
            sweat-shirts vendus à 30 TND avec un coût de 10 TND chacun = 300 − 100 = 200 TND de bénéfice net.
          </p>
        </AdminCard>
      </div>
    </AdminPage>
  )
}
