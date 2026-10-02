import { useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ArrowDownLeft, ArrowUpLeft, CircleAlert, UsersRound, Wallet } from 'lucide-react'
import {
  getDashboardData,
  getInvoicePayments,
  getInvoiceRemaining,
  type Customer,
  type Expense,
  type Invoice,
  type Supplier,
} from '../../api/accounting'

export interface DashboardCopy {
  locale: string
  welcome: string
  dashboardSummary: string
  totalRevenue: string
  outstandingInvoices: string
  totalExpenses: string
  thisMonth: string
  paidInvoices: string
  dueInvoices: string
  recordedExpenses: string
  revenueVsExpenses: string
  revenue: string
  expenseSeries: string
  latestInvoices: string
  invoice: string
  customer: string
  date: string
  amount: string
  status: string
  paid: string
  partial: string
  outstanding: string
  customerCount: string
  supplierCount: string
  loading: string
  loadError: string
  retry: string
  noInvoices: string
  noChartData: string
}

interface DashboardData {
  invoices: Invoice[]
  expenses: Expense[]
  customers: Customer[]
  suppliers: Supplier[]
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function dateMonthKey(value: string) {
  return value.slice(0, 7)
}

function Dashboard({ copy }: { copy: DashboardCopy }) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    getDashboardData(controller.signal)
      .then((result) => setData(result))
      .catch(() => {
        if (!controller.signal.aborted) setHasError(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [retryCount])

  if (isLoading) {
    return (
      <section className="mx-auto max-w-7xl" aria-live="polite">
        <h1 className="text-2xl font-bold text-slate-900">{copy.welcome}</h1>
        <p className="mt-2 text-sm text-slate-500">{copy.loading}</p>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
        <div className="mt-5 h-80 animate-pulse rounded-xl border border-slate-200 bg-white" />
      </section>
    )
  }

  if (hasError || !data) {
    return (
      <section className="mx-auto flex min-h-72 max-w-7xl flex-col items-center justify-center text-center">
        <CircleAlert className="text-rose-600" size={32} />
        <p className="mt-4 font-semibold text-slate-800">{copy.loadError}</p>
        <button
          type="button"
          onClick={() => {
            setIsLoading(true)
            setHasError(false)
            setRetryCount((count) => count + 1)
          }}
          className="mt-4 rounded-lg bg-[#17352f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#21483e]"
        >
          {copy.retry}
        </button>
      </section>
    )
  }

  const now = new Date()
  const currentMonth = monthKey(now)
  const currency = new Intl.NumberFormat(copy.locale, {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 2,
  })
  const currentMonthPayments = data.invoices.flatMap((invoice) =>
    getInvoicePayments(invoice).filter((payment) => dateMonthKey(payment.date) === currentMonth),
  )
  const revenue = currentMonthPayments.reduce((total, payment) => total + payment.amount, 0)
  const receivables = data.invoices.reduce((total, invoice) => total + getInvoiceRemaining(invoice), 0)
  const currentMonthExpenses = data.expenses.filter((expense) => dateMonthKey(expense.date) === currentMonth)
  const expensesTotal = currentMonthExpenses.reduce((total, expense) => total + expense.amount, 0)
  const number = new Intl.NumberFormat(copy.locale)
  const dateFormatter = new Intl.DateTimeFormat(copy.locale, { day: 'numeric', month: 'short' })

  const chartData = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1)
    const key = monthKey(date)
    const monthRevenue = data.invoices
      .flatMap((invoice) => getInvoicePayments(invoice))
      .filter((payment) => dateMonthKey(payment.date) === key)
      .reduce((total, payment) => total + payment.amount, 0)
    const monthExpenses = data.expenses
      .filter((expense) => dateMonthKey(expense.date) === key)
      .reduce((total, expense) => total + expense.amount, 0)

    return {
      month: new Intl.DateTimeFormat(copy.locale, { month: 'short' }).format(date),
      revenue: monthRevenue,
      expenses: monthExpenses,
    }
  })

  const metrics = [
    {
      label: copy.totalRevenue,
      value: currency.format(revenue),
      detail: `${number.format(new Set(currentMonthPayments.map((payment) => payment.id)).size)} ${copy.paidInvoices}`,
      icon: ArrowDownLeft,
      iconStyle: 'bg-emerald-50 text-emerald-700',
      detailStyle: 'text-emerald-700',
    },
    {
      label: copy.outstandingInvoices,
      value: currency.format(receivables),
      detail: `${number.format(data.invoices.filter((invoice) => invoice.status !== 'paid').length)} ${copy.dueInvoices}`,
      icon: CircleAlert,
      iconStyle: 'bg-amber-50 text-amber-700',
      detailStyle: 'text-amber-700',
    },
    {
      label: copy.totalExpenses,
      value: currency.format(expensesTotal),
      detail: `${number.format(currentMonthExpenses.length)} ${copy.recordedExpenses}`,
      icon: ArrowUpLeft,
      iconStyle: 'bg-sky-50 text-sky-700',
      detailStyle: 'text-sky-700',
    },
    {
      label: copy.customerCount,
      value: number.format(data.customers.length),
      detail: `${number.format(data.suppliers.length)} ${copy.supplierCount}`,
      icon: UsersRound,
      iconStyle: 'bg-rose-50 text-rose-700',
      detailStyle: 'text-slate-500',
    },
  ] as const

  const latestInvoices = [...data.invoices]
    .sort((first, second) => second.issueDate.localeCompare(first.issueDate))
    .slice(0, 5)

  return (
    <section className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{copy.welcome}</h1>
          <p className="mt-2 text-sm text-slate-500">{copy.dashboardSummary}</p>
        </div>
        <p className="text-xs font-medium text-slate-500">
          {new Intl.DateTimeFormat(copy.locale, { month: 'long', year: 'numeric' }).format(now)}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, detail, icon: Icon, iconStyle, detailStyle }) => (
          <article key={label} className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.02]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <span className={`grid size-10 place-items-center rounded-lg ${iconStyle}`}>
                <Icon size={19} strokeWidth={1.9} />
              </span>
            </div>
            <p className="mt-5 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
            <p className={`mt-2 text-xs font-medium ${detailStyle}`}>{detail}</p>
          </article>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.02]">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bold text-slate-800">{copy.revenueVsExpenses}</h2>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-2"><i className="size-2 rounded-full bg-emerald-600" />{copy.revenue}</span>
              <span className="flex items-center gap-2"><i className="size-2 rounded-full bg-sky-500" />{copy.expenseSeries}</span>
            </div>
          </div>
          <div className="h-64 w-full" role="img" aria-label={copy.revenueVsExpenses}>
            {chartData.some((month) => month.revenue > 0 || month.expenses > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#16845d" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#16845d" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expensesFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0ea5a4" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0ea5a4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#e8eeeb" strokeDasharray="3 4" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={8} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickFormatter={(value: number) => new Intl.NumberFormat(copy.locale, { notation: 'compact', maximumFractionDigits: 0 }).format(value)}
                    width={48}
                  />
                  <Tooltip
                    formatter={(value) => currency.format(Number(value))}
                    contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 10, fontFamily: 'Cairo, sans-serif', fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="revenue" name={copy.revenue} stroke="#16845d" strokeWidth={2.5} fill="url(#revenueFill)" />
                  <Area type="monotone" dataKey="expenses" name={copy.expenseSeries} stroke="#0ea5a4" strokeWidth={2.5} fill="url(#expensesFill)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-sm text-slate-400">{copy.noChartData}</div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.02]">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-lg bg-[#e9f4ef] text-[#176447]">
              <Wallet size={19} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-800">{copy.outstandingInvoices}</h2>
              <p className="mt-1 text-xs text-slate-500">{copy.dueInvoices}</p>
            </div>
          </div>
          <p className="mt-7 text-3xl font-bold tabular-nums text-slate-900">{currency.format(receivables)}</p>
          <div className="mt-5 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{copy.customerCount}</span>
              <span className="font-semibold text-slate-800">{number.format(data.customers.length)}</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>{copy.supplierCount}</span>
              <span className="font-semibold text-slate-800">{number.format(data.suppliers.length)}</span>
            </div>
          </div>
        </section>
      </div>

      <section className="mt-5 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.02]">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-slate-800">{copy.latestInvoices}</h2>
          <span className="text-xs text-slate-500">{number.format(latestInvoices.length)}</span>
        </div>
        {latestInvoices.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-start text-sm">
              <thead className="bg-slate-50/70 text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">{copy.invoice}</th>
                  <th className="px-5 py-3 font-semibold">{copy.customer}</th>
                  <th className="px-5 py-3 font-semibold">{copy.date}</th>
                  <th className="px-5 py-3 font-semibold">{copy.amount}</th>
                  <th className="px-5 py-3 font-semibold">{copy.status}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {latestInvoices.map((invoice) => {
                  const status = invoice.status === 'paid' ? copy.paid : invoice.status === 'partial' ? copy.partial : copy.outstanding
                  const statusStyle = invoice.status === 'paid'
                    ? 'bg-emerald-50 text-emerald-700'
                    : invoice.status === 'partial'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-rose-50 text-rose-700'

                  return (
                    <tr key={invoice.id} className="text-slate-700 hover:bg-slate-50/70">
                      <td className="whitespace-nowrap px-5 py-3.5 font-semibold text-slate-800">{invoice.id}</td>
                      <td className="whitespace-nowrap px-5 py-3.5">{invoice.customerName}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-slate-500">{dateFormatter.format(new Date(`${invoice.issueDate}T12:00:00`))}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 font-medium tabular-nums">{currency.format(invoice.amount)}</td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${statusStyle}`}>{status}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-10 text-center text-sm text-slate-500">{copy.noInvoices}</p>
        )}
      </section>
    </section>
  )
}

export default Dashboard
