import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  addTransaction,
  DATA_CHANGED_EVENT,
  formatRupiah,
  getBalance,
  getProducts,
  getTransactions,
  isInPeriod,
  type Period,
  type Product,
  type Transaction,
} from '../data/storage'

type DashboardProps = {
  onNavigate?: (page: string) => void
}

type Notification = {
  id: string
  title: string
  message: string
  type: 'warning' | 'success' | 'info'
  icon: string
  page?: string
}

const NOTIFICATION_READ_KEY =
  'catatTokoReadNotifications'

function safeGetTransactions(): Transaction[] {
  try {
    const result = getTransactions()

    return Array.isArray(result)
      ? result
      : []
  } catch {
    return []
  }
}

function safeGetProducts(): Product[] {
  try {
    const result = getProducts()

    return Array.isArray(result)
      ? result
      : []
  } catch {
    return []
  }
}

function safeGetBalance(): number {
  try {
    const result = getBalance()

    return typeof result === 'number' &&
      Number.isFinite(result)
      ? result
      : 0
  } catch {
    return 0
  }
}

function getTransactionTimestamp(
  transaction: Transaction,
): number {
  if (transaction.createdAt) {
    const timestamp =
      new Date(
        transaction.createdAt,
      ).getTime()

    if (Number.isFinite(timestamp)) {
      return timestamp
    }
  }

  return 0
}

function getTransactionIcon(
  type: Transaction['type'],
) {
  if (type === 'income') {
    return '↗'
  }

  if (type === 'expense') {
    return '↘'
  }

  return '◎'
}

function getTransactionStyle(
  type: Transaction['type'],
) {
  if (type === 'income') {
    return {
      icon: 'bg-emerald-50 text-emerald-600',
      amount: 'text-emerald-600',
    }
  }

  if (type === 'expense') {
    return {
      icon: 'bg-red-50 text-red-600',
      amount: 'text-red-600',
    }
  }

  return {
    icon: 'bg-blue-50 text-blue-600',
    amount: 'text-blue-600',
  }
}

