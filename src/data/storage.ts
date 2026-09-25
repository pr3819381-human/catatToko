import {
  completeFirestoreSale,
  getFirestoreBalance,
  getFirestoreProducts,
  getFirestoreTransactions,
  initializeUserProfile,
  replaceFirestoreProducts,
  replaceFirestoreTransactions,
  setFirestoreBalance,
} from '../firebaseService'

import { getCurrentUser } from '../auth'

export type TransactionType =
  | 'income'
  | 'expense'
  | 'saving'

export type Transaction = {
  id: number
  cloudId?: string
  title: string
  type: TransactionType
  amount: number
  date: string
  time: string
  createdAt?: string
}

export type Product = {
  id: number
  cloudId?: string
  name: string
  price: number
  stock: number
  icon: string
}

export type Period =
  | 'today'
  | 'week'
  | 'month'
  | 'all'

export const DATA_CHANGED_EVENT =
  'catatTokoDataChanged'

const TRANSACTIONS_CACHE_KEY =
  'catatTokoTransactions'

const PRODUCTS_CACHE_KEY =
  'catatTokoProducts'

const BALANCE_CACHE_KEY =
  'catatTokoBalance'

let currentUserId:
  string | null =
    null

let transactionsCache:
  Transaction[] = []

let productsCache:
  Product[] = []

let balanceCache =
  0

let cloudInitialized =
  false

let cloudWriteQueue:
  Promise<void> =
    Promise.resolve()

/* =========================================================
   EVENTS
========================================================= */

function dispatchDataChanged() {
  if (
    typeof window !==
    'undefined'
  ) {
    window.dispatchEvent(
      new Event(
        DATA_CHANGED_EVENT,
      ),
    )
  }
}

/* =========================================================
   USER
========================================================= */

function getRequiredUserId(): string {
  const user =
    getCurrentUser()

  if (!user) {
    throw new Error(
      'Pengguna belum login.',
    )
  }

  return user.uid
}

function getUserCacheKey(
  baseKey: string,
): string {
  if (
    !currentUserId
  ) {
    return baseKey
  }

  return `${baseKey}_${currentUserId}`
}

/* =========================================================
   CACHE
========================================================= */

function writeCache(
  key: string,
  value: unknown,
) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify(value),
    )
  } catch {
    /*
      localStorage hanya cache UI.
      Firestore tetap menjadi
      sumber data utama.
    */
  }
}

/* =========================================================
   ID
========================================================= */

function createStableNumericId(
  value: string,
): number {
  let hash =
    0

  for (
    let index = 0;
    index <
    value.length;
    index += 1
  ) {
    hash =
      (hash << 5) -
      hash +
      value.charCodeAt(
        index,
      )

    hash |= 0
  }

  return (
    Math.abs(hash) ||
    Date.now()
  )
}

/* =========================================================
   DATE
========================================================= */

function formatDate(
  date: Date,
): string {
  const year =
    date.getFullYear()

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(
      2,
      '0',
    )

  const day =
    String(
      date.getDate(),
    ).padStart(
      2,
      '0',
    )

  return `${year}-${month}-${day}`
}

function formatTime(
  date: Date,
): string {
  const hours =
    String(
      date.getHours(),
    ).padStart(
      2,
      '0',
    )

  const minutes =
    String(
      date.getMinutes(),
    ).padStart(
      2,
      '0',
    )

  return `${hours}:${minutes}`
}

function normalizeDateTime(
  date?: string,
  createdAt?: unknown,
) {
  const source =
    date ||
    (
      typeof createdAt ===
      'string'
        ? createdAt
        : ''
    )

  const parsed =
    source
      ? new Date(
          source,
        )
      : new Date()

  const valid =
    Number.isNaN(
      parsed.getTime(),
    )
      ? new Date()
      : parsed

  return {
    date:
      formatDate(
        valid,
      ),

    time:
      formatTime(
        valid,
      ),
  }
}

/* =========================================================
   FIRESTORE → LOCAL
========================================================= */

