import {
  useEffect,
  useState,
  type KeyboardEvent,
} from 'react'

import {
  addTransaction,
  DATA_CHANGED_EVENT,
  formatRupiah,
} from '../data/storage'

type TransactionType =
  | 'income'
  | 'expense'

type CatatProps = {
  initialType?: TransactionType
  onNavigate?: (page: string) => void
}

function Catat({
  initialType = 'income',
  onNavigate,
}: CatatProps) {
  const [type, setType] =
    useState<TransactionType>(
      initialType,
    )

  const [amount, setAmount] =
    useState('')

  const [description, setDescription] =
    useState('')

  const [isSaving, setIsSaving] =
    useState(false)

  const [message, setMessage] =
    useState('')

  const [error, setError] =
    useState('')

  useEffect(() => {
    setType(initialType)
  }, [initialType])

  const numericAmount =
    Number(amount)

  const previewAmount =
    Number.isFinite(
      numericAmount,
    ) &&
    numericAmount > 0
      ? numericAmount
      : 0

  const transactionLabel =
    type === 'income'
      ? 'Pemasukan'
      : 'Pengeluaran'

  const isValid =
    previewAmount > 0 &&
    description.trim().length >= 2

  /* =========================================================
     AMOUNT
  ========================================================= */

  const handleAmountChange = (
    value: string,
  ) => {
    const cleaned =
      value.replace(
        /[^0-9]/g,
        '',
      )

    setAmount(cleaned)
    setError('')
    setMessage('')
  }

  /* =========================================================
     RESET
  ========================================================= */

  const resetForm = () => {
    setAmount('')
    setDescription('')
  }

  /* =========================================================
     SAVE
  ========================================================= */

  const handleSave = async () => {
    if (isSaving) {
      return
    }

    setMessage('')
    setError('')

    const cleanDescription =
      description.trim()

    const cleanAmount =
      Number(amount)

    if (
      !Number.isFinite(
        cleanAmount,
      ) ||
      cleanAmount <= 0
    ) {
      setError(
        'Masukkan nominal transaksi yang valid.',
      )
      return
    }

    if (
      cleanDescription.length < 2
    ) {
      setError(
        'Keterangan transaksi minimal 2 karakter.',
      )
      return
    }

    try {
      setIsSaving(true)

      /*
       * addTransaction langsung memperbarui
       * cache dan memasukkan sinkronisasi
       * Firestore ke queue.
       */
      addTransaction({
        title:
          cleanDescription,

        type,

        amount:
          cleanAmount,
      })

      resetForm()

      setMessage(
        `${transactionLabel} berhasil dicatat.`,
      )

      window.dispatchEvent(
        new Event(
          DATA_CHANGED_EVENT,
        ),
      )

      window.setTimeout(() => {
        setMessage('')
      }, 3000)
    } catch (saveError) {
      console.error(
        'Gagal menyimpan transaksi:',
        saveError,
      )

      setError(
        'Transaksi gagal disimpan. Periksa koneksi Firebase lalu coba lagi.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  /* =========================================================
     KEYBOARD
  ========================================================= */

  const handleKeyDown = (
    event: KeyboardEvent<
      HTMLInputElement
    >,
  ) => {
    if (
      event.key === 'Enter'
    ) {
      event.preventDefault()
      void handleSave()
    }
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 pb-32 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl">

        {/* HEADER */}
        <header className="mb-7">
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-blue-600">
              CatatToko
            </span>

            <span className="text-xs font-medium text-slate-400">
              Keuangan
            </span>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Catat Transaksi
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
            Catat pemasukan dan pengeluaran
            toko secara cepat agar saldo dan
            laporan selalu ikut diperbarui.
          </p>
        </header>

        {/* SUCCESS */}
        {message && (
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-black text-white">
              ✓
            </span>

            <span>
              {message}
            </span>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500 text-xs font-black text-white">
              !
            </span>

            <span>
              {error}
            </span>
          </div>
        )}

        {/* TYPE */}
        <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-black text-slate-900">
              Jenis Transaksi
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Pilih jenis uang yang ingin
              kamu catat.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

            {/* PEMASUKAN */}
            <button
              type="button"
              disabled={isSaving}
              onClick={() => {
                setType('income')
                setError('')
                setMessage('')
              }}
              className={`group rounded-2xl border p-4 text-left transition ${
                type === 'income'
                  ? 'border-emerald-300 bg-emerald-50 ring-2 ring-emerald-500/10'
                  : 'border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/40'
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl ${
                    type === 'income'
                      ? 'bg-emerald-100'
                      : 'bg-slate-100 group-hover:bg-emerald-100'
                  }`}
                >
                  💰
                </div>

                <div className="min-w-0">
                  <strong className="block text-sm font-black text-slate-900">
                    Pemasukan
                  </strong>

                  <span className="mt-1 block text-xs text-slate-500">
                    Uang masuk ke toko
                  </span>
                </div>

                {type ===
                  'income' && (
                  <span className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-black text-white">
                    ✓
                  </span>
                )}
              </div>
            </button>

            {/* PENGELUARAN */}
            <button
              type="button"
              disabled={isSaving}
              onClick={() => {
                setType('expense')
                setError('')
                setMessage('')
              }}
              className={`group rounded-2xl border p-4 text-left transition ${
                type === 'expense'
                  ? 'border-red-300 bg-red-50 ring-2 ring-red-500/10'
                  : 'border-slate-200 bg-white hover:border-red-200 hover:bg-red-50/40'
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl ${
                    type === 'expense'
                      ? 'bg-red-100'
                      : 'bg-slate-100 group-hover:bg-red-100'
                  }`}
                >
                  💸
                </div>

                <div className="min-w-0">
                  <strong className="block text-sm font-black text-slate-900">
                    Pengeluaran
                  </strong>

                  <span className="mt-1 block text-xs text-slate-500">
                    Uang keluar dari toko
                  </span>
                </div>

                {type ===
                  'expense' && (
                  <span className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500 text-xs font-black text-white">
                    ✓
                  </span>
                )}
              </div>
            </button>
          </div>
        </section>

        {/* DETAIL */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6">
            <h2 className="text-lg font-black text-slate-900">
              Detail Transaksi
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Masukkan nominal dan keterangan
              transaksi.
            </p>
          </div>

          {/* NOMINAL */}
          <div className="mb-5">
            <label
              htmlFor="catat-amount"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              Nominal
            </label>

            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">
                Rp
              </span>

              <input
                id="catat-amount"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="0"
                value={
                  amount
                    ? new Intl.NumberFormat(
                        'id-ID',
                      ).format(
                        Number(amount),
                      )
                    : ''
                }
                disabled={isSaving}
                onChange={(event) =>
                  handleAmountChange(
                    event.target.value,
                  )
                }
                onKeyDown={
                  handleKeyDown
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 text-xl font-black text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <p className="mt-2 text-xs text-slate-400">
              Contoh: 50000 untuk
              Rp50.000.
            </p>
          </div>

          {/* KETERANGAN */}
          <div className="mb-5">
            <label
              htmlFor="catat-description"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              Keterangan
            </label>

            <input
              id="catat-description"
              type="text"
              maxLength={100}
              autoComplete="off"
              placeholder={
                type === 'income'
                  ? 'Contoh: Penjualan barang'
                  : 'Contoh: Beli stok barang'
              }
              value={description}
              disabled={isSaving}
              onChange={(event) => {
                setDescription(
                  event.target.value,
                )
                setError('')
                setMessage('')
              }}
              onKeyDown={
                handleKeyDown
              }
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            />

            <div className="mt-2 flex justify-end">
              <span className="text-[11px] text-slate-400">
                {description.length}/100
              </span>
            </div>
          </div>

          {/* PREVIEW */}
          <div
            className={`mb-6 rounded-2xl border p-4 ${
              type === 'income'
                ? 'border-emerald-100 bg-emerald-50'
                : 'border-red-100 bg-red-50'
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-500">
                  Preview
                </p>

                <p className="mt-1 truncate text-sm font-black text-slate-900">
                  {description.trim() ||
                    transactionLabel}
                </p>

                <p className="mt-0.5 text-xs text-slate-500">
                  {type === 'income'
                    ? 'Uang masuk'
                    : 'Uang keluar'}
                </p>
              </div>

              <p
                className={`shrink-0 text-lg font-black ${
                  type === 'income'
                    ? 'text-emerald-600'
                    : 'text-red-600'
                }`}
              >
                {type === 'income'
                  ? '+'
                  : '-'}
                {formatRupiah(
                  previewAmount,
                )}
              </p>
            </div>
          </div>

          {/* ACTION */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            {onNavigate && (
              <button
                type="button"
                disabled={isSaving}
                onClick={() =>
                  onNavigate(
                    'transactions',
                  )
                }
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Lihat Transaksi
              </button>
            )}

            <button
              type="button"
              disabled={
                isSaving ||
                !isValid
              }
              onClick={() =>
                void handleSave()
              }
              className={`rounded-2xl px-6 py-3.5 text-sm font-black text-white shadow-lg transition ${
                type === 'income'
                  ? 'bg-emerald-600 shadow-emerald-600/20 hover:bg-emerald-700'
                  : 'bg-red-600 shadow-red-600/20 hover:bg-red-700'
              } disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none`}
            >
              {isSaving
                ? 'Menyimpan...'
                : `Simpan ${transactionLabel}`}
            </button>
          </div>
        </section>

        {/* INFO */}
        <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
          <div className="flex gap-3">
            <span className="mt-0.5 text-sm">
              💡
            </span>

            <p className="text-xs leading-5 text-blue-700">
              Pemasukan akan menambah
              saldo, sedangkan pengeluaran
              akan mengurangi saldo. Keduanya
              otomatis masuk ke laporan
              keuangan dan tersimpan di
              Firebase.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}

export default Catat