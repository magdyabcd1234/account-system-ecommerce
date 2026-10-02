import { useEffect, useState, type FormEvent } from 'react'
import { CalendarDays, Pencil, Plus, Search, Tags, Trash2, Wallet, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import {
  createExpense,
  deleteExpense,
  getExpenses,
  getSuppliers,
  updateExpense,
  type Expense,
  type ExpenseInput,
  type Supplier,
} from '../../api/accounting'

export interface ExpensePageCopy {
  locale: string
  expenses: string
  expenseSubtitle: string
  addExpense: string
  searchExpenses: string
  expenseRecords: string
  totalExpenses: string
  monthExpenses: string
  expenseDescription: string
  category: string
  supplier: string
  chooseSupplier: string
  addSupplierForExpense: string
  date: string
  amount: string
  actions: string
  edit: string
  delete: string
  cancel: string
  saveExpense: string
  saving: string
  deleting: string
  loading: string
  loadError: string
  retry: string
  noExpenses: string
  noResults: string
  addExpenseTitle: string
  editExpenseTitle: string
  expenseRequiredFields: string
  expenseCreated: string
  expenseUpdated: string
  expenseDeleted: string
  expenseCreateError: string
  expenseUpdateError: string
  expenseDeleteError: string
  expenseLoadError: string
  deleteExpenseTitle: string
  deleteExpenseConfirm: string
}

function getToday() {
  const today = new Date()
  const offset = today.getTimezoneOffset()
  return new Date(today.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

function ExpensesPage({ copy }: { copy: ExpensePageCopy }) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [search, setSearch] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null)
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(getToday)
  const [supplierId, setSupplierId] = useState('')
  const [formError, setFormError] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([getExpenses(controller.signal), getSuppliers(controller.signal)])
      .then(([expenseData, supplierData]) => {
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

  const number = new Intl.NumberFormat(copy.locale)
  const currency = new Intl.NumberFormat(copy.locale, {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 2,
  })
  const dateFormatter = new Intl.DateTimeFormat(copy.locale, { day: 'numeric', month: 'short', year: 'numeric' })
  const supplierNames = new Map(suppliers.map((supplier) => [supplier.id, supplier.name]))
  const currentMonth = getToday().slice(0, 7)
  const totalExpenses = expenses.reduce((total, expense) => total + expense.amount, 0)
  const monthTotal = expenses
    .filter((expense) => expense.date.slice(0, 7) === currentMonth)
    .reduce((total, expense) => total + expense.amount, 0)
  const query = search.trim().toLocaleLowerCase(copy.locale)
  const filteredExpenses = [...expenses]
    .filter((expense) => {
      const supplierName = supplierNames.get(expense.supplierId) ?? ''
      return [expense.description, expense.category, supplierName]
        .some((value) => value.toLocaleLowerCase(copy.locale).includes(query))
    })
    .sort((first, second) => second.date.localeCompare(first.date))

  function openForm(expense?: Expense) {
    const editing = expense ?? null
    setEditingExpense(editing)
    setDescription(editing?.description ?? '')
    setCategory(editing?.category ?? '')
    setAmount(editing ? String(editing.amount) : '')
    setDate(editing?.date ?? getToday())
    setSupplierId(editing ? String(editing.supplierId) : '')
    setFormError('')
    setIsFormOpen(true)
  }

  async function handleSaveExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    const parsedAmount = Number(amount)
    const parsedSupplierId = Number(supplierId)
    const selectedSupplier = suppliers.find((supplier) => supplier.id === parsedSupplierId)
    if (!description.trim() || !category.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0 || !date || !selectedSupplier) {
      setFormError(copy.expenseRequiredFields)
      return
    }

    const expenseInput: ExpenseInput = {
      description: description.trim(),
      category: category.trim(),
      amount: parsedAmount,
      date,
      supplierId: selectedSupplier.id,
    }
    setIsSaving(true)
    try {
      if (editingExpense) {
        const updatedExpense = await updateExpense(editingExpense.id, expenseInput)
        setExpenses((current) => current.map((expense) => expense.id === updatedExpense.id ? updatedExpense : expense))
        toast.success(copy.expenseUpdated)
      } else {
        const expenseYear = date.slice(0, 4)
        const sequence = expenses
          .filter((expense) => expense.id.startsWith(`EXP-${expenseYear}-`))
          .map((expense) => Number(expense.id.split('-').at(-1)))
          .reduce((highest, value) => Math.max(highest, value), 0) + 1
        const createdExpense = await createExpense({
          id: `EXP-${expenseYear}-${String(sequence).padStart(3, '0')}`,
          ...expenseInput,
        })
        setExpenses((current) => [createdExpense, ...current])
        toast.success(copy.expenseCreated)
      }
      setIsFormOpen(false)
    } catch {
      setFormError(editingExpense ? copy.expenseUpdateError : copy.expenseCreateError)
      toast.error(editingExpense ? copy.expenseUpdateError : copy.expenseCreateError)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteExpense() {
    if (!deleteTarget) return
    setDeletingId(deleteTarget.id)
    setDeleteError('')
    try {
      await deleteExpense(deleteTarget.id)
      setExpenses((current) => current.filter((expense) => expense.id !== deleteTarget.id))
      setDeleteTarget(null)
      toast.success(copy.expenseDeleted)
    } catch {
      setDeleteError(copy.expenseDeleteError)
      toast.error(copy.expenseDeleteError)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{copy.expenses}</h1>
          <p className="mt-2 text-sm text-slate-500">{copy.expenseSubtitle}</p>
        </div>
        <button type="button" onClick={() => openForm()} disabled={suppliers.length === 0} title={suppliers.length === 0 ? copy.chooseSupplier : undefined} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#17352f] px-4 text-sm font-semibold text-white hover:bg-[#21483e] disabled:cursor-not-allowed disabled:opacity-60">
          <Plus size={17} />
          {copy.addExpense}
        </button>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.02]">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-500">{copy.expenseRecords}</p>
            <span className="grid size-10 place-items-center rounded-lg bg-slate-100 text-slate-700"><Tags size={19} /></span>
          </div>
          <p className="mt-5 text-2xl font-bold tabular-nums text-slate-900">{number.format(expenses.length)}</p>
        </article>
        <article className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.02]">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-500">{copy.totalExpenses}</p>
            <span className="grid size-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><Wallet size={19} /></span>
          </div>
          <p className="mt-5 text-2xl font-bold tabular-nums text-slate-900">{currency.format(totalExpenses)}</p>
        </article>
        <article className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.02]">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-500">{copy.monthExpenses}</p>
            <span className="grid size-10 place-items-center rounded-lg bg-amber-50 text-amber-700"><CalendarDays size={19} /></span>
          </div>
          <p className="mt-5 text-2xl font-bold tabular-nums text-slate-900">{currency.format(monthTotal)}</p>
        </article>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.02]">
        <div className="border-b border-slate-100 p-4 sm:px-5">
          <label className="relative block w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.searchExpenses} className="h-10 w-full rounded-lg border border-slate-200 bg-white ps-10 pe-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10" />
          </label>
        </div>
        {isLoading ? (
          <div className="grid min-h-60 place-items-center text-sm text-slate-500" aria-live="polite">{copy.loading}</div>
        ) : hasError ? (
          <div className="flex min-h-60 flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-rose-700">{copy.expenseLoadError}</p>
            <button type="button" onClick={() => { setHasError(false); setIsLoading(true); setRetryCount((count) => count + 1) }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">{copy.retry}</button>
          </div>
        ) : filteredExpenses.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-start text-sm">
              <thead className="bg-slate-50/70 text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">{copy.expenseDescription}</th>
                  <th className="px-5 py-3.5 font-semibold">{copy.category}</th>
                  <th className="px-5 py-3.5 font-semibold">{copy.supplier}</th>
                  <th className="px-5 py-3.5 font-semibold">{copy.date}</th>
                  <th className="px-5 py-3.5 font-semibold">{copy.amount}</th>
                  <th className="px-5 py-3.5 font-semibold">{copy.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="text-slate-700 hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-800">{expense.description}</td>
                    <td className="whitespace-nowrap px-5 py-4">{expense.category}</td>
                    <td className="whitespace-nowrap px-5 py-4">{supplierNames.get(expense.supplierId) ?? copy.noResults}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">{dateFormatter.format(new Date(`${expense.date}T12:00:00`))}</td>
                    <td className="whitespace-nowrap px-5 py-4 font-medium tabular-nums">{currency.format(expense.amount)}</td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => openForm(expense)} aria-label={`${copy.edit} ${expense.description}`} title={copy.edit} className="grid size-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"><Pencil size={16} /></button>
                        <button type="button" onClick={() => { setDeleteError(''); setDeleteTarget(expense) }} aria-label={`${copy.delete} ${expense.description}`} title={copy.delete} className="grid size-8 place-items-center rounded-md text-slate-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-14 text-center text-sm text-slate-500">
            <p>{search ? copy.noResults : copy.noExpenses}</p>
            {!search && suppliers.length === 0 && (
              <Link to="/suppliers" className="mt-2 inline-block font-semibold text-emerald-800 underline underline-offset-2">{copy.addSupplierForExpense}</Link>
            )}
          </div>
        )}
      </section>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !isSaving) setIsFormOpen(false)
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="expense-form-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 id="expense-form-title" className="font-bold text-slate-900">{editingExpense ? copy.editExpenseTitle : copy.addExpenseTitle}</h2>
              <button type="button" onClick={() => setIsFormOpen(false)} disabled={isSaving} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50" aria-label={copy.cancel}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveExpense} className="grid gap-4 p-5">
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                {copy.expenseDescription}
                <input required autoFocus value={description} onChange={(event) => setDescription(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 font-normal outline-none focus:border-emerald-600" />
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                {copy.category}
                <input required value={category} onChange={(event) => setCategory(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 font-normal outline-none focus:border-emerald-600" />
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                {copy.supplier}
                <select required value={supplierId} onChange={(event) => setSupplierId(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 font-normal outline-none focus:border-emerald-600">
                  <option value="">{copy.chooseSupplier}</option>
                  {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                </select>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                  {copy.amount}
                  <input required min="0.01" step="0.01" type="number" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 font-normal outline-none focus:border-emerald-600" />
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                  {copy.date}
                  <input required type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 font-normal outline-none focus:border-emerald-600" />
                </label>
              </div>
              {formError && <p role="alert" className="text-sm text-rose-700">{formError}</p>}
              <div className="mt-1 flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setIsFormOpen(false)} disabled={isSaving} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{copy.cancel}</button>
                <button type="submit" disabled={isSaving} className="h-10 rounded-lg bg-[#17352f] px-4 text-sm font-semibold text-white hover:bg-[#21483e] disabled:opacity-60">{isSaving ? copy.saving : copy.saveExpense}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !deletingId) setDeleteTarget(null)
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="delete-expense-title" className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-700"><Trash2 size={19} /></span>
              <div>
                <h2 id="delete-expense-title" className="font-bold text-slate-900">{copy.deleteExpenseTitle}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{copy.deleteExpenseConfirm} <span className="font-semibold text-slate-800">{deleteTarget.description}</span></p>
              </div>
            </div>
            {deleteError && <p role="alert" className="mt-4 text-sm text-rose-700">{deleteError}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={Boolean(deletingId)} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{copy.cancel}</button>
              <button type="button" onClick={handleDeleteExpense} disabled={Boolean(deletingId)} className="h-10 rounded-lg bg-rose-700 px-4 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-60">{deletingId ? copy.deleting : copy.delete}</button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}

export default ExpensesPage