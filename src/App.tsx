import { lazy, Suspense, useEffect, useEffectEvent, useRef, useState } from 'react'
import {
  Bell,
  CalendarClock,
  ChartNoAxesCombined,
  CheckCheck,
  CircleAlert,
  FileText,
  Languages,
  LayoutDashboard,
  Menu,
  ReceiptText,
  Settings,
  Truck,
  UsersRound,
  Wallet,
  X,
} from 'lucide-react'
import {
  BrowserRouter,
  Navigate,
  NavLink,
  Route,
  Routes,
  useNavigate,
  useLocation,
} from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { getInvoiceRemaining, getInvoices, getSettings, type AppLanguage, type AppSettings, type Invoice } from './api/accounting'

const Dashboard = lazy(() => import('./features/dashboard/Dashboard'))
const InvoicesPage = lazy(() => import('./features/invoices/InvoicesPage'))
const CustomersPage = lazy(() => import('./features/customers/CustomersPage'))
const SuppliersPage = lazy(() => import('./features/suppliers/SuppliersPage'))
const ExpensesPage = lazy(() => import('./features/expenses/ExpensesPage'))
const ReportsPage = lazy(() => import('./features/reports/ReportsPage'))
const SettingsPage = lazy(() => import('./features/settings/SettingsPage'))

type Language = AppLanguage

function getStoredLanguage(): Language {
  return typeof window !== 'undefined' && window.localStorage.getItem('daftar-language') === 'en' ? 'en' : 'ar'
}

function getStoredDueDays() {
  if (typeof window === 'undefined') return 14
  const value = Number(window.localStorage.getItem('daftar-invoice-due-days'))
  return Number.isInteger(value) && value >= 1 && value <= 365 ? value : 14
}

