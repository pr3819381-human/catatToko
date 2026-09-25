import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
  setDoc,
  writeBatch,
  type DocumentData,
  type DocumentReference,
} from 'firebase/firestore'

import { auth } from './auth'
import { db } from './firebase'

export type TransactionType =
  | 'income'
  | 'expense'
  | 'saving'

export interface FirestoreTransaction {
  id?: string
  type: TransactionType
  amount: number
  description: string
  category?: string
  date?: string
  paymentMethod?: string
  createdAt?: unknown
}

export interface FirestoreProduct {
  id?: string
  name: string
  price: number
  stock: number
  icon?: string
  createdAt?: unknown
}

export interface SaleItem {
  productId: string
  quantity: number
}

export interface CompleteSaleInput {
  type: TransactionType
  amount: number
  description: string
  date?: string
  category?: string
  paymentMethod?: string
}

interface FirestoreProductData {
  name?: unknown
  price?: unknown
  stock?: unknown
  icon?: unknown
  createdAt?: unknown
  updatedAt?: unknown
}

/* =========================================================
   AUTH
========================================================= */

function getRequiredUser() {
  const user = auth.currentUser

  if (!user) {
    throw new Error(
      'Sesi login tidak ditemukan. Silakan login kembali.',
    )
  }

  return user
}

/* =========================================================
   USER REFERENCES
========================================================= */

function getUserRef() {
  const user = getRequiredUser()

  return doc(
    db,
    'users',
    user.uid,
  )
}

function getTransactionsRef() {
  const user = getRequiredUser()

  return collection(
    db,
    'users',
    user.uid,
    'transactions',
  )
}

function getProductsRef() {
  const user = getRequiredUser()

  return collection(
    db,
    'users',
    user.uid,
    'products',
  )
}

function getSettingsRef() {
  const user = getRequiredUser()

  return doc(
    db,
    'users',
    user.uid,
    'settings',
    'app',
  )
}

/* =========================================================
   HELPERS
========================================================= */

function normalizeTransaction(
  transaction: FirestoreTransaction,
) {
  return {
    type: transaction.type,

    amount: Math.max(
      0,
      Number(transaction.amount) || 0,
    ),

    description:
      transaction.description?.trim() || '',

    category:
      transaction.category || null,

    date:
      transaction.date ||
      new Date().toISOString(),

    paymentMethod:
      transaction.paymentMethod || null,

    createdAt:
      transaction.createdAt ||
      serverTimestamp(),
  }
}

function normalizeProduct(
  product: FirestoreProduct,
) {
  return {
    name:
      product.name?.trim() || 'Produk',

    price: Math.max(
      0,
      Number(product.price) || 0,
    ),

    stock: Math.max(
      0,
      Number(product.stock) || 0,
    ),

    icon:
      product.icon || '📦',

    createdAt:
      product.createdAt ||
      serverTimestamp(),
  }
}

/* =========================================================
   USER PROFILE
========================================================= */

export async function initializeUserProfile(): Promise<void> {
  const user = getRequiredUser()
  const userRef = getUserRef()

  const snapshot = await getDoc(
    userRef,
  )

  if (!snapshot.exists()) {
    await setDoc(
      userRef,
      {
        uid: user.uid,

        email:
          user.email || '',

        createdAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp(),
      },
    )

    return
  }

  await setDoc(
    userRef,
    {
      uid: user.uid,

      email:
        user.email || '',

      updatedAt:
        serverTimestamp(),
    },
    {
      merge: true,
    },
  )
}

/* =========================================================
   TRANSACTIONS - READ
========================================================= */

export async function getFirestoreTransactions(): Promise<
  FirestoreTransaction[]