function Dashboard({
  onNavigate,
}: DashboardProps) {
  const [period, setPeriod] =
    useState<Period>('today')

  const [showBalance, setShowBalance] =
    useState(true)

  const [showNotifications, setShowNotifications] =
    useState(false)

  const [search, setSearch] =
    useState('')

  const [balance, setBalance] =
    useState<number>(
      safeGetBalance(),
    )

  const [transactions, setTransactions] =
    useState<Transaction[]>(
      safeGetTransactions(),
    )

  const [products, setProducts] =
    useState<Product[]>(
      safeGetProducts(),
    )

  const [readNotifications, setReadNotifications] =
    useState<string[]>(() => {
      try {
        const saved =
          localStorage.getItem(
            NOTIFICATION_READ_KEY,
          )

        if (!saved) {
          return []
        }

        const parsed =
          JSON.parse(saved)

        return Array.isArray(parsed)
          ? parsed
          : []
      } catch {
        return []
      }
    })

  const loadData = () => {
    setBalance(
      safeGetBalance(),
    )

    setTransactions(
      safeGetTransactions(),
    )

    setProducts(
      safeGetProducts(),
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

  const filteredTransactions =
    useMemo(() => {
      return transactions.filter(
        (transaction) =>
          isInPeriod(
            transaction.date,
            period,
          ),
      )
    }, [
      transactions,
      period,
    ])

  const totalIncome =
    useMemo(() => {
      return filteredTransactions
        .filter(
          (transaction) =>
            transaction.type ===
            'income',
        )
        .reduce(
          (total, transaction) =>
            total +
            Number(
              transaction.amount || 0,
            ),
          0,
        )
    }, [filteredTransactions])

  const totalExpense =
    useMemo(() => {
      return filteredTransactions
        .filter(
          (transaction) =>
            transaction.type ===
            'expense',
        )
        .reduce(
          (total, transaction) =>
            total +
            Number(
              transaction.amount || 0,
            ),
          0,
        )
    }, [filteredTransactions])

  const totalSaving =
    useMemo(() => {
      return filteredTransactions
        .filter(
          (transaction) =>
            transaction.type ===
            'saving',
        )
        .reduce(
          (total, transaction) =>
            total +
            Number(
              transaction.amount || 0,
            ),
          0,
        )
    }, [filteredTransactions])

  const netProfit =
    totalIncome - totalExpense

  const transactionCount =
    filteredTransactions.length

  const averageTransaction =
    transactionCount > 0
      ? Math.round(
          filteredTransactions.reduce(
            (total, transaction) =>
              total +
              Number(
                transaction.amount ||
                  0,
              ),
            0,
          ) /
            transactionCount,
        )
      : 0

  const lowStockProducts =
    useMemo(() => {
      return [...products]
        .filter(
          (product) =>
            Number(
              product.stock || 0,
            ) <= 10,
        )
        .sort(
          (a, b) =>
            Number(
              a.stock || 0,
            ) -
            Number(
              b.stock || 0,
            ),
        )
    }, [products])

  const recentTransactions =
    useMemo(() => {
      return [...transactions]
        .sort(
          (a, b) =>
            getTransactionTimestamp(
              b,
            ) -
            getTransactionTimestamp(
              a,
            ),
        )
        .slice(0, 6)
    }, [transactions])

  const searchResults =
    useMemo(() => {
      const keyword =
        search.trim().toLowerCase()

      if (!keyword) {
        return []
      }

      return transactions
        .filter((transaction) =>
          transaction.title
            .toLowerCase()
            .includes(keyword),
        )
        .sort(
          (a, b) =>
            getTransactionTimestamp(
              b,
            ) -
            getTransactionTimestamp(
              a,
            ),
        )
        .slice(0, 5)
    }, [
      transactions,
      search,
    ])

  const notifications =
    useMemo<Notification[]>(() => {
      const result: Notification[] =
        []

      lowStockProducts
        .slice(0, 5)
        .forEach((product) => {
          result.push({
            id: `stock-${product.id}`,
            title: 'Stok Menipis',
            message: `${product.name} tersisa ${product.stock} stok.`,
            type: 'warning',
            icon: '📦',
            page: 'products',
          })
        })

      const latestIncome =
        [...transactions]
          .filter(
            (transaction) =>
              transaction.type ===
              'income',
          )
          .sort(
            (a, b) =>
              getTransactionTimestamp(
                b,
              ) -
              getTransactionTimestamp(
                a,
              ),
          )[0]

      if (latestIncome) {
        result.push({
          id: `income-${latestIncome.id}`,
          title: 'Pemasukan Terbaru',
          message: `${latestIncome.title} sebesar ${formatRupiah(
            latestIncome.amount,
          )}.`,
          type: 'success',
          icon: '💰',
          page: 'transactions',
        })
      }

      const latestExpense =
        [...transactions]
          .filter(
            (transaction) =>
              transaction.type ===
              'expense',
          )
          .sort(
            (a, b) =>
              getTransactionTimestamp(
                b,
              ) -
              getTransactionTimestamp(
                a,
              ),
          )[0]

      if (latestExpense) {
        result.push({
          id: `expense-${latestExpense.id}`,
          title:
            'Pengeluaran Terbaru',
          message: `${latestExpense.title} sebesar ${formatRupiah(
            latestExpense.amount,
          )}.`,
          type: 'info',
          icon: '💸',
          page: 'transactions',
        })
      }

      if (result.length === 0) {
        result.push({
          id: 'welcome',
          title: 'Semua Aman',
          message:
            'Belum ada pemberitahuan baru untuk kamu.',
          type: 'success',
          icon: '✓',
        })
      }

      return result
    }, [
      lowStockProducts,
      transactions,
    ])

  const unreadNotifications =
    notifications.filter(
      (notification) =>
        !readNotifications.includes(
          notification.id,
        ),
    )

  const saveReadNotifications = (
    ids: string[],
  ) => {
    setReadNotifications(ids)

    try {
      localStorage.setItem(
        NOTIFICATION_READ_KEY,
        JSON.stringify(ids),
      )
    } catch {
      // Abaikan jika localStorage tidak tersedia.
    }
  }

  const handleNotificationClick = (
    notification: Notification,
  ) => {
    const updated =
      Array.from(
        new Set([
          ...readNotifications,
          notification.id,
        ]),
      )

    saveReadNotifications(updated)

    if (notification.page) {
      setShowNotifications(false)
      onNavigate?.(
        notification.page,
      )
    }
  }

  const markAllNotificationsRead =
    () => {
      saveReadNotifications(
        notifications.map(
          (notification) =>
            notification.id,
        ),
      )
    }

  const handleDemoIncome = () => {
    try {
      addTransaction({
        title:
          'Pemasukan Cepat',
        type: 'income',
        amount: 100000,
      })
    } catch (error) {
      console.error(
        'Gagal membuat transaksi:',
        error,
      )
    }
  }

  const periodLabel =
    {
      today: 'Hari Ini',
      week: 'Minggu Ini',
      month: 'Bulan Ini',
      all: 'Semua',
    }[period] ?? 'Hari Ini'

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
                Dashboard
              </span>
            </div>

            <p className="text-sm text-slate-500 sm:text-base">
              Kelola toko dengan lebih mudah.
            </p>
          </div>

          <div className="relative w-full lg:w-auto">

            <div className="flex gap-2">

              <div className="relative flex-1 lg:w-64 lg:flex-none">

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value,
                    )
                  }
                  placeholder="Cari transaksi..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
                />

                {searchResults.length >
                  0 && (
                  <div className="absolute left-0 right-0 top-14 z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">

                    {searchResults.map(
                      (transaction) => (
                        <button
                          key={
                            transaction.id
                          }
                          type="button"
                          onClick={() => {
                            setSearch('')
                            onNavigate?.(
                              'transactions',
                            )
                          }}
                          className="flex w-full items-center gap-3 border-b border-slate-100 p-3 text-left transition last:border-0 hover:bg-slate-50"
                        >
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${getTransactionStyle(
                              transaction.type,
                            ).icon}`}
                          >
                            {getTransactionIcon(
                              transaction.type,
                            )}
                          </span>

                          <span className="min-w-0">
                            <strong className="block truncate text-xs text-slate-800">
                              {
                                transaction.title
                              }
                            </strong>

                            <small className="mt-1 block text-[10px] text-slate-400">
                              {formatRupiah(
                                transaction.amount,
                              )}
                              {' • '}
                              {
                                transaction.date
                              }
                            </small>
                          </span>
                        </button>
                      ),
                    )}

                  </div>
                )}

              </div>

              <div className="relative">

                <button
                  type="button"
                  onClick={() =>
                    setShowNotifications(
                      (value) =>
                        !value,
                    )
                  }
                  aria-label="Notifikasi"
                  className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
                >
                  🔔

                  {unreadNotifications.length >
                    0 && (
                    <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-slate-50 bg-red-500 px-1 text-[9px] font-black text-white">
                      {unreadNotifications.length >
                      9
                        ? '9+'
                        : unreadNotifications.length}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="fixed left-4 right-4 top-20 z-[100] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:absolute sm:left-auto sm:right-0 sm:top-14 sm:w-[380px]">

                    <div className="flex items-center justify-between border-b border-slate-100 p-4">

                      <div>
                        <h3 className="text-sm font-black text-slate-900">
                          Notifikasi
                        </h3>

                        <p className="mt-1 text-[10px] text-slate-400">
                          {unreadNotifications.length >
                          0
                            ? `${unreadNotifications.length} belum dibaca`
                            : 'Semua sudah dibaca'}
                        </p>
                      </div>

                      {unreadNotifications.length >
                        0 && (
                        <button
                          type="button"
                          onClick={
                            markAllNotificationsRead
                          }
                          className="text-[10px] font-black text-blue-600 hover:underline"
                        >
                          Tandai semua
                        </button>
                      )}

                    </div>

                    <div className="max-h-[360px] overflow-y-auto">

                      {notifications.map(
                        (
                          notification,
                        ) => {
                          const unread =
                            !readNotifications.includes(
                              notification.id,
                            )

                          return (
                            <button
                              key={
                                notification.id
                              }
                              type="button"
                              onClick={() =>
                                handleNotificationClick(
                                  notification,
                                )
                              }
                              className={`flex w-full gap-3 border-b border-slate-100 p-4 text-left transition last:border-0 hover:bg-slate-50 ${
                                unread
                                  ? 'bg-blue-50/30'
                                  : 'bg-white'
                              }`}
                            >
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg">
                                {
                                  notification.icon
                                }
                              </span>

                              <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-2">
                                  <strong className="text-xs font-black text-slate-800">
                                    {
                                      notification.title
                                    }
                                  </strong>

                                  {unread && (
                                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                  )}
                                </span>

                                <span className="mt-1 block text-[11px] leading-5 text-slate-500">
                                  {
                                    notification.message
                                  }
                                </span>
                              </span>
                            </button>
                          )
                        },
                      )}

                    </div>

                  </div>
                )}

              </div>

            </div>

          </div>

        </header>

        <section className="mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-5 text-white shadow-xl shadow-blue-900/10 sm:p-7">

          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

            <div>
              <p className="text-xs font-bold text-blue-200">
                Saldo Toko
              </p>

              <div className="mt-2 flex items-center gap-3">

                <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                  {showBalance
                    ? formatRupiah(
                        balance,
                      )
                    : 'Rp •••••••'}
                </h2>

                <button
                  type="button"
                  onClick={() =>
                    setShowBalance(
                      (value) =>
                        !value,
                    )
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-sm transition hover:bg-white/20"
                  aria-label={
                    showBalance
                      ? 'Sembunyikan saldo'
                      : 'Tampilkan saldo'
                  }
                >
                  {showBalance
                    ? '◉'
                    : '○'}
                </button>

              </div>

              <p className="mt-2 text-xs text-slate-400">
                Saldo dihitung dari
                aktivitas keuangan toko.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                onNavigate?.(
                  'transactions',
                )
              }
              className="w-full rounded-2xl bg-white px-5 py-3.5 text-sm font-black text-slate-900 transition hover:bg-blue-50 sm:w-auto"
            >
              Lihat Transaksi →
            </button>

          </div>

        </section>

        <section className="mb-5 flex gap-2 overflow-x-auto pb-1">

          {(
            [
              ['today', 'Hari Ini'],
              ['week', 'Minggu Ini'],
              ['month', 'Bulan Ini'],
              ['all', 'Semua'],
            ] as [
              Period,
              string,
            ][]
          ).map(
            ([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setPeriod(value)
                }
                className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-black transition ${
                  period === value
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-500 shadow-sm hover:bg-slate-100'
                }`}
              >
                {label}
              </button>
            ),
          )}

        </section>

        <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">

          <article className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-lg">
                💰
              </span>

              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                {periodLabel}
              </span>
            </div>

            <p className="mt-4 text-xs font-bold text-slate-500">
              Pemasukan
            </p>

            <p className="mt-1 text-xl font-black text-emerald-600">
              {formatRupiah(
                totalIncome,
              )}
            </p>
          </article>

          <article className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-lg">
                💸
              </span>

              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                {periodLabel}
              </span>
            </div>

            <p className="mt-4 text-xs font-bold text-slate-500">
              Pengeluaran
            </p>

            <p className="mt-1 text-xl font-black text-red-600">
              {formatRupiah(
                totalExpense,
              )}
            </p>
          </article>

          <article className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-lg">
                📊
              </span>

              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Bersih
              </span>
            </div>

            <p className="mt-4 text-xs font-bold text-slate-500">
              Laba Bersih
            </p>

            <p
              className={`mt-1 text-xl font-black ${
                netProfit >= 0
                  ? 'text-blue-600'
                  : 'text-red-600'
              }`}
            >
              {formatRupiah(
                netProfit,
              )}
            </p>
          </article>

          <article className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-lg">
                🧾
              </span>

              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                {periodLabel}
              </span>
            </div>

            <p className="mt-4 text-xs font-bold text-slate-500">
              Transaksi
            </p>

            <p className="mt-1 text-xl font-black text-violet-600">
              {transactionCount}
            </p>
          </article>

        </section>

        <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">

          <button
            type="button"
            onClick={() =>
              onNavigate?.(
                'sales',
              )
            }
            className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-lg">
              🛒
            </span>

            <strong className="mt-3 block text-sm font-black text-slate-900">
              Kasir
            </strong>

            <span className="mt-1 block text-[10px] text-slate-400">
              Catat penjualan
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              onNavigate?.(
                'catat',
              )
            }
            className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-lg">
              ➕
            </span>

            <strong className="mt-3 block text-sm font-black text-slate-900">
              Catat
            </strong>

            <span className="mt-1 block text-[10px] text-slate-400">
              Pemasukan / pengeluaran
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              onNavigate?.(
                'products',
              )
            }
            className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-md"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-lg">
              📦
            </span>

            <strong className="mt-3 block text-sm font-black text-slate-900">
              Produk
            </strong>

            <span className="mt-1 block text-[10px] text-slate-400">
              Kelola stok barang
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              onNavigate?.(
                'reports',
              )
            }
            className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-lg">
              📈
            </span>

            <strong className="mt-3 block text-sm font-black text-slate-900">
              Laporan
            </strong>

            <span className="mt-1 block text-[10px] text-slate-400">
              Lihat perkembangan
            </span>
          </button>

        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.5fr_1fr]">

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5">

              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Transaksi Terbaru
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  Aktivitas terakhir toko
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  onNavigate?.(
                    'transactions',
                  )
                }
                className="text-xs font-black text-blue-600 hover:underline"
              >
                Lihat Semua
              </button>

            </div>

            {recentTransactions.length ===
            0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center px-5 text-center">
                <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                  🧾
                </span>

                <h3 className="text-sm font-black text-slate-900">
                  Belum ada transaksi
                </h3>

                <p className="mt-1 max-w-xs text-xs leading-5 text-slate-400">
                  Transaksi dari Kasir
                  atau pencatatan manual
                  akan muncul di sini.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">

                {recentTransactions.map(
                  (transaction) => {
                    const style =
                      getTransactionStyle(
                        transaction.type,
                      )

                    const sign =
                      transaction.type ===
                      'income'
                        ? '+'
                        : '-'

                    return (
                      <div
                        key={
                          transaction.id
                        }
                        className="flex items-center gap-3 px-5 py-4"
                      >

                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm ${style.icon}`}
                        >
                          {getTransactionIcon(
                            transaction.type,
                          )}
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-black text-slate-800">
                            {
                              transaction.title
                            }
                          </p>

                          <p className="mt-1 text-[10px] text-slate-400">
                            {
                              transaction.date
                            }
                            {' • '}
                            {
                              transaction.time
                            }
                          </p>
                        </div>

                        <strong
                          className={`shrink-0 text-xs font-black sm:text-sm ${style.amount}`}
                        >
                          {sign}
                          {formatRupiah(
                            transaction.amount,
                          )}
                        </strong>

                      </div>
                    )
                  },
                )}

              </div>
            )}

          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="mb-5 flex items-start justify-between gap-4">

              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Stok Menipis
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  Perlu diperhatikan
                </p>
              </div>

              <span className="rounded-full bg-amber-50 px-3 py-1.5 text-[10px] font-black text-amber-700">
                {lowStockProducts.length}
                {' '}produk
              </span>

            </div>

            {lowStockProducts.length ===
            0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
                <span className="mb-3 text-3xl">
                  ✅
                </span>

                <h3 className="text-sm font-black text-slate-900">
                  Stok aman
                </h3>

                <p className="mt-1 text-xs text-slate-400">
                  Belum ada produk dengan
                  stok menipis.
                </p>
              </div>
            ) : (
              <div className="space-y-3">

                {lowStockProducts
                  .slice(0, 6)
                  .map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() =>
                        onNavigate?.(
                          'products',
                        )
                      }
                      className="flex w-full items-center gap-3 rounded-xl bg-slate-50 p-3 text-left transition hover:bg-slate-100"
                    >

                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm">
                        {product.icon ||
                          '📦'}
                      </span>

                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-xs font-black text-slate-800">
                          {
                            product.name
                          }
                        </strong>

                        <span className="mt-1 block text-[10px] text-slate-400">
                          Harga{' '}
                          {formatRupiah(
                            product.price,
                          )}
                        </span>
                      </span>

                      <span
                        className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-black ${
                          Number(
                            product.stock ||
                              0,
                          ) <= 0
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {Number(
                          product.stock ||
                            0,
                        ) <= 0
                          ? 'Habis'
                          : `${product.stock} stok`}
                      </span>

                    </button>
                  ))}

                <button
                  type="button"
                  onClick={() =>
                    onNavigate?.(
                      'products',
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 py-3 text-xs font-black text-slate-600 transition hover:bg-slate-50"
                >
                  Kelola Semua Produk
                </button>

              </div>
            )}

          </div>

        </section>

        <section className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <p className="text-xs font-bold text-slate-400">
              Rata-rata Transaksi
            </p>

            <p className="mt-2 text-2xl font-black text-slate-900">
              {formatRupiah(
                averageTransaction,
              )}
            </p>

            <p className="mt-1 text-[11px] text-slate-400">
              Berdasarkan {periodLabel.toLowerCase()}
            </p>

          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <p className="text-xs font-bold text-slate-400">
              Tabungan
            </p>

            <p className="mt-2 text-2xl font-black text-blue-600">
              {formatRupiah(
                totalSaving,
              )}
            </p>

            <p className="mt-1 text-[11px] text-slate-400">
              Dana yang dicatat sebagai
              tabungan pada periode ini.
            </p>

          </div>

        </section>

        <section className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/60 p-5">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <p className="text-xs font-black text-blue-700">
                Butuh pencatatan cepat?
              </p>

              <p className="mt-1 text-sm text-blue-900">
                Tambahkan transaksi manual
                tanpa masuk ke halaman lain.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDemoIncome}
              className="rounded-xl bg-blue-600 px-4 py-3 text-xs font-black text-white transition hover:bg-blue-700"
            >
              + Contoh Pemasukan Rp100.000
            </button>

          </div>

        </section>

        <footer className="mt-8 pb-4 text-center text-[10px] text-slate-400">
          CatatToko • Kasir & Keuangan UMKM
        </footer>

      </div>
    </main>
  )
}

export default Dashboard