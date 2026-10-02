import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyInvoicePayment,
  getInvoicePayments,
  getInvoiceRemaining,
} from './accounting.ts'

const baseInvoice = {
  id: 'INV-2026-0001',
  customerId: 1,
  customerName: 'Test customer',
  issueDate: '2026-10-01',
  dueDate: '2026-10-15',
  amount: 100,
  paidAmount: 0,
  status: 'outstanding',
}

test('paid invoices always have a zero remaining balance', () => {
  assert.equal(getInvoiceRemaining({ ...baseInvoice, paidAmount: 40, status: 'paid' }), 0)
})

test('partial invoices report the amount still due', () => {
  assert.equal(getInvoiceRemaining({ ...baseInvoice, paidAmount: 35, status: 'partial' }), 65)
})

test('legacy paid amounts remain available as a dated payment', () => {
  const payments = getInvoicePayments({ ...baseInvoice, paidAmount: 20, status: 'partial' })

  assert.deepEqual(payments, [{
    id: 'legacy-INV-2026-0001',
    amount: 20,
    date: baseInvoice.issueDate,
  }])
})

test('multiple payments preserve dates and update the invoice status', () => {
  const partialInvoice = applyInvoicePayment(baseInvoice, {
    id: 'PAY-1',
    amount: 35,
    date: '2026-10-03',
  })
  const paidInvoice = applyInvoicePayment(partialInvoice, {
    id: 'PAY-2',
    amount: 65,
    date: '2026-10-10',
  })

  assert.equal(partialInvoice.status, 'partial')
  assert.equal(getInvoiceRemaining(partialInvoice), 65)
  assert.equal(paidInvoice.status, 'paid')
  assert.equal(getInvoiceRemaining(paidInvoice), 0)
  assert.deepEqual(paidInvoice.payments.map(({ date }) => date), ['2026-10-03', '2026-10-10'])
})