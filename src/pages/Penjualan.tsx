import {
  useEffect,
  useState
} from 'react'

import {
  addTransaction,
  DATA_CHANGED_EVENT,
  formatRupiah,
  getProducts,
  updateProductStock,
  type Product
} from '../data/storage'


type CartItem = Product & {
  quantity: number
}


function Penjualan() {

  const [products, setProducts] =
    useState<Product[]>([])

  const [cart, setCart] =
    useState<CartItem[]>([])


  // =========================
  // LOAD PRODUK
  // =========================

  const loadProducts = () => {

    setProducts(
      getProducts()
    )

  }


  // =========================
  // LOAD SAAT HALAMAN DIBUKA
  // =========================

  useEffect(() => {

    loadProducts()


    window.addEventListener(
      DATA_CHANGED_EVENT,
      loadProducts
    )


    return () => {

      window.removeEventListener(
        DATA_CHANGED_EVENT,
        loadProducts
      )

    }

  }, [])


  // =========================
  // TAMBAH KE KERANJANG
  // =========================

  const addToCart = (
    product: Product
  ) => {

    setCart((currentCart) => {

      const existingItem =
        currentCart.find(
          item =>
            item.id === product.id
        )


      const currentQuantity =
        existingItem?.quantity || 0


      // Jangan melebihi stok
      if (
        currentQuantity >=
        product.stock
      ) {

        alert(
          `Stok ${product.name} hanya tersisa ${product.stock}.`
        )

        return currentCart

      }


      // Kalau sudah ada di keranjang
      if (existingItem) {

        return currentCart.map(
          item =>
            item.id === product.id
              ? {
                  ...item,
                  quantity:
                    item.quantity + 1
                }
              : item
        )

      }


      // Produk baru
      return [

        ...currentCart,

        {
          ...product,
          quantity: 1
        }

      ]

    })

  }


  // =========================
  // KURANGI JUMLAH
  // =========================

  const decreaseQuantity = (
    productId: number
  ) => {

    setCart((currentCart) => {

      return currentCart

        .map((item) =>

          item.id === productId

            ? {
                ...item,
                quantity:
                  item.quantity - 1
              }

            : item

        )

        .filter(
          item =>
            item.quantity > 0
        )

    })

  }


  // =========================
  // TOTAL
  // =========================

  const total =
    cart.reduce(
      (
        sum,
        item
      ) =>
        sum +
        item.price *
        item.quantity,

      0
    )


  // =========================
  // TOTAL ITEM
  // =========================

  const totalItems =
    cart.reduce(
      (
        sum,
        item
      ) =>
        sum +
        item.quantity,

      0
    )


  // =========================
  // BAYAR
  // =========================

  const handlePayment = () => {

    if (
      cart.length === 0
    ) {

      alert(
        'Keranjang masih kosong.'
      )

      return

    }


    /*
     * Ambil stok terbaru
     * sebelum transaksi.
     */

    const latestProducts =
      getProducts()


    // =========================
    // CEK STOK
    // =========================

    for (
      const item of cart
    ) {

      const latestProduct =
        latestProducts.find(
          product =>
            product.id ===
            item.id
        )


      if (!latestProduct) {

        alert(
          `Produk ${item.name} tidak ditemukan.`
        )

        return

      }


      if (
        latestProduct.stock <
        item.quantity
      ) {

        alert(
          `Stok ${item.name} tidak cukup.\n\nStok tersedia: ${latestProduct.stock}\nJumlah dibeli: ${item.quantity}`
        )

        return

      }

    }


    // =========================
    // KURANGI STOK
    // =========================

    for (
      const item of cart
    ) {

      updateProductStock(
        item.id,
        -item.quantity
      )

    }


    // =========================
    // CATAT TRANSAKSI
    // =========================

    const productNames =
      cart
        .map(
          item =>
            `${item.name} x${item.quantity}`
        )
        .join(', ')


    addTransaction({

      title:
        `Penjualan - ${productNames}`,

      type:
        'income',

      amount:
        total

    })


    // =========================
    // SELESAI
    // =========================

    alert(
      `Pembayaran berhasil! 🎉\n\nTotal: ${formatRupiah(total)}\n\nStok produk sudah diperbarui.\nTransaksi sudah masuk ke Buku Kas.`
    )


    setCart([])

  }


  return (

    <main className="page pos-page">


      {/* =========================
          HEADER
      ========================= */}

      <header className="page-header">

        <div>

          <p className="small-text">
            CatatToko
          </p>

          <h1>
            Kasir & Penjualan
          </h1>

          <p className="page-description">
            Pilih produk untuk membuat transaksi penjualan.
          </p>

        </div>


        <div className="cart-counter">

          🛒 {totalItems}

        </div>

      </header>



      {/* =========================
          PRODUK
      ========================= */}

      <section className="pos-section">

        <div className="section-title">

          <h2>
            Produk
          </h2>

          <span>
            {products.length} produk
          </span>

        </div>


        <div className="product-grid">

          {products.length === 0 ? (

            <div className="empty-products">

              <div className="empty-product-icon">
                📦
              </div>

              <h3>
                Belum ada produk
              </h3>

              <p>
                Tambahkan produk terlebih dahulu.
              </p>

            </div>

          ) : (

            products.map(
              (product) => (

                <div
                  className="product-card"
                  key={product.id}
                >

                  <div className="product-icon">

                    {product.icon}

                  </div>


                  <h3>
                    {product.name}
                  </h3>


                  <p className="product-price">

                    {formatRupiah(
                      product.price
                    )}

                  </p>


                  <small
                    className={
                      product.stock <= 5
                        ? 'stock-warning'
                        : 'stock-safe'
                    }
                  >

                    Stok: {product.stock}

                  </small>


                  <button
                    type="button"
                    className="add-product-button"
                    disabled={
                      product.stock <= 0
                    }
                    onClick={() =>
                      addToCart(
                        product
                      )
                    }
                  >

                    {product.stock <= 0
                      ? 'Stok Habis'
                      : '+ Tambah'
                    }

                  </button>

                </div>

              )
            )

          )}

        </div>

      </section>



      {/* =========================
          KERANJANG
      ========================= */}

      <section className="cart-section">

        <div className="section-title">

          <h2>
            Keranjang
          </h2>

          <span>
            {totalItems} item
          </span>

        </div>


        {cart.length === 0 ? (

          <div className="empty-cart">

            <span>
              🛒
            </span>

            <h3>
              Keranjang masih kosong
            </h3>

            <p>
              Tambahkan produk untuk mulai transaksi.
            </p>

          </div>

        ) : (

          <div className="cart-list">

            {cart.map(
              (item) => (

                <div
                  className="cart-item"
                  key={item.id}
                >


                  {/* ICON */}

                  <div className="cart-product-icon">

                    {item.icon}

                  </div>



                  {/* INFO */}

                  <div className="cart-product-info">

                    <h3>
                      {item.name}
                    </h3>

                    <p>
                      {formatRupiah(
                        item.price
                      )}
                    </p>

                  </div>



                  {/* JUMLAH */}

                  <div className="quantity-control">

                    <button
                      type="button"
                      onClick={() =>
                        decreaseQuantity(
                          item.id
                        )
                      }
                    >
                      −
                    </button>


                    <strong>
                      {item.quantity}
                    </strong>


                    <button
                      type="button"
                      onClick={() =>
                        addToCart(
                          item
                        )
                      }
                    >
                      +
                    </button>

                  </div>



                  {/* SUBTOTAL */}

                  <strong className="cart-subtotal">

                    {formatRupiah(
                      item.price *
                      item.quantity
                    )}

                  </strong>

                </div>

              )
            )}

          </div>

        )}



        {/* =========================
            TOTAL
        ========================= */}

        <div className="cart-total">

          <span>
            Total Pembayaran
          </span>


          <strong>
            {formatRupiah(total)}
          </strong>

        </div>



        {/* =========================
            BAYAR
        ========================= */}

        <button
          type="button"
          className="payment-button"
          onClick={
            handlePayment
          }
          disabled={
            cart.length === 0
          }
        >

          Bayar Sekarang

        </button>

      </section>


    </main>

  )

}


export default Penjualan