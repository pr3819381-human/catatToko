import { useState } from 'react'
import {
  addTransaction,
  formatRupiah
} from '../data/storage'

type TransactionType = 'income' | 'expense'

type CatatProps = {
  initialType?: TransactionType
}

function Catat({
  initialType = 'income'
}: CatatProps) {

  // ================================
  // STATE
  // ================================

  const [type, setType] =
    useState<TransactionType>(initialType)

  const [amount, setAmount] =
    useState('')

  const [description, setDescription] =
    useState('')


  // ================================
  // SIMPAN TRANSAKSI
  // ================================

  const handleSave = () => {

    const numericAmount =
      Number(amount)

    // Validasi nominal
    if (!numericAmount || numericAmount <= 0) {
      alert('Masukkan nominal transaksi.')
      return
    }

    // Validasi keterangan
    if (!description.trim()) {
      alert('Masukkan keterangan transaksi.')
      return
    }

    // Simpan ke localStorage
    addTransaction({
      title: description.trim(),
      type,
      amount: numericAmount
    })

    // Pesan berhasil
    alert(
      `${type === 'income'
        ? 'Pemasukan'
        : 'Pengeluaran'
      } berhasil dicatat!\n\n` +

      `Keterangan: ${description.trim()}\n` +

      `Nominal: ${formatRupiah(numericAmount)}`
    )

    // Reset form
    setAmount('')
    setDescription('')
  }


  // ================================
  // RENDER
  // ================================

  return (
    <main className="page record-page">

      {/* =================================
          HEADER
      ================================= */}

      <header className="page-header">

        <div>

          <p className="small-text">
            CatatToko
          </p>

          <h1>
            Catat Transaksi
          </h1>

        </div>

      </header>


      {/* =================================
          PILIH JENIS TRANSAKSI
      ================================= */}

      <section className="record-card">

        <h2>
          Jenis Transaksi
        </h2>


        <div className="record-type-buttons">

          {/* =============================
              PEMASUKAN
          ============================= */}

          <button
            type="button"
            className={`record-type-button ${
              type === 'income'
                ? 'active income'
                : ''
            }`}
            onClick={() =>
              setType('income')
            }
          >

            <span>
              💰
            </span>


            <div>

              <strong>
                Pemasukan
              </strong>

              <small>
                Uang masuk
              </small>

            </div>

          </button>


          {/* =============================
              PENGELUARAN
          ============================= */}

          <button
            type="button"
            className={`record-type-button ${
              type === 'expense'
                ? 'active expense'
                : ''
            }`}
            onClick={() =>
              setType('expense')
            }
          >

            <span>
              💸
            </span>


            <div>

              <strong>
                Pengeluaran
              </strong>

              <small>
                Uang keluar
              </small>

            </div>

          </button>

        </div>

      </section>


      {/* =================================
          DETAIL TRANSAKSI
      ================================= */}

      <section className="record-card">

        <h2>
          Detail Transaksi
        </h2>


        {/* =============================
            NOMINAL
        ============================= */}

        <div className="form-group">

          <label htmlFor="amount">
            Nominal
          </label>


          <div className="amount-input">

            <span>
              Rp
            </span>


            <input
              id="amount"
              type="number"
              min="0"
              placeholder="0"
              value={amount}
              onChange={(event) =>
                setAmount(event.target.value)
              }
            />

          </div>

        </div>


        {/* =============================
            KETERANGAN
        ============================= */}

        <div className="form-group">

          <label htmlFor="description">
            Keterangan
          </label>


          <input
            id="description"
            type="text"
            placeholder={
              type === 'income'
                ? 'Contoh: Penjualan barang'
                : 'Contoh: Beli stok barang'
            }
            value={description}
            onChange={(event) =>
              setDescription(event.target.value)
            }
          />

        </div>


        {/* =============================
            PREVIEW NOMINAL
        ============================= */}

        {amount && Number(amount) > 0 && (

          <div className="record-preview">

            <span>
              {type === 'income'
                ? 'Pemasukan'
                : 'Pengeluaran'
              }
            </span>

            <strong>
              {formatRupiah(
                Number(amount)
              )}
            </strong>

          </div>

        )}


        {/* =============================
            TOMBOL SIMPAN
        ============================= */}

        <button
          type="button"
          className={`save-record-button ${
            type === 'income'
              ? 'income-button'
              : 'expense-button'
          }`}
          onClick={handleSave}
        >

          {type === 'income'
            ? 'Simpan Pemasukan'
            : 'Simpan Pengeluaran'
          }

        </button>

      </section>

    </main>
  )
}

export default Catat