> {
  const transactionsRef =
    getTransactionsRef()

  const snapshot =
    await getDocs(
      transactionsRef,
    )

  const transactions =
    snapshot.docs.map(
      (item) => {
        const data =
          item.data() as Record<
            string,
            unknown
          >

        return {
          id:
            item.id,

          type:
            data.type as TransactionType,

          amount:
            Number(
              data.amount,
            ) || 0,

          description:
            String(
              data.description ||
                '',
            ),

          category:
            typeof data.category ===
            'string'
              ? data.category
              : undefined,

          date:
            typeof data.date ===
            'string'
              ? data.date
              : undefined,

          paymentMethod:
            typeof data.paymentMethod ===
            'string'
              ? data.paymentMethod
              : undefined,

          createdAt:
            data.createdAt,
        }
      },
    )

  transactions.sort(
    (a, b) => {
      const aTime =
        getTimestampNumber(
          a.createdAt,
          a.date,
        )

      const bTime =
        getTimestampNumber(
          b.createdAt,
          b.date,
        )

      return bTime - aTime
    },
  )

  return transactions
}

function getTimestampNumber(
  createdAt: unknown,
  date?: string,
): number {
  if (
    createdAt &&
    typeof createdAt === 'object' &&
    'toMillis' in createdAt &&
    typeof (
      createdAt as {
        toMillis?: unknown
      }
    ).toMillis === 'function'
  ) {
    return (
      createdAt as {
        toMillis: () => number
      }
    ).toMillis()
  }

  if (
    typeof createdAt ===
    'number'
  ) {
    return createdAt
  }

  if (date) {
    const parsed =
      Date.parse(date)

    if (
      Number.isFinite(parsed)
    ) {
      return parsed
    }
  }

  return 0
}

/* =========================================================
   TRANSACTIONS - CREATE
========================================================= */

export async function addFirestoreTransaction(
  transaction: Omit<
    FirestoreTransaction,
    'id' | 'createdAt'
  >,
): Promise<string> {
  const transactionsRef =
    getTransactionsRef()

  const docRef =
    doc(transactionsRef)

  await setDoc(
    docRef,
    normalizeTransaction({
      ...transaction,
      createdAt:
        serverTimestamp(),
    }),
  )

  return docRef.id
}

/* =========================================================
   TRANSACTIONS - UPDATE
========================================================= */

export async function updateFirestoreTransaction(
  id: string,
  transaction: Partial<
    Omit<
      FirestoreTransaction,
      'id' | 'createdAt'
    >
  >,
): Promise<void> {
  const user =
    getRequiredUser()

  const transactionRef =
    doc(
      db,
      'users',
      user.uid,
      'transactions',
      id,
    )

  const updateData:
    Record<string, unknown> =
    {}

  if (
    transaction.type !==
    undefined
  ) {
    updateData.type =
      transaction.type
  }

  if (
    transaction.amount !==
    undefined
  ) {
    updateData.amount =
      Math.max(
        0,
        Number(
          transaction.amount,
        ) || 0,
      )
  }

  if (
    transaction.description !==
    undefined
  ) {
    updateData.description =
      transaction.description.trim()
  }

  if (
    transaction.category !==
    undefined
  ) {
    updateData.category =
      transaction.category ||
      null
  }

  if (
    transaction.date !==
    undefined
  ) {
    updateData.date =
      transaction.date
  }

  if (
    transaction.paymentMethod !==
    undefined
  ) {
    updateData.paymentMethod =
      transaction.paymentMethod ||
      null
  }

  await setDoc(
    transactionRef,
    updateData,
    {
      merge: true,
    },
  )
}

/* =========================================================
   TRANSACTIONS - DELETE
========================================================= */

export async function deleteFirestoreTransaction(
  id: string,
): Promise<void> {
  const user =
    getRequiredUser()

  const transactionRef =
    doc(
      db,
      'users',
      user.uid,
      'transactions',
      id,
    )

  const batch =
    writeBatch(db)

  batch.delete(
    transactionRef,
  )

  await batch.commit()
}

/* =========================================================
   REPLACE ALL TRANSACTIONS
========================================================= */

