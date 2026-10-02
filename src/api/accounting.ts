export type InvoiceStatus = 'paid' | 'partial' | 'outstanding'

export interface Invoice {
  id: string
  customerId: number
  customerName: string
  issueDate: string
  dueDate: string
  amount: number
  paidAmount: number
  status: InvoiceStatus
  paidAt?: string
  payments?: InvoicePayment[]
}

export interface InvoicePayment {
  id: string
  amount: number
  date: string
}

export interface Expense {
  id: string
  description: string
  category: string
  amount: number
  date: string
  supplierId: number
}

export interface Customer {
  id: number
  name: string
  email: string
  phone: string
}

export interface Supplier {
  id: number
  name: string
  category: string
  phone: string
}

export type NewInvoice = Invoice
export type CustomerInput = Omit<Customer, 'id'>
export type SupplierInput = Omit<Supplier, 'id'>
export type ExpenseInput = Omit<Expense, 'id'>

export type AppLanguage = 'ar' | 'en'

export interface BusinessProfile {
  name: string
  email: string
  phone: string
  taxNumber: string
  address: string
}

export interface AppSettings {
  id: number
  language: AppLanguage
  defaultDueDays: number
  businessProfile: BusinessProfile
}

export type AppSettingsInput = Omit<AppSettings, 'id'>

export function getInvoicePayments(invoice: Invoice): InvoicePayment[] {
  if (invoice.payments?.length) return invoice.payments
  if (invoice.paidAmount <= 0) return []

  return [{
    id: `legacy-${invoice.id}`,
    amount: invoice.paidAmount,
    date: invoice.paidAt ?? invoice.issueDate,
  }]
}

export function getInvoiceRemaining(invoice: Invoice): number {
  return invoice.status === 'paid' ? 0 : Math.max(0, invoice.amount - invoice.paidAmount)
}

export function getInvoiceStatus(amount: number, paidAmount: number): InvoiceStatus {
  if (paidAmount >= amount) return 'paid'
  return paidAmount > 0 ? 'partial' : 'outstanding'
}

export function getSettings(signal?: AbortSignal) {
  return getResource<AppSettings[]>('settings', signal)
}

export async function createSettings(settings: AppSettingsInput): Promise<AppSettings> {
  const response = await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  })

  if (!response.ok) {
    throw new Error(`Settings creation failed (${response.status})`)
  }

  return response.json() as Promise<AppSettings>
}

export async function updateSettings(id: number, settings: AppSettingsInput): Promise<AppSettings> {
  const response = await fetch(`/api/settings/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  })

  if (!response.ok) {
    throw new Error(`Settings update failed (${response.status})`)
  }

  return response.json() as Promise<AppSettings>
}

export function applyInvoicePayment(invoice: Invoice, payment: InvoicePayment): Invoice {
  const payments = [...getInvoicePayments(invoice), payment]
  const paidAmount = payments.reduce((total, item) => total + item.amount, 0)

  return {
    ...invoice,
    payments,
    paidAmount,
    paidAt: payment.date,
    status: getInvoiceStatus(invoice.amount, paidAmount),
  }
}

async function getResource<T>(resource: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/${resource}`, { signal })

  if (!response.ok) {
    throw new Error(`Request for ${resource} failed (${response.status})`)
  }

  return response.json() as Promise<T>
}

export function getInvoices(signal?: AbortSignal) {
  return getResource<Invoice[]>('invoices', signal)
}

export function getCustomers(signal?: AbortSignal) {
  return getResource<Customer[]>('customers', signal)
}

export function getSuppliers(signal?: AbortSignal) {
  return getResource<Supplier[]>('suppliers', signal)
}

export function getExpenses(signal?: AbortSignal) {
  return getResource<Expense[]>('expenses', signal)
}

export async function createExpense(expense: Expense): Promise<Expense> {
  const response = await fetch('/api/expenses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expense),
  })

  if (!response.ok) {
    throw new Error(`Expense creation failed (${response.status})`)
  }

  return response.json() as Promise<Expense>
}

export async function updateExpense(id: string, expense: ExpenseInput): Promise<Expense> {
  const response = await fetch(`/api/expenses/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expense),
  })

  if (!response.ok) {
    throw new Error(`Expense update failed (${response.status})`)
  }

  return response.json() as Promise<Expense>
}

export async function deleteExpense(id: string): Promise<void> {
  const response = await fetch(`/api/expenses/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error(`Expense deletion failed (${response.status})`)
  }
}

export async function createInvoice(invoice: NewInvoice): Promise<Invoice> {
  const response = await fetch('/api/invoices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invoice),
  })

  if (!response.ok) {
    throw new Error(`Invoice creation failed (${response.status})`)
  }

  return response.json() as Promise<Invoice>
}

export async function deleteInvoice(id: string): Promise<void> {
  const response = await fetch(`/api/invoices/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error(`Invoice deletion failed (${response.status})`)
  }
}

export async function updateInvoice(id: string, invoice: Invoice): Promise<Invoice> {
  const response = await fetch(`/api/invoices/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invoice),
  })

  if (!response.ok) {
    throw new Error(`Invoice update failed (${response.status})`)
  }

  return response.json() as Promise<Invoice>
}

export async function createCustomer(customer: CustomerInput): Promise<Customer> {
  const response = await fetch('/api/customers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customer),
  })

  if (!response.ok) {
    throw new Error(`Customer creation failed (${response.status})`)
  }

  return response.json() as Promise<Customer>
}

export async function updateCustomer(id: number, customer: CustomerInput): Promise<Customer> {
  const response = await fetch(`/api/customers/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customer),
  })

  if (!response.ok) {
    throw new Error(`Customer update failed (${response.status})`)
  }

  return response.json() as Promise<Customer>
}

export async function deleteCustomer(id: number): Promise<void> {
  const response = await fetch(`/api/customers/${id}`, { method: 'DELETE' })

  if (!response.ok) {
    throw new Error(`Customer deletion failed (${response.status})`)
  }
}

export async function createSupplier(supplier: SupplierInput): Promise<Supplier> {
  const response = await fetch('/api/suppliers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(supplier),
  })

  if (!response.ok) {
    throw new Error(`Supplier creation failed (${response.status})`)
  }

  return response.json() as Promise<Supplier>
}

export async function updateSupplier(id: number, supplier: SupplierInput): Promise<Supplier> {
  const response = await fetch(`/api/suppliers/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(supplier),
  })

  if (!response.ok) {
    throw new Error(`Supplier update failed (${response.status})`)
  }

  return response.json() as Promise<Supplier>
}

export async function deleteSupplier(id: number): Promise<void> {
  const response = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' })

  if (!response.ok) {
    throw new Error(`Supplier deletion failed (${response.status})`)
  }
}

export function getDashboardData(signal?: AbortSignal) {
  return Promise.all([
    getResource<Invoice[]>('invoices', signal),
    getResource<Expense[]>('expenses', signal),
    getResource<Customer[]>('customers', signal),
    getResource<Supplier[]>('suppliers', signal),
  ]).then(([invoices, expenses, customers, suppliers]) => ({
    invoices,
    expenses,
    customers,
    suppliers,
  }))
}
