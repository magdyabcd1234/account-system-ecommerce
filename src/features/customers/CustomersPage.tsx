import { useEffect, useState, type FormEvent } from 'react'
import { Building2, CircleAlert, Mail, Pencil, Phone, Plus, Search, Trash2, UsersRound, Wallet, X } from 'lucide-react'
import { toast } from 'react-toastify'
import {
  createCustomer,
  deleteCustomer,
  getCustomers,
  getInvoiceRemaining,
  getInvoices,
  updateCustomer,
  type Customer,
  type CustomerInput,
  type Invoice,
} from '../../api/accounting'

export interface CustomersPageCopy {
  locale: string
  customers: string
  customerSubtitle: string
  addCustomer: string
  searchCustomers: string
  totalCustomers: string
  totalReceivables: string
  customersWithBalance: string
  customer: string
  email: string
  phone: string
  invoices: string
  receivables: string
  actions: string
  edit: string
  delete: string
  addCustomerTitle: string
  editCustomerTitle: string
  customerName: string
  cancel: string
  saveCustomer: string
  saving: string
  deleting: string
  retry: string
  loading: string
  customerLoadError: string
  noCustomers: string
  noResults: string
  customerRequiredFields: string
  emailAlreadyExists: string
  customerCreated: string
  customerUpdated: string
  customerDeleted: string
  customerCreateError: string
  customerUpdateError: string
  customerDeleteError: string
  deleteCustomerTitle: string
  deleteCustomerConfirm: string
  customerInvoicesPreserved: string
}

interface CustomerRow extends Customer {
  invoiceCount: number
  receivables: number
}