export async function replaceFirestoreTransactions(
  transactions: FirestoreTransaction[],
): Promise<void> {
  const transactionsRef =
    getTransactionsRef()

  const snapshot =
    await getDocs(
      transactionsRef,
    )

  const operations: Array<{
    type: 'delete' | 'set'
    ref: DocumentReference<DocumentData>
    data?: DocumentData
  }> = []

  snapshot.docs.forEach(
    (item) => {
      operations.push({
        type: 'delete',
        ref: item.ref,
      })
    },
  )

  transactions.forEach(
    (transaction) => {
      const transactionId =
        transaction.id ||
        doc(transactionsRef).id

      const transactionRef =
        doc(
          transactionsRef,
          transactionId,
        )

      operations.push({
        type: 'set',
        ref: transactionRef,
        data:
          normalizeTransaction(
            transaction,
          ),
      })
    },
  )

  for (
    let index = 0;
    index < operations.length;
    index += 450
  ) {
    const chunk =
      operations.slice(
        index,
        index + 450,
      )

    const batch =
      writeBatch(db)

    chunk.forEach(
      (operation) => {
        if (
          operation.type ===
          'delete'
        ) {
          batch.delete(
            operation.ref,
          )
        } else {
          batch.set(
            operation.ref,
            operation.data || {},
          )
        }
      },
    )

    await batch.commit()
  }
}

/* =========================================================
   PRODUCTS - READ
========================================================= */

export async function getFirestoreProducts(): Promise<
  FirestoreProduct[]
> {
  const productsRef =
    getProductsRef()

  const snapshot =
    await getDocs(
      productsRef,
    )

  const products =
    snapshot.docs.map(
      (item) => {
        const data =
          item.data() as FirestoreProductData

        return {
          id:
            item.id,

          name:
            String(
              data.name ||
                '',
            ),

          price:
            Math.max(
              0,
              Number(
                data.price,
              ) || 0,
            ),

          stock:
            Math.max(
              0,
              Number(
                data.stock,
              ) || 0,
            ),

          icon:
            typeof data.icon ===
            'string'
              ? data.icon
              : '📦',

          createdAt:
            data.createdAt,
        }
      },
    )

  products.sort(
    (a, b) =>
      a.name.localeCompare(
        b.name,
        'id',
      ),
  )

  return products
}

/* =========================================================
   PRODUCTS - SINGLE
========================================================= */

export async function getFirestoreProduct(
  id: string,
): Promise<
  FirestoreProduct | null
> {
  const user =
    getRequiredUser()

  const productRef =
    doc(
      db,
      'users',
      user.uid,
      'products',
      id,
    )

  const snapshot =
    await getDoc(
      productRef,
    )

  if (!snapshot.exists()) {
    return null
  }

  const data =
    snapshot.data() as FirestoreProductData

  return {
    id:
      snapshot.id,

    name:
      String(
        data.name || '',
      ),

    price:
      Math.max(
        0,
        Number(
          data.price,
        ) || 0,
      ),

    stock:
      Math.max(
        0,
        Number(
          data.stock,
        ) || 0,
      ),

    icon:
      typeof data.icon ===
      'string'
        ? data.icon
        : '📦',

    createdAt:
      data.createdAt,
  }
}

/* =========================================================
   PRODUCTS - CREATE
========================================================= */

export async function addFirestoreProduct(
  product: Omit<
    FirestoreProduct,
    'id' | 'createdAt'
  >,
): Promise<string> {
  const productsRef =
    getProductsRef()

  const docRef =
    doc(productsRef)

  await setDoc(
    docRef,
    normalizeProduct({
      ...product,
      createdAt:
        serverTimestamp(),
    }),
  )

  return docRef.id
}

/* =========================================================
   PRODUCTS - UPDATE
========================================================= */

export async function updateFirestoreProduct(
  id: string,
  product: Partial<
    Omit<
      FirestoreProduct,
      'id' | 'createdAt'
    >
  >,
): Promise<void> {
  const user =
    getRequiredUser()

  const productRef =
    doc(
      db,
      'users',
      user.uid,
      'products',
      id,
    )

  const updateData:
    Record<string, unknown> =
    {}

  if (
    product.name !==
    undefined
  ) {
    updateData.name =
      product.name.trim()
  }

  if (
    product.price !==
    undefined
  ) {
    updateData.price =
      Math.max(
        0,
        Number(
          product.price,
        ) || 0,
      )
  }

  if (
    product.stock !==
    undefined
  ) {
    updateData.stock =
      Math.max(
        0,
        Number(
          product.stock,
        ) || 0,
      )
  }

  if (
    product.icon !==
    undefined
  ) {
    updateData.icon =
      product.icon ||
      '📦'
  }

  await setDoc(
    productRef,
    updateData,
    {
      merge: true,
    },
  )
}