function firestoreTransactionToLocal(
  transaction: {
    id?: string
    type: TransactionType
    amount: number
    description: string
    date?: string
    createdAt?: unknown
  },
): Transaction {
  const {
    date,
    time,
  } =
    normalizeDateTime(
      transaction.date,
      transaction.createdAt,
    )

  const createdAt =
    typeof transaction.createdAt ===
    'string'
      ? transaction.createdAt
      : transaction.date ||
        new Date(
          `${date}T${time}:00`,
        ).toISOString()

  return {
    id:
      transaction.id
        ? createStableNumericId(
            transaction.id,
          )
        : Date.now(),

    cloudId:
      transaction.id,

    title:
      transaction.description ||
      'Transaksi',

    type:
      transaction.type,

    amount:
      Number(
        transaction.amount,
      ) || 0,

    date,

    time,

    createdAt,
  }
}

function firestoreProductToLocal(
  product: {
    id?: string
    name: string
    price: number
    stock: number
    icon?: string
  },
): Product {
  return {
    id:
      product.id
        ? createStableNumericId(
            product.id,
          )
        : Date.now(),

    cloudId:
      product.id,

    name:
      product.name,

    price:
      Number(
        product.price,
      ) || 0,

    stock:
      Math.max(
        0,
        Number(
          product.stock,
        ) || 0,
      ),

    icon:
      product.icon ||
      '📦',
  }
}

/* =========================================================
   LOCAL → FIRESTORE
========================================================= */

function localTransactionToFirestore(
  transaction: Transaction,
) {
  return {
    type:
      transaction.type,

    amount:
      Number(
        transaction.amount,
      ) || 0,

    description:
      transaction.title,

    date:
      `${transaction.date}T${transaction.time}:00`,

    createdAt:
      transaction.createdAt ||
      new Date().toISOString(),
  }
}

function localProductToFirestore(
  product: Product,
) {
  return {
    name:
      product.name,

    price:
      Number(
        product.price,
      ) || 0,

    stock:
      Math.max(
        0,
        Number(
          product.stock,
        ) || 0,
      ),

    icon:
      product.icon ||
      '📦',
  }
}

/* =========================================================
   CLOUD WRITE QUEUE
========================================================= */

function enqueueCloudWrite(
  operation: () => Promise<void>,
) {
  cloudWriteQueue =
    cloudWriteQueue
      .then(
        operation,
      )
      .catch(
        (error) => {
          console.error(
            'Gagal sinkronisasi CatatToko:',
            error,
          )
        },
      )

  return cloudWriteQueue
}

async function syncTransactions() {
  if (
    !getCurrentUser()
  ) {
    return
  }

  await replaceFirestoreTransactions(
    transactionsCache.map(
      localTransactionToFirestore,
    ),
  )
}

/*
  PENTING:
  Setelah produk ditulis ke Firestore,
  kita langsung membaca kembali produk dari Firestore.
  Dengan begitu setiap produk memperoleh cloudId.
*/
async function syncProducts() {
  if (
    !getCurrentUser()
  ) {
    return
  }

  await replaceFirestoreProducts(
    productsCache.map(
      localProductToFirestore,
    ),
  )

  const cloudProducts =
    await getFirestoreProducts()

  productsCache =
    cloudProducts.map(
      firestoreProductToLocal,
    )

  writeCache(
    getUserCacheKey(
      PRODUCTS_CACHE_KEY,
    ),
    productsCache,
  )

  dispatchDataChanged()
}

async function syncBalance() {
  if (
    !getCurrentUser()
  ) {
    return
  }

  await setFirestoreBalance(
    balanceCache,
  )
}

/* =========================================================
   TRANSACTIONS
========================================================= */

export function getTransactions(): Transaction[] {
  return [
    ...transactionsCache,
  ]
}

export function saveTransactions(
  transactions: Transaction[],
): void {
  transactionsCache =
    transactions.map(
      (item) => ({
        ...item,

        amount:
          Number(
            item.amount,
          ) || 0,
      }),
    )

  writeCache(
    getUserCacheKey(
      TRANSACTIONS_CACHE_KEY,
    ),
    transactionsCache,
  )

  dispatchDataChanged()

  void enqueueCloudWrite(
    syncTransactions,
  )
}

