import { useEffect, useState, type FormEvent } from 'react'
import { Building2, Pencil, Phone, Plus, Search, Trash2, Truck, Wallet, X } from 'lucide-react'
import { toast } from 'react-toastify'
import {
  createSupplier,
  deleteSupplier,
  getExpenses,
  getSuppliers,
  updateSupplier,
  type Expense,
  type Supplier,
  type SupplierInput,
} from '../../api/accounting'

export interface SupplierPageCopy {
  locale: string
  suppliers: string
  supplier: string
  supplierSubtitle: string
  addSupplier: string
  searchSuppliers: string
  totalSuppliers: string
  supplierExpenseCount: string
  supplierExpenseTotal: string
  supplierName: string
  category: string
  phone: string
  expenses: string
  actions: string
  addSupplierTitle: string
  editSupplierTitle: string
  saveSupplier: string
  saving: string
  cancel: string
  edit: string
  delete: string
  deleting: string
  retry: string
  loading: string
  supplierLoadError: string
  noSuppliers: string
  noResults: string
  supplierRequiredFields: string
  supplierNameExists: string
  supplierCreated: string
  supplierUpdated: string
  supplierDeleted: string
  supplierCreateError: string
  supplierUpdateError: string
  supplierDeleteError: string
  deleteSupplierTitle: string
  deleteSupplierConfirm: string
  supplierExpensesPreserved: string
}

interface SupplierRow extends Supplier {
  expenseCount: number
  expenseTotal: number
}