/* =========================================================
   PRODUCTS - DELETE
========================================================= */

export async function deleteFirestoreProduct(
  id: string,
): Promise<void> {
  const user =
    getRequiredUser()

  const productRef =
    doc(
      db,
      'users',
      user.uid,
      'products',
      id,
    )

  const batch =
    writeBatch(db)

  batch.delete(
    productRef,
  )

  await batch.commit()
}

/* =========================================================
   REPLACE ALL PRODUCTS
========================================================= */

export async function replaceFirestoreProducts(
  products: FirestoreProduct[],
): Promise<void> {
  const productsRef =
    getProductsRef()

  const snapshot =
    await getDocs(
      productsRef,
    )

  const operations: Array<{
    type: 'delete' | 'set'
    ref: DocumentReference<DocumentData>
    data?: DocumentData
  }> = []

  snapshot.docs.forEach(
    (item) => {
      operations.push({
        type: 'delete',
        ref: item.ref,
      })
    },
  )

  products.forEach(
    (product) => {
      const productId =
        product.id ||
        doc(productsRef).id

      const productRef =
        doc(
          productsRef,
          productId,
        )

      operations.push({
        type: 'set',
        ref: productRef,
        data:
          normalizeProduct(
            product,
          ),
      })
    },
  )

  for (
    let index = 0;
    index < operations.length;
    index += 450
  ) {
    const chunk =
      operations.slice(
        index,
        index + 450,
      )

    const batch =
      writeBatch(db)

    chunk.forEach(
      (operation) => {
        if (
          operation.type ===
          'delete'
        ) {
          batch.delete(
            operation.ref,
          )
        } else {
          batch.set(
            operation.ref,
            operation.data || {},
          )
        }
      },
    )

    await batch.commit()
  }
}

/* =========================================================
   BALANCE - READ
========================================================= */

export async function getFirestoreBalance(): Promise<
  number | null
> {
  const settingsRef =
    getSettingsRef()

  const snapshot =
    await getDoc(
      settingsRef,
    )

  if (!snapshot.exists()) {
    return null
  }

  const value =
    snapshot.data().balance

  const numericValue =
    Number(value)

  if (
    !Number.isFinite(
      numericValue,
    )
  ) {
    return 0
  }

  return numericValue
}

/* =========================================================
   BALANCE - WRITE
========================================================= */

export async function setFirestoreBalance(
  balance: number,
): Promise<void> {
  const settingsRef =
    getSettingsRef()

  await setDoc(
    settingsRef,
    {
      balance:
        Math.max(
          0,
          Number(balance) || 0,
        ),

      updatedAt:
        serverTimestamp(),
    },
    {
      merge: true,
    },
  )
}

/* =========================================================
   COMPLETE SALE
   ATOMIC:
   - cek stok
   - kurangi stok
   - tambah saldo
   - simpan transaksi
========================================================= */