export function addTransaction(
  input: Omit<
    Transaction,
    'id' | 'date' | 'time'
  > & {
    date?: string
    time?: string
  },
): Transaction {
  const now =
    new Date()

  const transaction:
    Transaction = {
    id:
      Date.now() +
      Math.floor(
        Math.random() *
          1000,
      ),

    title:
      input.title.trim() ||
      'Transaksi',

    type:
      input.type,

    amount:
      Math.max(
        0,
        Number(
          input.amount,
        ) || 0,
      ),

    date:
      input.date ||
      formatDate(
        now,
      ),

    time:
      input.time ||
      formatTime(
        now,
      ),

    createdAt:
      input.createdAt ||
      now.toISOString(),
  }

  transactionsCache = [
    transaction,
    ...transactionsCache,
  ]

  if (
    transaction.type ===
    'income'
  ) {
    balanceCache +=
      transaction.amount
  }

  if (
    transaction.type ===
    'expense'
  ) {
    balanceCache -=
      transaction.amount
  }

  writeCache(
    getUserCacheKey(
      TRANSACTIONS_CACHE_KEY,
    ),
    transactionsCache,
  )

  writeCache(
    getUserCacheKey(
      BALANCE_CACHE_KEY,
    ),
    balanceCache,
  )

  dispatchDataChanged()

  void enqueueCloudWrite(
    async () => {
      await syncTransactions()
      await syncBalance()
    },
  )

  return transaction
}

export function updateTransaction(
  updatedTransaction: Transaction,
): void {
  const previous =
    transactionsCache.find(
      (item) =>
        item.id ===
        updatedTransaction.id,
    )

  if (!previous) {
    return
  }

  if (
    previous.type ===
    'income'
  ) {
    balanceCache -=
      previous.amount
  }

  if (
    previous.type ===
    'expense'
  ) {
    balanceCache +=
      previous.amount
  }

  if (
    updatedTransaction.type ===
    'income'
  ) {
    balanceCache +=
      updatedTransaction.amount
  }

  if (
    updatedTransaction.type ===
    'expense'
  ) {
    balanceCache -=
      updatedTransaction.amount
  }

  transactionsCache =
    transactionsCache.map(
      (item) =>
        item.id ===
        updatedTransaction.id
          ? {
              ...updatedTransaction,

              amount:
                Math.max(
                  0,
                  Number(
                    updatedTransaction.amount,
                  ) || 0,
                ),

              title:
                updatedTransaction.title.trim() ||
                'Transaksi',

              createdAt:
                updatedTransaction.createdAt ||
                item.createdAt ||
                new Date().toISOString(),
            }
          : item,
    )

  writeCache(
    getUserCacheKey(
      TRANSACTIONS_CACHE_KEY,
    ),
    transactionsCache,
  )

  writeCache(
    getUserCacheKey(
      BALANCE_CACHE_KEY,
    ),
    balanceCache,
  )

  dispatchDataChanged()

  void enqueueCloudWrite(
    async () => {
      await syncTransactions()
      await syncBalance()
    },
  )
}

export function deleteTransaction(
  id: number,
): void {
  const transaction =
    transactionsCache.find(
      (item) =>
        item.id === id,
    )

  if (!transaction) {
    return
  }

  if (
    transaction.type ===
    'income'
  ) {
    balanceCache -=
      transaction.amount
  }

  if (
    transaction.type ===
    'expense'
  ) {
    balanceCache +=
      transaction.amount
  }

  transactionsCache =
    transactionsCache.filter(
      (item) =>
        item.id !== id,
    )

  writeCache(
    getUserCacheKey(
      TRANSACTIONS_CACHE_KEY,
    ),
    transactionsCache,
  )

  writeCache(
    getUserCacheKey(
      BALANCE_CACHE_KEY,
    ),
    balanceCache,
  )

  dispatchDataChanged()

  void enqueueCloudWrite(
    async () => {
      await syncTransactions()
      await syncBalance()
    },
  )
}

/* =========================================================
   BALANCE
========================================================= */

export function getBalance(): number {
  return balanceCache
}

export function saveBalance(
  balance: number,
): void {
  balanceCache =
    Number.isFinite(
      balance,
    )
      ? balance
      : 0

  writeCache(
    getUserCacheKey(
      BALANCE_CACHE_KEY,
    ),
    balanceCache,
  )

  dispatchDataChanged()

  void enqueueCloudWrite(
    syncBalance,
  )
}

export function updateBalance(
  transaction: Transaction,
): void {
  if (
    transaction.type ===
    'income'
  ) {
    balanceCache +=
      transaction.amount
  }

  if (
    transaction.type ===
    'expense'
  ) {
    balanceCache -=
      transaction.amount
  }

  writeCache(
    getUserCacheKey(
      BALANCE_CACHE_KEY,
    ),
    balanceCache,
  )

  dispatchDataChanged()

  void enqueueCloudWrite(
    syncBalance,
  )
}

