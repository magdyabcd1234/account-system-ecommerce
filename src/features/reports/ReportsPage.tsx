import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Download, FileBarChart, Wallet } from 'lucide-react'
import {
  getExpenses,
  getInvoicePayments,
  getInvoiceRemaining,
  getInvoices,
  getSuppliers,
  type Expense,
  type Invoice,
  type Supplier,
} from '../../api/accounting'

export interface ReportsPageCopy {
  locale: string
  reports: string
  reportsSubtitle: string
  dateRange: string
  thisMonth: string
  last3Months: string
  last12Months: string
  allTime: string
  customRange: string
  fromDate: string
  toDate: string
  exportCsv: string
  revenue: string
  totalExpenses: string
  netCashflow: string
  currentReceivables: string
  monthlyTrend: string
  expenseByCategory: string
  invoiceStatusSummary: string
  invoice: string
  status: string
  invoiceTotalAmount: string
  amountPaid: string
  remainingAmount: string
  paid: string
  partial: string
  outstanding: string
  category: string
  recordCount: string
  amount: string
  date: string
  description: string
  customer: string
  supplier: string
  counterparty: string
  reportInvoicePayment: string
  reportExpense: string
  noReportData: string
  loading: string
  loadError: string
  retry: string
}

type Period = 'month' | 'quarter' | 'year' | 'all' | 'custom'

interface DateRange {
  from: string
  to: string
}

function formatDateInput(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDefaultFromDate() {
  const today = new Date()
  return formatDateInput(new Date(today.getFullYear(), today.getMonth(), 1))
}

function getMonthKey(date: string) {
  return date.slice(0, 7)
}

function toDate(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number)
  return new Date(year, month - 1, 1)
}