export async function completeFirestoreSale(
  items: SaleItem[],
  transactionInput: CompleteSaleInput,
): Promise<{
  transactionId: string
  balance: number
}> {
  const user =
    getRequiredUser()

  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {
    throw new Error(
      'Keranjang penjualan masih kosong.',
    )
  }

  if (
    transactionInput.type !==
    'income'
  ) {
    throw new Error(
      'Penjualan harus dicatat sebagai pemasukan.',
    )
  }

  const cleanItems =
    items.map(
      (item) => ({
        productId:
          String(
            item.productId,
          ).trim(),

        quantity:
          Math.floor(
            Number(
              item.quantity,
            ),
          ),
      }),
    )

  for (
    const item of cleanItems
  ) {
    if (
      !item.productId
    ) {
      throw new Error(
        'Produk penjualan tidak valid.',
      )
    }

    if (
      !Number.isFinite(
        item.quantity,
      ) ||
      item.quantity <= 0
    ) {
      throw new Error(
        'Jumlah produk harus lebih dari 0.',
      )
    }
  }

  const uniqueProductIds =
    new Set(
      cleanItems.map(
        (item) =>
          item.productId,
      ),
    )

  if (
    uniqueProductIds.size !==
    cleanItems.length
  ) {
    throw new Error(
      'Produk yang sama tidak boleh muncul dua kali dalam satu keranjang.',
    )
  }

  const productsCollection =
    collection(
      db,
      'users',
      user.uid,
      'products',
    )

  const transactionsCollection =
    collection(
      db,
      'users',
      user.uid,
      'transactions',
    )

  const settingsRef =
    doc(
      db,
      'users',
      user.uid,
      'settings',
      'app',
    )

  const transactionRef =
    doc(
      transactionsCollection,
    )

  const productRefs =
    cleanItems.map(
      (item) =>
        doc(
          productsCollection,
          item.productId,
        ),
    )

  return runTransaction(
    db,
    async (
      firestoreTransaction,
    ) => {
      /*
       * SEMUA READ dilakukan lebih dulu.
       */

      const productSnapshots: Array<{
        ref: DocumentReference<DocumentData>
        snapshot: Awaited<
          ReturnType<typeof getDoc>
        >
        item: SaleItem
      }> = []

      for (
        let index = 0;
        index < productRefs.length;
        index += 1
      ) {
        const snapshot =
          await firestoreTransaction.get(
            productRefs[index],
          )

        productSnapshots.push({
          ref:
            productRefs[index],

          snapshot,

          item:
            cleanItems[index],
        })
      }

      const settingsSnapshot =
        await firestoreTransaction.get(
          settingsRef,
        )

      /*
       * Validasi stok.
       */

      for (
        const product of
          productSnapshots
      ) {
        if (
          !product.snapshot.exists()
        ) {
          throw new Error(
            `Produk dengan ID ${product.item.productId} tidak ditemukan.`,
          )
        }

        const data =
          product.snapshot.data() as FirestoreProductData

        const currentStock =
          Math.max(
            0,
            Number(
              data.stock,
            ) || 0,
          )

        if (
          currentStock <
          product.item.quantity
        ) {
          const productName =
            String(
              data.name ||
                'Produk',
            )

          throw new Error(
            `Stok ${productName} tidak cukup. Tersedia ${currentStock}, diminta ${product.item.quantity}.`,
          )
        }
      }

      /*
       * Saldo saat ini.
       */

      const currentBalance =
        settingsSnapshot.exists()
          ? Math.max(
              0,
              Number(
                (
                  settingsSnapshot.data() as {
                    balance?: unknown
                  }
                ).balance,
              ) || 0,
            )
          : 0

      const saleAmount =
        Math.max(
          0,
          Number(
            transactionInput.amount,
          ) || 0,
        )

      const newBalance =
        currentBalance +
        saleAmount

      /*
       * WRITE stok.
       */

      for (
        const product of
          productSnapshots
      ) {
        const data =
          product.snapshot.data() as FirestoreProductData

        const currentStock =
          Math.max(
            0,
            Number(
              data.stock,
            ) || 0,
          )

        const newStock =
          currentStock -
          product.item.quantity

        firestoreTransaction.update(
          product.ref,
          {
            stock:
              newStock,

            updatedAt:
              serverTimestamp(),
          },
        )
      }

      /*
       * WRITE saldo.
       */

      firestoreTransaction.set(
        settingsRef,
        {
          balance:
            newBalance,

          updatedAt:
            serverTimestamp(),
        },
        {
          merge: true,
        },
      )

      /*
       * WRITE transaksi penjualan.
       */

      firestoreTransaction.set(
        transactionRef,
        {
          type:
            'income',

          amount:
            saleAmount,

          description:
            transactionInput.description?.trim() ||
            'Penjualan',

          category:
            transactionInput.category ||
            'Penjualan',

          paymentMethod:
            transactionInput.paymentMethod ||
            'Tunai',

          date:
            transactionInput.date ||
            new Date().toISOString(),

          createdAt:
            serverTimestamp(),

          items:
            cleanItems.map(
              (item) => ({
                productId:
                  item.productId,

                quantity:
                  item.quantity,
              }),
            ),
        },
      )

      return {
        transactionId:
          transactionRef.id,

        balance:
          newBalance,
      }
    },
  )
}