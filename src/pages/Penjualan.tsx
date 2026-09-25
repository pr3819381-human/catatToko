import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  completeSale,
  DATA_CHANGED_EVENT,
  formatRupiah,
  getProducts,
  type Product,
} from '../data/storage'

type CartItem = Product & {
  quantity: number
}

type StockFilter =
  | 'all'
  | 'available'

function Penjualan() {
  const [products, setProducts] =
    useState<Product[]>([])

  const [cart, setCart] =
    useState<CartItem[]>([])

  const [search, setSearch] =
    useState('')

  const [stockFilter, setStockFilter] =
    useState<StockFilter>('available')

  const [processing, setProcessing] =
    useState(false)

  const [message, setMessage] =
    useState('')

  const [error, setError] =
    useState('')

  const [showCart, setShowCart] =
    useState(false)

  const [showPayment, setShowPayment] =
    useState(false)

  const [receivedAmount, setReceivedAmount] =
    useState('')

  /* =========================================================
     LOAD PRODUCTS
  ========================================================= */

  const loadProducts = () => {
    setProducts(
      getProducts(),
    )
  }

  useEffect(() => {
    loadProducts()

    const handleDataChanged = () => {
      loadProducts()
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

  /* =========================================================
     CLEAR FEEDBACK
  ========================================================= */

  useEffect(() => {
    if (
      !message &&
      !error
    ) {
      return
    }

    const timer =
      window.setTimeout(() => {
        setMessage('')
        setError('')
      }, 5000)

    return () => {
      window.clearTimeout(
        timer,
      )
    }
  }, [
    message,
    error,
  ])

  /* =========================================================
     FILTER PRODUCTS
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

          const matchesStock =
            stockFilter ===
              'all' ||
            product.stock > 0

          return (
            matchesSearch &&
            matchesStock
          )
        },
      )
    }, [
      products,
      search,
      stockFilter,
    ])

  /* =========================================================
     CART TOTAL
  ========================================================= */

  const cartCount =
    useMemo(
      () =>
        cart.reduce(
          (
            total,
            item,
          ) =>
            total +
            item.quantity,
          0,
        ),
      [cart],
    )

  const cartTotal =
    useMemo(
      () =>
        cart.reduce(
          (
            total,
            item,
          ) =>
            total +
            item.price *
              item.quantity,
          0,
        ),
      [cart],
    )

  const numericReceivedAmount =
    Number(
      receivedAmount,
    ) || 0

  const changeAmount =
    Math.max(
      0,
      numericReceivedAmount -
        cartTotal,
    )

  const isPaymentEnough =
    numericReceivedAmount >=
      cartTotal &&
    cartTotal > 0

  /* =========================================================
     ADD TO CART
  ========================================================= */

  const addToCart = (
    product: Product,
  ) => {
    setError('')
    setMessage('')

    if (
      product.stock <= 0
    ) {
      setError(
        `${product.name} sedang habis.`,
      )
      return
    }

    setCart(
      (currentCart) => {
        const existing =
          currentCart.find(
            (item) =>
              item.id ===
              product.id,
          )

        if (existing) {
          if (
            existing.quantity >=
            product.stock
          ) {
            setError(
              `Stok ${product.name} hanya ${product.stock}.`,
            )

            return currentCart
          }

          return currentCart.map(
            (item) =>
              item.id ===
              product.id
                ? {
                    ...item,
                    quantity:
                      item.quantity +
                      1,
                  }
                : item,
          )
        }

        return [
          ...currentCart,
          {
            ...product,
            quantity: 1,
          },
        ]
      },
    )
  }

  /* =========================================================
     UPDATE QUANTITY
  ========================================================= */

  const changeQuantity = (
    productId: number,
    amount: number,
  ) => {
    setError('')
    setMessage('')

    setCart(
      (currentCart) =>
        currentCart
          .map((item) => {
            if (
              item.id !==
              productId
            ) {
              return item
            }

            const nextQuantity =
              item.quantity +
              amount

            if (
              nextQuantity <=
              0
            ) {
              return null
            }

            if (
              nextQuantity >
              item.stock
            ) {
              setError(
                `Stok ${item.name} hanya ${item.stock}.`,
              )

              return item
            }

            return {
              ...item,
              quantity:
                nextQuantity,
            }
          })
          .filter(
            (
              item,
            ): item is CartItem =>
              item !== null,
          ),
    )
  }

  /* =========================================================
     REMOVE ITEM
  ========================================================= */

  const removeFromCart = (
    productId: number,
  ) => {
    setCart(
      (currentCart) =>
        currentCart.filter(
          (item) =>
            item.id !==
            productId,
        ),
    )
  }

  /* =========================================================
     CLEAR CART
  ========================================================= */

  const clearCart = () => {
    if (
      cart.length === 0
    ) {
      return
    }

    const confirmed =
      window.confirm(
        'Kosongkan semua barang di keranjang?',
      )

    if (!confirmed) {
      return
    }

    setCart([])
    setError('')
    setMessage('')
    setReceivedAmount('')
    setShowPayment(false)
  }

  /* =========================================================
     OPEN PAYMENT
  ========================================================= */

  const openPayment = () => {
    if (
      processing
    ) {
      return
    }

    if (
      cart.length === 0
    ) {
      setError(
        'Keranjang masih kosong.',
      )
      return
    }

    if (
      cartTotal <= 0
    ) {
      setError(
        'Total transaksi tidak valid.',
      )
      return
    }

    setError('')
    setMessage('')
    setReceivedAmount('')
    setShowCart(false)
    setShowPayment(true)
  }

  /* =========================================================
     QUICK PAYMENT
  ========================================================= */

  const setQuickPayment = (
    amount: number,
  ) => {
    setReceivedAmount(
      String(amount),
    )
  }

  /* =========================================================
     COMPLETE PAYMENT
  ========================================================= */

  const handlePayment = async () => {
    if (
      processing
    ) {
      return
    }

    if (
      cart.length === 0
    ) {
      setError(
        'Keranjang masih kosong.',
      )
      setShowPayment(false)
      return
    }

    if (
      numericReceivedAmount <
      cartTotal
    ) {
      setError(
        `Uang diterima kurang ${formatRupiah(
          cartTotal -
            numericReceivedAmount,
        )}.`,
      )
      return
    }

    setProcessing(true)
    setError('')
    setMessage('')

    try {
      /*
        completeSale menangani seluruh
        proses transaksi secara atomik:

        - validasi produk
        - validasi stok
        - kurangi stok
        - buat transaksi pemasukan
        - tambah saldo
        - simpan ke Firestore
      */
      await completeSale(
        cart.map(
          (item) => ({
            productId:
              item.id,
            quantity:
              item.quantity,
          }),
        ),
      )

      const paid =
        numericReceivedAmount

      const change =
        paid - cartTotal

      const total =
        cartTotal

      setCart([])
      setReceivedAmount('')
      setShowPayment(false)
      loadProducts()

      setMessage(
        `Pembayaran berhasil. Total ${formatRupiah(
          total,
        )}. Kembalian ${formatRupiah(
          change,
        )}.`,
      )
    } catch (saleError) {
      console.error(
        'Gagal menyelesaikan pembayaran:',
        saleError,
      )

      setError(
        saleError instanceof
          Error
          ? saleError.message
          : 'Pembayaran gagal diproses.',
      )
    } finally {
      setProcessing(false)
    }
  }

  /* =========================================================
     CART CONTENT
  ========================================================= */

  const cartContent = (
    <div className="flex flex-col gap-4">

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-500">
            Keranjang
          </p>

          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900">
            Pesanan
          </h2>
        </div>

        {cart.length > 0 && (
          <button
            type="button"
            onClick={
              clearCart
            }
            className="rounded-xl px-3 py-2 text-xs font-bold text-red-500 transition hover:bg-red-50"
          >
            Kosongkan
          </button>
        )}
      </div>

      {cart.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-7 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
            🛒
          </div>

          <h3 className="mt-4 text-sm font-black text-slate-800">
            Keranjang masih kosong
          </h3>

          <p className="mt-1 text-xs leading-5 text-slate-400">
            Pilih produk untuk
            memasukkannya ke
            transaksi.
          </p>
        </div>
      ) : (
        <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">

          {cart.map(
            (item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm"
              >
                <div className="flex gap-3">

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-xl">
                    {item.icon}
                  </div>

                  <div className="min-w-0 flex-1">

                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-800">
                          {item.name}
                        </p>

                        <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                          {formatRupiah(
                            item.price,
                          )}{' '}
                          / item
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          removeFromCart(
                            item.id,
                          )
                        }
                        className="shrink-0 text-lg leading-none text-slate-300 transition hover:text-red-500"
                        aria-label={`Hapus ${item.name}`}
                      >
                        ×
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between">

                      <div className="flex items-center gap-1 rounded-xl bg-slate-50 p-1">

                        <button
                          type="button"
                          onClick={() =>
                            changeQuantity(
                              item.id,
                              -1,
                            )
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-sm font-black text-slate-600 shadow-sm transition hover:bg-slate-100"
                          aria-label="Kurangi jumlah"
                        >
                          −
                        </button>

                        <span className="min-w-7 text-center text-xs font-black text-slate-800">
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            changeQuantity(
                              item.id,
                              1,
                            )
                          }
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-sm font-black text-white shadow-sm transition hover:bg-blue-700"
                          aria-label="Tambah jumlah"
                        >
                          +
                        </button>

                      </div>

                      <p className="text-sm font-black text-slate-900">
                        {formatRupiah(
                          item.price *
                            item.quantity,
                        )}
                      </p>

                    </div>
                  </div>
                </div>
              </div>
            ),
          )}

        </div>
      )}

      <div className="border-t border-slate-100 pt-4">

        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-slate-400">
            Total barang
          </span>

          <span className="font-black text-slate-700">
            {cartCount}
          </span>
        </div>

        <div className="mt-2 flex items-end justify-between gap-4">
          <span className="text-sm font-bold text-slate-500">
            Total pembayaran
          </span>

          <span className="text-2xl font-black tracking-tight text-slate-950">
            {formatRupiah(
              cartTotal,
            )}
          </span>
        </div>

        <button
          type="button"
          disabled={
            processing ||
            cart.length === 0
          }
          onClick={
            openPayment
          }
          className="mt-4 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {processing
            ? 'Memproses...'
            : '💳 Bayar Sekarang'}
        </button>

      </div>
    </div>
  )

  /* =========================================================
     PAYMENT MODAL
  ========================================================= */

  const paymentModal =
    showPayment && (
      <div className="fixed inset-0 z-[1500] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-5">

        <div className="w-full max-w-md overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:rounded-[2rem]">

          {/* HEADER */}

          <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 px-6 py-6 text-white">

            <div className="flex items-start justify-between gap-4">

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">
                  CATATTOKO • PEMBAYARAN
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  Pembayaran
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  Masukkan uang yang diterima
                  dari pelanggan.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowPayment(false)
                }
                disabled={
                  processing
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-lg text-white transition hover:bg-white/20 disabled:opacity-50"
                aria-label="Tutup pembayaran"
              >
                ×
              </button>

            </div>

          </div>

          {/* BODY */}

          <div className="p-6">

            {/* TOTAL */}

            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">

              <div className="flex items-center justify-between gap-4">

                <span className="text-sm font-bold text-slate-500">
                  Total belanja
                </span>

                <strong className="text-2xl font-black text-blue-700">
                  {formatRupiah(
                    cartTotal,
                  )}
                </strong>

              </div>

            </div>

            {/* RECEIVED */}

            <div className="mt-5">

              <label
                htmlFor="receivedAmount"
                className="mb-2 block text-sm font-black text-slate-800"
              >
                Uang diterima
              </label>

              <div className="relative">

                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">
                  Rp
                </span>

                <input
                  id="receivedAmount"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={
                    receivedAmount
                  }
                  onChange={(
                    event,
                  ) => {
                    const value =
                      event.target.value

                    if (
                      value === '' ||
                      /^\d+$/.test(
                        value,
                      )
                    ) {
                      setReceivedAmount(
                        value,
                      )
                    }

                    setError('')
                  }}
                  onKeyDown={(
                    event,
                  ) => {
                    if (
                      event.key ===
                        'Enter' &&
                      isPaymentEnough
                    ) {
                      void handlePayment()
                    }
                  }}
                  placeholder="0"
                  autoFocus
                  className="w-full rounded-2xl border-2 border-slate-200 bg-white py-4 pl-11 pr-4 text-2xl font-black text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />

              </div>

            </div>

            {/* QUICK MONEY */}

            <div className="mt-3 flex flex-wrap gap-2">

              <button
                type="button"
                onClick={() =>
                  setQuickPayment(
                    cartTotal,
                  )
                }
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
              >
                Uang pas
              </button>

              {[10000, 20000, 50000, 100000]
                .filter(
                  (amount) =>
                    amount >=
                    cartTotal,
                )
                .slice(0, 4)
                .map(
                  (amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() =>
                        setQuickPayment(
                          amount,
                        )
                      }
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                    >
                      {formatRupiah(
                        amount,
                      )}
                    </button>
                  ),
                )}

            </div>

            {/* CHANGE */}

            <div
              className={`mt-5 rounded-2xl border p-5 transition ${
                receivedAmount === ''
                  ? 'border-slate-200 bg-slate-50'
                  : isPaymentEnough
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-red-200 bg-red-50'
              }`}
            >

              <div className="flex items-center justify-between gap-4">

                <span
                  className={`text-sm font-bold ${
                    receivedAmount === ''
                      ? 'text-slate-500'
                      : isPaymentEnough
                        ? 'text-emerald-700'
                        : 'text-red-600'
                  }`}
                >
                  {receivedAmount === ''
                    ? 'Kembalian'
                    : isPaymentEnough
                      ? 'Kembalian'
                      : 'Uang masih kurang'}
                </span>

                <strong
                  className={`text-2xl font-black ${
                    receivedAmount === ''
                      ? 'text-slate-700'
                      : isPaymentEnough
                        ? 'text-emerald-700'
                        : 'text-red-600'
                  }`}
                >
                  {receivedAmount === ''
                    ? 'Rp0'
                    : isPaymentEnough
                      ? formatRupiah(
                          changeAmount,
                        )
                      : formatRupiah(
                          cartTotal -
                            numericReceivedAmount,
                        )}
                </strong>

              </div>

              {receivedAmount !== '' &&
                !isPaymentEnough && (
                  <p className="mt-2 text-xs font-semibold text-red-500">
                    Tambahkan{' '}
                    {formatRupiah(
                      cartTotal -
                        numericReceivedAmount,
                    )}{' '}
                    lagi.
                  </p>
                )}

              {receivedAmount !== '' &&
                isPaymentEnough && (
                  <p className="mt-2 text-xs font-semibold text-emerald-600">
                    Uang cukup. Kembalikan{' '}
                    {formatRupiah(
                      changeAmount,
                    )}{' '}
                    kepada pelanggan.
                  </p>
                )}

            </div>

            {/* ERROR */}

            {error && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-600">
                {error}
              </div>
            )}

            {/* ACTIONS */}

            <div className="mt-5 grid grid-cols-2 gap-3">

              <button
                type="button"
                onClick={() =>
                  setShowPayment(false)
                }
                disabled={
                  processing
                }
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={() =>
                  void handlePayment()
                }
                disabled={
                  processing ||
                  !isPaymentEnough
                }
                className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-4 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {processing
                  ? 'Memproses...'
                  : '✓ Bayar & Selesai'}
              </button>

            </div>

          </div>

        </div>
      </div>
    )

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <div className="min-h-full bg-slate-50 pb-8">

      {/* HEADER */}

      <header className="bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-5 pb-7 pt-8 text-white sm:px-7">

        <div className="mx-auto w-full max-w-6xl">

          <div className="flex items-start justify-between gap-4">

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">
                CATATTOKO • KASIR
              </p>

              <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                Penjualan
              </h1>

              <p className="mt-1 max-w-md text-xs leading-5 text-slate-400">
                Pilih barang, atur jumlah,
                lalu selesaikan transaksi.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowCart(true)
              }
              className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-xl backdrop-blur transition hover:bg-white/15"
              aria-label="Buka keranjang"
            >
              🛒

              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-black text-white">
                  {cartCount}
                </span>
              )}
            </button>

          </div>

          {/* SEARCH */}

          <div className="mt-6">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">

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
                placeholder="Cari nama produk..."
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

        </div>
      </header>

      {/* FEEDBACK */}

      <div className="mx-auto w-full max-w-6xl px-5 sm:px-7">

        {message && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            ✓ {message}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
            {error}
          </div>
        )}

        {/* FILTER */}

        <div className="mt-5 flex items-center justify-between gap-3">

          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">
              Produk
            </p>

            <p className="mt-1 text-sm font-black text-slate-800">
              {filteredProducts.length}{' '}
              produk
            </p>
          </div>

          <div className="flex rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-100">

            <button
              type="button"
              onClick={() =>
                setStockFilter(
                  'available',
                )
              }
              className={`rounded-lg px-3 py-2 text-[11px] font-black transition ${
                stockFilter ===
                'available'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              Tersedia
            </button>

            <button
              type="button"
              onClick={() =>
                setStockFilter(
                  'all',
                )
              }
              className={`rounded-lg px-3 py-2 text-[11px] font-black transition ${
                stockFilter ===
                'all'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              Semua
            </button>

          </div>
        </div>

        {/* MAIN GRID */}

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_380px]">

          {/* PRODUCTS */}

          <section>

            {filteredProducts.length ===
            0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">

                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-3xl">
                  📦
                </div>

                <h2 className="mt-4 text-base font-black text-slate-800">
                  Produk tidak ditemukan
                </h2>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Coba gunakan kata
                  pencarian lain atau
                  tambahkan produk
                  terlebih dahulu.
                </p>

              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">

                {filteredProducts.map(
                  (product) => {
                    const cartItem =
                      cart.find(
                        (item) =>
                          item.id ===
                          product.id,
                      )

                    const quantity =
                      cartItem?.quantity ||
                      0

                    const lowStock =
                      product.stock > 0 &&
                      product.stock <= 5

                    return (
                      <button
                        key={product.id}
                        type="button"
                        disabled={
                          product.stock <=
                          0
                        }
                        onClick={() =>
                          addToCart(
                            product,
                          )
                        }
                        className="group relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/5 disabled:cursor-not-allowed disabled:opacity-50"
                      >

                        {quantity >
                          0 && (
                          <span className="absolute right-3 top-3 flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-black text-white">
                            {quantity}
                          </span>
                        )}

                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-2xl transition group-hover:bg-blue-50">
                          {product.icon}
                        </div>

                        <p className="mt-4 line-clamp-2 min-h-10 text-sm font-black leading-5 text-slate-800">
                          {product.name}
                        </p>

                        <p className="mt-2 text-sm font-black text-blue-600">
                          {formatRupiah(
                            product.price,
                          )}
                        </p>

                        <div className="mt-3 flex items-center justify-between gap-2">

                          <span
                            className={`text-[10px] font-bold ${
                              product.stock <=
                              0
                                ? 'text-red-500'
                                : lowStock
                                  ? 'text-amber-500'
                                  : 'text-slate-400'
                            }`}
                          >
                            {product.stock <=
                            0
                              ? 'Habis'
                              : `Stok ${product.stock}`}
                          </span>

                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-sm font-black text-slate-600 transition group-hover:bg-blue-600 group-hover:text-white">
                            +
                          </span>

                        </div>

                      </button>
                    )
                  },
                )}

              </div>
            )}

          </section>

          {/* DESKTOP CART */}

          <aside className="hidden rounded-3xl border border-slate-100 bg-white p-5 shadow-sm lg:sticky lg:top-5 lg:block lg:self-start">
            {cartContent}
          </aside>

        </div>

      </div>

      {/* MOBILE CART DRAWER */}

      {showCart && (
        <div className="fixed inset-0 z-[1200] lg:hidden">

          <button
            type="button"
            aria-label="Tutup keranjang"
            onClick={() =>
              setShowCart(false)
            }
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
          />

          <div className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-[32px] bg-white p-5 pb-8 shadow-2xl">

            <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-slate-200" />

            {cartContent}

          </div>
        </div>
      )}

      {/* MOBILE QUICK CART */}

      {!showCart &&
        cart.length > 0 && (
          <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[800] px-4 lg:hidden">

            <div className="pointer-events-auto mx-auto max-w-md">

              <button
                type="button"
                onClick={() =>
                  setShowCart(true)
                }
                className="flex w-full items-center justify-between gap-4 rounded-2xl bg-slate-950 px-4 py-3.5 text-white shadow-2xl shadow-slate-950/20"
              >

                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg">
                    🛒
                  </div>

                  <div className="text-left">
                    <p className="text-[10px] font-bold text-slate-400">
                      {cartCount}{' '}
                      barang
                    </p>

                    <p className="text-sm font-black">
                      Lihat keranjang
                    </p>
                  </div>

                </div>

                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400">
                    Total
                  </p>

                  <p className="text-sm font-black">
                    {formatRupiah(
                      cartTotal,
                    )}
                  </p>
                </div>

              </button>

            </div>

          </div>
        )}

      {/* PAYMENT */}

      {paymentModal}

    </div>
  )
}

export default Penjualan