import { useEffect, useMemo, useState } from 'react'

import {
  DATA_CHANGED_EVENT,
  deleteTransaction,
  formatRupiah,
  getTransactions,
  updateTransaction,
  type Transaction,
  type TransactionType,
} from '../data/storage'

type FilterType =
  | 'all'
  | 'income'
  | 'expense'
  | 'saving'

const filterOptions: Array<{
  value: FilterType
  label: string
}> = [
  {
    value: 'all',
    label: 'Semua',
  },
  {
    value: 'income',
    label: 'Pemasukan',
  },
  {
    value: 'expense',
    label: 'Pengeluaran',
  },
  {
    value: 'saving',
    label: 'Tabungan',
  },
]

const typeConfig: Record<
  TransactionType,
  {
    label: string
    icon: string
    iconClass: string
    badgeClass: string
    amountClass: string
    prefix: string
  }
> = {
  income: {
    label: 'Pemasukan',
    icon: '💰',
    iconClass:
      'bg-emerald-50 text-emerald-600',
    badgeClass:
      'bg-emerald-50 text-emerald-600',
    amountClass: 'text-emerald-600',
    prefix: '+',
  },

  expense: {
    label: 'Pengeluaran',
    icon: '💸',
    iconClass:
      'bg-red-50 text-red-600',
    badgeClass:
      'bg-red-50 text-red-600',
    amountClass: 'text-red-600',
    prefix: '-',
  },

  saving: {
    label: 'Tabungan',
    icon: '🏦',
    iconClass:
      'bg-violet-50 text-violet-600',
    badgeClass:
      'bg-violet-50 text-violet-600',
    amountClass: 'text-violet-600',
    prefix: '-',
  },
}

function getTransactionTimestamp(
  transaction: Transaction,
): number {
  if (transaction.createdAt) {
    const timestamp = Date.parse(
      transaction.createdAt,
    )

    if (Number.isFinite(timestamp)) {
      return timestamp
    }
  }

  const dateTime = `${transaction.date} ${transaction.time}`

  const fallbackTimestamp = Date.parse(
    dateTime,
  )

  if (Number.isFinite(fallbackTimestamp)) {
    return fallbackTimestamp
  }

  return transaction.id
}

