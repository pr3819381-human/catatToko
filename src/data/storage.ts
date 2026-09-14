import data from './data.json'

export type TransactionType =
  | 'income'
  | 'expense'
  | 'saving'

export type Transaction = {
  id: number
  title: string
  type: TransactionType
  amount: number
  date: string
  time: string
  createdAt?: string
}

export type Product = {
  id: number
  name: string
  price: number
  stock: number
  icon: string
}

export type Period =
  | 'today'
  | 'week'
  | 'month'


/* =========================
   STORAGE KEY
========================= */

export const TRANSACTION_KEY =
  'catatTokoTransactions'

export const PRODUCT_KEY =
  'catatTokoProducts'

export const NOTIFICATION_KEY =
  'catatTokoNotifications'

export const BALANCE_KEY =
  'catatTokoBalance'

export const DATA_CHANGED_EVENT =
  'catatTokoDataChanged'


/* =========================
   DATA CHANGE EVENT
========================= */

export function notifyDataChanged() {
  window.dispatchEvent(
    new CustomEvent(DATA_CHANGED_EVENT)
  )
}


/* =========================
   DEFAULT DATA
========================= */

const defaultTransactions =
  data.transactions as Transaction[]

const defaultProducts =
  data.products as Product[]

const defaultBalance =
  Number(data.dashboard?.balance || 0)


/* =========================
   BALANCE
========================= */

export function getBalance(): number {
  const stored =
    localStorage.getItem(BALANCE_KEY)

  if (stored === null) {
    localStorage.setItem(
      BALANCE_KEY,
      String(defaultBalance)
    )

    return defaultBalance
  }

  const balance =
    Number(stored)

  if (Number.isNaN(balance)) {
    localStorage.setItem(
      BALANCE_KEY,
      String(defaultBalance)
    )

    return defaultBalance
  }

  return balance
}


export function saveBalance(
  balance: number
) {
  localStorage.setItem(
    BALANCE_KEY,
    String(balance)
  )

  notifyDataChanged()
}


/* =========================
   UPDATE BALANCE
========================= */

export function updateBalance(
  transaction: {
    type: TransactionType
    amount: number
  }
) {
  const currentBalance =
    getBalance()

  let newBalance =
    currentBalance

  if (
    transaction.type ===
    'income'
  ) {
    newBalance +=
      transaction.amount
  }

  if (
    transaction.type ===
    'expense'
  ) {
    newBalance -=
      transaction.amount
  }

  saveBalance(newBalance)

  return newBalance
}


/* =========================
   TRANSACTIONS
========================= */

export function getTransactions():
  Transaction[] {

  const stored =
    localStorage.getItem(
      TRANSACTION_KEY
    )

  /*
   * BELUM ADA STORAGE
   * gunakan data default
   */
  if (!stored) {

    localStorage.setItem(
      TRANSACTION_KEY,
      JSON.stringify(
        defaultTransactions
      )
    )

    return defaultTransactions
  }

  try {

    const transactions =
      JSON.parse(stored)

    if (
      !Array.isArray(
        transactions
      )
    ) {

      localStorage.setItem(
        TRANSACTION_KEY,
        JSON.stringify(
          defaultTransactions
        )
      )

      return defaultTransactions
    }

    return transactions

  } catch {

    localStorage.setItem(
      TRANSACTION_KEY,
      JSON.stringify(
        defaultTransactions
      )
    )

    return defaultTransactions
  }
}


export function saveTransactions(
  transactions: Transaction[]
) {
  localStorage.setItem(
    TRANSACTION_KEY,
    JSON.stringify(
      transactions
    )
  )

  notifyDataChanged()
}


/* =========================
   ADD TRANSACTION
========================= */

export function addTransaction(
  transaction: {
    title: string
    type: TransactionType
    amount: number
  }
) {

  const transactions =
    getTransactions()

  const now =
    new Date()

  const newTransaction:
    Transaction = {

    id:
      Date.now(),

    title:
      transaction.title,

    type:
      transaction.type,

    amount:
      transaction.amount,

    date:
      now.toLocaleDateString(
        'id-ID'
      ),

    time:
      now.toLocaleTimeString(
        'id-ID',
        {
          hour: '2-digit',
          minute: '2-digit'
        }
      ),

    createdAt:
      now.toISOString()
  }


  const updatedTransactions = [
    newTransaction,
    ...transactions
  ]

  saveTransactions(
    updatedTransactions
  )

  updateBalance(
    newTransaction
  )

  return newTransaction
}


/* =========================
   UPDATE TRANSACTION
========================= */

export function updateTransaction(
  updatedTransaction: Transaction
) {

  const transactions =
    getTransactions()

  const oldTransaction =
    transactions.find(
      transaction =>
        transaction.id ===
        updatedTransaction.id
    )

  if (!oldTransaction) {
    return false
  }


  /*
   * BALIKKAN EFEK TRANSAKSI LAMA
   */

  if (
    oldTransaction.type ===
    'income'
  ) {

    saveBalance(
      getBalance() -
      oldTransaction.amount
    )
  }

  if (
    oldTransaction.type ===
    'expense'
  ) {

    saveBalance(
      getBalance() +
      oldTransaction.amount
    )
  }


  /*
   * SIMPAN TRANSAKSI BARU
   */

  const updatedTransactions =
    transactions.map(
      transaction =>
        transaction.id ===
        updatedTransaction.id
          ? updatedTransaction
          : transaction
    )

  saveTransactions(
    updatedTransactions
  )


  /*
   * TERAPKAN EFEK BARU
   */

  if (
    updatedTransaction.type ===
    'income'
  ) {

    saveBalance(
      getBalance() +
      updatedTransaction.amount
    )
  }

  if (
    updatedTransaction.type ===
    'expense'
  ) {

    saveBalance(
      getBalance() -
      updatedTransaction.amount
    )
  }

  notifyDataChanged()

  return true
}