function CustomersPage({ copy }: { copy: CustomersPageCopy }) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [search, setSearch] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [formError, setFormError] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([getCustomers(controller.signal), getInvoices(controller.signal)])
      .then(([customerData, invoiceData]) => {
        setCustomers(customerData)
        setInvoices(invoiceData)
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
  const customerRows: CustomerRow[] = customers.map((customer) => {
    const customerInvoices = invoices.filter((invoice) => invoice.customerId === customer.id)
    return {
      ...customer,
      invoiceCount: customerInvoices.length,
      receivables: customerInvoices.reduce(
        (total, invoice) => total + getInvoiceRemaining(invoice),
        0,
      ),
    }
  })
  const query = search.trim().toLocaleLowerCase(copy.locale)
  const filteredCustomers = customerRows.filter((customer) =>
    [customer.name, customer.email, customer.phone].some((value) => value.toLocaleLowerCase(copy.locale).includes(query)),
  )
  const balanceTotal = customerRows.reduce((total, customer) => total + customer.receivables, 0)
  const customersWithBalance = customerRows.filter((customer) => customer.receivables > 0).length

  function openForm(customer?: Customer) {
    const editing = customer ?? null
    setEditingCustomer(editing)
    setName(editing?.name ?? '')
    setEmail(editing?.email ?? '')
    setPhone(editing?.phone ?? '')
    setFormError('')
    setIsFormOpen(true)
  }

  async function handleSaveCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    const customerInput: CustomerInput = { name: name.trim(), email: email.trim(), phone: phone.trim() }
    if (!customerInput.name || !customerInput.email || !customerInput.phone) {
      setFormError(copy.customerRequiredFields)
      return
    }

    const emailExists = customers.some(
      (customer) => customer.id !== editingCustomer?.id && customer.email.toLowerCase() === customerInput.email.toLowerCase(),
    )
    if (emailExists) {
      setFormError(copy.emailAlreadyExists)
      return
    }

    setIsSaving(true)
    try {
      if (editingCustomer) {
        const updatedCustomer = await updateCustomer(editingCustomer.id, customerInput)
        setCustomers((current) => current.map((customer) => customer.id === updatedCustomer.id ? updatedCustomer : customer))
        toast.success(copy.customerUpdated)
      } else {
        const createdCustomer = await createCustomer(customerInput)
        setCustomers((current) => [createdCustomer, ...current])
        toast.success(copy.customerCreated)
      }
      setIsFormOpen(false)
    } catch {
      setFormError(editingCustomer ? copy.customerUpdateError : copy.customerCreateError)
      toast.error(editingCustomer ? copy.customerUpdateError : copy.customerCreateError)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteCustomer() {
    if (!deleteTarget) return
    setDeletingId(deleteTarget.id)
    setDeleteError('')
    try {
      await deleteCustomer(deleteTarget.id)
      setCustomers((current) => current.filter((customer) => customer.id !== deleteTarget.id))
      setDeleteTarget(null)
      toast.success(copy.customerDeleted)
    } catch {
      setDeleteError(copy.customerDeleteError)
      toast.error(copy.customerDeleteError)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{copy.customers}</h1>
          <p className="mt-2 text-sm text-slate-500">{copy.customerSubtitle}</p>
        </div>
        <button type="button" onClick={() => openForm()} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#17352f] px-4 text-sm font-semibold text-white hover:bg-[#21483e]">
          <Plus size={17} />
          {copy.addCustomer}
        </button>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.02]">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-500">{copy.totalCustomers}</p>
            <span className="grid size-10 place-items-center rounded-lg bg-slate-100 text-slate-700"><UsersRound size={19} /></span>
          </div>
          <p className="mt-5 text-2xl font-bold tabular-nums text-slate-900">{number.format(customers.length)}</p>
        </article>
        <article className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.02]">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-500">{copy.totalReceivables}</p>
            <span className="grid size-10 place-items-center rounded-lg bg-amber-50 text-amber-700"><Wallet size={19} /></span>
          </div>
          <p className="mt-5 text-2xl font-bold tabular-nums text-slate-900">{currency.format(balanceTotal)}</p>
        </article>
        <article className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.02]">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-500">{copy.customersWithBalance}</p>
            <span className="grid size-10 place-items-center rounded-lg bg-rose-50 text-rose-700"><CircleAlert size={19} /></span>
          </div>
          <p className="mt-5 text-2xl font-bold tabular-nums text-slate-900">{number.format(customersWithBalance)}</p>
        </article>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.02]">
        <div className="border-b border-slate-100 p-4 sm:px-5">
          <label className="relative block w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.searchCustomers} className="h-10 w-full rounded-lg border border-slate-200 bg-white ps-10 pe-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10" />
          </label>
        </div>
        {isLoading ? (
          <div className="grid min-h-60 place-items-center text-sm text-slate-500" aria-live="polite">{copy.loading}</div>
        ) : hasError ? (
          <div className="flex min-h-60 flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-rose-700">{copy.customerLoadError}</p>
            <button type="button" onClick={() => { setHasError(false); setIsLoading(true); setRetryCount((count) => count + 1) }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">{copy.retry}</button>
          </div>
        ) : filteredCustomers.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-start text-sm">
              <thead className="bg-slate-50/70 text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">{copy.customer}</th>
                  <th className="px-5 py-3.5 font-semibold">{copy.phone}</th>
                  <th className="px-5 py-3.5 font-semibold">{copy.email}</th>
                  <th className="px-5 py-3.5 font-semibold">{copy.invoices}</th>
                  <th className="px-5 py-3.5 font-semibold">{copy.receivables}</th>
                  <th className="px-5 py-3.5 font-semibold">{copy.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="text-slate-700 hover:bg-slate-50/70">
                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="grid size-9 place-items-center rounded-lg bg-[#e9f4ef] text-[#176447]"><Building2 size={17} /></span>
                          <span className="font-semibold text-slate-800">{customer.name}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <a href={`tel:${customer.phone}`} className="inline-flex items-center gap-2 text-slate-600 hover:text-emerald-800"><Phone size={15} />{customer.phone}</a>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <a href={`mailto:${customer.email}`} className="inline-flex items-center gap-2 text-slate-600 hover:text-emerald-800"><Mail size={15} />{customer.email}</a>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 tabular-nums">{number.format(customer.invoiceCount)}</td>
                      <td className="whitespace-nowrap px-5 py-4 font-semibold tabular-nums text-slate-800">{currency.format(customer.receivables)}</td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => openForm(customer)} aria-label={`${copy.edit} ${customer.name}`} title={copy.edit} className="grid size-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"><Pencil size={16} /></button>
                          <button type="button" onClick={() => { setDeleteError(''); setDeleteTarget(customer) }} aria-label={`${copy.delete} ${customer.name}`} title={copy.delete} className="grid size-8 place-items-center rounded-md text-slate-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-14 text-center text-sm text-slate-500">{search ? copy.noResults : copy.noCustomers}</p>
        )}
      </section>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !isSaving) setIsFormOpen(false)
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="customer-form-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 id="customer-form-title" className="font-bold text-slate-900">{editingCustomer ? copy.editCustomerTitle : copy.addCustomerTitle}</h2>
              <button type="button" onClick={() => setIsFormOpen(false)} disabled={isSaving} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50" aria-label={copy.cancel}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveCustomer} className="grid gap-4 p-5">
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                {copy.customerName}
                <input required autoFocus value={name} onChange={(event) => setName(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 font-normal outline-none focus:border-emerald-600" />
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                {copy.email}
                <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 font-normal outline-none focus:border-emerald-600" />
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                {copy.phone}
                <input required type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 font-normal outline-none focus:border-emerald-600" />
              </label>
              {formError && <p role="alert" className="text-sm text-rose-700">{formError}</p>}
              <div className="mt-1 flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setIsFormOpen(false)} disabled={isSaving} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{copy.cancel}</button>
                <button type="submit" disabled={isSaving} className="h-10 rounded-lg bg-[#17352f] px-4 text-sm font-semibold text-white hover:bg-[#21483e] disabled:opacity-60">{isSaving ? copy.saving : copy.saveCustomer}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !deletingId) setDeleteTarget(null)
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="delete-customer-title" className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-700"><Trash2 size={19} /></span>
              <div>
                <h2 id="delete-customer-title" className="font-bold text-slate-900">{copy.deleteCustomerTitle}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{copy.deleteCustomerConfirm} <span className="font-semibold text-slate-800">{deleteTarget.name}</span></p>
                {invoices.some((invoice) => invoice.customerId === deleteTarget.id) && (
                  <p className="mt-2 text-sm leading-6 text-slate-500">{copy.customerInvoicesPreserved}</p>
                )}
              </div>
            </div>
            {deleteError && <p role="alert" className="mt-4 text-sm text-rose-700">{deleteError}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={Boolean(deletingId)} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{copy.cancel}</button>
              <button type="button" onClick={handleDeleteCustomer} disabled={Boolean(deletingId)} className="h-10 rounded-lg bg-rose-700 px-4 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-60">{deletingId ? copy.deleting : copy.delete}</button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}

export default CustomersPage