function Transaksi() {
  const [transactions, setTransactions] =
    useState<Transaction[]>([])

  const [search, setSearch] =
    useState('')

  const [filterType, setFilterType] =
    useState<FilterType>('all')

  const [showEdit, setShowEdit] =
    useState(false)

  const [
    editingTransaction,
    setEditingTransaction,
  ] = useState<Transaction | null>(null)

  const [editTitle, setEditTitle] =
    useState('')

  const [editAmount, setEditAmount] =
    useState('')

  const [editType, setEditType] =
    useState<TransactionType>('income')

  const [isSaving, setIsSaving] =
    useState(false)

  const [isDeleting, setIsDeleting] =
    useState<number | null>(null)

  const loadTransactions = () => {
    setTransactions(
      getTransactions(),
    )
  }

  useEffect(() => {
    loadTransactions()

    const handleDataChanged = () => {
      loadTransactions()
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
      const keyword =
        search.trim().toLowerCase()

      return [...transactions]
        .filter((transaction) => {
          if (filterType === 'all') {
            return true
          }

          return (
            transaction.type ===
            filterType
          )
        })
        .filter((transaction) => {
          if (!keyword) {
            return true
          }

          const title =
            transaction.title
              .toLowerCase()

          const date =
            transaction.date
              .toLowerCase()

          const time =
            transaction.time
              .toLowerCase()

          return (
            title.includes(keyword) ||
            date.includes(keyword) ||
            time.includes(keyword)
          )
        })
        .sort(
          (a, b) =>
            getTransactionTimestamp(b) -
            getTransactionTimestamp(a),
        )
    }, [
      transactions,
      search,
      filterType,
    ])

  const totals = useMemo(() => {
    return transactions.reduce(
      (result, transaction) => {
        if (
          transaction.type ===
          'income'
        ) {
          result.income +=
            transaction.amount
        }

        if (
          transaction.type ===
          'expense'
        ) {
          result.expense +=
            transaction.amount
        }

        if (
          transaction.type ===
          'saving'
        ) {
          result.saving +=
            transaction.amount
        }

        return result
      },
      {
        income: 0,
        expense: 0,
        saving: 0,
      },
    )
  }, [transactions])

  const filteredTotal = useMemo(() => {
    return filteredTransactions.reduce(
      (total, transaction) =>
        total + transaction.amount,
      0,
    )
  }, [filteredTransactions])

  const netTotal =
    totals.income -
    totals.expense -
    totals.saving

  const openEdit = (
    transaction: Transaction,
  ) => {
    setEditingTransaction(
      transaction,
    )

    setEditTitle(
      transaction.title,
    )

    setEditAmount(
      String(transaction.amount),
    )

    setEditType(
      transaction.type,
    )

    setShowEdit(true)
  }

  const closeEdit = () => {
    if (isSaving) {
      return
    }

    setShowEdit(false)

    setEditingTransaction(null)

    setEditTitle('')

    setEditAmount('')

    setEditType('income')
  }

  const handleEdit = async () => {
    if (
      !editingTransaction ||
      isSaving
    ) {
      return
    }

    const title =
      editTitle.trim()

    const amount = Number(
      editAmount.replace(/\D/g, ''),
    )

    if (!title) {
      alert(
        'Nama transaksi wajib diisi.',
      )
      return
    }

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      alert(
        'Nominal transaksi tidak valid.',
      )
      return
    }

    setIsSaving(true)

    try {
      const updatedTransaction: Transaction =
        {
          ...editingTransaction,

          title,

          amount,

          type: editType,
        }

      updateTransaction(
        updatedTransaction,
      )

      closeEdit()
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = (
    transaction: Transaction,
  ) => {
    if (
      isDeleting !== null
    ) {
      return
    }

    const confirmed =
      window.confirm(
        `Hapus transaksi "${transaction.title}"?\n\nPerubahan saldo dari transaksi ini juga akan dikembalikan.`,
      )

    if (!confirmed) {
      return
    }

    setIsDeleting(
      transaction.id,
    )

    try {
      deleteTransaction(
        transaction.id,
      )
    } finally {
      setIsDeleting(null)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 pb-32 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">

        {/* HEADER */}
        <header className="mb-7">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-600" />

            <p className="text-sm font-bold text-blue-600">
              CatatToko
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                Transaksi
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                Semua aktivitas keuangan dan
                penjualan toko tersimpan di
                sini.
              </p>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-white px-4 py-3 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Saldo bersih transaksi
              </p>

              <p
                className={`mt-1 text-lg font-black ${
                  netTotal >= 0
                    ? 'text-blue-600'
                    : 'text-red-600'
                }`}
              >
                {formatRupiah(netTotal)}
              </p>
            </div>
          </div>
        </header>

        {/* SUMMARY */}
        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          {/* INCOME */}
          <div className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Total Pemasukan
                </p>

                <p className="mt-2 text-xl font-black text-emerald-600 sm:text-2xl">
                  {formatRupiah(
                    totals.income,
                  )}
                </p>
              </div>

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-xl">
                💰
              </div>
            </div>
          </div>

          {/* EXPENSE */}
          <div className="rounded-3xl border border-red-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Total Pengeluaran
                </p>

                <p className="mt-2 text-xl font-black text-red-600 sm:text-2xl">
                  {formatRupiah(
                    totals.expense,
                  )}
                </p>
              </div>

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-xl">
                💸
              </div>
            </div>
          </div>

          {/* SAVING */}
          <div className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Total Tabungan
                </p>

                <p className="mt-2 text-xl font-black text-violet-600 sm:text-2xl">
                  {formatRupiah(
                    totals.saving,
                  )}
                </p>
              </div>

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-xl">
                🏦
              </div>
            </div>
          </div>

          {/* COUNT */}
          <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Jumlah Transaksi
                </p>

                <p className="mt-2 text-xl font-black text-blue-600 sm:text-2xl">
                  {transactions.length}
                </p>
              </div>

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-xl">
                🧾
              </div>
            </div>
          </div>

        </section>

        {/* SEARCH & FILTER */}
        <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4">

            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg">
                🔎
              </span>

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Cari transaksi, tanggal, atau waktu..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-11 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    setSearch('')
                  }
                  aria-label="Hapus pencarian"
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {filterOptions.map(
                (option) => {
                  const active =
                    filterType ===
                    option.value

                  return (
                    <button
                      key={
                        option.value
                      }
                      type="button"
                      onClick={() =>
                        setFilterType(
                          option.value,
                        )
                      }
                      className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                        active
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  )
                },
              )}
            </div>

          </div>
        </section>

        {/* TRANSACTION LIST */}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <h2 className="text-lg font-black text-slate-900 sm:text-xl">
                  Daftar Transaksi
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {filteredTransactions.length}{' '}
                  transaksi ditemukan
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500">
                  {filterType ===
                  'all'
                    ? 'Semua'
                    : typeConfig[
                        filterType
                      ].label}
                </span>

                {search && (
                  <span className="max-w-[180px] truncate rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-600">
                    "{search}"
                  </span>
                )}
              </div>

            </div>
          </div>

          {/* EMPTY */}
          {filteredTransactions.length ===
          0 ? (
            <div className="flex min-h-[330px] flex-col items-center justify-center px-6 py-12 text-center">

              <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100 text-4xl">
                🧾
              </div>

              <h3 className="text-lg font-black text-slate-900">
                {search
                  ? 'Transaksi tidak ditemukan'
                  : 'Belum ada transaksi'}
              </h3>

              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                {search
                  ? 'Coba gunakan kata kunci pencarian yang berbeda.'
                  : 'Transaksi yang kamu catat melalui Kasir atau menu Catat akan muncul di sini.'}
              </p>

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    setSearch('')
                  }
                  className="mt-5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  Bersihkan pencarian
                </button>
              )}

            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-100">
                {filteredTransactions.map(
                  (transaction) => {
                    const config =
                      typeConfig[
                        transaction.type
                      ]

                    const deleting =
                      isDeleting ===
                      transaction.id

                    return (
                      <article
                        key={
                          transaction.id
                        }
                        className="group px-5 py-5 transition hover:bg-slate-50 sm:px-6"
                      >
                        <div className="flex items-start gap-4">

                          {/* ICON */}
                          <div
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl ${config.iconClass}`}
                          >
                            {
                              config.icon
                            }
                          </div>

                          {/* CONTENT */}
                          <div className="min-w-0 flex-1">

                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="break-words text-sm font-black text-slate-900 sm:text-base">
                                {
                                  transaction.title
                                }
                              </h3>

                              <span
                                className={`rounded-full px-2.5 py-1 text-[10px] font-black ${config.badgeClass}`}
                              >
                                {
                                  config.label
                                }
                              </span>
                            </div>

                            <p className="mt-1.5 text-xs font-medium text-slate-400 sm:text-sm">
                              {
                                transaction.date
                              }

                              {' • '}

                              {
                                transaction.time
                              }
                            </p>

                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 sm:mt-3">

                              <strong
                                className={`text-base font-black sm:text-lg ${config.amountClass}`}
                              >
                                {
                                  config.prefix
                                }

                                {formatRupiah(
                                  transaction.amount,
                                )}
                              </strong>

                              <div className="flex items-center gap-2">

                                <button
                                  type="button"
                                  onClick={() =>
                                    openEdit(
                                      transaction,
                                    )
                                  }
                                  aria-label={`Edit ${transaction.title}`}
                                  disabled={
                                    deleting
                                  }
                                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  ✏️
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDelete(
                                      transaction,
                                    )
                                  }
                                  aria-label={`Hapus ${transaction.title}`}
                                  disabled={
                                    deleting
                                  }
                                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {deleting
                                    ? '…'
                                    : '🗑️'}
                                </button>

                              </div>

                            </div>
                          </div>

                        </div>
                      </article>
                    )
                  },
                )}
              </div>

              {/* FILTER TOTAL */}
              <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6">
                <div className="flex items-center justify-between gap-4">

                  <span className="text-xs font-bold text-slate-500 sm:text-sm">
                    Total tampilan saat ini
                  </span>

                  <strong className="text-sm font-black text-slate-900 sm:text-base">
                    {formatRupiah(
                      filteredTotal,
                    )}
                  </strong>

                </div>
              </div>
            </>
          )}
        </section>

        {/* INFO */}
        <section className="mt-6 rounded-3xl border border-blue-100 bg-blue-50/70 p-5 sm:p-6">
          <div className="flex items-start gap-4">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
              💡
            </div>

            <div>
              <h3 className="text-sm font-black text-slate-900">
                Penjualan dari Kasir otomatis
                masuk ke sini
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-600 sm:text-sm">
                Saat penjualan selesai di
                menu Kasir, CatatToko akan
                mencatat transaksi sebagai
                pemasukan dan mengurangi
                stok produk secara otomatis.
              </p>
            </div>

          </div>
        </section>

      </div>

      {/* EDIT MODAL */}
      {showEdit &&
        editingTransaction && (
          <div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={closeEdit}
          >
            <form
              onSubmit={(event) => {
                event.preventDefault()
                void handleEdit()
              }}
              onClick={(event) =>
                event.stopPropagation()
              }
              className="flex max-h-[calc(100dvh-0.5rem)] w-full flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:max-h-[90vh] sm:max-w-lg sm:rounded-3xl"
            >

              {/* MODAL HEADER */}
              <div className="shrink-0 border-b border-slate-100 px-5 py-5 sm:px-6">
                <div className="flex items-start justify-between gap-4">

                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-blue-600">
                      Kelola transaksi
                    </p>

                    <h2 className="mt-1 text-2xl font-black text-slate-900">
                      Edit Transaksi
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Perbarui informasi
                      transaksi.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closeEdit}
                    disabled={isSaving}
                    aria-label="Tutup modal"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    ✕
                  </button>

                </div>
              </div>

              {/* MODAL BODY */}
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">

                {/* TYPE */}
                <div className="mb-5">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Jenis Transaksi
                  </label>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {(
                      [
                        'income',
                        'expense',
                        'saving',
                      ] as TransactionType[]
                    ).map((type) => {
                      const config =
                        typeConfig[
                          type
                        ]

                      const active =
                        editType ===
                        type

                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() =>
                            setEditType(
                              type,
                            )
                          }
                          disabled={
                            isSaving
                          }
                          className={`rounded-2xl border p-3 text-left transition ${
                            active
                              ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-500/10'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          } disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          <div className="flex items-center gap-2.5">

                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base ${config.iconClass}`}
                            >
                              {
                                config.icon
                              }
                            </div>

                            <span className="text-xs font-black text-slate-800">
                              {
                                config.label
                              }
                            </span>

                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* TITLE */}
                <div className="mb-5">
                  <label
                    htmlFor="edit-transaction-title"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    Nama Transaksi
                  </label>

                  <input
                    id="edit-transaction-title"
                    type="text"
                    value={editTitle}
                    onChange={(event) =>
                      setEditTitle(
                        event.target.value,
                      )
                    }
                    placeholder="Contoh: Pembelian stok"
                    autoComplete="off"
                    disabled={isSaving}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>

                {/* AMOUNT */}
                <div>
                  <label
                    htmlFor="edit-transaction-amount"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    Nominal
                  </label>

                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">
                      Rp
                    </span>

                    <input
                      id="edit-transaction-amount"
                      type="number"
                      value={
                        editAmount
                      }
                      onChange={(event) =>
                        setEditAmount(
                          event.target
                            .value,
                        )
                      }
                      placeholder="Masukkan nominal"
                      min="1"
                      inputMode="numeric"
                      disabled={
                        isSaving
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-bold text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* WARNING */}
                <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4">
                  <div className="flex items-start gap-3">

                    <span className="text-lg">
                      ⚠️
                    </span>

                    <p className="text-xs leading-5 text-amber-800">
                      Mengubah transaksi
                      akan ikut mengubah
                      perhitungan saldo
                      berdasarkan jenis dan
                      nominal transaksi.
                    </p>

                  </div>
                </div>

              </div>

              {/* MODAL FOOTER */}
              <div className="shrink-0 border-t border-slate-100 bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

                  <button
                    type="button"
                    onClick={closeEdit}
                    disabled={isSaving}
                    className="w-full rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    {isSaving
                      ? 'Menyimpan...'
                      : 'Simpan Perubahan'}
                  </button>

                </div>
              </div>

            </form>
          </div>
        )}

    </main>
  )
}

export default Transaksi