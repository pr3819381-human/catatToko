import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'

import {
  DATA_CHANGED_EVENT,
  formatRupiah,
  getProducts,
  saveProducts,
  type Product,
} from '../data/storage'

type ProdukProps = {
  onNavigate?: (page: string) => void
}

type FormData = {
  name: string
  price: string
  stock: string
  icon: string
}

type StockFilter =
  | 'all'
  | 'available'
  | 'low'
  | 'empty'

const EMPTY_FORM: FormData = {
  name: '',
  price: '',
  stock: '',
  icon: '📦',
}

const ICONS = [
  '📦',
  '🍚',
  '🫗',
  '🍬',
  '🍜',
  '🥚',
  '🍵',
  '🥤',
  '🧴',
  '🧹',
  '🧻',
  '🧃',
]

function Produk({
  onNavigate,
}: ProdukProps) {
  const [products, setProducts] =
    useState<Product[]>([])

  const [search, setSearch] =
    useState('')

  const [stockFilter, setStockFilter] =
    useState<StockFilter>('all')

  const [showModal, setShowModal] =
    useState(false)

  const [editingId, setEditingId] =
    useState<number | null>(null)

  const [form, setForm] =
    useState<FormData>(EMPTY_FORM)

  const [error, setError] =
    useState('')

  const [message, setMessage] =
    useState('')

  const [saving, setSaving] =
    useState(false)

  /* =========================================================
     LOAD
  ========================================================= */

  const loadProducts = () => {
    setProducts(getProducts())
  }

  useEffect(() => {
    loadProducts()

    const handleChanged = () => {
      loadProducts()
    }

    window.addEventListener(
      DATA_CHANGED_EVENT,
      handleChanged,
    )

    return () => {
      window.removeEventListener(
        DATA_CHANGED_EVENT,
        handleChanged,
      )
    }
  }, [])

  /* =========================================================
     FEEDBACK
  ========================================================= */

  useEffect(() => {
    if (!message && !error) {
      return
    }

    const timer = window.setTimeout(() => {
      setMessage('')
      setError('')
    }, 3500)

    return () => {
      window.clearTimeout(timer)
    }
  }, [message, error])

  /* =========================================================
     STATS
  ========================================================= */

  const totalProducts =
    products.length

  const totalStock =
    products.reduce(
      (total, product) =>
        total + product.stock,
      0,
    )

  const lowStock =
    products.filter(
      (product) =>
        product.stock > 0 &&
        product.stock <= 5,
    ).length

  const emptyStock =
    products.filter(
      (product) =>
        product.stock <= 0,
    ).length

  const inventoryValue =
    products.reduce(
      (total, product) =>
        total +
        product.price *
          product.stock,
      0,
    )

  /* =========================================================
     FILTER
  ========================================================= */

  const filteredProducts =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase()

      return products.filter(
        (product) => {
          const matchesSearch =
            !keyword ||
            product.name
              .toLowerCase()
              .includes(keyword)

          if (
            stockFilter ===
            'available'
          ) {
            return (
              matchesSearch &&
              product.stock > 0
            )
          }

          if (
            stockFilter ===
            'low'
          ) {
            return (
              matchesSearch &&
              product.stock > 0 &&
              product.stock <= 5
            )
          }

          if (
            stockFilter ===
            'empty'
          ) {
            return (
              matchesSearch &&
              product.stock <= 0
            )
          }

          return matchesSearch
        },
      )
    }, [
      products,
      search,
      stockFilter,
    ])

  /* =========================================================
     MODAL
  ========================================================= */

  const openAddModal = () => {
    setEditingId(null)
    setForm({
      ...EMPTY_FORM,
    })
    setError('')
    setShowModal(true)
  }

  const openEditModal = (
    product: Product,
  ) => {
    setEditingId(product.id)

    setForm({
      name: product.name,
      price: String(product.price),
      stock: String(product.stock),
      icon:
        product.icon ||
        '📦',
    })

    setError('')
    setShowModal(true)
  }

  const closeModal = () => {
    if (saving) {
      return
    }

    setShowModal(false)
    setEditingId(null)
    setForm({
      ...EMPTY_FORM,
    })
    setError('')
  }

  /* =========================================================
     FORM
  ========================================================= */

  const updateForm = (
    field: keyof FormData,
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))

    if (error) {
      setError('')
    }
  }

  /* =========================================================
     SAVE PRODUCT
  ========================================================= */

  const handleSubmit = (
    event: FormEvent,
  ) => {
    event.preventDefault()

    if (saving) {
      return
    }

    const name =
      form.name.trim()

    const price =
      Number(form.price)

    const stock =
      Number(form.stock)

    if (!name) {
      setError(
        'Nama produk wajib diisi.',
      )
      return
    }

    if (
      !Number.isFinite(price) ||
      price <= 0
    ) {
      setError(
        'Harga produk harus lebih dari 0.',
      )
      return
    }

    if (
      !Number.isInteger(stock) ||
      stock < 0
    ) {
      setError(
        'Stok harus berupa angka bulat 0 atau lebih.',
      )
      return
    }

    const duplicate =
      products.some(
        (product) =>
          product.id !==
            editingId &&
          product.name
            .trim()
            .toLowerCase() ===
            name.toLowerCase(),
      )

    if (duplicate) {
      setError(
        'Nama produk tersebut sudah ada.',
      )
      return
    }

    setSaving(true)

    try {
      if (editingId !== null) {
        const updated =
          products.map(
            (product) =>
              product.id ===
              editingId
                ? {
                    ...product,
                    name,
                    price,
                    stock,
                    icon:
                      form.icon ||
                      '📦',
                  }
                : product,
          )

        saveProducts(updated)

        setMessage(
          'Produk berhasil diperbarui dan sedang disinkronkan.',
        )
      } else {
        const newProduct: Product = {
          id:
            Date.now() +
            Math.floor(
              Math.random() *
                1000,
            ),
          name,
          price,
          stock,
          icon:
            form.icon ||
            '📦',
        }

        saveProducts([
          ...products,
          newProduct,
        ])

        setMessage(
          'Produk berhasil ditambahkan dan sedang disinkronkan.',
        )
      }

      loadProducts()
      closeModal()
    } catch (saveError) {
      console.error(
        'Gagal menyimpan produk:',
        saveError,
      )

      setError(
        'Produk gagal disimpan. Silakan coba lagi.',
      )
    } finally {
      setSaving(false)
    }
  }

  /* =========================================================
     DELETE
  ========================================================= */

  const deleteProduct = (
    product: Product,
  ) => {
    if (saving) {
      return
    }

    const confirmed =
      window.confirm(
        `Hapus produk "${product.name}"? Produk akan hilang dari daftar kasir.`,
      )

    if (!confirmed) {
      return
    }

    saveProducts(
      products.filter(
        (item) =>
          item.id !==
          product.id,
      ),
    )

    setMessage(
      'Produk berhasil dihapus dan sedang disinkronkan.',
    )

    loadProducts()
  }

  /* =========================================================
     QUICK STOCK
  ========================================================= */

  const changeStock = (
    productId: number,
    amount: number,
  ) => {
    if (saving) {
      return
    }

    const product =
      products.find(
        (item) =>
          item.id ===
          productId,
      )

    if (!product) {
      return
    }

    const nextStock =
      Math.max(
        0,
        product.stock +
          amount,
      )

    const updated =
      products.map(
        (item) =>
          item.id ===
          productId
            ? {
                ...item,
                stock:
                  nextStock,
              }
            : item,
      )

    saveProducts(updated)

    setMessage(
      amount > 0
        ? 'Stok berhasil ditambah dan sedang disinkronkan.'
        : 'Stok berhasil dikurangi dan sedang disinkronkan.',
    )

    loadProducts()
  }

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <div className="min-h-full bg-slate-50 pb-10">
      {/* HEADER */}

      <header className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-5 pb-7 pt-8 text-white sm:px-7">
        <div className="mx-auto w-full max-w-6xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">
                CATATTOKO • INVENTORY
              </p>

              <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                Produk & Stok
              </h1>

              <p className="mt-1 max-w-md text-xs leading-5 text-slate-400">
                Kelola barang toko yang
                nantinya digunakan langsung
                oleh kasir.
              </p>
            </div>

            <button
              type="button"
              onClick={openAddModal}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-light text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500"
              aria-label="Tambah produk"
            >
              +
            </button>
          </div>

          {/* SEARCH */}

          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
            <span className="text-lg">
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
              placeholder="Cari produk..."
              className="w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-slate-500"
            />

            {search && (
              <button
                type="button"
                onClick={() =>
                  setSearch('')
                }
                className="text-lg text-slate-400 hover:text-white"
                aria-label="Hapus pencarian"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 sm:px-7">
        {/* FEEDBACK */}

        {message && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            ✓ {message}
          </div>
        )}

        {error && !showModal && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
            {error}
          </div>
        )}

        {/* STATS */}

        <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Produk
            </p>

            <p className="mt-2 text-2xl font-black text-slate-900">
              {totalProducts}
            </p>

            <p className="mt-1 text-[10px] font-semibold text-slate-400">
              terdaftar
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Total Stok
            </p>

            <p className="mt-2 text-2xl font-black text-slate-900">
              {totalStock}
            </p>

            <p className="mt-1 text-[10px] font-semibold text-slate-400">
              unit barang
            </p>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-amber-500">
              Stok Menipis
            </p>

            <p className="mt-2 text-2xl font-black text-amber-700">
              {lowStock}
            </p>

            <p className="mt-1 text-[10px] font-semibold text-amber-500">
              perlu diperhatikan
            </p>
          </div>

          <div className="rounded-2xl border border-red-100 bg-red-50 p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-red-400">
              Stok Habis
            </p>

            <p className="mt-2 text-2xl font-black text-red-600">
              {emptyStock}
            </p>

            <p className="mt-1 text-[10px] font-semibold text-red-400">
              tidak tersedia
            </p>
          </div>
        </section>

        {/* INVENTORY VALUE */}

        <section className="mt-4 rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-blue-500">
                Nilai Persediaan
              </p>

              <p className="mt-2 text-xl font-black tracking-tight text-slate-900">
                {formatRupiah(
                  inventoryValue,
                )}
              </p>

              <p className="mt-1 text-[11px] font-medium text-slate-500">
                Estimasi harga jual seluruh
                stok yang tersedia.
              </p>
            </div>

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
              📦
            </div>
          </div>
        </section>

        {/* FILTER */}

        <section className="mt-6">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(
              [
                ['all', 'Semua'],
                ['available', 'Tersedia'],
                ['low', 'Menipis'],
                ['empty', 'Habis'],
              ] as [
                StockFilter,
                string,
              ][]
            ).map(
              ([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setStockFilter(
                      value,
                    )
                  }
                  className={`shrink-0 rounded-xl px-4 py-2.5 text-xs font-black transition ${
                    stockFilter ===
                    value
                      ? 'bg-slate-950 text-white shadow-md'
                      : 'bg-white text-slate-400 ring-1 ring-slate-100 hover:text-slate-700'
                  }`}
                >
                  {label}
                </button>
              ),
            )}
          </div>
        </section>

        {/* PRODUCTS */}

        <section className="mt-5">
          {filteredProducts.length ===
          0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-3xl">
                📦
              </div>

              <h2 className="mt-4 text-base font-black text-slate-800">
                Belum ada produk
              </h2>

              <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-slate-400">
                Tambahkan produk agar barang
                bisa langsung dipilih dari
                halaman kasir.
              </p>

              <button
                type="button"
                onClick={
                  openAddModal
                }
                className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-xs font-black text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700"
              >
                + Tambah Produk
              </button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map(
                (product) => {
                  const isEmpty =
                    product.stock <=
                    0

                  const isLow =
                    product.stock >
                      0 &&
                    product.stock <=
                      5

                  return (
                    <article
                      key={product.id}
                      className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-2xl">
                          {product.icon ||
                            '📦'}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h2 className="truncate text-sm font-black text-slate-800">
                                {product.name}
                              </h2>

                              <p className="mt-1 text-sm font-black text-blue-600">
                                {formatRupiah(
                                  product.price,
                                )}
                              </p>
                            </div>

                            <span
                              className={`shrink-0 rounded-lg px-2 py-1 text-[9px] font-black ${
                                isEmpty
                                  ? 'bg-red-50 text-red-500'
                                  : isLow
                                    ? 'bg-amber-50 text-amber-600'
                                    : 'bg-emerald-50 text-emerald-600'
                              }`}
                            >
                              {isEmpty
                                ? 'HABIS'
                                : isLow
                                  ? 'MENIPIS'
                                  : 'AMAN'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* STOCK */}

                      <div className="mt-5 rounded-2xl bg-slate-50 p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400">
                              Stok sekarang
                            </p>

                            <p className="mt-1 text-lg font-black text-slate-900">
                              {product.stock}{' '}
                              <span className="text-[10px] font-bold text-slate-400">
                                unit
                              </span>
                            </p>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                changeStock(
                                  product.id,
                                  -1,
                                )
                              }
                              disabled={
                                product.stock <=
                                  0 ||
                                saving
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-lg font-black text-slate-600 shadow-sm disabled:cursor-not-allowed disabled:opacity-30"
                              aria-label={`Kurangi stok ${product.name}`}
                            >
                              −
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                changeStock(
                                  product.id,
                                  1,
                                )
                              }
                              disabled={saving}
                              className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-lg font-black text-white shadow-sm shadow-blue-500/20 disabled:opacity-50"
                              aria-label={`Tambah stok ${product.name}`}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* CLOUD STATUS */}

                      <div className="mt-3 flex items-center gap-2">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            product.cloudId
                              ? 'bg-emerald-500'
                              : 'bg-amber-400'
                          }`}
                        />

                        <span className="text-[9px] font-bold text-slate-400">
                          {product.cloudId
                            ? 'Tersinkron'
                            : 'Menunggu sinkronisasi'}
                        </span>
                      </div>

                      {/* ACTIONS */}

                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openEditModal(
                              product,
                            )
                          }
                          disabled={saving}
                          className="flex-1 rounded-xl bg-slate-100 px-3 py-2.5 text-xs font-black text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deleteProduct(
                              product,
                            )
                          }
                          disabled={saving}
                          className="rounded-xl bg-red-50 px-4 py-2.5 text-xs font-black text-red-500 transition hover:bg-red-100 disabled:opacity-50"
                        >
                          Hapus
                        </button>
                      </div>
                    </article>
                  )
                },
              )}
            </div>
          )}
        </section>

        {/* INFO */}

        <section className="mt-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
              💡
            </div>

            <div>
              <h3 className="text-sm font-black text-slate-800">
                Terhubung dengan Kasir
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-400">
                Produk yang dibuat di sini
                otomatis tersedia di halaman
                Kasir. Saat barang terjual,
                stok akan berkurang otomatis
                dan transaksi pemasukan akan
                tercatat di Firebase.
              </p>

              {onNavigate && (
                <button
                  type="button"
                  onClick={() =>
                    onNavigate(
                      'sales',
                    )
                  }
                  className="mt-3 text-xs font-black text-blue-600 hover:text-blue-700"
                >
                  Buka Kasir →
                </button>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* MODAL */}

      {showModal && (
        <div className="fixed inset-0 z-[1300] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-5">
          <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[32px] bg-white p-5 shadow-2xl sm:rounded-[28px]">
            <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" />

            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-500">
                  {editingId !== null
                    ? 'EDIT PRODUK'
                    : 'PRODUK BARU'}
                </p>

                <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900">
                  {editingId !== null
                    ? 'Edit Produk'
                    : 'Tambah Produk'}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-xl text-slate-500 hover:bg-slate-200 disabled:opacity-40"
                aria-label="Tutup"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-6 space-y-4"
            >
              {/* PREVIEW */}

              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                  {form.icon ||
                    '📦'}
                </div>

                <div>
                  <p className="text-sm font-black text-slate-800">
                    {form.name ||
                      'Nama Produk'}
                  </p>

                  <p className="mt-1 text-xs font-semibold text-slate-400">
                    {form.price
                      ? formatRupiah(
                          Number(
                            form.price,
                          ),
                        )
                      : 'Rp0'}
                  </p>
                </div>
              </div>

              {/* NAME */}

              <label className="block">
                <span className="mb-2 block text-xs font-black text-slate-600">
                  Nama produk
                </span>

                <input
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    updateForm(
                      'name',
                      event.target.value,
                    )
                  }
                  placeholder="Contoh: Beras 5 Kg"
                  disabled={saving}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50"
                />
              </label>

              {/* PRICE / STOCK */}

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-2 block text-xs font-black text-slate-600">
                    Harga jual
                  </span>

                  <input
                    type="number"
                    min="1"
                    value={form.price}
                    onChange={(event) =>
                      updateForm(
                        'price',
                        event.target.value,
                      )
                    }
                    placeholder="75000"
                    disabled={saving}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-black text-slate-600">
                    Stok awal
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.stock}
                    onChange={(event) =>
                      updateForm(
                        'stock',
                        event.target.value,
                      )
                    }
                    placeholder="10"
                    disabled={saving}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50"
                  />
                </label>
              </div>

              {/* ICON */}

              <div>
                <span className="mb-2 block text-xs font-black text-slate-600">
                  Ikon produk
                </span>

                <div className="grid grid-cols-6 gap-2">
                  {ICONS.map(
                    (icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() =>
                          updateForm(
                            'icon',
                            icon,
                          )
                        }
                        disabled={saving}
                        className={`flex h-11 items-center justify-center rounded-xl text-xl transition disabled:opacity-50 ${
                          form.icon ===
                          icon
                            ? 'bg-blue-600 shadow-lg shadow-blue-500/20'
                            : 'bg-slate-50 hover:bg-slate-100'
                        }`}
                        aria-label={`Pilih ikon ${icon}`}
                      >
                        {icon}
                      </button>
                    ),
                  )}
                </div>
              </div>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold leading-5 text-red-600">
                  {error}
                </div>
              )}

              {/* ACTION */}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="flex-1 rounded-2xl bg-slate-100 px-4 py-3.5 text-sm font-black text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex-[1.5] rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 disabled:cursor-wait disabled:opacity-60"
                >
                  {saving
                    ? 'Menyimpan...'
                    : editingId !== null
                      ? 'Simpan Perubahan'
                      : 'Tambah Produk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Produk