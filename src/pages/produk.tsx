import { useEffect, useMemo, useState } from 'react'
import {
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

const emptyForm: FormData = {
  name: '',
  price: '',
  stock: '',
  icon: '📦',
}

function Produk({ onNavigate }: ProdukProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [error, setError] = useState('')
  const [showDeleteModal, setShowDeleteModal] =
    useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(
    null,
  )

  const loadProducts = () => {
    setProducts(getProducts())
  }

  useEffect(() => {
    loadProducts()

    const handleDataChanged = () => {
      loadProducts()
    }

    window.addEventListener(
      'catatTokoDataChanged',
      handleDataChanged,
    )

    return () => {
      window.removeEventListener(
        'catatTokoDataChanged',
        handleDataChanged,
      )
    }
  }, [])

  /*
   * FILTER PRODUK
   */
  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    if (!keyword) {
      return products
    }

    return products.filter((product) =>
      product.name.toLowerCase().includes(keyword),
    )
  }, [products, search])

  /*
   * STATISTIK
   */
  const totalProducts = products.length

  const totalStock = products.reduce(
    (total, product) => total + product.stock,
    0,
  )

  const lowStock = products.filter(
    (product) => product.stock <= 10,
  ).length

  const outOfStock = products.filter(
    (product) => product.stock <= 0,
  ).length

  /*
   * BUKA TAMBAH
   */
  const openAddModal = () => {
    setEditingId(null)
    setForm(emptyForm)
    setError('')
    setShowModal(true)
  }

  /*
   * BUKA EDIT
   */
  const openEditModal = (product: Product) => {
    setEditingId(product.id)

    setForm({
      name: product.name,
      price: String(product.price),
      stock: String(product.stock),
      icon: product.icon || '📦',
    })

    setError('')
    setShowModal(true)
  }

  /*
   * TUTUP MODAL
   */
  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setForm(emptyForm)
    setError('')
  }

  /*
   * HANDLE INPUT
   */
  const handleInput = (
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

  /*
   * SIMPAN PRODUK
   */
  const handleSubmit = () => {
    const name = form.name.trim()
    const price = Number(form.price)
    const stock = Number(form.stock)
    const icon = form.icon.trim() || '📦'

    if (!name) {
      setError('Nama produk wajib diisi.')
      return
    }

    if (!form.price || Number.isNaN(price) || price <= 0) {
      setError('Harga produk harus lebih dari 0.')
      return
    }

    if (
      form.stock === '' ||
      Number.isNaN(stock) ||
      stock < 0
    ) {
      setError('Stok tidak boleh kurang dari 0.')
      return
    }

    if (editingId !== null) {
      const updatedProducts = products.map((product) =>
        product.id === editingId
          ? {
              ...product,
              name,
              price,
              stock,
              icon,
            }
          : product,
      )

      saveProducts(updatedProducts)
    } else {
      const newProduct: Product = {
        id: Date.now(),
        name,
        price,
        stock,
        icon,
      }

      saveProducts([...products, newProduct])
    }

    closeModal()
    loadProducts()
  }

  /*
   * BUKA DELETE
   */
  const openDeleteModal = (id: number) => {
    setDeleteId(id)
    setShowDeleteModal(true)
  }

  /*
   * TUTUP DELETE
   */
  const closeDeleteModal = () => {
    setDeleteId(null)
    setShowDeleteModal(false)
  }

  /*
   * HAPUS PRODUK
   */
  const handleDelete = () => {
    if (deleteId === null) return

    const updatedProducts = products.filter(
      (product) => product.id !== deleteId,
    )

    saveProducts(updatedProducts)

    closeDeleteModal()
    loadProducts()
  }

  /*
   * UPDATE STOK
   */
  const updateStock = (
    product: Product,
    amount: number,
  ) => {
    const newStock = product.stock + amount

    if (newStock < 0) return

    const updatedProducts = products.map((item) =>
      item.id === product.id
        ? {
            ...item,
            stock: newStock,
          }
        : item,
    )

    saveProducts(updatedProducts)
    loadProducts()
  }

  /*
   * STATUS STOK
   */
  const getStockStatus = (stock: number) => {
    if (stock <= 0) {
      return {
        label: 'Habis',
        color: '#dc2626',
        background: '#fef2f2',
      }
    }

    if (stock <= 10) {
      return {
        label: 'Menipis',
        color: '#ea580c',
        background: '#fff7ed',
      }
    }

    return {
      label: 'Aman',
      color: '#059669',
      background: '#ecfdf5',
    }
  }

  return (
    <>
      <style>{`
        .produk-page {
          min-height: 100vh;
          padding: 30px;
          background:
            radial-gradient(
              circle at top right,
              rgba(37, 99, 235, 0.07),
              transparent 28%
            ),
            #f8fafc;
          color: #0f172a;
        }

        .produk-container {
          width: 100%;
          max-width: 1500px;
          margin: 0 auto;
        }

        .produk-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 25px;
        }

        .back-button {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #ffffff;
          color: #475569;
          cursor: pointer;
          font-size: 16px;
          transition: 0.2s ease;
        }

        .back-button:hover {
          transform: translateX(-2px);
          border-color: #bfdbfe;
          background: #eff6ff;
          color: #2563eb;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 13px;
          min-width: 0;
        }

        .page-title {
          margin: 0;
          font-size: 28px;
          font-weight: 900;
          letter-spacing: -0.035em;
        }

        .page-subtitle {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 12px;
        }

        .primary-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 42px;
          padding: 0 17px;
          border: none;
          border-radius: 12px;
          background: linear-gradient(
            135deg,
            #2563eb,
            #4f46e5
          );
          color: #ffffff;
          cursor: pointer;
          font-size: 11px;
          font-weight: 850;
          box-shadow:
            0 8px 20px rgba(37, 99, 235, 0.18);
          transition: 0.2s ease;
        }

        .primary-button:hover {
          transform: translateY(-1px);
          box-shadow:
            0 12px 25px rgba(37, 99, 235, 0.23);
        }

        .stats-grid {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 15px;
          margin-bottom: 20px;
        }

        .stat-card {
          padding: 18px;
          border: 1px solid #e2e8f0;
          border-radius: 17px;
          background: #ffffff;
          box-shadow:
            0 8px 24px rgba(15, 23, 42, 0.04);
        }

        .stat-label {
          margin: 0;
          color: #64748b;
          font-size: 10px;
          font-weight: 750;
        }

        .stat-value {
          margin: 8px 0 0;
          color: #0f172a;
          font-size: 22px;
          font-weight: 900;
          letter-spacing: -0.03em;
        }

        .stat-description {
          margin: 5px 0 0;
          color: #94a3b8;
          font-size: 9px;
        }

        .products-panel {
          overflow: hidden;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          background: #ffffff;
          box-shadow:
            0 8px 25px rgba(15, 23, 42, 0.045);
        }

        .toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 18px 20px;
          border-bottom: 1px solid #f1f5f9;
        }

        .toolbar-title {
          margin: 0;
          font-size: 14px;
          font-weight: 850;
        }

        .toolbar-count {
          margin: 4px 0 0;
          color: #94a3b8;
          font-size: 9px;
        }

        .search-input {
          width: 270px;
          height: 40px;
          padding: 0 13px;
          border: 1px solid #e2e8f0;
          outline: none;
          border-radius: 11px;
          background: #f8fafc;
          color: #0f172a;
          font-size: 11px;
          transition: 0.2s ease;
        }

        .search-input:focus {
          border-color: #93c5fd;
          background: #ffffff;
          box-shadow:
            0 0 0 4px rgba(37, 99, 235, 0.07);
        }

        .table-wrapper {
          width: 100%;
          overflow-x: auto;
        }

        .product-table {
          width: 100%;
          min-width: 750px;
          border-collapse: collapse;
        }

        .product-table th {
          padding: 12px 20px;
          border-bottom: 1px solid #f1f5f9;
          color: #94a3b8;
          font-size: 9px;
          font-weight: 800;
          text-align: left;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .product-table td {
          padding: 15px 20px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }

        .product-table tr:last-child td {
          border-bottom: none;
        }

        .product-table tbody tr {
          transition: 0.18s ease;
        }

        .product-table tbody tr:hover {
          background: #fafcff;
        }

        .product-info {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .product-icon {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: #eff6ff;
          font-size: 19px;
        }

        .product-name {
          margin: 0;
          color: #1e293b;
          font-size: 11px;
          font-weight: 850;
        }

        .product-id {
          margin: 3px 0 0;
          color: #94a3b8;
          font-size: 8px;
        }

        .price-text {
          color: #1e293b;
          font-size: 11px;
          font-weight: 800;
        }

        .stock-control {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .stock-button {
          width: 27px;
          height: 27px;
          display: grid;
          place-items: center;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #ffffff;
          color: #475569;
          cursor: pointer;
          font-size: 13px;
          font-weight: 800;
        }

        .stock-button:hover {
          border-color: #bfdbfe;
          background: #eff6ff;
          color: #2563eb;
        }

        .stock-number {
          min-width: 35px;
          color: #0f172a;
          font-size: 11px;
          font-weight: 900;
          text-align: center;
        }

        .stock-badge {
          display: inline-flex;
          align-items: center;
          padding: 5px 8px;
          border-radius: 99px;
          font-size: 8px;
          font-weight: 900;
        }

        .action-group {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .action-button {
          width: 31px;
          height: 31px;
          display: grid;
          place-items: center;
          border: 1px solid #e2e8f0;
          border-radius: 9px;
          background: #ffffff;
          cursor: pointer;
          font-size: 12px;
          transition: 0.18s ease;
        }

        .edit-button {
          color: #2563eb;
        }

        .edit-button:hover {
          border-color: #bfdbfe;
          background: #eff6ff;
        }

        .delete-button {
          color: #dc2626;
        }

        .delete-button:hover {
          border-color: #fecaca;
          background: #fef2f2;
        }

        .empty-state {
          padding: 60px 20px;
          text-align: center;
        }

        .empty-icon {
          width: 55px;
          height: 55px;
          display: grid;
          place-items: center;
          margin: 0 auto 12px;
          border-radius: 16px;
          background: #eff6ff;
          font-size: 24px;
        }

        .empty-title {
          margin: 0;
          color: #334155;
          font-size: 13px;
          font-weight: 850;
        }

        .empty-text {
          margin: 5px 0 0;
          color: #94a3b8;
          font-size: 10px;
        }

        /*
         * MODAL
         */

        .modal-overlay {
          position: fixed;
          z-index: 500;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(15, 23, 42, 0.52);
          backdrop-filter: blur(7px);
        }

        .modal-card {
          width: 100%;
          max-width: 470px;
          max-height: calc(100vh - 40px);
          overflow-y: auto;
          border: 1px solid rgba(255,255,255,0.7);
          border-radius: 21px;
          background: #ffffff;
          box-shadow:
            0 30px 80px rgba(15, 23, 42, 0.25);
          animation: modalIn 0.18s ease;
        }

        @keyframes modalIn {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.98);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 20px;
          border-bottom: 1px solid #f1f5f9;
        }

        .modal-title {
          margin: 0;
          font-size: 17px;
          font-weight: 900;
        }

        .modal-subtitle {
          margin: 4px 0 0;
          color: #94a3b8;
          font-size: 9px;
        }

        .close-button {
          width: 32px;
          height: 32px;
          display: grid;
          place-items: center;
          border: none;
          border-radius: 9px;
          background: #f8fafc;
          color: #64748b;
          cursor: pointer;
          font-size: 15px;
        }

        .close-button:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        .modal-body {
          padding: 20px;
        }

        .form-group {
          margin-bottom: 15px;
        }

        .form-label {
          display: block;
          margin-bottom: 6px;
          color: #334155;
          font-size: 10px;
          font-weight: 850;
        }

        .form-input {
          width: 100%;
          height: 42px;
          box-sizing: border-box;
          padding: 0 12px;
          border: 1px solid #e2e8f0;
          outline: none;
          border-radius: 11px;
          background: #f8fafc;
          color: #0f172a;
          font-size: 11px;
        }

        .form-input:focus {
          border-color: #93c5fd;
          background: #ffffff;
          box-shadow:
            0 0 0 4px rgba(37, 99, 235, 0.07);
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .emoji-row {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 7px;
        }

        .emoji-button {
          width: 35px;
          height: 35px;
          display: grid;
          place-items: center;
          border: 1px solid #e2e8f0;
          border-radius: 9px;
          background: #ffffff;
          cursor: pointer;
          font-size: 17px;
        }

        .emoji-button:hover,
        .emoji-button.selected {
          border-color: #93c5fd;
          background: #eff6ff;
        }

        .error-message {
          margin-bottom: 13px;
          padding: 10px 12px;
          border: 1px solid #fecaca;
          border-radius: 10px;
          background: #fef2f2;
          color: #dc2626;
          font-size: 10px;
          font-weight: 750;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          padding: 15px 20px 20px;
        }

        .secondary-button {
          min-height: 40px;
          padding: 0 15px;
          border: 1px solid #e2e8f0;
          border-radius: 11px;
          background: #ffffff;
          color: #64748b;
          cursor: pointer;
          font-size: 10px;
          font-weight: 800;
        }

        .secondary-button:hover {
          background: #f8fafc;
        }

        /*
         * DELETE MODAL
         */

        .delete-card {
          width: 100%;
          max-width: 380px;
          padding: 25px;
          border-radius: 20px;
          background: #ffffff;
          text-align: center;
          box-shadow:
            0 30px 80px rgba(15, 23, 42, 0.25);
          animation: modalIn 0.18s ease;
        }

        .delete-icon {
          width: 52px;
          height: 52px;
          display: grid;
          place-items: center;
          margin: 0 auto 13px;
          border-radius: 15px;
          background: #fef2f2;
          font-size: 22px;
        }

        .delete-title {
          margin: 0;
          font-size: 16px;
          font-weight: 900;
        }

        .delete-text {
          margin: 7px 0 20px;
          color: #64748b;
          font-size: 10px;
          line-height: 1.6;
        }

        .delete-actions {
          display: flex;
          gap: 8px;
        }

        .delete-confirm {
          flex: 1;
          min-height: 40px;
          border: none;
          border-radius: 11px;
          background: #dc2626;
          color: #ffffff;
          cursor: pointer;
          font-size: 10px;
          font-weight: 850;
        }

        .delete-confirm:hover {
          background: #b91c1c;
        }

        .delete-cancel {
          flex: 1;
          min-height: 40px;
          border: 1px solid #e2e8f0;
          border-radius: 11px;
          background: #ffffff;
          color: #64748b;
          cursor: pointer;
          font-size: 10px;
          font-weight: 800;
        }

        @media (max-width: 1000px) {
          .stats-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 700px) {
          .produk-page {
            padding: 20px 14px 90px;
          }

          .produk-header {
            align-items: flex-start;
          }

          .page-title {
            font-size: 23px;
          }

          .primary-button {
            min-height: 39px;
            padding: 0 12px;
          }

          .toolbar {
            align-items: stretch;
            flex-direction: column;
          }

          .search-input {
            width: 100%;
          }
        }

        @media (max-width: 480px) {
          .produk-page {
            padding-left: 10px;
            padding-right: 10px;
          }

          .stats-grid {
            gap: 9px;
          }

          .stat-card {
            padding: 13px;
          }

          .stat-value {
            font-size: 17px;
          }

          .stat-label {
            font-size: 8px;
          }

          .stat-description {
            font-size: 7px;
          }

          .header-left {
            gap: 8px;
          }

          .back-button {
            width: 36px;
            height: 36px;
          }

          .page-title {
            font-size: 20px;
          }

          .page-subtitle {
            font-size: 9px;
          }

          .primary-button {
            width: 42px;
            padding: 0;
            font-size: 0;
          }

          .primary-button::before {
            content: '+';
            font-size: 20px;
          }

          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <main className="produk-page">
        <div className="produk-container">

          {/* HEADER */}
          <header className="produk-header">
            <div className="header-left">
              <button
                className="back-button"
                onClick={() =>
                  onNavigate?.('dashboard')
                }
              >
                ←
              </button>

              <div>
                <h1 className="page-title">
                  Produk
                </h1>

                <p className="page-subtitle">
                  Kelola produk dan stok Toko Berkah Jaya.
                </p>
              </div>
            </div>

            <button
              className="primary-button"
              onClick={openAddModal}
            >
              + Tambah Produk
            </button>
          </header>

          {/* STATS */}
          <section className="stats-grid">

            <article className="stat-card">
              <p className="stat-label">
                TOTAL PRODUK
              </p>

              <p className="stat-value">
                {totalProducts}
              </p>

              <p className="stat-description">
                Produk terdaftar
              </p>
            </article>

            <article className="stat-card">
              <p className="stat-label">
                TOTAL STOK
              </p>

              <p className="stat-value">
                {totalStock}
              </p>

              <p className="stat-description">
                Semua barang
              </p>
            </article>

            <article className="stat-card">
              <p className="stat-label">
                STOK MENIPIS
              </p>

              <p
                className="stat-value"
                style={{
                  color:
                    lowStock > 0
                      ? '#ea580c'
                      : '#059669',
                }}
              >
                {lowStock}
              </p>

              <p className="stat-description">
                Stok ≤ 10
              </p>
            </article>

            <article className="stat-card">
              <p className="stat-label">
                STOK HABIS
              </p>

              <p
                className="stat-value"
                style={{
                  color:
                    outOfStock > 0
                      ? '#dc2626'
                      : '#059669',
                }}
              >
                {outOfStock}
              </p>

              <p className="stat-description">
                Perlu restock
              </p>
            </article>

          </section>

          {/* PRODUCT PANEL */}
          <section className="products-panel">

            <div className="toolbar">
              <div>
                <h2 className="toolbar-title">
                  Daftar Produk
                </h2>

                <p className="toolbar-count">
                  Menampilkan {filteredProducts.length}{' '}
                  dari {products.length} produk
                </p>
              </div>

              <input
                className="search-input"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="🔎 Cari nama produk..."
              />
            </div>

            {filteredProducts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  📦
                </div>

                <h3 className="empty-title">
                  {search
                    ? 'Produk tidak ditemukan'
                    : 'Belum ada produk'}
                </h3>

                <p className="empty-text">
                  {search
                    ? 'Coba gunakan kata kunci lain.'
                    : 'Klik Tambah Produk untuk membuat produk baru.'}
                </p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="product-table">
                  <thead>
                    <tr>
                      <th>Produk</th>
                      <th>Harga</th>
                      <th>Stok</th>
                      <th>Status</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredProducts.map(
                      (product) => {
                        const stockStatus =
                          getStockStatus(
                            product.stock,
                          )

                        return (
                          <tr key={product.id}>

                            <td>
                              <div className="product-info">
                                <div className="product-icon">
                                  {product.icon}
                                </div>

                                <div>
                                  <p className="product-name">
                                    {product.name}
                                  </p>

                                  <p className="product-id">
                                    ID #{product.id}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td>
                              <span className="price-text">
                                {formatRupiah(
                                  product.price,
                                )}
                              </span>
                            </td>

                            <td>
                              <div className="stock-control">

                                <button
                                  className="stock-button"
                                  onClick={() =>
                                    updateStock(
                                      product,
                                      -1,
                                    )
                                  }
                                >
                                  −
                                </button>

                                <span className="stock-number">
                                  {product.stock}
                                </span>

                                <button
                                  className="stock-button"
                                  onClick={() =>
                                    updateStock(
                                      product,
                                      1,
                                    )
                                  }
                                >
                                  +
                                </button>

                              </div>
                            </td>

                            <td>
                              <span
                                className="stock-badge"
                                style={{
                                  color:
                                    stockStatus.color,
                                  background:
                                    stockStatus.background,
                                }}
                              >
                                {stockStatus.label}
                              </span>
                            </td>

                            <td>
                              <div className="action-group">

                                <button
                                  className="action-button edit-button"
                                  onClick={() =>
                                    openEditModal(
                                      product,
                                    )
                                  }
                                  title="Edit produk"
                                >
                                  ✎
                                </button>

                                <button
                                  className="action-button delete-button"
                                  onClick={() =>
                                    openDeleteModal(
                                      product.id,
                                    )
                                  }
                                  title="Hapus produk"
                                >
                                  🗑
                                </button>

                              </div>
                            </td>

                          </tr>
                        )
                      },
                    )}
                  </tbody>
                </table>
              </div>
            )}

          </section>

        </div>
      </main>

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal()
            }
          }}
        >
          <div className="modal-card">

            <div className="modal-header">
              <div>
                <h2 className="modal-title">
                  {editingId !== null
                    ? 'Edit Produk'
                    : 'Tambah Produk'}
                </h2>

                <p className="modal-subtitle">
                  Isi informasi produk dengan lengkap.
                </p>
              </div>

              <button
                className="close-button"
                onClick={closeModal}
              >
                ×
              </button>
            </div>

            <div className="modal-body">

              {error && (
                <div className="error-message">
                  ⚠ {error}
                </div>
              )}

              {/* NAMA */}
              <div className="form-group">
                <label className="form-label">
                  Nama Produk
                </label>

                <input
                  className="form-input"
                  value={form.name}
                  onChange={(event) =>
                    handleInput(
                      'name',
                      event.target.value,
                    )
                  }
                  placeholder="Contoh: Beras 5 Kg"
                />
              </div>

              {/* HARGA + STOK */}
              <div className="form-row">

                <div className="form-group">
                  <label className="form-label">
                    Harga
                  </label>

                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(event) =>
                      handleInput(
                        'price',
                        event.target.value,
                      )
                    }
                    placeholder="75000"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Stok
                  </label>

                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={(event) =>
                      handleInput(
                        'stock',
                        event.target.value,
                      )
                    }
                    placeholder="10"
                  />
                </div>

              </div>

              {/* ICON */}
              <div className="form-group">
                <label className="form-label">
                  Icon Produk
                </label>

                <input
                  className="form-input"
                  value={form.icon}
                  maxLength={4}
                  onChange={(event) =>
                    handleInput(
                      'icon',
                      event.target.value,
                    )
                  }
                  placeholder="📦"
                />

                <div className="emoji-row">
                  {[
                    '📦',
                    '🍚',
                    '🫗',
                    '🧂',
                    '🍜',
                    '🥚',
                    '🍵',
                    '🥤',
                    '🍞',
                    '🧴',
                    '🧃',
                    '🛒',
                  ].map((emoji) => (
                    <button
                      key={emoji}
                      className={`emoji-button ${
                        form.icon === emoji
                          ? 'selected'
                          : ''
                      }`}
                      onClick={() =>
                        handleInput('icon', emoji)
                      }
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            <div className="modal-footer">
              <button
                className="secondary-button"
                onClick={closeModal}
              >
                Batal
              </button>

              <button
                className="primary-button"
                onClick={handleSubmit}
              >
                {editingId !== null
                  ? 'Simpan Perubahan'
                  : 'Tambah Produk'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {showDeleteModal && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDeleteModal()
            }
          }}
        >
          <div className="delete-card">

            <div className="delete-icon">
              🗑️
            </div>

            <h2 className="delete-title">
              Hapus Produk?
            </h2>

            <p className="delete-text">
              Produk yang dihapus tidak akan muncul lagi
              di daftar produk. Pastikan kamu benar-benar
              ingin menghapusnya.
            </p>

            <div className="delete-actions">

              <button
                className="delete-cancel"
                onClick={closeDeleteModal}
              >
                Batal
              </button>

              <button
                className="delete-confirm"
                onClick={handleDelete}
              >
                Ya, Hapus
              </button>

            </div>

          </div>
        </div>
      )}
    </>
  )
}

export default Produk