function SuppliersPage({ copy }: { copy: SupplierPageCopy }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [search, setSearch] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [phone, setPhone] = useState('')
  const [formError, setFormError] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([getSuppliers(controller.signal), getExpenses(controller.signal)])
      .then(([supplierData, expenseData]) => {
        setSuppliers(supplierData)
        setExpenses(expenseData)
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
  const expenseTotals = new Map<number, { count: number; total: number }>()
  for (const expense of expenses) {
    const total = expenseTotals.get(expense.supplierId) ?? { count: 0, total: 0 }
    total.count += 1
    total.total += expense.amount
    expenseTotals.set(expense.supplierId, total)
  }
  const supplierRows: SupplierRow[] = suppliers.map((supplier) => {
    const expenseTotal = expenseTotals.get(supplier.id) ?? { count: 0, total: 0 }
    return { ...supplier, expenseCount: expenseTotal.count, expenseTotal: expenseTotal.total }
  })
  const query = search.trim().toLocaleLowerCase(copy.locale)
  const filteredSuppliers = supplierRows.filter((supplier) =>
    [supplier.name, supplier.category, supplier.phone].some((value) => value.toLocaleLowerCase(copy.locale).includes(query)),
  )
  const totalExpense = expenses.reduce((total, expense) => total + expense.amount, 0)
  const linkedExpenses = expenses.length

  function openForm(supplier?: Supplier) {
    const editing = supplier ?? null
    setEditingSupplier(editing)
    setName(editing?.name ?? '')
    setCategory(editing?.category ?? '')
    setPhone(editing?.phone ?? '')
    setFormError('')
    setIsFormOpen(true)
  }

  async function handleSaveSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    const supplierInput: SupplierInput = {
      name: name.trim(),
      category: category.trim(),
      phone: phone.trim(),
    }
    if (!supplierInput.name || !supplierInput.category || !supplierInput.phone) {
      setFormError(copy.supplierRequiredFields)
      return
    }

    const duplicateName = suppliers.some(
      (supplier) => supplier.id !== editingSupplier?.id && supplier.name.toLocaleLowerCase() === supplierInput.name.toLocaleLowerCase(),
    )
    if (duplicateName) {
      setFormError(copy.supplierNameExists)
      return
    }

    setIsSaving(true)
    try {
      if (editingSupplier) {
        const updatedSupplier = await updateSupplier(editingSupplier.id, supplierInput)
        setSuppliers((current) => current.map((supplier) => supplier.id === updatedSupplier.id ? updatedSupplier : supplier))
        toast.success(copy.supplierUpdated)
      } else {
        const createdSupplier = await createSupplier(supplierInput)
        setSuppliers((current) => [createdSupplier, ...current])
        toast.success(copy.supplierCreated)
      }
      setIsFormOpen(false)
    } catch {
      setFormError(editingSupplier ? copy.supplierUpdateError : copy.supplierCreateError)
      toast.error(editingSupplier ? copy.supplierUpdateError : copy.supplierCreateError)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteSupplier() {
    if (!deleteTarget) return
    setDeletingId(deleteTarget.id)
    setDeleteError('')
    try {
      await deleteSupplier(deleteTarget.id)
      setSuppliers((current) => current.filter((supplier) => supplier.id !== deleteTarget.id))
      setDeleteTarget(null)
      toast.success(copy.supplierDeleted)
    } catch {
      setDeleteError(copy.supplierDeleteError)
      toast.error(copy.supplierDeleteError)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{copy.suppliers}</h1>
          <p className="mt-2 text-sm text-slate-500">{copy.supplierSubtitle}</p>
        </div>
        <button type="button" onClick={() => openForm()} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#17352f] px-4 text-sm font-semibold text-white hover:bg-[#21483e]">
          <Plus size={17} />
          {copy.addSupplier}
        </button>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.02]">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-500">{copy.totalSuppliers}</p>
            <span className="grid size-10 place-items-center rounded-lg bg-slate-100 text-slate-700"><Truck size={19} /></span>
          </div>
          <p className="mt-5 text-2xl font-bold tabular-nums text-slate-900">{number.format(suppliers.length)}</p>
        </article>
        <article className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.02]">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-500">{copy.supplierExpenseCount}</p>
            <span className="grid size-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><Building2 size={19} /></span>
          </div>
          <p className="mt-5 text-2xl font-bold tabular-nums text-slate-900">{number.format(linkedExpenses)}</p>
        </article>
        <article className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.02]">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-500">{copy.supplierExpenseTotal}</p>
            <span className="grid size-10 place-items-center rounded-lg bg-amber-50 text-amber-700"><Wallet size={19} /></span>
          </div>
          <p className="mt-5 text-2xl font-bold tabular-nums text-slate-900">{currency.format(totalExpense)}</p>
        </article>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.02]">
        <div className="border-b border-slate-100 p-4 sm:px-5">
          <label className="relative block w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.searchSuppliers} className="h-10 w-full rounded-lg border border-slate-200 bg-white ps-10 pe-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10" />
          </label>
        </div>
        {isLoading ? (
          <div className="grid min-h-60 place-items-center text-sm text-slate-500" aria-live="polite">{copy.loading}</div>
        ) : hasError ? (
          <div className="flex min-h-60 flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-rose-700">{copy.supplierLoadError}</p>
            <button type="button" onClick={() => { setHasError(false); setIsLoading(true); setRetryCount((count) => count + 1) }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">{copy.retry}</button>
          </div>
        ) : filteredSuppliers.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-start text-sm">
              <thead className="bg-slate-50/70 text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">{copy.supplier}</th>
                  <th className="px-5 py-3.5 font-semibold">{copy.category}</th>
                  <th className="px-5 py-3.5 font-semibold">{copy.phone}</th>
                  <th className="px-5 py-3.5 font-semibold">{copy.expenses}</th>
                  <th className="px-5 py-3.5 font-semibold">{copy.supplierExpenseTotal}</th>
                  <th className="px-5 py-3.5 font-semibold">{copy.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="text-slate-700 hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 place-items-center rounded-lg bg-[#e9f4ef] text-[#176447]"><Building2 size={17} /></span>
                        <span className="font-semibold text-slate-800">{supplier.name}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">{supplier.category}</td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <a href={`tel:${supplier.phone}`} className="inline-flex items-center gap-2 text-slate-600 hover:text-emerald-800"><Phone size={15} />{supplier.phone}</a>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 tabular-nums">{number.format(supplier.expenseCount)}</td>
                    <td className="whitespace-nowrap px-5 py-4 font-semibold tabular-nums text-slate-800">{currency.format(supplier.expenseTotal)}</td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => openForm(supplier)} aria-label={`${copy.edit} ${supplier.name}`} title={copy.edit} className="grid size-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"><Pencil size={16} /></button>
                        <button type="button" onClick={() => { setDeleteError(''); setDeleteTarget(supplier) }} aria-label={`${copy.delete} ${supplier.name}`} title={copy.delete} className="grid size-8 place-items-center rounded-md text-slate-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-14 text-center text-sm text-slate-500">{search ? copy.noResults : copy.noSuppliers}</p>
        )}
      </section>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !isSaving) setIsFormOpen(false)
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="supplier-form-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 id="supplier-form-title" className="font-bold text-slate-900">{editingSupplier ? copy.editSupplierTitle : copy.addSupplierTitle}</h2>
              <button type="button" onClick={() => setIsFormOpen(false)} disabled={isSaving} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50" aria-label={copy.cancel}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveSupplier} className="grid gap-4 p-5">
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                {copy.supplierName}
                <input required autoFocus value={name} onChange={(event) => setName(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 font-normal outline-none focus:border-emerald-600" />
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                {copy.category}
                <input required value={category} onChange={(event) => setCategory(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 font-normal outline-none focus:border-emerald-600" />
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                {copy.phone}
                <input required type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 font-normal outline-none focus:border-emerald-600" />
              </label>
              {formError && <p role="alert" className="text-sm text-rose-700">{formError}</p>}
              <div className="mt-1 flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setIsFormOpen(false)} disabled={isSaving} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{copy.cancel}</button>
                <button type="submit" disabled={isSaving} className="h-10 rounded-lg bg-[#17352f] px-4 text-sm font-semibold text-white hover:bg-[#21483e] disabled:opacity-60">{isSaving ? copy.saving : copy.saveSupplier}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !deletingId) setDeleteTarget(null)
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="delete-supplier-title" className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-700"><Trash2 size={19} /></span>
              <div>
                <h2 id="delete-supplier-title" className="font-bold text-slate-900">{copy.deleteSupplierTitle}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{copy.deleteSupplierConfirm} <span className="font-semibold text-slate-800">{deleteTarget.name}</span></p>
                {expenses.some((expense) => expense.supplierId === deleteTarget.id) && (
                  <p className="mt-2 text-sm leading-6 text-slate-500">{copy.supplierExpensesPreserved}</p>
                )}
              </div>
            </div>
            {deleteError && <p role="alert" className="mt-4 text-sm text-rose-700">{deleteError}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={Boolean(deletingId)} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{copy.cancel}</button>
              <button type="button" onClick={handleDeleteSupplier} disabled={Boolean(deletingId)} className="h-10 rounded-lg bg-rose-700 px-4 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-60">{deletingId ? copy.deleting : copy.delete}</button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}

export default SuppliersPage