/* =========================
   DELETE TRANSACTION
========================= */

export function deleteTransaction(
  transactionId: number
) {

  const transactions =
    getTransactions()

  const transaction =
    transactions.find(
      item =>
        item.id ===
        transactionId
    )

  if (!transaction) {
    return false
  }


  /*
   * BALIKKAN EFEK SALDO
   */

  if (
    transaction.type ===
    'income'
  ) {

    saveBalance(
      getBalance() -
      transaction.amount
    )
  }

  if (
    transaction.type ===
    'expense'
  ) {

    saveBalance(
      getBalance() +
      transaction.amount
    )
  }


  /*
   * HAPUS TRANSAKSI
   */

  const updatedTransactions =
    transactions.filter(
      item =>
        item.id !==
        transactionId
    )

  saveTransactions(
    updatedTransactions
  )

  notifyDataChanged()

  return true
}


/* =========================
   PRODUCTS
========================= */

export function getProducts():
  Product[] {

  const stored =
    localStorage.getItem(
      PRODUCT_KEY
    )


  /*
   * INI BAGIAN PENTING
   *
   * Kalau localStorage kosong,
   * otomatis masukkan produk
   * dari data.json.
   */

  if (!stored) {

    localStorage.setItem(
      PRODUCT_KEY,
      JSON.stringify(
        defaultProducts
      )
    )

    return defaultProducts
  }


  try {

    const products =
      JSON.parse(stored)


    if (
      !Array.isArray(
        products
      )
    ) {

      localStorage.setItem(
        PRODUCT_KEY,
        JSON.stringify(
          defaultProducts
        )
      )

      return defaultProducts
    }


    return products

  } catch {

    localStorage.setItem(
      PRODUCT_KEY,
      JSON.stringify(
        defaultProducts
      )
    )

    return defaultProducts
  }
}


/* =========================
   SAVE PRODUCTS
========================= */

export function saveProducts(
  products: Product[]
) {

  localStorage.setItem(
    PRODUCT_KEY,
    JSON.stringify(
      products
    )
  )

  notifyDataChanged()
}


/* =========================
   UPDATE PRODUCT STOCK
========================= */

export function updateProductStock(
  productId: number,
  quantityChange: number
) {

  const products =
    getProducts()

  const product =
    products.find(
      item =>
        item.id ===
        productId
    )

  if (!product) {
    return false
  }


  const newStock =
    product.stock +
    quantityChange


  if (newStock < 0) {
    return false
  }


  const updatedProducts =
    products.map(
      item =>
        item.id === productId
          ? {
              ...item,
              stock: newStock
            }
          : item
    )


  saveProducts(
    updatedProducts
  )

  return true
}


/* =========================
   FORMAT RUPIAH
========================= */

export function formatRupiah(
  amount: number
): string {

  return new Intl.NumberFormat(
    'id-ID',
    {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }
  ).format(amount)
}


/* =========================
   PERIOD
========================= */

export function isInPeriod(
  dateString: string,
  period: Period
): boolean {

  const now =
    new Date()

  /*
   * Format transaksi:
   * DD/MM/YYYY
   */

  const parts =
    dateString.split('/')

  if (
    parts.length !== 3
  ) {
    return false
  }


  const day =
    Number(parts[0])

  const month =
    Number(parts[1]) - 1

  const year =
    Number(parts[2])


  const transactionDate =
    new Date(
      year,
      month,
      day
    )


  /*
   * HARI INI
   */

  if (
    period === 'today'
  ) {

    return (
      transactionDate.getDate() ===
        now.getDate() &&

      transactionDate.getMonth() ===
        now.getMonth() &&

      transactionDate.getFullYear() ===
        now.getFullYear()
    )
  }


  /*
   * MINGGU INI
   */

  if (
    period === 'week'
  ) {

    const startOfWeek =
      new Date(now)

    const dayOfWeek =
      now.getDay()

    const difference =
      dayOfWeek === 0
        ? 6
        : dayOfWeek - 1

    startOfWeek.setDate(
      now.getDate() -
      difference
    )

    startOfWeek.setHours(
      0,
      0,
      0,
      0
    )


    const endOfWeek =
      new Date(
        startOfWeek
      )

    endOfWeek.setDate(
      startOfWeek.getDate() +
      6
    )

    endOfWeek.setHours(
      23,
      59,
      59,
      999
    )


    return (
      transactionDate >=
        startOfWeek &&
      transactionDate <=
        endOfWeek
    )
  }


  /*
   * BULAN INI
   */

  if (
    period === 'month'
  ) {

    return (
      transactionDate.getMonth() ===
        now.getMonth() &&

      transactionDate.getFullYear() ===
        now.getFullYear()
    )
  }


  return true
}