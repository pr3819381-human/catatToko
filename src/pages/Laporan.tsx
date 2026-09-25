import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'

import data from '../data/data.json'

import {
  DATA_CHANGED_EVENT,
  formatRupiah,
  getBalance,
  getProducts,
  getTransactions,
  isInPeriod,
  saveBalance,
  saveProducts,
  saveTransactions,
  type Period,
  type Product,
  type Transaction,
} from '../data/storage'

type LaporanProps = {
  onNavigate?: (page: string) => void
}

type BackupData = {
  app: string
  version: string
  exportedAt: string
  store: typeof data.store
  balance: number
  transactions: Transaction[]
  products: Product[]
}

type PeriodOption = {
  value: Period
  label: string
}

const PERIOD_OPTIONS: PeriodOption[] = [
  {
    value: 'today',
    label: 'Hari Ini',
  },
  {
    value: 'week',
    label: 'Minggu Ini',
  },
  {
    value: 'month',
    label: 'Bulan Ini',
  },
  {
    value: 'all',
    label: 'Semua',
  },
]

function Laporan({
  onNavigate,
}: LaporanProps) {
  const [period, setPeriod] =
    useState<Period>('month')

  const [transactions, setTransactions] =
    useState<Transaction[]>([])

  const [products, setProducts] =
    useState<Product[]>([])

  const [balance, setBalance] =
    useState(0)

  const [showBackup, setShowBackup] =
    useState(false)

  const [restoreMessage, setRestoreMessage] =
    useState('')

  const [restoreError, setRestoreError] =
    useState('')

  const fileInputRef =
    useRef<HTMLInputElement | null>(null)

  /*
   * =========================================
   * LOAD DATA
   * =========================================
   */

  const loadData = () => {
    setTransactions(
      getTransactions(),
    )

    setProducts(
      getProducts(),
    )

    setBalance(
      getBalance(),
    )
  }

  useEffect(() => {
    loadData()

    const handleDataChanged = () => {
      loadData()
    }

    window.addEventListener(
      DATA_CHANGED_EVENT,
      handleDataChanged,
    )

    return () => {
      window.removeEventListener(
        DATA_CHANGED_EVENT,
        handleDataChanged,
      )
    }
  }, [])

  /*
   * =========================================
   * FILTER TRANSACTIONS
   * =========================================
   */

  const filteredTransactions =
    useMemo(() => {
      return transactions.filter(
        (transaction) =>
          isInPeriod(
            transaction.createdAt ||
              transaction.date,
            period,
          ),
      )
    }, [transactions, period])

  /*
   * =========================================
   * PEMASUKAN
   * =========================================
   */

  const incomeTransactions =
    useMemo(() => {
      return filteredTransactions.filter(
        (transaction) =>
          transaction.type ===
          'income',
      )
    }, [filteredTransactions])

  const totalIncome =
    useMemo(() => {
      return incomeTransactions.reduce(
        (total, transaction) =>
          total +
          Number(transaction.amount),
        0,
      )
    }, [incomeTransactions])

  /*
   * =========================================
   * PENGELUARAN
   * =========================================
   */

  const expenseTransactions =
    useMemo(() => {
      return filteredTransactions.filter(
        (transaction) =>
          transaction.type ===
          'expense',
      )
    }, [filteredTransactions])

  const totalExpense =
    useMemo(() => {
      return expenseTransactions.reduce(
        (total, transaction) =>
          total +
          Number(transaction.amount),
        0,
      )
    }, [expenseTransactions])

  /*
   * =========================================
   * NET PROFIT
   * =========================================
   */

  const netProfit =
    totalIncome -
    totalExpense

  /*
   * =========================================
   * PROFIT MARGIN
   * =========================================
   */

  const profitMargin =
    totalIncome > 0
      ? (netProfit /
          totalIncome) *
        100
      : 0

  /*
   * =========================================
   * SAVING
   * =========================================
   */

  const savingTransactions =
    useMemo(() => {
      return filteredTransactions.filter(
        (transaction) =>
          transaction.type ===
          'saving',
      )
    }, [filteredTransactions])

  const totalSaving =
    useMemo(() => {
      return savingTransactions.reduce(
        (total, transaction) =>
          total +
          Number(transaction.amount),
        0,
      )
    }, [savingTransactions])

  /*
   * =========================================
   * TRANSACTION COUNT
   * =========================================
   */

  const transactionCount =
    filteredTransactions.length

  /*
   * =========================================
   * AVERAGE TRANSACTION
   * =========================================
   */

  const averageTransaction =
    transactionCount > 0
      ? Math.round(
          filteredTransactions.reduce(
            (total, transaction) =>
              total +
              Number(
                transaction.amount,
              ),
            0,
          ) /
            transactionCount,
        )
      : 0

  /*
   * =========================================
   * LATEST TRANSACTIONS
   * =========================================
   */

  const latestTransactions =
    useMemo(() => {
      return [
        ...filteredTransactions,
      ]
        .sort(
          (a, b) => {
            const dateA =
              new Date(
                a.createdAt ||
                  `${a.date}T${a.time || '00:00'}:00`,
              ).getTime()

            const dateB =
              new Date(
                b.createdAt ||
                  `${b.date}T${b.time || '00:00'}:00`,
              ).getTime()

            return dateB - dateA
          },
        )
        .slice(0, 10)
    }, [filteredTransactions])

  /*
   * =========================================
   * EXPORT BACKUP
   * =========================================
   */

  const handleBackup = () => {
    const backup: BackupData = {
      app: 'CatatToko',
      version: '1.0.0',
      exportedAt:
        new Date().toISOString(),
      store: data.store,
      balance,
      transactions,
      products,
    }

    const blob = new Blob(
      [
        JSON.stringify(
          backup,
          null,
          2,
        ),
      ],
      {
        type: 'application/json',
      },
    )

    const url =
      URL.createObjectURL(blob)

    const link =
      document.createElement('a')

    link.href = url

    link.download =
      `catattoko-backup-${new Date()
        .toISOString()
        .slice(0, 10)}.json`

    document.body.appendChild(link)

    link.click()

    document.body.removeChild(link)

    URL.revokeObjectURL(url)
  }

  /*
   * =========================================
   * RESTORE BACKUP
   * =========================================
   */

  const handleRestoreClick = () => {
    setRestoreMessage('')
    setRestoreError('')
    fileInputRef.current?.click()
  }

  const handleRestoreFile = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file =
      event.target.files?.[0]

    if (!file) {
      return
    }

    setRestoreMessage('')
    setRestoreError('')

    try {
      const text =
        await file.text()

      const parsed =
        JSON.parse(text) as Partial<BackupData>

      if (
        !parsed ||
        typeof parsed !==
          'object'
      ) {
        throw new Error(
          'Format file tidak valid.',
        )
      }

      if (
        parsed.app !==
        'CatatToko'
      ) {
        throw new Error(
          'File bukan backup CatatToko.',
        )
      }

      if (
        !Array.isArray(
          parsed.transactions,
        )
      ) {
        throw new Error(
          'Data transaksi dalam backup tidak valid.',
        )
      }

      if (
        !Array.isArray(
          parsed.products,
        )
      ) {
        throw new Error(
          'Data produk dalam backup tidak valid.',
        )
      }

      const restoredTransactions =
        parsed.transactions.map(
          (transaction) => ({
            ...transaction,
            amount:
              Number(
                transaction.amount,
              ) || 0,
          }),
        )

      const restoredProducts =
        parsed.products.map(
          (product) => ({
            ...product,
            price:
              Number(
                product.price,
              ) || 0,
            stock: Math.max(
              0,
              Number(
                product.stock,
              ) || 0,
            ),
          }),
        )

      const restoredBalance =
        Number(
          parsed.balance,
        ) || 0

      saveTransactions(
        restoredTransactions,
      )

      saveProducts(
        restoredProducts,
      )

      saveBalance(
        restoredBalance,
      )

      loadData()

      setRestoreMessage(
        'Backup berhasil dipulihkan.',
      )
    } catch (error) {
      console.error(
        'Gagal restore backup:',
        error,
      )

      setRestoreError(
        error instanceof Error
          ? error.message
          : 'Gagal memulihkan backup.',
      )
    } finally {
      event.target.value = ''
    }
  }

  /*
   * =========================================
   * HELPERS
   * =========================================
   */

  const getTransactionIcon = (
    type: Transaction['type'],
  ) => {
    if (
      type === 'income'
    ) {
      return '↗'
    }

    if (
      type === 'expense'
    ) {
      return '↘'
    }

    return '◎'
  }

  const getTransactionStyle = (
    type: Transaction['type'],
  ) => {
    if (
      type === 'income'
    ) {
      return {
        icon:
          'bg-emerald-50 text-emerald-600',
        amount:
          'text-emerald-600',
      }
    }

    if (
      type === 'expense'
    ) {
      return {
        icon:
          'bg-red-50 text-red-600',
        amount:
          'text-red-600',
      }
    }

    return {
      icon:
        'bg-blue-50 text-blue-600',
      amount:
        'text-blue-600',
    }
  }

  const getTransactionLabel = (
    type: Transaction['type'],
  ) => {
    if (
      type === 'income'
    ) {
      return 'Pemasukan'
    }

    if (
      type === 'expense'
    ) {
      return 'Pengeluaran'
    }

    return 'Tabungan'
  }

  const periodLabel =
    PERIOD_OPTIONS.find(
      (item) =>
        item.value ===
        period,
    )?.label ||
    'Bulan Ini'

  /*
   * =========================================
   * RENDER
   * =========================================
   */

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 pb-28 text-slate-900 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">

        <header className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-blue-600">
                CatatToko
              </span>

              <span className="text-xs text-slate-400">
                Laporan
              </span>
            </div>

            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              Laporan Keuangan
            </h1>

            <p className="mt-2 text-sm text-slate-500 sm:text-base">
              Pantau pemasukan,
              pengeluaran, dan
              perkembangan toko.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                setShowBackup(
                  (value) =>
                    !value,
                )
              }
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-100"
            >
              Backup & Restore
            </button>

            <button
              type="button"
              onClick={() =>
                onNavigate?.(
                  'transactions',
                )
              }
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-slate-800"
            >
              Lihat Transaksi →
            </button>
          </div>

        </header>

        {showBackup && (
          <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

              <div>
                <p className="text-xs font-black uppercase tracking-wider text-blue-600">
                  Data Toko
                </p>

                <h2 className="mt-1 text-lg font-black">
                  Backup & Restore
                </h2>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                  Simpan data CatatToko
                  ke file JSON atau
                  pulihkan kembali dari
                  file backup sebelumnya.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={
                    handleBackup
                  }
                  className="rounded-xl bg-blue-600 px-4 py-3 text-xs font-black text-white transition hover:bg-blue-700"
                >
                  Download Backup
                </button>

                <button
                  type="button"
                  onClick={
                    handleRestoreClick
                  }
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                >
                  Restore Backup
                </button>

                <input
                  ref={
                    fileInputRef
                  }
                  type="file"
                  accept=".json,application/json"
                  onChange={
                    handleRestoreFile
                  }
                  className="hidden"
                />
              </div>

            </div>

            {restoreMessage && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                {restoreMessage}
              </div>
            )}

            {restoreError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                {restoreError}
              </div>
            )}

          </section>
        )}

        <section className="mb-6 flex gap-2 overflow-x-auto pb-1">
          {PERIOD_OPTIONS.map(
            (option) => (
              <button
                key={
                  option.value
                }
                type="button"
                onClick={() =>
                  setPeriod(
                    option.value,
                  )
                }
                className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-black transition ${
                  period ===
                  option.value
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-500 shadow-sm hover:bg-slate-100'
                }`}
              >
                {option.label}
              </button>
            ),
          )}
        </section>

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <article className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-lg text-emerald-600">
                ↗
              </span>

              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-600">
                {periodLabel}
              </span>
            </div>

            <p className="mt-5 text-xs font-bold text-slate-500">
              Total Pemasukan
            </p>

            <p className="mt-1 text-2xl font-black text-emerald-600">
              {formatRupiah(
                totalIncome,
              )}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              {incomeTransactions.length}{' '}
              transaksi
            </p>
          </article>

          <article className="rounded-3xl border border-red-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-lg text-red-600">
                ↘
              </span>

              <span className="rounded-full bg-red-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-red-600">
                {periodLabel}
              </span>
            </div>

            <p className="mt-5 text-xs font-bold text-slate-500">
              Total Pengeluaran
            </p>

            <p className="mt-1 text-2xl font-black text-red-600">
              {formatRupiah(
                totalExpense,
              )}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              {expenseTransactions.length}{' '}
              transaksi
            </p>
          </article>

          <article className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-lg text-blue-600">
                ◎
              </span>

              <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-blue-600">
                Bersih
              </span>
            </div>

            <p className="mt-5 text-xs font-bold text-slate-500">
              Laba Bersih
            </p>

            <p
              className={`mt-1 text-2xl font-black ${
                netProfit >= 0
                  ? 'text-blue-600'
                  : 'text-red-600'
              }`}
            >
              {formatRupiah(
                netProfit,
              )}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              Margin{' '}
              {profitMargin.toFixed(
                1,
              )}
              %
            </p>
          </article>

          <article className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-lg text-violet-600">
                ◉
              </span>

              <span className="rounded-full bg-violet-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-violet-600">
                Rata-rata
              </span>
            </div>

            <p className="mt-5 text-xs font-bold text-slate-500">
              Rata-rata Transaksi
            </p>

            <p className="mt-1 text-2xl font-black text-violet-600">
              {formatRupiah(
                averageTransaction,
              )}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              {transactionCount}{' '}
              transaksi
            </p>
          </article>

        </section>

        <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">

          <article className="rounded-3xl bg-slate-900 p-6 text-white shadow-xl lg:col-span-2">

            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">

              <div>
                <p className="text-xs font-black uppercase tracking-wider text-blue-300">
                  Ringkasan
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  Kondisi Keuangan
                </h2>

                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
                  Data dihitung berdasarkan
                  transaksi yang tersimpan
                  pada CatatToko.
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 px-5 py-4 backdrop-blur">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Saldo Saat Ini
                </p>

                <p className="mt-1 text-xl font-black">
                  {formatRupiah(
                    balance,
                  )}
                </p>
              </div>

            </div>

            <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">

              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs text-slate-400">
                  Pemasukan
                </p>

                <p className="mt-2 text-lg font-black text-emerald-300">
                  {formatRupiah(
                    totalIncome,
                  )}
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs text-slate-400">
                  Pengeluaran
                </p>

                <p className="mt-2 text-lg font-black text-red-300">
                  {formatRupiah(
                    totalExpense,
                  )}
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs text-slate-400">
                  Tabungan
                </p>

                <p className="mt-2 text-lg font-black text-blue-300">
                  {formatRupiah(
                    totalSaving,
                  )}
                </p>
              </div>

            </div>

          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

            <p className="text-xs font-black uppercase tracking-wider text-slate-400">
              Statistik
            </p>

            <h2 className="mt-2 text-xl font-black">
              Aktivitas
            </h2>

            <div className="mt-6 space-y-4">

              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-500">
                  Total transaksi
                </span>

                <span className="font-black text-slate-900">
                  {transactionCount}
                </span>
              </div>

              <div className="h-px bg-slate-100" />

              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-500">
                  Pemasukan
                </span>

                <span className="font-black text-emerald-600">
                  {incomeTransactions.length}
                </span>
              </div>

              <div className="h-px bg-slate-100" />

              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-500">
                  Pengeluaran
                </span>

                <span className="font-black text-red-600">
                  {expenseTransactions.length}
                </span>
              </div>

              <div className="h-px bg-slate-100" />

              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-500">
                  Tabungan
                </span>

                <span className="font-black text-blue-600">
                  {savingTransactions.length}
                </span>
              </div>

            </div>

          </article>

        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">

          <article className="rounded-3xl border border-slate-200 bg-white shadow-sm lg:col-span-2">

            <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">

              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Aktivitas
                </p>

                <h2 className="mt-1 text-lg font-black">
                  Transaksi Terbaru
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  onNavigate?.(
                    'transactions',
                  )
                }
                className="text-xs font-black text-blue-600 transition hover:text-blue-700"
              >
                Lihat Semua
              </button>

            </div>

            <div className="divide-y divide-slate-100">

              {latestTransactions.length ===
              0 ? (
                <div className="px-6 py-12 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                    📊
                  </div>

                  <p className="mt-4 text-sm font-black text-slate-700">
                    Belum ada transaksi
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Transaksi yang dibuat
                    melalui kasir akan
                    muncul di sini.
                  </p>
                </div>
              ) : (
                latestTransactions.map(
                  (transaction) => {
                    const style =
                      getTransactionStyle(
                        transaction.type,
                      )

                    return (
                      <div
                        key={
                          transaction.id
                        }
                        className="flex items-center gap-4 px-5 py-4 sm:px-6"
                      >

                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg font-black ${style.icon}`}
                        >
                          {getTransactionIcon(
                            transaction.type,
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-slate-800">
                            {
                              transaction.title
                            }
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {getTransactionLabel(
                              transaction.type,
                            )}{' '}
                            •{' '}
                            {transaction.date}{' '}
                            {transaction.time
                              ? `• ${transaction.time}`
                              : ''}
                          </p>
                        </div>

                        <p
                          className={`shrink-0 text-sm font-black ${style.amount}`}
                        >
                          {transaction.type ===
                          'expense'
                            ? '-'
                            : '+'}
                          {formatRupiah(
                            Number(
                              transaction.amount,
                            ),
                          )}
                        </p>

                      </div>
                    )
                  },
                )
              )}

            </div>

          </article>

          <article className="rounded-3xl border border-slate-200 bg-white shadow-sm">

            <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                Produk
              </p>

              <h2 className="mt-1 text-lg font-black">
                Stok Toko
              </h2>
            </div>

            <div className="p-5 sm:p-6">

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Total produk
                </p>

                <p className="mt-1 text-2xl font-black text-slate-900">
                  {products.length}
                </p>
              </div>

              <div className="mt-4 rounded-2xl bg-red-50 p-4">
                <p className="text-xs text-red-500">
                  Stok menipis
                </p>

                <p className="mt-1 text-2xl font-black text-red-600">
                  {
                    products.filter(
                      (product) =>
                        Number(
                          product.stock,
                        ) <= 10,
                    ).length
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  onNavigate?.(
                    'products',
                  )
                }
                className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 text-xs font-black text-white transition hover:bg-slate-800"
              >
                Kelola Produk →
              </button>

            </div>

          </article>

        </section>

      </div>
    </main>
  )
}

export default Laporan