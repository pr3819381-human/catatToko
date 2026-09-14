import { useEffect, useMemo, useRef, useState } from 'react'
import data from '../data/data.json'
import {
  formatRupiah,
  getBalance,
  getProducts,
  getTransactions,
  isInPeriod,
  type Period,
  type Product,
  type Transaction,
} from '../data/storage'

type LaporanProps = {
  onNavigate?: (page: string) => void
}

type ReportPeriod = Period | 'all'

type BackupData = {
  app: string
  version: string
  exportedAt: string
  store: typeof data.store
  balance: number
  transactions: Transaction[]
  products: Product[]
}

function Laporan({ onNavigate }: LaporanProps) {
  const [period, setPeriod] =
    useState<ReportPeriod>('month')

  const [transactions, setTransactions] = useState<
    Transaction[]
  >(getTransactions())

  const [products, setProducts] = useState<Product[]>(
    getProducts(),
  )

  const [balance, setBalance] = useState(getBalance())

  const [showBackup, setShowBackup] = useState(false)

  const [restoreMessage, setRestoreMessage] =
    useState('')

  const [restoreError, setRestoreError] =
    useState('')

  const fileInputRef =
    useRef<HTMLInputElement | null>(null)

  /*
   * LOAD DATA
   */
  const loadData = () => {
    setTransactions(getTransactions())
    setProducts(getProducts())
    setBalance(getBalance())
  }

  useEffect(() => {
    loadData()

    const handleDataChanged = () => {
      loadData()
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
   * FILTER TRANSACTIONS
   */
  const filteredTransactions = useMemo(() => {
    if (period === 'all') {
      return transactions
    }

    return transactions.filter((transaction) =>
      isInPeriod(transaction.date, period),
    )
  }, [transactions, period])

  /*
   * TOTAL INCOME
   */
  const totalIncome = useMemo(() => {
    return filteredTransactions
      .filter(
        (transaction) =>
          transaction.type === 'income',
      )
      .reduce(
        (total, transaction) =>
          total + transaction.amount,
        0,
      )
  }, [filteredTransactions])

  /*
   * TOTAL EXPENSE
   */
  const totalExpense = useMemo(() => {
    return filteredTransactions
      .filter(
        (transaction) =>
          transaction.type === 'expense',
      )
      .reduce(
        (total, transaction) =>
          total + transaction.amount,
        0,
      )
  }, [filteredTransactions])

  /*
   * TOTAL SAVING
   */
  const totalSaving = useMemo(() => {
    return filteredTransactions
      .filter(
        (transaction) =>
          transaction.type === 'saving',
      )
      .reduce(
        (total, transaction) =>
          total + transaction.amount,
        0,
      )
  }, [filteredTransactions])

  const netProfit = totalIncome - totalExpense

  /*
   * EXPENSE CATEGORIES
   */
  const expenseCategories = useMemo(() => {
    const categories: Record<
      string,
      number
    > = {}

    filteredTransactions
      .filter(
        (transaction) =>
          transaction.type === 'expense',
      )
      .forEach((transaction) => {
        let category = 'Lainnya'

        const title =
          transaction.title.toLowerCase()

        if (
          title.includes('pln') ||
          title.includes('listrik')
        ) {
          category = 'Utilitas'
        } else if (
          title.includes('stok') ||
          title.includes('barang') ||
          title.includes('belanja')
        ) {
          category = 'Stok Barang'
        } else if (
          title.includes('transport') ||
          title.includes('bensin') ||
          title.includes('ojek')
        ) {
          category = 'Transportasi'
        } else if (
          title.includes('gaji') ||
          title.includes('karyawan')
        ) {
          category = 'Karyawan'
        }

        categories[category] =
          (categories[category] || 0) +
          transaction.amount
      })

    return Object.entries(categories)
      .map(([name, amount]) => ({
        name,
        amount,
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [filteredTransactions])

  /*
   * CHART DATA
   */
  const chartData = useMemo(() => {
    return [...filteredTransactions]
      .sort((a, b) => {
        const dateA = a.createdAt
          ? new Date(a.createdAt).getTime()
          : 0

        const dateB = b.createdAt
          ? new Date(b.createdAt).getTime()
          : 0

        return dateA - dateB
      })
      .slice(-7)
  }, [filteredTransactions])

  const chartMax = Math.max(
    ...chartData.map((item) => item.amount),
    1,
  )

  /*
   * BACKUP
   */
  const createBackup = (): BackupData => {
    return {
      app: 'CatatToko',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      store: data.store,
      balance,
      transactions,
      products,
    }
  }

  const downloadBackup = () => {
    const backup = createBackup()

    const json = JSON.stringify(
      backup,
      null,
      2,
    )

    const blob = new Blob([json], {
      type: 'application/json',
    })

    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')

    const date = new Date()
      .toISOString()
      .slice(0, 10)

    link.href = url
    link.download = `catattoko-backup-${date}.json`

    document.body.appendChild(link)

    link.click()

    document.body.removeChild(link)

    URL.revokeObjectURL(url)

    setRestoreMessage(
      'Backup berhasil dibuat dan disimpan ke perangkat.',
    )

    setRestoreError('')
  }

  /*
   * BUKA FILE RESTORE
   */
  const openRestorePicker = () => {
    setRestoreMessage('')
    setRestoreError('')

    fileInputRef.current?.click()
  }

  /*
   * VALIDASI BACKUP
   */
  const validateBackup = (
    backup: unknown,
  ): backup is BackupData => {
    if (
      !backup ||
      typeof backup !== 'object'
    ) {
      return false
    }

    const item =
      backup as Partial<BackupData>

    if (
      item.app !== 'CatatToko'
    ) {
      return false
    }

    if (
      typeof item.balance !== 'number'
    ) {
      return false
    }

    if (
      !Array.isArray(item.transactions)
    ) {
      return false
    }

    if (
      !Array.isArray(item.products)
    ) {
      return false
    }

    return true
  }

  /*
   * RESTORE FILE
   */
  const handleRestoreFile = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file =
      event.target.files?.[0]

    if (!file) return

    setRestoreMessage('')
    setRestoreError('')

    try {
      const text =
        await file.text()

      const backup: unknown =
        JSON.parse(text)

      if (!validateBackup(backup)) {
        throw new Error(
          'Format backup tidak valid.',
        )
      }

      const confirmed =
        window.confirm(
          `Restore data dari backup?\n\n` +
            `Transaksi: ${backup.transactions.length}\n` +
            `Produk: ${backup.products.length}\n` +
            `Saldo: ${formatRupiah(backup.balance)}\n\n` +
            `Data saat ini akan diganti dengan data backup.`,
        )

      if (!confirmed) {
        event.target.value = ''
        return
      }

      localStorage.setItem(
        'catatTokoBalance',
        String(backup.balance),
      )

      localStorage.setItem(
        'catatTokoTransactions',
        JSON.stringify(
          backup.transactions,
        ),
      )

      localStorage.setItem(
        'catatTokoProducts',
        JSON.stringify(
          backup.products,
        ),
      )

      window.dispatchEvent(
        new Event('catatTokoDataChanged'),
      )

      loadData()

      setRestoreMessage(
        'Restore berhasil. Semua data sudah dipulihkan.',
      )
    } catch (error) {
      console.error(error)

      setRestoreError(
        'File backup tidak bisa dipulihkan. Pastikan file berasal dari CatatToko.',
      )
    }

    event.target.value = ''
  }

  /*
   * RESET MESSAGE
   */
  const closeBackupMessage = () => {
    setRestoreMessage('')
    setRestoreError('')
  }

  /*
   * LABEL PERIOD
   */
  const periodLabel = {
    today: 'Hari Ini',
    week: 'Minggu Ini',
    month: 'Bulan Ini',
    all: 'Semua Data',
  }[period]

  return (
    <>
      <style>{`
        .laporan-page {
          min-height: 100vh;
          padding: 30px;
          background:
            radial-gradient(
              circle at top right,
              rgba(37, 99, 235, 0.07),
              transparent 30%
            ),
            #f8fafc;
          color: #0f172a;
        }

        .laporan-container {
          width: 100%;
          max-width: 1500px;
          margin: 0 auto;
        }

        .laporan-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 22px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
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

        .page-title {
          margin: 0;
          font-size: 28px;
          font-weight: 900;
          letter-spacing: -0.035em;
        }

        .page-subtitle {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 11px;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .backup-button {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          min-height: 40px;
          padding: 0 13px;
          border: 1px solid #dbeafe;
          border-radius: 11px;
          background: #eff6ff;
          color: #2563eb;
          cursor: pointer;
          font-size: 10px;
          font-weight: 850;
        }

        .backup-button:hover {
          background: #dbeafe;
        }

        .primary-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 40px;
          padding: 0 14px;
          border: none;
          border-radius: 11px;
          background: linear-gradient(
            135deg,
            #2563eb,
            #4f46e5
          );
          color: #ffffff;
          cursor: pointer;
          font-size: 10px;
          font-weight: 850;
          box-shadow:
            0 7px 17px rgba(37, 99, 235, 0.18);
        }

        .primary-button:hover {
          transform: translateY(-1px);
        }

        .period-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 18px;
          padding: 5px;
          border: 1px solid #e2e8f0;
          border-radius: 13px;
          background: #ffffff;
        }

        .period-buttons {
          display: flex;
          gap: 4px;
        }

        .period-button {
          min-height: 34px;
          padding: 0 12px;
          border: none;
          border-radius: 9px;
          background: transparent;
          color: #64748b;
          cursor: pointer;
          font-size: 10px;
          font-weight: 800;
        }

        .period-button:hover {
          background: #eff6ff;
          color: #2563eb;
        }

        .period-button.active {
          background: #2563eb;
          color: #ffffff;
        }

        .period-info {
          padding-right: 10px;
          color: #94a3b8;
          font-size: 9px;
          font-weight: 700;
        }

        .summary-grid {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 15px;
          margin-bottom: 18px;
        }

        .summary-card {
          padding: 18px;
          border: 1px solid #e2e8f0;
          border-radius: 17px;
          background: #ffffff;
          box-shadow:
            0 8px 24px rgba(15, 23, 42, 0.04);
        }

        .summary-label {
          margin: 0;
          color: #64748b;
          font-size: 9px;
          font-weight: 800;
        }

        .summary-value {
          margin: 9px 0 0;
          color: #0f172a;
          font-size: 19px;
          font-weight: 900;
          letter-spacing: -0.025em;
        }

        .summary-note {
          margin: 5px 0 0;
          color: #94a3b8;
          font-size: 8px;
        }

        .main-grid {
          display: grid;
          grid-template-columns:
            minmax(0, 1.3fr)
            minmax(300px, 0.7fr);
          gap: 18px;
          margin-bottom: 18px;
        }

        .panel {
          overflow: hidden;
          border: 1px solid #e2e8f0;
          border-radius: 19px;
          background: #ffffff;
          box-shadow:
            0 8px 25px rgba(15, 23, 42, 0.045);
        }

        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 18px 20px 12px;
        }

        .panel-title {
          margin: 0;
          font-size: 14px;
          font-weight: 900;
        }

        .panel-subtitle {
          margin: 4px 0 0;
          color: #94a3b8;
          font-size: 9px;
        }

        .chart {
          display: flex;
          align-items: flex-end;
          gap: 12px;
          height: 250px;
          padding: 25px 20px 20px;
        }

        .bar-column {
          min-width: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          height: 100%;
          gap: 7px;
        }

        .bar-value {
          color: #64748b;
          font-size: 7px;
          font-weight: 800;
          white-space: nowrap;
        }

        .bar-track {
          width: 100%;
          max-width: 45px;
          height: 170px;
          display: flex;
          align-items: flex-end;
          border-radius: 9px 9px 4px 4px;
          background: #f1f5f9;
          overflow: hidden;
        }

        .bar {
          width: 100%;
          min-height: 5px;
          border-radius: 9px 9px 4px 4px;
          background: linear-gradient(
            180deg,
            #3b82f6,
            #2563eb
          );
          transition: height 0.4s ease;
        }

        .bar-label {
          max-width: 48px;
          overflow: hidden;
          color: #94a3b8;
          font-size: 7px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .category-list {
          padding: 3px 20px 17px;
        }

        .category-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 0;
          border-bottom: 1px solid #f1f5f9;
        }

        .category-row:last-child {
          border-bottom: none;
        }

        .category-dot {
          width: 8px;
          height: 8px;
          flex: 0 0 8px;
          border-radius: 50%;
          background: #2563eb;
        }

        .category-info {
          min-width: 0;
          flex: 1;
        }

        .category-name {
          margin: 0;
          color: #334155;
          font-size: 10px;
          font-weight: 800;
        }

        .category-percent {
          margin: 3px 0 0;
          color: #94a3b8;
          font-size: 8px;
        }

        .category-amount {
          color: #1e293b;
          font-size: 10px;
          font-weight: 850;
        }

        .transaction-panel {
          margin-bottom: 18px;
        }

        .transaction-table-wrapper {
          width: 100%;
          overflow-x: auto;
        }

        .transaction-table {
          width: 100%;
          min-width: 700px;
          border-collapse: collapse;
        }

        .transaction-table th {
          padding: 11px 20px;
          border-top: 1px solid #f1f5f9;
          border-bottom: 1px solid #f1f5f9;
          color: #94a3b8;
          font-size: 8px;
          font-weight: 850;
          text-align: left;
          text-transform: uppercase;
        }

        .transaction-table td {
          padding: 12px 20px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 9px;
        }

        .transaction-table tr:last-child td {
          border-bottom: none;
        }

        .type-badge {
          display: inline-flex;
          padding: 5px 8px;
          border-radius: 99px;
          font-size: 7px;
          font-weight: 900;
        }

        .backup-panel {
          margin-bottom: 18px;
        }

        .backup-content {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr)
            minmax(280px, 0.8fr);
          gap: 18px;
          padding: 3px 20px 20px;
        }

        .backup-card {
          padding: 18px;
          border: 1px solid #e2e8f0;
          border-radius: 15px;
          background: #f8fafc;
        }

        .backup-card-icon {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          margin-bottom: 10px;
          border-radius: 11px;
          background: #eff6ff;
          font-size: 17px;
        }

        .backup-card-title {
          margin: 0;
          color: #1e293b;
          font-size: 12px;
          font-weight: 900;
        }

        .backup-card-text {
          margin: 6px 0 14px;
          color: #64748b;
          font-size: 9px;
          line-height: 1.6;
        }

        .backup-stats {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 14px;
        }

        .backup-stat {
          padding: 5px 8px;
          border-radius: 8px;
          background: #ffffff;
          color: #475569;
          font-size: 8px;
          font-weight: 800;
        }

        .message {
          margin: 0 20px 18px;
          padding: 11px 13px;
          border: 1px solid #bbf7d0;
          border-radius: 11px;
          background: #f0fdf4;
          color: #15803d;
          font-size: 9px;
          font-weight: 750;
        }

        .error {
          margin: 0 20px 18px;
          padding: 11px 13px;
          border: 1px solid #fecaca;
          border-radius: 11px;
          background: #fef2f2;
          color: #dc2626;
          font-size: 9px;
          font-weight: 750;
        }

        .empty {
          padding: 45px 20px;
          color: #94a3b8;
          font-size: 10px;
          text-align: center;
        }

        .footer {
          padding: 10px 0 20px;
          color: #94a3b8;
          font-size: 8px;
          text-align: center;
        }

        @media (max-width: 1000px) {
          .summary-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .main-grid {
            grid-template-columns: 1fr;
          }

          .backup-content {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .laporan-page {
            padding: 20px 14px 90px;
          }

          .laporan-header {
            align-items: flex-start;
          }

          .header-actions {
            flex-wrap: wrap;
            justify-content: flex-end;
          }

          .period-bar {
            align-items: stretch;
            flex-direction: column;
          }

          .period-buttons {
            width: 100%;
          }

          .period-button {
            flex: 1;
          }

          .period-info {
            padding: 5px 8px 8px;
          }

          .chart {
            gap: 7px;
            padding-left: 12px;
            padding-right: 12px;
          }

          .bar-value {
            font-size: 6px;
          }
        }

        @media (max-width: 450px) {
          .laporan-page {
            padding-left: 10px;
            padding-right: 10px;
          }

          .page-title {
            font-size: 22px;
          }

          .page-subtitle {
            font-size: 8px;
          }

          .back-button {
            width: 36px;
            height: 36px;
          }

          .backup-button {
            font-size: 0;
            width: 40px;
            padding: 0;
          }

          .backup-button::before {
            content: '💾';
            font-size: 14px;
          }

          .primary-button {
            font-size: 0;
            width: 40px;
            padding: 0;
          }

          .primary-button::before {
            content: '📥';
            font-size: 14px;
          }

          .summary-card {
            padding: 13px;
          }

          .summary-value {
            font-size: 15px;
          }

          .panel-header {
            padding-left: 15px;
            padding-right: 15px;
          }

          .category-list {
            padding-left: 15px;
            padding-right: 15px;
          }

          .backup-content {
            padding-left: 15px;
            padding-right: 15px;
          }
        }
      `}</style>

      <main className="laporan-page">
        <div className="laporan-container">

          {/* HEADER */}
          <header className="laporan-header">

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
                  Laporan
                </h1>

                <p className="page-subtitle">
                  Analisis keuangan Toko Berkah Jaya.
                </p>
              </div>
            </div>

            <div className="header-actions">

              <button
                className="backup-button"
                onClick={() =>
                  setShowBackup(!showBackup)
                }
              >
                💾 Backup
              </button>

              <button
                className="primary-button"
                onClick={openRestorePicker}
              >
                📥 Restore
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                style={{ display: 'none' }}
                onChange={handleRestoreFile}
              />

            </div>
          </header>

          {/* PERIOD */}
          <section className="period-bar">

            <div className="period-buttons">

              {(
                [
                  ['today', 'Hari Ini'],
                  ['week', 'Minggu Ini'],
                  ['month', 'Bulan Ini'],
                  ['all', 'Semua'],
                ] as [ReportPeriod, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  className={`period-button ${
                    period === value
                      ? 'active'
                      : ''
                  }`}
                  onClick={() =>
                    setPeriod(value)
                  }
                >
                  {label}
                </button>
              ))}

            </div>

            <div className="period-info">
              Periode: {periodLabel}
            </div>

          </section>

          {/* SUMMARY */}
          <section className="summary-grid">

            <article className="summary-card">
              <p className="summary-label">
                TOTAL PEMASUKAN
              </p>

              <p
                className="summary-value"
                style={{ color: '#059669' }}
              >
                {formatRupiah(totalIncome)}
              </p>

              <p className="summary-note">
                {filteredTransactions.filter(
                  (item) =>
                    item.type === 'income',
                ).length}{' '}
                transaksi
              </p>
            </article>

            <article className="summary-card">
              <p className="summary-label">
                TOTAL PENGELUARAN
              </p>

              <p
                className="summary-value"
                style={{ color: '#dc2626' }}
              >
                {formatRupiah(totalExpense)}
              </p>

              <p className="summary-note">
                {filteredTransactions.filter(
                  (item) =>
                    item.type === 'expense',
                ).length}{' '}
                transaksi
              </p>
            </article>

            <article className="summary-card">
              <p className="summary-label">
                NET PROFIT
              </p>

              <p
                className="summary-value"
                style={{
                  color:
                    netProfit >= 0
                      ? '#2563eb'
                      : '#dc2626',
                }}
              >
                {formatRupiah(netProfit)}
              </p>

              <p className="summary-note">
                Pemasukan − Pengeluaran
              </p>
            </article>

            <article className="summary-card">
              <p className="summary-label">
                TABUNGAN
              </p>

              <p
                className="summary-value"
                style={{ color: '#6366f1' }}
              >
                {formatRupiah(totalSaving)}
              </p>

              <p className="summary-note">
                Saldo sekarang{' '}
                {formatRupiah(balance)}
              </p>
            </article>

          </section>

          {/* CHART + CATEGORIES */}
          <section className="main-grid">

            {/* CHART */}
            <article className="panel">

              <div className="panel-header">
                <div>
                  <h2 className="panel-title">
                    Aktivitas Keuangan
                  </h2>

                  <p className="panel-subtitle">
                    Data transaksi nyata dari CatatToko.
                  </p>
                </div>
              </div>

              {chartData.length === 0 ? (
                <div className="empty">
                  Belum ada transaksi pada periode ini.
                </div>
              ) : (
                <div className="chart">
                  {chartData.map(
                    (transaction) => {
                      const height =
                        Math.max(
                          (transaction.amount /
                            chartMax) *
                            100,
                          5,
                        )

                      const color =
                        transaction.type ===
                        'income'
                          ? '#059669'
                          : transaction.type ===
                              'expense'
                            ? '#dc2626'
                            : '#6366f1'

                      return (
                        <div
                          className="bar-column"
                          key={transaction.id}
                        >
                          <span
                            className="bar-value"
                            style={{
                              color,
                            }}
                          >
                            {formatRupiah(
                              transaction.amount,
                            )}
                          </span>

                          <div className="bar-track">
                            <div
                              className="bar"
                              style={{
                                height: `${height}%`,
                                background: color,
                              }}
                            />
                          </div>

                          <span className="bar-label">
                            {transaction.title}
                          </span>
                        </div>
                      )
                    },
                  )}
                </div>
              )}

            </article>

            {/* CATEGORY */}
            <article className="panel">

              <div className="panel-header">
                <div>
                  <h2 className="panel-title">
                    Pengeluaran
                  </h2>

                  <p className="panel-subtitle">
                    Berdasarkan kategori transaksi.
                  </p>
                </div>
              </div>

              {expenseCategories.length === 0 ? (
                <div className="empty">
                  Belum ada pengeluaran.
                </div>
              ) : (
                <div className="category-list">
                  {expenseCategories.map(
                    (category) => {
                      const percentage =
                        totalExpense > 0
                          ? Math.round(
                              (category.amount /
                                totalExpense) *
                                100,
                            )
                          : 0

                      return (
                        <div
                          className="category-row"
                          key={category.name}
                        >
                          <span className="category-dot" />

                          <div className="category-info">
                            <p className="category-name">
                              {category.name}
                            </p>

                            <p className="category-percent">
                              {percentage}% dari total
                            </p>
                          </div>

                          <span className="category-amount">
                            {formatRupiah(
                              category.amount,
                            )}
                          </span>
                        </div>
                      )
                    },
                  )}
                </div>
              )}

            </article>

          </section>

          {/* TRANSACTIONS */}
          <section className="panel transaction-panel">

            <div className="panel-header">
              <div>
                <h2 className="panel-title">
                  Detail Transaksi
                </h2>

                <p className="panel-subtitle">
                  {filteredTransactions.length}{' '}
                  transaksi pada {periodLabel}.
                </p>
              </div>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="empty">
                Belum ada transaksi.
              </div>
            ) : (
              <div className="transaction-table-wrapper">
                <table className="transaction-table">
                  <thead>
                    <tr>
                      <th>Transaksi</th>
                      <th>Tanggal</th>
                      <th>Waktu</th>
                      <th>Tipe</th>
                      <th>Jumlah</th>
                    </tr>
                  </thead>

                  <tbody>
                    {[...filteredTransactions]
                      .sort((a, b) => {
                        const dateA =
                          a.createdAt
                            ? new Date(
                                a.createdAt,
                              ).getTime()
                            : 0

                        const dateB =
                          b.createdAt
                            ? new Date(
                                b.createdAt,
                              ).getTime()
                            : 0

                        return dateB - dateA
                      })
                      .map((transaction) => {

                        const type =
                          transaction.type

                        const color =
                          type === 'income'
                            ? '#059669'
                            : type === 'expense'
                              ? '#dc2626'
                              : '#6366f1'

                        const background =
                          type === 'income'
                            ? '#ecfdf5'
                            : type === 'expense'
                              ? '#fef2f2'
                              : '#eef2ff'

                        const label =
                          type === 'income'
                            ? 'Pemasukan'
                            : type === 'expense'
                              ? 'Pengeluaran'
                              : 'Tabungan'

                        return (
                          <tr
                            key={transaction.id}
                          >
                            <td
                              style={{
                                fontWeight: 800,
                              }}
                            >
                              {transaction.title}
                            </td>

                            <td>
                              {transaction.date}
                            </td>

                            <td>
                              {transaction.time}
                            </td>

                            <td>
                              <span
                                className="type-badge"
                                style={{
                                  color,
                                  background,
                                }}
                              >
                                {label}
                              </span>
                            </td>

                            <td
                              style={{
                                color,
                                fontWeight: 850,
                              }}
                            >
                              {type === 'income'
                                ? '+'
                                : type === 'expense'
                                  ? '-'
                                  : '•'}{' '}
                              {formatRupiah(
                                transaction.amount,
                              )}
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            )}

          </section>

          {/* BACKUP RESTORE */}
          {showBackup && (
            <section className="panel backup-panel">

              <div className="panel-header">
                <div>
                  <h2 className="panel-title">
                    Backup & Restore
                  </h2>

                  <p className="panel-subtitle">
                    Amankan data CatatToko di perangkatmu.
                  </p>
                </div>

                <button
                  className="back-button"
                  onClick={() => {
                    setShowBackup(false)
                    closeBackupMessage()
                  }}
                  style={{
                    width: 32,
                    height: 32,
                  }}
                >
                  ×
                </button>
              </div>

              <div className="backup-content">

                {/* BACKUP */}
                <div className="backup-card">

                  <div className="backup-card-icon">
                    💾
                  </div>

                  <h3 className="backup-card-title">
                    Backup Data
                  </h3>

                  <p className="backup-card-text">
                    Simpan seluruh data CatatToko
                    menjadi satu file JSON yang bisa
                    kamu simpan sebagai cadangan.
                  </p>

                  <div className="backup-stats">
                    <span className="backup-stat">
                      💰 Saldo: {formatRupiah(balance)}
                    </span>

                    <span className="backup-stat">
                      💸 {transactions.length} transaksi
                    </span>

                    <span className="backup-stat">
                      📦 {products.length} produk
                    </span>
                  </div>

                  <button
                    className="primary-button"
                    onClick={downloadBackup}
                  >
                    💾 Download Backup
                  </button>

                </div>

                {/* RESTORE */}
                <div className="backup-card">

                  <div className="backup-card-icon">
                    📥
                  </div>

                  <h3 className="backup-card-title">
                    Restore Data
                  </h3>

                  <p className="backup-card-text">
                    Pulihkan data dari file backup
                    CatatToko yang sebelumnya sudah
                    kamu simpan.
                  </p>

                  <div className="backup-stats">
                    <span className="backup-stat">
                      JSON Backup
                    </span>

                    <span className="backup-stat">
                      ✓ Validasi otomatis
                    </span>

                    <span className="backup-stat">
                      🔄 Auto Refresh
                    </span>
                  </div>

                  <button
                    className="backup-button"
                    onClick={openRestorePicker}
                  >
                    📥 Pilih File Backup
                  </button>

                </div>

              </div>

              {restoreMessage && (
                <div className="message">
                  ✓ {restoreMessage}
                </div>
              )}

              {restoreError && (
                <div className="error">
                  ⚠ {restoreError}
                </div>
              )}

            </section>
          )}

          <footer className="footer">
            CatatToko • Laporan Keuangan UMKM
          </footer>

        </div>
      </main>
    </>
  )
}

export default Laporan