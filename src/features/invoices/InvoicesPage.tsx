import { useEffect, useState, type FormEvent } from 'react'
import { CircleAlert, FilePlus2, HandCoins, Search, Trash2, Wallet, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import {
  createInvoice,
  deleteInvoice,
  applyInvoicePayment,
  getCustomers,
  getInvoices,
  getInvoicePayments,
  getInvoiceRemaining,
  updateInvoice,
  type Customer,
  type Invoice,
  type InvoiceStatus,
} from '../../api/accounting'

export interface InvoicePageCopy {
  locale: string
  invoices: string
  invoiceSubtitle: string
  createInvoice: string
  searchInvoices: string
  allStatuses: string
  paid: string
  partial: string
  outstanding: string
  totalInvoices: string
  collected: string
  receivables: string
  invoice: string
  customer: string
  issueDate: string
  dueDate: string
  amount: string
  status: string
  noInvoices: string
  noResults: string
  loading: string
  loadError: string
  retry: string
  newInvoice: string
  chooseCustomer: string
  noCustomersForInvoice: string
  addCustomerFromInvoice: string
  invoiceAmount: string
  invoiceStatus: string
  paidAmount: string
  remainingAmount: string
  recordPayment: string
  paymentTitle: string
  paymentAmount: string
  paymentDate: string
  paymentSaved: string
  paymentRequired: string
  paymentExceedsBalance: string
  paymentSaveError: string
  actions: string
  cancel: string
  save: string
  saving: string
  invoiceCreated: string
  invoiceCreateError: string
  invoiceDeleted: string
  invoiceDeleteError: string
  deleteInvoiceTitle: string
  deleteInvoiceConfirm: string
  delete: string
  deleting: string
  requiredFields: string
}

type StatusFilter = 'all' | InvoiceStatus

function getToday() {
  const today = new Date()
  const offset = today.getTimezoneOffset()
  return new Date(today.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

function addDays(value: string, days: number) {
  const [year, month, day] = value.split('-').map(Number)
  const dueDate = new Date(year, month - 1, day + days)
  const dueYear = dueDate.getFullYear()
  const dueMonth = String(dueDate.getMonth() + 1).padStart(2, '0')
  const dueDay = String(dueDate.getDate()).padStart(2, '0')
  return `${dueYear}-${dueMonth}-${dueDay}`
}

function InvoicesPage({ copy, defaultDueDays }: { copy: InvoicePageCopy; defaultDueDays: number }) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [amount, setAmount] = useState('')
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatus>('outstanding')
  const [paidAmount, setPaidAmount] = useState('')
  const [issueDate, setIssueDate] = useState(getToday)
  const [dueDate, setDueDate] = useState(() => addDays(getToday(), defaultDueDays))
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null)
  const [paymentTarget, setPaymentTarget] = useState<Invoice | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(getToday)
  const [paymentError, setPaymentError] = useState('')
  const [isSavingPayment, setIsSavingPayment] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([getInvoices(controller.signal), getCustomers(controller.signal)])
      .then(([invoiceData, customerData]) => {
        setInvoices(invoiceData)
        setCustomers(customerData)
      })
      .catch(() => {
        if (!controller.signal.aborted) setHasError(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [retryCount])

  const number = new Intl.NumberFormat(copy.locale)
  const currency = new Intl.NumberFormat(copy.locale, {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 2,
  })
  const dateFormatter = new Intl.DateTimeFormat(copy.locale, { day: 'numeric', month: 'short', year: 'numeric' })
  const filteredInvoices = invoices
    .filter((invoice) => statusFilter === 'all' || invoice.status === statusFilter)
    .filter((invoice) => {
      const value = search.trim().toLocaleLowerCase(copy.locale)
      return !value || invoice.id.toLocaleLowerCase(copy.locale).includes(value) || invoice.customerName.toLocaleLowerCase(copy.locale).includes(value)
    })
    .sort((first, second) => second.issueDate.localeCompare(first.issueDate))
  const collected = invoices.reduce(
    (total, invoice) => total + getInvoicePayments(invoice).reduce((invoiceTotal, payment) => invoiceTotal + payment.amount, 0),
    0,
  )
  const receivables = invoices.reduce((total, invoice) => total + getInvoiceRemaining(invoice), 0)

  async function handleCreateInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')

    const customer = customers.find((item) => item.id === Number(selectedCustomerId))
    const parsedAmount = Number(amount)
    const parsedPaidAmount = invoiceStatus === 'paid'
      ? parsedAmount
      : invoiceStatus === 'partial'
        ? Number(paidAmount)
        : 0
    const invalidPaidAmount = invoiceStatus === 'partial'
      && (!Number.isFinite(parsedPaidAmount) || parsedPaidAmount <= 0 || parsedPaidAmount >= parsedAmount)

    if (!customer || !Number.isFinite(parsedAmount) || parsedAmount <= 0 || invalidPaidAmount || !issueDate || !dueDate || dueDate < issueDate) {
      setFormError(copy.requiredFields)
      return
    }

    const invoiceYear = issueDate.slice(0, 4)
    const sequence = invoices
      .filter((invoice) => invoice.id.startsWith(`INV-${invoiceYear}-`))
      .map((invoice) => Number(invoice.id.split('-').at(-1)))
      .reduce((highest, value) => Math.max(highest, value), 0) + 1

    setIsSaving(true)
    try {
      const createdInvoice = await createInvoice({
        id: `INV-${invoiceYear}-${String(sequence).padStart(4, '0')}`,
        customerId: customer.id,
        customerName: customer.name,
        issueDate,
        dueDate,
        amount: parsedAmount,
        paidAmount: parsedPaidAmount,
        status: invoiceStatus,
        ...(parsedPaidAmount > 0 ? {
          paidAt: issueDate,
          payments: [{
            id: `INV-${invoiceYear}-${String(sequence).padStart(4, '0')}-PAY-001`,
            amount: parsedPaidAmount,
            date: issueDate,
          }],
        } : {}),
      })
      setInvoices((current) => [createdInvoice, ...current])
      setIsCreateOpen(false)
      setSelectedCustomerId('')
      setAmount('')
      setInvoiceStatus('outstanding')
      setPaidAmount('')
      const nextIssueDate = getToday()
      setIssueDate(nextIssueDate)
      setDueDate(addDays(nextIssueDate, defaultDueDays))
      toast.success(copy.invoiceCreated)
    } catch {
      setFormError(copy.invoiceCreateError)
      toast.error(copy.invoiceCreateError)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteInvoice() {
    if (!deleteTarget) return
    setDeletingId(deleteTarget.id)
    setDeleteError('')

    try {
      await deleteInvoice(deleteTarget.id)
      setInvoices((current) => current.filter((invoice) => invoice.id !== deleteTarget.id))
      setDeleteTarget(null)
      toast.success(copy.invoiceDeleted)
    } catch {
      setDeleteError(copy.invoiceDeleteError)
      toast.error(copy.invoiceDeleteError)
    } finally {
      setDeletingId(null)
    }
  }

  async function handleRecordPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!paymentTarget) return
    setPaymentError('')

    const parsedAmount = Number(paymentAmount)
    const payments = getInvoicePayments(paymentTarget)
    const paidAmount = payments.reduce((total, payment) => total + payment.amount, 0)
    const remaining = Math.max(0, paymentTarget.amount - paidAmount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || !paymentDate) {
      setPaymentError(copy.paymentRequired)
      return
    }
    if (parsedAmount > remaining) {
      setPaymentError(copy.paymentExceedsBalance)
      return
    }

    const updatedInvoice = applyInvoicePayment(paymentTarget, {
      id: `${paymentTarget.id}-PAY-${Date.now()}-${payments.length + 1}`,
      amount: parsedAmount,
      date: paymentDate,
    })

    setIsSavingPayment(true)
    try {
      const savedInvoice = await updateInvoice(paymentTarget.id, updatedInvoice)
      setInvoices((current) => current.map((invoice) => invoice.id === savedInvoice.id ? savedInvoice : invoice))
      setPaymentTarget(null)
      setPaymentAmount('')
      setPaymentDate(getToday())
      toast.success(copy.paymentSaved)
    } catch {
      setPaymentError(copy.paymentSaveError)
      toast.error(copy.paymentSaveError)
    } finally {
      setIsSavingPayment(false)
    }
  }

  const statusLabel = (status: InvoiceStatus) =>
    status === 'paid' ? copy.paid : status === 'partial' ? copy.partial : copy.outstanding

  const statusStyle = (status: InvoiceStatus) =>
    status === 'paid'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'partial'
        ? 'bg-amber-50 text-amber-700'
        : 'bg-rose-50 text-rose-700'

  return (
    <section className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{copy.invoices}</h1>
          <p className="mt-2 text-sm text-slate-500">{copy.invoiceSubtitle}</p>
        </div>
        <button
          type="button"
          disabled={isLoading || hasError}
          title={isLoading ? copy.loading : hasError ? copy.loadError : undefined}
          onClick={() => {
            setFormError('')
            setInvoiceStatus('outstanding')
            setPaidAmount('')
            const nextIssueDate = getToday()
            setIssueDate(nextIssueDate)
            setDueDate(addDays(nextIssueDate, defaultDueDays))
            setIsCreateOpen(true)
          }}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#17352f] px-4 text-sm font-semibold text-white hover:bg-[#21483e] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FilePlus2 size={17} />
          {copy.createInvoice}
        </button>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.02]">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-500">{copy.totalInvoices}</p>
            <span className="grid size-10 place-items-center rounded-lg bg-slate-100 text-slate-700"><FilePlus2 size={19} /></span>
          </div>
          <p className="mt-5 text-2xl font-bold tabular-nums text-slate-900">{number.format(invoices.length)}</p>
        </article>
        <article className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.02]">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-500">{copy.collected}</p>
            <span className="grid size-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><Wallet size={19} /></span>
          </div>
          <p className="mt-5 text-2xl font-bold tabular-nums text-slate-900">{currency.format(collected)}</p>
        </article>
        <article className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.02]">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-500">{copy.receivables}</p>
            <span className="grid size-10 place-items-center rounded-lg bg-amber-50 text-amber-700"><CircleAlert size={19} /></span>
          </div>
          <p className="mt-5 text-2xl font-bold tabular-nums text-slate-900">{currency.format(receivables)}</p>
        </article>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.02]">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <label className="relative block w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={copy.searchInvoices}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white ps-10 pe-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10"
            />
          </label>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            aria-label={copy.status}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-600 sm:min-w-44"
          >
            <option value="all">{copy.allStatuses}</option>
            <option value="paid">{copy.paid}</option>
            <option value="partial">{copy.partial}</option>
            <option value="outstanding">{copy.outstanding}</option>
          </select>
        </div>

        {isLoading ? (
          <div className="grid min-h-60 place-items-center text-sm text-slate-500" aria-live="polite">{copy.loading}</div>
        ) : hasError ? (
          <div className="flex min-h-60 flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-rose-700">{copy.loadError}</p>
            <button
              type="button"
              onClick={() => {
                setHasError(false)
                setIsLoading(true)
                setRetryCount((count) => count + 1)
              }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {copy.retry}
            </button>
          </div>
        ) : filteredInvoices.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-start text-sm">
              <thead className="bg-slate-50/70 text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">{copy.invoice}</th>
                  <th className="px-5 py-3.5 font-semibold">{copy.customer}</th>
                  <th className="px-5 py-3.5 font-semibold">{copy.issueDate}</th>
                  <th className="px-5 py-3.5 font-semibold">{copy.dueDate}</th>
                  <th className="px-5 py-3.5 font-semibold">{copy.amount}</th>
                  <th className="px-5 py-3.5 font-semibold">{copy.paidAmount}</th>
                  <th className="px-5 py-3.5 font-semibold">{copy.status}</th>
                  <th className="px-5 py-3.5 font-semibold">{copy.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="text-slate-700 hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-800">{invoice.id}</td>
                    <td className="whitespace-nowrap px-5 py-4">{invoice.customerName}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">{dateFormatter.format(new Date(`${invoice.issueDate}T12:00:00`))}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">{dateFormatter.format(new Date(`${invoice.dueDate}T12:00:00`))}</td>
                    <td className="whitespace-nowrap px-5 py-4 font-medium tabular-nums">{currency.format(invoice.amount)}</td>
                    <td className="whitespace-nowrap px-5 py-4 tabular-nums">{currency.format(getInvoicePayments(invoice).reduce((total, payment) => total + payment.amount, 0))}</td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${statusStyle(invoice.status)}`}>
                        {statusLabel(invoice.status)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex items-center gap-1">
                        {getInvoiceRemaining(invoice) > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentError('')
                              setPaymentTarget(invoice)
                              setPaymentAmount('')
                              setPaymentDate(getToday())
                            }}
                            className="grid size-8 place-items-center rounded-md text-emerald-700 hover:bg-emerald-50"
                            aria-label={`${copy.recordPayment} ${invoice.id}`}
                            title={copy.recordPayment}
                          >
                            <HandCoins size={17} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError('')
                            setDeleteTarget(invoice)
                          }}
                          className="grid size-8 place-items-center rounded-md text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                          aria-label={`${copy.delete} ${invoice.id}`}
                          title={copy.delete}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-14 text-center text-sm text-slate-500">
            {search || statusFilter !== 'all' ? copy.noResults : copy.noInvoices}
          </p>
        )}
      </section>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !isSaving) setIsCreateOpen(false)
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="new-invoice-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 id="new-invoice-title" className="font-bold text-slate-900">{copy.newInvoice}</h2>
              <button type="button" onClick={() => setIsCreateOpen(false)} disabled={isSaving} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50" aria-label={copy.cancel}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateInvoice} className="grid gap-4 p-5">
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                {copy.customer}
                <select required value={selectedCustomerId} onChange={(event) => setSelectedCustomerId(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 font-normal outline-none focus:border-emerald-600">
                  <option value="">{copy.chooseCustomer}</option>
                  {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
                </select>
                {customers.length === 0 && !isLoading && !hasError && (
                  <span className="text-xs font-normal text-amber-700">
                    {copy.noCustomersForInvoice}{' '}
                    <Link to="/customers" className="font-semibold underline underline-offset-2">{copy.addCustomerFromInvoice}</Link>
                  </span>
                )}
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                {copy.invoiceAmount}
                <input required min="1" step="0.01" type="number" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 font-normal outline-none focus:border-emerald-600" />
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                {copy.invoiceStatus}
                <select value={invoiceStatus} onChange={(event) => setInvoiceStatus(event.target.value as InvoiceStatus)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 font-normal outline-none focus:border-emerald-600">
                  <option value="outstanding">{copy.outstanding}</option>
                  <option value="partial">{copy.partial}</option>
                  <option value="paid">{copy.paid}</option>
                </select>
              </label>
              {invoiceStatus === 'partial' && (
                <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                  {copy.paidAmount}
                  <input required min="0.01" step="0.01" max={amount || undefined} type="number" inputMode="decimal" value={paidAmount} onChange={(event) => setPaidAmount(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 font-normal outline-none focus:border-emerald-600" />
                </label>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                  {copy.issueDate}
                  <input required type="date" value={issueDate} onChange={(event) => { setIssueDate(event.target.value); setDueDate(addDays(event.target.value, defaultDueDays)) }} className="h-10 rounded-lg border border-slate-200 px-3 font-normal outline-none focus:border-emerald-600" />
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                  {copy.dueDate}
                  <input required min={issueDate} type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 font-normal outline-none focus:border-emerald-600" />
                </label>
              </div>
              {formError && <p role="alert" className="text-sm text-rose-700">{formError}</p>}
              <div className="mt-1 flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setIsCreateOpen(false)} disabled={isSaving} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{copy.cancel}</button>
                <button type="submit" disabled={isSaving} className="h-10 rounded-lg bg-[#17352f] px-4 text-sm font-semibold text-white hover:bg-[#21483e] disabled:opacity-60">{isSaving ? copy.saving : copy.save}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !deletingId) setDeleteTarget(null)
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="delete-invoice-title" className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-700"><Trash2 size={19} /></span>
              <div>
                <h2 id="delete-invoice-title" className="font-bold text-slate-900">{copy.deleteInvoiceTitle}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{copy.deleteInvoiceConfirm} <span className="font-semibold text-slate-800">{deleteTarget.id}</span></p>
              </div>
            </div>
            {deleteError && <p role="alert" className="mt-4 text-sm text-rose-700">{deleteError}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={Boolean(deletingId)} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{copy.cancel}</button>
              <button type="button" onClick={handleDeleteInvoice} disabled={Boolean(deletingId)} className="h-10 rounded-lg bg-rose-700 px-4 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-60">{deletingId ? copy.deleting : copy.delete}</button>
            </div>
          </section>
        </div>
      )}

      {paymentTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !isSavingPayment) setPaymentTarget(null)
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="invoice-payment-title" className="w-full max-w-md rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 id="invoice-payment-title" className="font-bold text-slate-900">{copy.paymentTitle}</h2>
              <button type="button" onClick={() => setPaymentTarget(null)} disabled={isSavingPayment} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50" aria-label={copy.cancel}><X size={18} /></button>
            </div>
            <form onSubmit={handleRecordPayment} className="grid gap-4 p-5">
              <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
                <p className="font-semibold text-slate-800">{paymentTarget.id} · {paymentTarget.customerName}</p>
                <p className="mt-1 text-slate-500">{copy.remainingAmount}: {currency.format(getInvoiceRemaining(paymentTarget))}</p>
              </div>
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                {copy.paymentAmount}
                <input required type="number" min="0.01" max={getInvoiceRemaining(paymentTarget)} step="0.01" inputMode="decimal" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 font-normal outline-none focus:border-emerald-600" />
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                {copy.paymentDate}
                <input required type="date" max={getToday()} value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 font-normal outline-none focus:border-emerald-600" />
              </label>
              {paymentError && <p role="alert" className="text-sm text-rose-700">{paymentError}</p>}
              <div className="mt-1 flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setPaymentTarget(null)} disabled={isSavingPayment} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{copy.cancel}</button>
                <button type="submit" disabled={isSavingPayment} className="h-10 rounded-lg bg-[#17352f] px-4 text-sm font-semibold text-white hover:bg-[#21483e] disabled:opacity-60">{isSavingPayment ? copy.saving : copy.recordPayment}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  )
}

export default InvoicesPage
