import { useEffect, useMemo, useState } from 'react'

import {
  DATA_CHANGED_EVENT,
  deleteTransaction,
  formatRupiah,
  getTransactions,
  updateTransaction,
  type Transaction,
  type TransactionType
} from '../data/storage'

type FilterType = 'all' | 'income' | 'expense'

function Transaksi() {
  const [transactions, setTransactions] =
    useState<Transaction[]>([])

  const [search, setSearch] = useState('')

  const [filterType, setFilterType] =
    useState<FilterType>('all')

  const [showEdit, setShowEdit] =
    useState(false)

  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null)

  const [editTitle, setEditTitle] =
    useState('')

  const [editAmount, setEditAmount] =
    useState('')

  const [editType, setEditType] =
    useState<TransactionType>('income')


  // =========================
  // LOAD TRANSACTIONS
  // =========================

  const loadTransactions = () => {
    setTransactions(getTransactions())
  }


  // =========================
  // INITIAL LOAD + LIVE UPDATE
  // =========================

  useEffect(() => {
    loadTransactions()

    const handleDataChanged = () => {
      loadTransactions()
    }

    window.addEventListener(
      DATA_CHANGED_EVENT,
      handleDataChanged
    )

    return () => {
      window.removeEventListener(
        DATA_CHANGED_EVENT,
        handleDataChanged
      )
    }
  }, [])


  // =========================
  // FILTER TRANSACTIONS
  // =========================

  const filteredTransactions = useMemo(() => {
    const keyword =
      search.toLowerCase().trim()

    return [...transactions]
      .filter(transaction => {
        if (filterType === 'all') {
          return true
        }

        return transaction.type === filterType
      })
      .filter(transaction => {
        if (!keyword) {
          return true
        }

        return transaction.title
          .toLowerCase()
          .includes(keyword)
      })
      .sort((a, b) => b.id - a.id)
  }, [
    transactions,
    search,
    filterType
  ])


  // =========================
  // TOTAL PEMASUKAN
  // =========================

  const totalIncome =
    filteredTransactions
      .filter(
        transaction =>
          transaction.type === 'income'
      )
      .reduce(
        (total, transaction) =>
          total + transaction.amount,
        0
      )


  // =========================
  // TOTAL PENGELUARAN
  // =========================

  const totalExpense =
    filteredTransactions
      .filter(
        transaction =>
          transaction.type === 'expense'
      )
      .reduce(
        (total, transaction) =>
          total + transaction.amount,
        0
      )


  // =========================
  // BUKA EDIT
  // =========================

  const openEdit = (
    transaction: Transaction
  ) => {
    setEditingTransaction(transaction)

    setEditTitle(transaction.title)

    setEditAmount(
      String(transaction.amount)
    )

    setEditType(
      transaction.type
    )

    setShowEdit(true)
  }


  // =========================
  // TUTUP EDIT
  // =========================

  const closeEdit = () => {
    setShowEdit(false)

    setEditingTransaction(null)

    setEditTitle('')

    setEditAmount('')

    setEditType('income')
  }


  // =========================
  // SIMPAN EDIT
  // =========================

  const handleEdit = () => {
    if (!editingTransaction) {
      return
    }

    const title =
      editTitle.trim()

    const amount =
      Number(
        editAmount.replace(/\D/g, '')
      )


    if (!title) {
      alert(
        'Nama transaksi wajib diisi.'
      )

      return
    }


    if (!amount || amount <= 0) {
      alert(
        'Nominal transaksi tidak valid.'
      )

      return
    }


    const updatedTransaction: Transaction = {
      ...editingTransaction,

      title,

      amount,

      type: editType
    }


    updateTransaction(
      updatedTransaction
    )


    closeEdit()

    loadTransactions()


    alert(
      'Transaksi berhasil diperbarui.'
    )
  }


  // =========================
  // HAPUS TRANSAKSI
  // =========================

  const handleDelete = (
    transaction: Transaction
  ) => {
    const confirmed =
      window.confirm(
        `Hapus transaksi "${transaction.title}"?`
      )


    if (!confirmed) {
      return
    }


    deleteTransaction(
      transaction.id
    )


    loadTransactions()


    alert(
      'Transaksi berhasil dihapus.'
    )
  }


  // =========================
  // RENDER
  // =========================

  return (
    <main className="transactions-page">

      {/* =========================
          HEADER
      ========================== */}

      <header className="page-header">

        <div>

          <p className="small-text">
            CatatToko
          </p>

          <h1>
            Transaksi
          </h1>

          <p className="page-description">
            Kelola seluruh pemasukan dan
            pengeluaran toko.
          </p>

        </div>

      </header>


      {/* =========================
          RINGKASAN
      ========================== */}

      <section className="transaction-summary">

        {/* PEMASUKAN */}

        <div className="transaction-summary-card">

          <span className="summary-icon">
            💰
          </span>

          <div>

            <p>
              Pemasukan
            </p>

            <strong>
              {formatRupiah(
                totalIncome
              )}
            </strong>

          </div>

        </div>


        {/* PENGELUARAN */}

        <div className="transaction-summary-card">

          <span className="summary-icon">
            💸
          </span>

          <div>

            <p>
              Pengeluaran
            </p>

            <strong>
              {formatRupiah(
                totalExpense
              )}
            </strong>

          </div>

        </div>


        {/* JUMLAH */}

        <div className="transaction-summary-card">

          <span className="summary-icon">
            🧾
          </span>

          <div>

            <p>
              Jumlah Transaksi
            </p>

            <strong>
              {
                filteredTransactions.length
              }
            </strong>

          </div>

        </div>

      </section>


      {/* =========================
          SEARCH + FILTER
      ========================== */}

      <section className="transaction-tools">

        {/* SEARCH */}

        <div className="transaction-search">

          <span>
            🔎
          </span>

          <input
            type="text"
            placeholder="Cari transaksi..."
            value={search}
            onChange={event =>
              setSearch(
                event.target.value
              )
            }
          />

          {search && (

            <button
              type="button"
              onClick={() =>
                setSearch('')
              }
              aria-label="Hapus pencarian"
            >
              ✕
            </button>

          )}

        </div>


        {/* FILTER */}

        <div className="transaction-filters">

          <button
            type="button"
            className={
              filterType === 'all'
                ? 'active'
                : ''
            }
            onClick={() =>
              setFilterType('all')
            }
          >
            Semua
          </button>


          <button
            type="button"
            className={
              filterType === 'income'
                ? 'active'
                : ''
            }
            onClick={() =>
              setFilterType('income')
            }
          >
            Pemasukan
          </button>


          <button
            type="button"
            className={
              filterType === 'expense'
                ? 'active'
                : ''
            }
            onClick={() =>
              setFilterType('expense')
            }
          >
            Pengeluaran
          </button>

        </div>

      </section>


      {/* =========================
          DAFTAR TRANSAKSI
      ========================== */}

      <section className="transactions-section">

        <div className="section-title">

          <div>

            <h2>
              Daftar Transaksi
            </h2>

            <p className="small-text">
              {
                filteredTransactions.length
              }
              {' '}
              transaksi ditemukan
            </p>

          </div>

        </div>


        {/* EMPTY */}

        {filteredTransactions.length === 0 ? (

          <div className="empty-transactions">

            <div className="empty-transactions-icon">
              🧾
            </div>

            <h3>
              Belum ada transaksi
            </h3>

            <p>
              Transaksi yang kamu catat
              akan muncul di sini.
            </p>

          </div>

        ) : (

          <div className="transaction-list">

            {filteredTransactions.map(
              transaction => (

                <article
                  className="transaction-card"
                  key={transaction.id}
                >

                  {/* ICON */}

                  <div
                    className={
                      transaction.type ===
                      'income'
                        ? 'transaction-main-icon income'
                        : 'transaction-main-icon expense'
                    }
                  >
                    {
                      transaction.type ===
                      'income'
                        ? '💰'
                        : '💸'
                    }
                  </div>


                  {/* INFO */}

                  <div className="transaction-card-info">

                    <strong>
                      {
                        transaction.title
                      }
                    </strong>

                    <small>
                      {
                        transaction.date
                      }

                      {' • '}

                      {
                        transaction.time
                      }
                    </small>

                    <span>
                      {
                        transaction.type ===
                        'income'
                          ? 'Pemasukan'
                          : 'Pengeluaran'
                      }
                    </span>

                  </div>


                  {/* NOMINAL + ACTION */}

                  <div className="transaction-card-right">

                    <strong
                      className={
                        transaction.type ===
                        'income'
                          ? 'transaction-income'
                          : 'transaction-expense'
                      }
                    >
                      {
                        transaction.type ===
                        'income'
                          ? '+'
                          : '-'
                      }

                      {
                        formatRupiah(
                          transaction.amount
                        )
                      }
                    </strong>


                    <div className="transaction-actions">

                      {/* EDIT */}

                      <button
                        type="button"
                        onClick={() =>
                          openEdit(
                            transaction
                          )
                        }
                        aria-label="Edit transaksi"
                      >
                        ✏️
                      </button>


                      {/* DELETE */}

                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(
                            transaction
                          )
                        }
                        aria-label="Hapus transaksi"
                      >
                        🗑️
                      </button>

                    </div>

                  </div>

                </article>

              )
            )}

          </div>

        )}

      </section>


      {/* =========================
          MODAL EDIT
      ========================== */}

      {showEdit &&
        editingTransaction && (

          <div
            className="transaction-modal-overlay"
            onClick={closeEdit}
          >

            <div
              className="transaction-modal"
              onClick={event =>
                event.stopPropagation()
              }
            >

              {/* HEADER MODAL */}

              <div className="transaction-modal-header">

                <div>

                  <p className="small-text">
                    Kelola transaksi
                  </p>

                  <h2>
                    Edit Transaksi
                  </h2>

                </div>


                <button
                  type="button"
                  onClick={closeEdit}
                  aria-label="Tutup"
                >
                  ✕
                </button>

              </div>


              {/* JENIS TRANSAKSI */}

              <div className="form-group">

                <label>
                  Jenis Transaksi
                </label>


                <div className="transaction-type-selector">

                  <button
                    type="button"
                    className={
                      editType === 'income'
                        ? 'active income'
                        : ''
                    }
                    onClick={() =>
                      setEditType(
                        'income'
                      )
                    }
                  >
                    💰 Pemasukan
                  </button>


                  <button
                    type="button"
                    className={
                      editType === 'expense'
                        ? 'active expense'
                        : ''
                    }
                    onClick={() =>
                      setEditType(
                        'expense'
                      )
                    }
                  >
                    💸 Pengeluaran
                  </button>

                </div>

              </div>


              {/* NAMA TRANSAKSI */}

              <div className="form-group">

                <label>
                  Nama Transaksi
                </label>

                <input
                  type="text"
                  value={editTitle}
                  onChange={event =>
                    setEditTitle(
                      event.target.value
                    )
                  }
                  placeholder="Contoh: Pembelian stok"
                />

              </div>


              {/* NOMINAL */}

              <div className="form-group">

                <label>
                  Nominal
                </label>

                <input
                  type="number"
                  value={editAmount}
                  onChange={event =>
                    setEditAmount(
                      event.target.value
                    )
                  }
                  placeholder="Masukkan nominal"
                  min="1"
                />

              </div>


              {/* BUTTON */}

              <div className="transaction-modal-actions">

                <button
                  type="button"
                  className="cancel-button"
                  onClick={closeEdit}
                >
                  Batal
                </button>


                <button
                  type="button"
                  className="save-button"
                  onClick={handleEdit}
                >
                  Simpan Perubahan
                </button>

              </div>

            </div>

          </div>

        )}

    </main>
  )
}

export default Transaksi