function ReportsPage({ copy }: { copy: ReportsPageCopy }) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [period, setPeriod] = useState<Period>('month')
  const [customFrom, setCustomFrom] = useState(getDefaultFromDate)
  const [customTo, setCustomTo] = useState(() => formatDateInput(new Date()))

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      getInvoices(controller.signal),
      getExpenses(controller.signal),
      getSuppliers(controller.signal),
    ])
      .then(([invoiceData, expenseData, supplierData]) => {
        setInvoices(invoiceData)
        setExpenses(expenseData)
        setSuppliers(supplierData)
      })
      .catch(() => {
        if (!controller.signal.aborted) setHasError(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [retryCount])

  const today = new Date()
  const todayInput = formatDateInput(today)
  let range: DateRange
  if (period === 'custom') {
    range = { from: customFrom, to: customTo }
  } else if (period === 'all') {
    const transactionDates = [
      ...invoices.flatMap((invoice) => [invoice.issueDate, ...getInvoicePayments(invoice).map((payment) => payment.date)]),
      ...expenses.map((expense) => expense.date),
    ].sort()
    range = { from: transactionDates[0] ?? getDefaultFromDate(), to: todayInput }
  } else {
    const monthsToInclude = period === 'month' ? 1 : period === 'quarter' ? 3 : 12
    range = {
      from: formatDateInput(new Date(today.getFullYear(), today.getMonth() - monthsToInclude + 1, 1)),
      to: todayInput,
    }
  }
  const validRange = range.from <= range.to
  const payments = invoices.flatMap((invoice) =>
    getInvoicePayments(invoice).map((payment) => ({ ...payment, invoiceId: invoice.id, customerName: invoice.customerName })),
  )
  const filteredPayments = validRange
    ? payments.filter((payment) => payment.date >= range.from && payment.date <= range.to)
    : []
  const filteredExpenses = validRange
    ? expenses.filter((expense) => expense.date >= range.from && expense.date <= range.to)
    : []
  const revenue = filteredPayments.reduce((total, payment) => total + payment.amount, 0)
  const expenseTotal = filteredExpenses.reduce((total, expense) => total + expense.amount, 0)
  const netCashflow = revenue - expenseTotal
  const currentReceivables = invoices.reduce((total, invoice) => total + getInvoiceRemaining(invoice), 0)
  const currency = new Intl.NumberFormat(copy.locale, {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 2,
  })
  const number = new Intl.NumberFormat(copy.locale)
  const supplierNames = new Map(suppliers.map((supplier) => [supplier.id, supplier.name]))
  const categoryTotals = new Map<string, { count: number; total: number }>()
  for (const expense of filteredExpenses) {
    const category = categoryTotals.get(expense.category) ?? { count: 0, total: 0 }
    category.count += 1
    category.total += expense.amount
    categoryTotals.set(expense.category, category)
  }
  const expenseCategories = [...categoryTotals.entries()]
    .map(([category, totals]) => ({ category, ...totals }))
    .sort((first, second) => second.total - first.total)
  const invoiceStatuses = (['paid', 'partial', 'outstanding'] as const).map((status) => {
    const statusInvoices = invoices.filter((invoice) => invoice.status === status && invoice.issueDate >= range.from && invoice.issueDate <= range.to)
    return {
      status,
      count: statusInvoices.length,
      total: statusInvoices.reduce((total, invoice) => total + invoice.amount, 0),
      remaining: status === 'paid'
        ? 0
        : statusInvoices.reduce((total, invoice) => total + getInvoiceRemaining(invoice), 0),
    }
  })

  const monthlyTotals = new Map<string, { revenue: number; expenses: number }>()
  for (const invoice of filteredPayments) {
    const key = getMonthKey(invoice.date)
    const totals = monthlyTotals.get(key) ?? { revenue: 0, expenses: 0 }
    totals.revenue += invoice.amount
    monthlyTotals.set(key, totals)
  }
  for (const expense of filteredExpenses) {
    const key = getMonthKey(expense.date)
    const totals = monthlyTotals.get(key) ?? { revenue: 0, expenses: 0 }
    totals.expenses += expense.amount
    monthlyTotals.set(key, totals)
  }
  const rangeFirstMonth = getMonthKey(range.from)
  const rangeLastMonth = getMonthKey(range.to)
  const monthKeys: string[] = []
  let month = toDate(rangeFirstMonth)
  const lastMonth = toDate(rangeLastMonth)
  while (month <= lastMonth) {
    monthKeys.push(getMonthKey(formatDateInput(month)))
    month = new Date(month.getFullYear(), month.getMonth() + 1, 1)
  }
  const chartData = monthKeys.map((key) => ({
    month: new Intl.DateTimeFormat(copy.locale, { month: 'short', year: '2-digit' }).format(toDate(key)),
    revenue: monthlyTotals.get(key)?.revenue ?? 0,
    expenses: monthlyTotals.get(key)?.expenses ?? 0,
  }))
  const dateFormatter = new Intl.DateTimeFormat(copy.locale, { day: 'numeric', month: 'short', year: 'numeric' })

  function exportCsv() {
    const rows = [
      [copy.date, copy.description, copy.counterparty, copy.amount],
      ...filteredPayments.map((invoice) => [
        invoice.date,
        copy.reportInvoicePayment,
        invoice.customerName,
        String(invoice.amount),
      ]),
      ...filteredExpenses.map((expense) => [
        expense.date,
        `${copy.reportExpense}: ${expense.description} (${expense.category})`,
        supplierNames.get(expense.supplierId) ?? '',
        String(-expense.amount),
      ]),
    ]
    const csv = `\uFEFF${rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(',')).join('\r\n')}`
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `financial-report-${range.from}-${range.to}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return <section className="mx-auto max-w-7xl py-16 text-center text-sm text-slate-500" aria-live="polite">{copy.loading}</section>
  }

  if (hasError) {
    return (
      <section className="mx-auto flex min-h-72 max-w-7xl flex-col items-center justify-center text-center">
        <p className="font-semibold text-rose-700">{copy.loadError}</p>
        <button type="button" onClick={() => { setIsLoading(true); setHasError(false); setRetryCount((count) => count + 1) }} className="mt-4 rounded-lg bg-[#17352f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#21483e]">{copy.retry}</button>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{copy.reports}</h1>
          <p className="mt-2 text-sm text-slate-500">{copy.reportsSubtitle}</p>
        </div>
        <button type="button" onClick={exportCsv} disabled={!validRange || (!filteredPayments.length && !filteredExpenses.length)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
          <Download size={16} />
          {copy.exportCsv}
        </button>
      </div>

      <div className="mb-5 flex flex-col gap-3 border-y border-slate-200 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={copy.dateRange}>
          {([
            ['month', copy.thisMonth],
            ['quarter', copy.last3Months],
            ['year', copy.last12Months],
            ['all', copy.allTime],
            ['custom', copy.customRange],
          ] as const).map(([value, label]) => (
            <button key={value} type="button" onClick={() => setPeriod(value)} aria-pressed={period === value} className={`h-9 rounded-lg px-3 text-sm font-semibold transition-colors ${period === value ? 'bg-[#17352f] text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
              {label}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
              {copy.fromDate}
              <input type="date" value={customFrom} max={customTo} onChange={(event) => setCustomFrom(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700" />
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
              {copy.toDate}
              <input type="date" value={customTo} min={customFrom} max={todayInput} onChange={(event) => setCustomTo(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700" />
            </label>
          </div>
        )}
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.02]">
          <p className="text-sm font-medium text-slate-500">{copy.revenue}</p>
          <p className="mt-4 text-2xl font-bold tabular-nums text-emerald-800">{currency.format(revenue)}</p>
        </article>
        <article className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.02]">
          <p className="text-sm font-medium text-slate-500">{copy.totalExpenses}</p>
          <p className="mt-4 text-2xl font-bold tabular-nums text-amber-700">{currency.format(expenseTotal)}</p>
        </article>
        <article className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.02]">
          <p className="flex items-center gap-2 text-sm font-medium text-slate-500"><Wallet size={16} />{copy.netCashflow}</p>
          <p className={`mt-4 text-2xl font-bold tabular-nums ${netCashflow < 0 ? 'text-rose-700' : 'text-slate-900'}`}>{currency.format(netCashflow)}</p>
        </article>
        <article className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.02]">
          <p className="flex items-center gap-2 text-sm font-medium text-slate-500"><FileBarChart size={16} />{copy.currentReceivables}</p>
          <p className="mt-4 text-2xl font-bold tabular-nums text-slate-900">{currency.format(currentReceivables)}</p>
        </article>
      </div>

      {!validRange || (!filteredPayments.length && !filteredExpenses.length) ? (
        <div className="grid min-h-56 place-items-center rounded-xl border border-slate-200 bg-white text-sm text-slate-500">{copy.noReportData}</div>
      ) : (
        <>
          <section className="mb-5 rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.02]">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-bold text-slate-800">{copy.monthlyTrend}</h2>
              <span className="text-xs text-slate-500">{dateFormatter.format(new Date(`${range.from}T12:00:00`))} – {dateFormatter.format(new Date(`${range.to}T12:00:00`))}</span>
            </div>
            <div className="h-72 w-full" role="img" aria-label={copy.monthlyTrend}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#e8eeeb" strokeDasharray="3 4" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(value: number) => new Intl.NumberFormat(copy.locale, { notation: 'compact', maximumFractionDigits: 0 }).format(value)} width={48} />
                  <Tooltip formatter={(value) => currency.format(Number(value))} contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 10, fontFamily: 'Cairo, sans-serif', fontSize: 12 }} />
                  <Legend />
                  <Bar dataKey="revenue" name={copy.revenue} fill="#16845d" radius={[4, 4, 0, 0]} maxBarSize={34} />
                  <Bar dataKey="expenses" name={copy.totalExpenses} fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={34} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-2">
            <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.02]">
              <h2 className="border-b border-slate-100 px-5 py-4 font-bold text-slate-800">{copy.expenseByCategory}</h2>
              {expenseCategories.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px] text-start text-sm">
                    <thead className="bg-slate-50/70 text-xs text-slate-500">
                      <tr><th className="px-5 py-3 font-semibold">{copy.category}</th><th className="px-5 py-3 font-semibold">{copy.recordCount}</th><th className="px-5 py-3 font-semibold">{copy.amount}</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {expenseCategories.map((item) => (
                        <tr key={item.category} className="text-slate-700">
                          <td className="px-5 py-3.5 font-medium">{item.category}</td>
                          <td className="px-5 py-3.5 tabular-nums">{number.format(item.count)}</td>
                          <td className="px-5 py-3.5 font-semibold tabular-nums">{currency.format(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="px-5 py-10 text-center text-sm text-slate-500">{copy.noReportData}</p>}
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.02]">
              <h2 className="border-b border-slate-100 px-5 py-4 font-bold text-slate-800">{copy.invoiceStatusSummary}</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-start text-sm">
                  <thead className="bg-slate-50/70 text-xs text-slate-500">
                    <tr><th className="px-5 py-3 font-semibold">{copy.status}</th><th className="px-5 py-3 font-semibold">{copy.recordCount}</th><th className="px-5 py-3 font-semibold">{copy.invoiceTotalAmount}</th><th className="px-5 py-3 font-semibold">{copy.remainingAmount}</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoiceStatuses.map((item) => (
                      <tr key={item.status} className="text-slate-700">
                        <td className="px-5 py-3.5 font-medium">{copy[item.status]}</td>
                        <td className="px-5 py-3.5 tabular-nums">{number.format(item.count)}</td>
                        <td className="px-5 py-3.5 tabular-nums">{currency.format(item.total)}</td>
                        <td className="px-5 py-3.5 font-semibold tabular-nums">{currency.format(item.remaining)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </>
      )}
    </section>
  )
}

export default ReportsPage