/* =========================================================
   PRODUCTS
========================================================= */

export function getProducts(): Product[] {
  return [
    ...productsCache,
  ]
}

export function saveProducts(
  products: Product[],
): void {
  productsCache =
    products.map(
      (product) => ({
        ...product,

        price:
          Math.max(
            0,
            Number(
              product.price,
            ) || 0,
          ),

        stock:
          Math.max(
            0,
            Number(
              product.stock,
            ) || 0,
          ),

        icon:
          product.icon ||
          '📦',
      }),
    )

  writeCache(
    getUserCacheKey(
      PRODUCTS_CACHE_KEY,
    ),
    productsCache,
  )

  dispatchDataChanged()

  void enqueueCloudWrite(
    syncProducts,
  )
}

export function updateProductStock(
  productId: number,
  amount: number,
): void {
  productsCache =
    productsCache.map(
      (product) =>
        product.id ===
        productId
          ? {
              ...product,

              stock:
                Math.max(
                  0,
                  product.stock +
                    amount,
                ),
            }
          : product,
    )

  writeCache(
    getUserCacheKey(
      PRODUCTS_CACHE_KEY,
    ),
    productsCache,
  )

  dispatchDataChanged()

  void enqueueCloudWrite(
    syncProducts,
  )
}

/* =========================================================
   ATOMIC SALE
========================================================= */

export type SaleItemInput = {
  productId: number
  quantity: number
}

export async function completeSale(
  items: SaleItemInput[],
): Promise<Transaction> {
  if (
    !items.length
  ) {
    throw new Error(
      'Keranjang penjualan kosong.',
    )
  }

  if (
    !getCurrentUser()
  ) {
    throw new Error(
      'Pengguna belum login.',
    )
  }

  const cloudItems =
    items.map(
      (item) => {
        const product =
          productsCache.find(
            (candidate) =>
              candidate.id ===
              item.productId,
          )

        if (!product) {
          throw new Error(
            'Salah satu produk sudah tidak tersedia.',
          )
        }

        if (!product.cloudId) {
          throw new Error(
            `Produk "${product.name}" belum memiliki ID cloud. Muat ulang data lalu coba lagi.`,
          )
        }

        const quantity =
          Math.floor(
            Number(
              item.quantity,
            ),
          )

        if (
          !Number.isInteger(
            quantity,
          ) ||
          quantity <= 0
        ) {
          throw new Error(
            `Jumlah ${product.name} tidak valid.`,
          )
        }

        if (
          product.stock <
          quantity
        ) {
          throw new Error(
            `Stok ${product.name} tidak mencukupi. Tersisa ${product.stock}.`,
          )
        }

        return {
          productId:
            product.cloudId,

          quantity,

          product,
        }
      },
    )

  const productNames =
    cloudItems
      .map(
        (item) =>
          `${item.product.name} x${item.quantity}`,
      )
      .join(', ')

  const total =
    cloudItems.reduce(
      (
        sum,
        item,
      ) =>
        sum +
        item.product.price *
          item.quantity,
      0,
    )

  if (
    total <= 0
  ) {
    throw new Error(
      'Total penjualan tidak valid.',
    )
  }

  const now =
    new Date()

  const result =
    await completeFirestoreSale(
      cloudItems.map(
        (item) => ({
          productId:
            item.productId,

          quantity:
            item.quantity,
        }),
      ),
      {
        type:
          'income',

        amount:
          total,

        description:
          `Penjualan - ${productNames}`,

        date:
          now.toISOString(),
      },
    )

  const transaction:
    Transaction = {
    id:
      createStableNumericId(
        result.transactionId,
      ),

    cloudId:
      result.transactionId,

    title:
      `Penjualan - ${productNames}`,

    type:
      'income',

    amount:
      total,

    date:
      formatDate(
        now,
      ),

    time:
      formatTime(
        now,
      ),

    createdAt:
      now.toISOString(),
  }

  transactionsCache = [
    transaction,
    ...transactionsCache,
  ]

  productsCache =
    productsCache.map(
      (product) => {
        const sold =
          cloudItems.find(
            (item) =>
              item.product.id ===
              product.id,
          )

        return sold
          ? {
              ...product,

              stock:
                Math.max(
                  0,
                  product.stock -
                    sold.quantity,
                ),
            }
          : product
      },
    )

  balanceCache =
    result.balance

  writeCache(
    getUserCacheKey(
      TRANSACTIONS_CACHE_KEY,
    ),
    transactionsCache,
  )

  writeCache(
    getUserCacheKey(
      PRODUCTS_CACHE_KEY,
    ),
    productsCache,
  )

  writeCache(
    getUserCacheKey(
      BALANCE_CACHE_KEY,
    ),
    balanceCache,
  )

  dispatchDataChanged()

  return transaction
}