function getStoredReadNotificationIds(): string[] {
  try {
    const stored = localStorage.getItem('daftar-read-notifications')
    const ids: unknown = stored ? JSON.parse(stored) : []
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

interface InvoiceNotification {
  id: string
  invoice: Invoice
  dueDate: Date
  remaining: number
  isOverdue: boolean
}

const translations = {
  ar: {
    locale: 'ar-EG',
    appName: 'دفتر',
    appDescription: 'نظام الإدارة المالية',
    navigation: 'القائمة الرئيسية',
    dashboard: 'لوحة التحكم',
    invoices: 'الفواتير',
    invoice: 'رقم الفاتورة',
    customer: 'العميل',
    email: 'البريد الإلكتروني',
    phone: 'رقم الهاتف',
    category: 'التصنيف',
    actions: 'إجراءات',
    customers: 'العملاء',
    customerSubtitle: 'تابع بيانات العملاء وفواتيرهم والمبالغ المستحقة.',
    addCustomer: 'إضافة عميل',
    saveCustomer: 'حفظ العميل',
    customerLoadError: 'تعذر تحميل بيانات العملاء.',
    customerRequiredFields: 'أدخل اسم العميل والبريد الإلكتروني ورقم الهاتف.',
    searchCustomers: 'ابحث بالاسم أو البريد أو الهاتف',
    totalCustomers: 'إجمالي العملاء',
    totalReceivables: 'إجمالي مستحقات العملاء',
    customersWithBalance: 'عملاء لديهم مستحقات',
    edit: 'تعديل',
    addCustomerTitle: 'إضافة عميل جديد',
    editCustomerTitle: 'تعديل بيانات العميل',
    customerName: 'اسم العميل',
    customerCreated: 'تمت إضافة العميل بنجاح.',
    customerUpdated: 'تم تحديث بيانات العميل.',
    customerDeleted: 'تم حذف العميل.',
    customerCreateError: 'تعذرت إضافة العميل. حاول مرة أخرى.',
    customerUpdateError: 'تعذر تحديث بيانات العميل. حاول مرة أخرى.',
    customerDeleteError: 'تعذرت حذف العميل. حاول مرة أخرى.',
    emailAlreadyExists: 'هذا البريد الإلكتروني مسجل لعميل آخر.',
    noCustomers: 'لا يوجد عملاء مسجلون بعد.',
    deleteCustomerTitle: 'حذف العميل؟',
    deleteCustomerConfirm: 'سيتم حذف العميل نهائيًا:',
    customerInvoicesPreserved: 'ستظل فواتير العميل السابقة محفوظة في سجل الفواتير.',
    invoiceSubtitle: 'تابع التحصيل والمواعيد المستحقة لكل فواتيرك.',
    noCustomersForInvoice: 'لا يوجد عملاء مسجلون لإنشاء فاتورة.',
    addCustomerFromInvoice: 'إضافة عميل',
    createInvoice: 'فاتورة جديدة',
    searchInvoices: 'ابحث برقم الفاتورة أو اسم العميل',
    allStatuses: 'كل الحالات',
    totalInvoices: 'عدد الفواتير',
    collected: 'إجمالي المحصل',
    receivables: 'إجمالي المستحق',
    issueDate: 'تاريخ الإصدار',
    dueDate: 'تاريخ الاستحقاق',
    noResults: 'لا توجد نتائج تطابق البحث أو التصفية.',
    newInvoice: 'إنشاء فاتورة جديدة',
    chooseCustomer: 'اختر العميل',
    invoiceAmount: 'قيمة الفاتورة (ج.م)',
    invoiceStatus: 'حالة الفاتورة',
    paidAmount: 'المبلغ المدفوع',
    recordPayment: 'تسجيل دفعة',
    paymentTitle: 'تسجيل دفعة على الفاتورة',
    paymentAmount: 'مبلغ الدفعة',
    paymentDate: 'تاريخ التحصيل',
    paymentSaved: 'تم تسجيل الدفعة وتحديث حالة الفاتورة.',
    paymentRequired: 'أدخل مبلغًا صحيحًا وتاريخ التحصيل.',
    paymentExceedsBalance: 'مبلغ الدفعة يتجاوز المتبقي على الفاتورة.',
    paymentSaveError: 'تعذر تسجيل الدفعة. حاول مرة أخرى.',
    cancel: 'إلغاء',
    save: 'حفظ الفاتورة',
    saving: 'جارٍ الحفظ...',
    invoiceCreated: 'تم إنشاء الفاتورة بنجاح.',
    invoiceCreateError: 'تعذر حفظ الفاتورة. حاول مرة أخرى.',
    invoiceDeleted: 'تم حذف الفاتورة.',
    invoiceDeleteError: 'تعذر حذف الفاتورة. حاول مرة أخرى.',
    deleteInvoiceTitle: 'حذف الفاتورة؟',
    deleteInvoiceConfirm: 'سيتم حذف الفاتورة نهائيًا:',
    delete: 'حذف',
    deleting: 'جارٍ الحذف...',
    requiredFields: 'تحقق من العميل والمبلغ وتواريخ الفاتورة.',
    suppliers: 'الموردون',
    supplier: 'المورد',
    supplierSubtitle: 'أدر بيانات الموردين وتابع المصروفات المرتبطة بهم.',
    addSupplier: 'إضافة مورد',
    searchSuppliers: 'ابحث باسم المورد أو التصنيف أو الهاتف',
    totalSuppliers: 'إجمالي الموردين',
    supplierExpenseCount: 'مصروفات مرتبطة',
    supplierExpenseTotal: 'إجمالي المصروفات',
    supplierName: 'اسم المورد',
    addSupplierTitle: 'إضافة مورد جديد',
    editSupplierTitle: 'تعديل بيانات المورد',
    saveSupplier: 'حفظ المورد',
    supplierRequiredFields: 'أدخل اسم المورد والتصنيف ورقم الهاتف.',
    supplierNameExists: 'اسم المورد مسجل بالفعل.',
    supplierCreated: 'تمت إضافة المورد بنجاح.',
    supplierUpdated: 'تم تحديث بيانات المورد.',
    supplierDeleted: 'تم حذف المورد.',
    supplierCreateError: 'تعذرت إضافة المورد. حاول مرة أخرى.',
    supplierUpdateError: 'تعذر تحديث بيانات المورد. حاول مرة أخرى.',
    supplierDeleteError: 'تعذر حذف المورد. حاول مرة أخرى.',
    supplierLoadError: 'تعذر تحميل بيانات الموردين.',
    noSuppliers: 'لا يوجد موردون مسجلون بعد.',
    deleteSupplierTitle: 'حذف المورد؟',
    deleteSupplierConfirm: 'سيتم حذف المورد نهائيًا:',
    supplierExpensesPreserved: 'ستظل المصروفات السابقة محفوظة في سجل المصروفات.',
    expenses: 'المصروفات',
    expenseSubtitle: 'سجل المصروفات واربط كل عملية بالمورد المناسب.',
    addExpense: 'إضافة مصروف',
    searchExpenses: 'ابحث بالوصف أو التصنيف أو المورد',
    expenseRecords: 'عدد المصروفات',
    monthExpenses: 'مصروفات هذا الشهر',
    expenseDescription: 'وصف المصروف',
    chooseSupplier: 'اختر المورد',
    addSupplierForExpense: 'إضافة مورد',
    addExpenseTitle: 'تسجيل مصروف جديد',
    editExpenseTitle: 'تعديل المصروف',
    saveExpense: 'حفظ المصروف',
    expenseRequiredFields: 'أدخل الوصف والتصنيف والمبلغ والتاريخ واختر المورد.',
    expenseCreated: 'تم تسجيل المصروف بنجاح.',
    expenseUpdated: 'تم تحديث المصروف.',
    expenseDeleted: 'تم حذف المصروف.',
    expenseCreateError: 'تعذر تسجيل المصروف. حاول مرة أخرى.',
    expenseUpdateError: 'تعذر تحديث المصروف. حاول مرة أخرى.',
    expenseDeleteError: 'تعذر حذف المصروف. حاول مرة أخرى.',
    expenseLoadError: 'تعذر تحميل بيانات المصروفات.',
    noExpenses: 'لا توجد مصروفات مسجلة بعد.',
    deleteExpenseTitle: 'حذف المصروف؟',
    deleteExpenseConfirm: 'سيتم حذف المصروف نهائيًا:',
    reports: 'التقارير',
    reportsSubtitle: 'تابع حركة الإيرادات والمصروفات والمستحقات خلال أي فترة.',
    dateRange: 'الفترة الزمنية',
    last3Months: 'آخر 3 أشهر',
    last12Months: 'آخر 12 شهرًا',
    allTime: 'كل الفترات',
    customRange: 'فترة مخصصة',
    fromDate: 'من تاريخ',
    toDate: 'إلى تاريخ',
    exportCsv: 'تصدير CSV',
    netCashflow: 'صافي التدفق النقدي',
    currentReceivables: 'المستحقات الحالية',
    monthlyTrend: 'الإيرادات والمصروفات شهريًا',
    expenseByCategory: 'المصروفات حسب التصنيف',
    invoiceStatusSummary: 'ملخص حالات الفواتير',
    invoiceTotalAmount: 'إجمالي قيمة الفواتير',
    amountPaid: 'المدفوع',
    remainingAmount: 'المتبقي',
    reportInvoicePayment: 'تحصيل فاتورة',
    reportExpense: 'مصروف',
    description: 'الوصف',
    counterparty: 'الطرف',
    recordCount: 'عدد العمليات',
    noReportData: 'لا توجد بيانات مالية في الفترة المحددة.',
    settings: 'الإعدادات',
    settingsSubtitle: 'خصص بيانات المنشأة وتفضيلات الفواتير والتطبيق.',
    businessDetails: 'بيانات المنشأة',
    businessName: 'اسم المنشأة',
    businessEmail: 'البريد الإلكتروني للمنشأة',
    businessPhone: 'رقم هاتف المنشأة',
    taxNumber: 'الرقم الضريبي',
    businessAddress: 'العنوان',
    invoiceDefaults: 'إعدادات الفواتير',
    defaultDueDays: 'مدة السداد الافتراضية (بالأيام)',
    languagePreference: 'لغة التطبيق',
    arabic: 'العربية',
    english: 'English',
    saveSettings: 'حفظ الإعدادات',
    settingsSaved: 'تم حفظ الإعدادات على هذا الجهاز.',
    settingsSaveError: 'تعذر حفظ الإعدادات في المتصفح.',
    settingsLoadError: 'تعذر تحميل إعدادات المنشأة من الخادم.',
    notifications: 'الإشعارات',
    notificationsHeading: 'تنبيهات الفواتير',
    markAllRead: 'تعليم الكل كمقروء',
    noNotifications: 'لا توجد فواتير متأخرة أو مستحقة قريبًا.',
    overdueInvoice: 'فاتورة متأخرة',
    invoiceDueSoon: 'فاتورة تستحق قريبًا',
    notificationsLoadError: 'تعذر تحميل تنبيهات الفواتير.',
    unreadNotifications: 'تنبيهات غير مقروءة',
    accountManager: 'مدير النظام',
    role: 'مسؤول الحسابات',
    welcome: 'مرحبًا بعودتك',
    dashboardSummary: 'إليك ملخص نشاطك المالي اليوم.',
    totalRevenue: 'إجمالي الإيرادات',
    outstandingInvoices: 'الفواتير المستحقة',
    totalExpenses: 'إجمالي المصروفات',
    thisMonth: 'هذا الشهر',
    paidInvoices: 'فاتورة مدفوعة هذا الشهر',
    dueInvoices: 'فاتورة مستحقة',
    recordedExpenses: 'مصروف مسجل هذا الشهر',
    revenueVsExpenses: 'الإيرادات والمصروفات',
    revenue: 'الإيرادات',
    expenseSeries: 'المصروفات',
    latestInvoices: 'أحدث الفواتير',
    date: 'التاريخ',
    amount: 'المبلغ',
    status: 'الحالة',
    paid: 'مدفوعة',
    partial: 'مدفوعة جزئيًا',
    outstanding: 'مستحقة',
    customerCount: 'العملاء',
    supplierCount: 'الموردون',
    loading: 'جارٍ تحميل بياناتك المالية...',
    loadError: 'تعذر تحميل بيانات لوحة التحكم.',
    retry: 'إعادة المحاولة',
    noInvoices: 'لا توجد فواتير لعرضها.',
    noChartData: 'لا توجد بيانات مالية لهذه الفترة.',
    sectionReady: 'مساحة العمل جاهزة',
    sectionDescription: 'ستظهر بيانات هذا القسم هنا عند ربطه بالنظام.',
    switchLanguage: 'تغيير اللغة',
    openMenu: 'فتح القائمة',
    closeMenu: 'إغلاق القائمة',
  },
  en: {
    locale: 'en-EG',
    appName: 'Daftar',
    appDescription: 'Financial management system',
    navigation: 'MAIN MENU',
    dashboard: 'Dashboard',
    invoices: 'Invoices',
    invoice: 'Invoice number',
    customer: 'Customer',
    email: 'Email address',
    phone: 'Phone number',
    category: 'Category',
    actions: 'Actions',
    customers: 'Customers',
    customerSubtitle: 'Review customer details, invoices, and outstanding balances.',
    addCustomer: 'Add customer',
    saveCustomer: 'Save customer',
    customerLoadError: 'Could not load customer data.',
    customerRequiredFields: 'Enter the customer name, email address, and phone number.',
    searchCustomers: 'Search by name, email, or phone',
    totalCustomers: 'Total customers',
    totalReceivables: 'Total customer receivables',
    customersWithBalance: 'Customers with balances',
    edit: 'Edit',
    addCustomerTitle: 'Add a customer',
    editCustomerTitle: 'Edit customer details',
    customerName: 'Customer name',
    customerCreated: 'Customer added successfully.',
    customerUpdated: 'Customer details updated.',
    customerDeleted: 'Customer deleted.',
    customerCreateError: 'Could not add the customer. Try again.',
    customerUpdateError: 'Could not update the customer. Try again.',
    customerDeleteError: 'Could not delete the customer. Try again.',
    emailAlreadyExists: 'This email address is already used by another customer.',
    noCustomers: 'There are no customers yet.',
    deleteCustomerTitle: 'Delete customer?',
    deleteCustomerConfirm: 'This customer will be permanently deleted:',
    customerInvoicesPreserved: 'The customer’s existing invoices will remain in the invoice history.',
    invoiceSubtitle: 'Track collection status and due dates across your invoices.',
    noCustomersForInvoice: 'There are no customers available for an invoice.',
    addCustomerFromInvoice: 'Add a customer',
    createInvoice: 'New invoice',
    searchInvoices: 'Search by invoice number or customer',
    allStatuses: 'All statuses',
    totalInvoices: 'Invoice count',
    collected: 'Total collected',
    receivables: 'Total receivables',
    issueDate: 'Issue date',
    dueDate: 'Due date',
    noResults: 'No results match this search or filter.',
    newInvoice: 'Create new invoice',
    chooseCustomer: 'Choose a customer',
    invoiceAmount: 'Invoice amount (EGP)',
    invoiceStatus: 'Invoice status',
    paidAmount: 'Amount paid',
    recordPayment: 'Record payment',
    paymentTitle: 'Record an invoice payment',
    paymentAmount: 'Payment amount',
    paymentDate: 'Payment date',
    paymentSaved: 'Payment recorded and invoice status updated.',
    paymentRequired: 'Enter a valid payment amount and date.',
    paymentExceedsBalance: 'Payment amount exceeds the remaining balance.',
    paymentSaveError: 'Could not record the payment. Try again.',
    cancel: 'Cancel',
    save: 'Save invoice',
    saving: 'Saving...',
    invoiceCreated: 'Invoice created successfully.',
    invoiceCreateError: 'Could not save invoice. Try again.',
    invoiceDeleted: 'Invoice deleted.',
    invoiceDeleteError: 'Could not delete the invoice. Try again.',
    deleteInvoiceTitle: 'Delete invoice?',
    deleteInvoiceConfirm: 'This invoice will be permanently deleted:',
    delete: 'Delete',
    deleting: 'Deleting...',
    requiredFields: 'Check the customer, amount, and invoice dates.',
    suppliers: 'Suppliers',
    supplier: 'Supplier',
    supplierSubtitle: 'Manage supplier details and review their linked expenses.',
    addSupplier: 'Add supplier',
    searchSuppliers: 'Search by supplier, category, or phone',
    totalSuppliers: 'Total suppliers',
    supplierExpenseCount: 'Linked expenses',
    supplierExpenseTotal: 'Total expenses',
    supplierName: 'Supplier name',
    addSupplierTitle: 'Add a supplier',
    editSupplierTitle: 'Edit supplier details',
    saveSupplier: 'Save supplier',
    supplierRequiredFields: 'Enter the supplier name, category, and phone number.',
    supplierNameExists: 'A supplier with this name already exists.',
    supplierCreated: 'Supplier added successfully.',
    supplierUpdated: 'Supplier details updated.',
    supplierDeleted: 'Supplier deleted.',
    supplierCreateError: 'Could not add the supplier. Try again.',
    supplierUpdateError: 'Could not update the supplier. Try again.',
    supplierDeleteError: 'Could not delete the supplier. Try again.',
    supplierLoadError: 'Could not load supplier data.',
    noSuppliers: 'There are no suppliers yet.',
    deleteSupplierTitle: 'Delete supplier?',
    deleteSupplierConfirm: 'This supplier will be permanently deleted:',
    supplierExpensesPreserved: 'Previous expenses will remain in the expense history.',
    expenses: 'Expenses',
    expenseSubtitle: 'Record expenses and link each transaction to a supplier.',
    addExpense: 'Add expense',
    searchExpenses: 'Search by description, category, or supplier',
    expenseRecords: 'Expense records',
    monthExpenses: 'This month’s expenses',
    expenseDescription: 'Expense description',
    chooseSupplier: 'Choose a supplier',
    addSupplierForExpense: 'Add a supplier',
    addExpenseTitle: 'Record a new expense',
    editExpenseTitle: 'Edit expense',
    saveExpense: 'Save expense',
    expenseRequiredFields: 'Enter a description, category, amount, date, and supplier.',
    expenseCreated: 'Expense recorded successfully.',
    expenseUpdated: 'Expense updated.',
    expenseDeleted: 'Expense deleted.',
    expenseCreateError: 'Could not record the expense. Try again.',
    expenseUpdateError: 'Could not update the expense. Try again.',
    expenseDeleteError: 'Could not delete the expense. Try again.',
    expenseLoadError: 'Could not load expense data.',
    noExpenses: 'There are no expense records yet.',
    deleteExpenseTitle: 'Delete expense?',
    deleteExpenseConfirm: 'This expense will be permanently deleted:',
    reports: 'Reports',
    reportsSubtitle: 'Review revenue, expenses, and receivables for any period.',
    dateRange: 'Date range',
    last3Months: 'Last 3 months',
    last12Months: 'Last 12 months',
    allTime: 'All time',
    customRange: 'Custom range',
    fromDate: 'From',
    toDate: 'To',
    exportCsv: 'Export CSV',
    netCashflow: 'Net cash flow',
    currentReceivables: 'Current receivables',
    monthlyTrend: 'Monthly revenue and expenses',
    expenseByCategory: 'Expenses by category',
    invoiceStatusSummary: 'Invoice status summary',
    invoiceTotalAmount: 'Invoice amount',
    amountPaid: 'Paid',
    remainingAmount: 'Remaining',
    reportInvoicePayment: 'Invoice payment',
    reportExpense: 'Expense',
    description: 'Description',
    counterparty: 'Party',
    recordCount: 'Transactions',
    noReportData: 'There is no financial activity in this period.',
    settings: 'Settings',
    settingsSubtitle: 'Configure your business details and application defaults.',
    businessDetails: 'Business details',
    businessName: 'Business name',
    businessEmail: 'Business email',
    businessPhone: 'Business phone',
    taxNumber: 'Tax registration number',
    businessAddress: 'Address',
    invoiceDefaults: 'Invoice defaults',
    defaultDueDays: 'Default payment term (days)',
    languagePreference: 'Application language',
    arabic: 'العربية',
    english: 'English',
    saveSettings: 'Save settings',
    settingsSaved: 'Settings saved on this device.',
    settingsSaveError: 'Could not save settings in this browser.',
    settingsLoadError: 'Could not load business settings from the server.',
    notifications: 'Notifications',
    notificationsHeading: 'Invoice alerts',
    markAllRead: 'Mark all as read',
    noNotifications: 'No overdue or upcoming invoices.',
    overdueInvoice: 'Overdue invoice',
    invoiceDueSoon: 'Invoice due soon',
    notificationsLoadError: 'Could not load invoice alerts.',
    unreadNotifications: 'unread alerts',
    accountManager: 'System Manager',
    role: 'Account Administrator',
    welcome: 'Welcome back',
    dashboardSummary: 'Here is your financial activity summary for today.',
    totalRevenue: 'Total revenue',
    outstandingInvoices: 'Outstanding invoices',
    totalExpenses: 'Total expenses',
    thisMonth: 'This month',
    paidInvoices: 'paid invoices this month',
    dueInvoices: 'outstanding invoices',
    recordedExpenses: 'expenses recorded this month',
    revenueVsExpenses: 'Revenue and expenses',
    revenue: 'Revenue',
    expenseSeries: 'Expenses',
    latestInvoices: 'Latest invoices',
    date: 'Date',
    amount: 'Amount',
    status: 'Status',
    paid: 'Paid',
    partial: 'Partially paid',
    outstanding: 'Outstanding',
    customerCount: 'Customers',
    supplierCount: 'Suppliers',
    loading: 'Loading your financial data...',
    loadError: 'Could not load dashboard data.',
    retry: 'Try again',
    noInvoices: 'There are no invoices to display.',
    noChartData: 'There is no financial activity for this period.',
    sectionReady: 'Your workspace is ready',
    sectionDescription: 'This section will show your data when connected to the system.',
    switchLanguage: 'Change language',
    openMenu: 'Open navigation',
    closeMenu: 'Close navigation',
  },
} as const

const navigationItems = [
  { path: '/dashboard', key: 'dashboard', icon: LayoutDashboard },
  { path: '/invoices', key: 'invoices', icon: FileText },
  { path: '/customers', key: 'customers', icon: UsersRound },
  { path: '/suppliers', key: 'suppliers', icon: Truck },
  { path: '/expenses', key: 'expenses', icon: ReceiptText },
  { path: '/reports', key: 'reports', icon: ChartNoAxesCombined },
  { path: '/settings', key: 'settings', icon: Settings },
] as const

function AppLayout() {
  const [language, setLanguage] = useState<Language>(getStoredLanguage)
  const [defaultDueDays, setDefaultDueDays] = useState(getStoredDueDays)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [notificationInvoices, setNotificationInvoices] = useState<Invoice[]>([])
  const [notificationLoadError, setNotificationLoadError] = useState(false)
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(getStoredReadNotificationIds)
  const notificationPanelRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const copy = translations[language]
  const direction = language === 'ar' ? 'rtl' : 'ltr'
  const currentPath = location.pathname === '/' ? '/dashboard' : location.pathname
  const currentPage = navigationItems.find((item) => item.path === currentPath)
  const pageTitle = currentPage ? copy[currentPage.key] : copy.dashboard
  const isDashboard = currentPath === '/dashboard'
  const isInvoices = currentPath === '/invoices'
  const isCustomers = currentPath === '/customers'
  const isSuppliers = currentPath === '/suppliers'
  const isExpenses = currentPath === '/expenses'
  const isReports = currentPath === '/reports'
  const isSettings = currentPath === '/settings'

  function handleSaveSettings(settings: { language: Language; defaultDueDays: number }) {
    setLanguage(settings.language)
    setDefaultDueDays(settings.defaultDueDays)
  }

  const syncSettingsToApp = useEffectEvent((settings: AppSettings) => {
    handleSaveSettings({ language: settings.language, defaultDueDays: settings.defaultDueDays })
  })

  useEffect(() => {
    const controller = new AbortController()
    getSettings(controller.signal)
      .then(([settings]) => {
        if (!settings) return
        syncSettingsToApp(settings)
      })
      .catch(() => undefined)

    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const refreshNotifications = () => {
      getInvoices(controller.signal)
        .then((data) => {
          setNotificationInvoices(data)
          setNotificationLoadError(false)
        })
        .catch(() => {
          if (!controller.signal.aborted) setNotificationLoadError(true)
        })
    }

    refreshNotifications()
    const interval = window.setInterval(refreshNotifications, 60_000)
    return () => {
      controller.abort()
      window.clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (!isNotificationsOpen) return

    function closeOnOutsideClick(event: PointerEvent) {
      if (event.target instanceof Node && !notificationPanelRef.current?.contains(event.target)) {
        setIsNotificationsOpen(false)
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsNotificationsOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isNotificationsOpen])

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayKey = formatLocalDate(today)
  const notificationHorizon = new Date(today)
  notificationHorizon.setDate(notificationHorizon.getDate() + 7)
  const horizonKey = formatLocalDate(notificationHorizon)
  const notificationDateFormatter = new Intl.DateTimeFormat(copy.locale, { day: 'numeric', month: 'short', year: 'numeric' })
  const notificationCurrency = new Intl.NumberFormat(copy.locale, { style: 'currency', currency: 'EGP', maximumFractionDigits: 2 })
  const notificationsList: InvoiceNotification[] = notificationInvoices
    .filter((invoice) => getInvoiceRemaining(invoice) > 0)
    .filter((invoice) => invoice.dueDate < todayKey || invoice.dueDate <= horizonKey)
    .map((invoice) => ({
      id: `${invoice.id}:${invoice.dueDate}`,
      invoice,
      dueDate: new Date(`${invoice.dueDate}T12:00:00`),
      remaining: getInvoiceRemaining(invoice),
      isOverdue: invoice.dueDate < todayKey,
    }))
    .sort((first, second) => first.invoice.dueDate.localeCompare(second.invoice.dueDate))
  const unreadCount = notificationsList.filter((notification) => !readNotificationIds.includes(notification.id)).length

  function markNotificationRead(notificationId: string) {
    const nextReadIds = [...new Set([...readNotificationIds, notificationId])]
    setReadNotificationIds(nextReadIds)
    try {
      localStorage.setItem('daftar-read-notifications', JSON.stringify(nextReadIds))
    } catch {
      return
    }
  }

  function markAllNotificationsRead() {
    const nextReadIds = [...new Set([...readNotificationIds, ...notificationsList.map((notification) => notification.id)])]
    setReadNotificationIds(nextReadIds)
    try {
      localStorage.setItem('daftar-read-notifications', JSON.stringify(nextReadIds))
    } catch {
      return
    }
  }

  useEffect(() => {
    localStorage.setItem('daftar-language', language)
    document.documentElement.lang = language
    document.documentElement.dir = direction
    document.title = `${copy.appName} | ${pageTitle}`
  }, [copy.appName, direction, language, pageTitle])

  return (
    <div className="flex min-h-screen bg-[#f4f7f6] text-slate-900" dir={direction}>
      <ToastContainer
        position="top-center"
        rtl={direction === 'rtl'}
        theme="colored"
        autoClose={4000}
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
        newestOnTop
      />
      {isSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
          aria-label={copy.closeMenu}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={`${isSidebarOpen ? 'flex' : 'hidden'} fixed inset-y-0 start-0 z-40 w-72 shrink-0 flex-col bg-[#17352f] text-white lg:static lg:flex lg:w-64`}
      >
        <div className="flex h-[76px] items-center gap-3 border-b border-white/10 px-6">
          <div className="grid size-10 place-items-center rounded-xl bg-emerald-400 text-[#12332b]">
            <Wallet size={21} strokeWidth={2.4} />
          </div>
          <div>
            <p className="text-lg font-bold leading-tight">{copy.appName}</p>
            <p className="mt-1 text-xs text-emerald-100/65">{copy.appDescription}</p>
          </div>
          <button
            type="button"
            className="ms-auto rounded-lg p-2 text-white/70 hover:bg-white/10 lg:hidden"
            aria-label={copy.closeMenu}
            onClick={() => setIsSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-4 pb-2 pt-8 text-[11px] font-semibold tracking-wide text-emerald-100/50">
          {copy.navigation}
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3" aria-label={copy.navigation}>
          {navigationItems.map(({ path, key, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              onClick={() => setIsSidebarOpen(false)}
              className={({ isActive }) =>
                `flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-400 text-[#12332b]'
                    : 'text-emerald-50/75 hover:bg-white/8 hover:text-white'
                }`
              }
            >
              <Icon size={18} strokeWidth={1.9} />
              <span>{copy[key]}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3 rounded-lg bg-white/5 p-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-[#e2b98a] text-sm font-bold text-[#3a291a]">
              {language === 'ar' ? 'م' : 'A'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{copy.accountManager}</p>
              <p className="mt-0.5 truncate text-xs text-emerald-100/55">{copy.role}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[76px] shrink-0 items-center justify-between border-b border-slate-200/80 bg-white px-4 sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label={copy.openMenu}
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={21} />
            </button>
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-slate-800">{pageTitle}</p>
              <p className="mt-0.5 hidden text-xs text-slate-500 sm:block">{copy.appName}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <button
              type="button"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:px-3"
              aria-label={copy.switchLanguage}
              title={copy.switchLanguage}
              onClick={() => setLanguage((current) => (current === 'ar' ? 'en' : 'ar'))}
            >
              <Languages size={16} />
              <span>{language === 'ar' ? 'EN' : 'عربي'}</span>
            </button>
            <div className="relative" ref={notificationPanelRef}>
              <button
                type="button"
                className="relative grid size-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
                aria-label={`${copy.notifications}${unreadCount ? `, ${unreadCount} ${copy.unreadNotifications}` : ''}`}
                aria-expanded={isNotificationsOpen}
                aria-controls="invoice-notifications-panel"
                title={copy.notifications}
                onClick={() => setIsNotificationsOpen((open) => !open)}
              >
                <Bell size={19} />
                {unreadCount > 0 && (
                  <span className="absolute -end-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full border-2 border-white bg-rose-600 px-1 text-[9px] font-bold leading-none text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {isNotificationsOpen && (
                <section id="invoice-notifications-panel" role="dialog" aria-label={copy.notificationsHeading} className="absolute end-0 top-12 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                    <h2 className="text-sm font-bold text-slate-800">{copy.notificationsHeading}</h2>
                    <button type="button" onClick={markAllNotificationsRead} disabled={unreadCount === 0} className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 disabled:cursor-default disabled:text-slate-400">
                      <span className="inline-flex items-center gap-1.5"><CheckCheck size={14} />{copy.markAllRead}</span>
                    </button>
                  </div>
                  <div className="max-h-[min(26rem,calc(100vh-8rem))] overflow-y-auto">
                    {notificationLoadError ? (
                      <p className="px-4 py-8 text-center text-sm text-rose-700">{copy.notificationsLoadError}</p>
                    ) : notificationsList.length ? (
                      <ul className="divide-y divide-slate-100">
                        {notificationsList.map((notification) => {
                          const isUnread = !readNotificationIds.includes(notification.id)
                          const NotificationIcon = notification.isOverdue ? CircleAlert : CalendarClock
                          return (
                            <li key={notification.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  markNotificationRead(notification.id)
                                  setIsNotificationsOpen(false)
                                  navigate('/invoices')
                                }}
                                className={`flex w-full items-start gap-3 px-4 py-3 text-start transition-colors hover:bg-slate-50 ${isUnread ? 'bg-emerald-50/45' : 'bg-white'}`}
                              >
                                <span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg ${notification.isOverdue ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                                  <NotificationIcon size={17} />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                                    {notification.isOverdue ? copy.overdueInvoice : copy.invoiceDueSoon}
                                    {isUnread && <span className="size-1.5 rounded-full bg-emerald-600" />}
                                  </span>
                                  <span className="mt-1 block truncate text-xs text-slate-600">{notification.invoice.id} · {notification.invoice.customerName}</span>
                                  <span className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                                    <span>{notificationDateFormatter.format(notification.dueDate)}</span>
                                    <span>{notificationCurrency.format(notification.remaining)}</span>
                                  </span>
                                </span>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    ) : (
                      <p className="px-4 py-10 text-center text-sm text-slate-500">{copy.noNotifications}</p>
                    )}
                  </div>
                </section>
              )}
            </div>
            <div className="hidden h-8 w-px bg-slate-200 sm:block" />
            <button type="button" className="flex items-center gap-2 rounded-lg p-1 text-start hover:bg-slate-50">
              <span className="grid size-9 place-items-center rounded-full bg-[#e2b98a] text-sm font-bold text-[#3a291a]">
                {language === 'ar' ? 'م' : 'A'}
              </span>
              <span className="hidden text-xs font-semibold text-slate-700 md:block">
                {copy.accountManager}
              </span>
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-7 sm:py-8">
          <Routes>
            <Route path="/" element={<Navigate replace to="/dashboard" />} />
            {navigationItems.map(({ path }) => (
              <Route
                key={path}
                path={path}
                element={
                  isDashboard ? (
                    <Suspense fallback={<p className="text-sm text-slate-500">{copy.loading}</p>}>
                      <Dashboard copy={copy} />
                    </Suspense>
                  ) : isInvoices ? (
                    <Suspense fallback={<p className="text-sm text-slate-500">{copy.loading}</p>}>
                      <InvoicesPage copy={copy} defaultDueDays={defaultDueDays} />
                    </Suspense>
                  ) : isCustomers ? (
                    <Suspense fallback={<p className="text-sm text-slate-500">{copy.loading}</p>}>
                      <CustomersPage copy={copy} />
                    </Suspense>
                  ) : isSuppliers ? (
                    <Suspense fallback={<p className="text-sm text-slate-500">{copy.loading}</p>}>
                      <SuppliersPage copy={copy} />
                    </Suspense>
                  ) : isExpenses ? (
                    <Suspense fallback={<p className="text-sm text-slate-500">{copy.loading}</p>}>
                      <ExpensesPage copy={copy} />
                    </Suspense>
                  ) : isReports ? (
                    <Suspense fallback={<p className="text-sm text-slate-500">{copy.loading}</p>}>
                      <ReportsPage copy={copy} />
                    </Suspense>
                  ) : isSettings ? (
                    <Suspense fallback={<p className="text-sm text-slate-500">{copy.loading}</p>}>
                      <SettingsPage copy={copy} language={language} defaultDueDays={defaultDueDays} onSave={handleSaveSettings} />
                    </Suspense>
                  ) : (
                    <SectionContent title={pageTitle} copy={copy} />
                  )
                }
              />
            ))}
            <Route path="*" element={<Navigate replace to="/dashboard" />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

type Copy = (typeof translations)[Language]

function SectionContent({ title, copy }: { title: string; copy: Copy }) {
  return (
    <section className="mx-auto max-w-7xl">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <div className="mt-6 rounded-xl border border-slate-200/80 bg-white px-6 py-14 text-center shadow-sm shadow-slate-900/[0.02]">
        <p className="font-semibold text-slate-700">{copy.sectionReady}</p>
        <p className="mt-2 text-sm text-slate-500">{copy.sectionDescription}</p>
      </div>
    </section>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  )
}

export default App