/* =========================================================
   FORMAT RUPIAH
========================================================= */

export function formatRupiah(
  amount: number,
): string {
  return new Intl.NumberFormat(
    'id-ID',
    {
      style:
        'currency',

      currency:
        'IDR',

      maximumFractionDigits:
        0,
    },
  ).format(
    Number(
      amount,
    ) || 0,
  )
}

/* =========================================================
   PERIOD
========================================================= */

export function isInPeriod(
  dateString: string,
  period: Period,
): boolean {
  if (
    period === 'all'
  ) {
    return true
  }

  const transactionDate =
    new Date(
      dateString,
    )

  if (
    Number.isNaN(
      transactionDate.getTime(),
    )
  ) {
    return false
  }

  const now =
    new Date()

  if (
    period === 'today'
  ) {
    return (
      transactionDate.getFullYear() ===
        now.getFullYear() &&
      transactionDate.getMonth() ===
        now.getMonth() &&
      transactionDate.getDate() ===
        now.getDate()
    )
  }

  if (
    period === 'month'
  ) {
    return (
      transactionDate.getFullYear() ===
        now.getFullYear() &&
      transactionDate.getMonth() ===
        now.getMonth()
    )
  }

  const startOfWeek =
    new Date(
      now,
    )

  const day =
    startOfWeek.getDay()

  const diff =
    day === 0
      ? 6
      : day - 1

  startOfWeek.setDate(
    startOfWeek.getDate() -
      diff,
  )

  startOfWeek.setHours(
    0,
    0,
    0,
    0,
  )

  return (
    transactionDate >=
    startOfWeek
  )
}

/* =========================================================
   NO DEMO DATA
========================================================= */

// CatatToko dimulai kosong.
// Data hanya berasal dari Firestore.

/* =========================================================
   FIREBASE INITIALIZATION
========================================================= */

export async function initializeCloudData(): Promise<void> {
  const userId =
    getRequiredUserId()

  if (
    cloudInitialized &&
    currentUserId ===
      userId
  ) {
    return
  }

  currentUserId =
    userId

  cloudInitialized =
    false

  transactionsCache =
    []

  productsCache =
    []

  balanceCache =
    0

  cloudWriteQueue =
    Promise.resolve()

  await initializeUserProfile()

  const [
    cloudTransactions,
    cloudProducts,
    cloudBalance,
  ] =
    await Promise.all([
      getFirestoreTransactions(),
      getFirestoreProducts(),
      getFirestoreBalance(),
    ])

  transactionsCache =
    cloudTransactions.map(
      firestoreTransactionToLocal,
    )

  productsCache =
    cloudProducts.map(
      firestoreProductToLocal,
    )

  balanceCache =
    cloudBalance !== null &&
    Number.isFinite(
      Number(
        cloudBalance,
      ),
    )
      ? Number(
          cloudBalance,
        )
      : 0

  writeCache(
    getUserCacheKey(
      TRANSACTIONS_CACHE_KEY,
    ),
    transactionsCache,
  )

  writeCache(
    getUserCacheKey(
      PRODUCTS_CACHE_KEY,
    ),
    productsCache,
  )

  writeCache(
    getUserCacheKey(
      BALANCE_CACHE_KEY,
    ),
    balanceCache,
  )

  cloudInitialized =
    true

  dispatchDataChanged()
}

/* =========================================================
   RESET SESSION
========================================================= */

export function resetCloudSession(): void {
  currentUserId =
    null

  cloudInitialized =
    false

  transactionsCache =
    []

  productsCache =
    []

  balanceCache =
    0

  cloudWriteQueue =
    Promise.resolve()
}

/* =========================================================
   STATUS
========================================================= */

export function isCloudInitialized(): boolean {
  return cloudInitialized
}

export function getCurrentStorageUserId(): string | null {
  return currentUserId
}