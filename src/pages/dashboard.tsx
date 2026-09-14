import { useEffect, useMemo, useState } from 'react'
import data from '../data/data.json'
import {
  addTransaction,
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

const NOTIFICATION_READ_KEY = 'catatTokoReadNotifications'

function Dashboard({ onNavigate }: DashboardProps) {
  const [period, setPeriod] = useState<Period>('today')
  const [showBalance, setShowBalance] = useState(true)
  const [showNotifications, setShowNotifications] = useState(false)

  const [balance, setBalance] = useState(getBalance())
  const [transactions, setTransactions] = useState<Transaction[]>(
    getTransactions(),
  )
  const [products, setProducts] = useState<Product[]>(getProducts())

  const [search, setSearch] = useState('')
  const [readNotifications, setReadNotifications] = useState<string[]>(
    () => {
      try {
        const saved = localStorage.getItem(
          NOTIFICATION_READ_KEY,
        )

        return saved ? JSON.parse(saved) : []
      } catch {
        return []
      }
    },
  )

  const loadData = () => {
    setBalance(getBalance())
    setTransactions(getTransactions())
    setProducts(getProducts())
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

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) =>
      isInPeriod(transaction.date, period),
    )
  }, [transactions, period])

  const totalIncome = useMemo(() => {
    return filteredTransactions
      .filter(
        (transaction) => transaction.type === 'income',
      )
      .reduce(
        (total, transaction) => total + transaction.amount,
        0,
      )
  }, [filteredTransactions])

  const totalExpense = useMemo(() => {
    return filteredTransactions
      .filter(
        (transaction) => transaction.type === 'expense',
      )
      .reduce(
        (total, transaction) => total + transaction.amount,
        0,
      )
  }, [filteredTransactions])

  const netProfit = totalIncome - totalExpense

  const transactionCount = filteredTransactions.length

  const averageTransaction =
    transactionCount > 0
      ? Math.round(
          filteredTransactions.reduce(
            (total, transaction) =>
              total + transaction.amount,
            0,
          ) / transactionCount,
        )
      : 0

  const lowStockProducts = useMemo(() => {
    return products
      .filter((product) => product.stock <= 10)
      .sort((a, b) => a.stock - b.stock)
  }, [products])

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => {
        const dateA = a.createdAt
          ? new Date(a.createdAt).getTime()
          : 0

        const dateB = b.createdAt
          ? new Date(b.createdAt).getTime()
          : 0

        return dateB - dateA
      })
      .slice(0, 5)
  }, [transactions])

  /*
   * NOTIFICATION SYSTEM
   */
  const notifications = useMemo<Notification[]>(() => {
    const result: Notification[] = []

    /*
     * 1. STOK MENIPIS
     */
    lowStockProducts.slice(0, 5).forEach((product) => {
      result.push({
        id: `stock-${product.id}`,
        title: 'Stok Menipis',
        message: `${product.name} tersisa ${product.stock} stok.`,
        type: 'warning',
        icon: '📦',
        page: 'produk',
      })
    })

    /*
     * 2. PEMASUKAN TERBARU
     */
    const latestIncome = [...transactions]
      .filter(
        (transaction) => transaction.type === 'income',
      )
      .sort((a, b) => {
        const dateA = a.createdAt
          ? new Date(a.createdAt).getTime()
          : 0

        const dateB = b.createdAt
          ? new Date(b.createdAt).getTime()
          : 0

        return dateB - dateA
      })[0]

    if (latestIncome) {
      result.push({
        id: `income-${latestIncome.id}`,
        title: 'Pemasukan Terbaru',
        message: `${latestIncome.title} sebesar ${formatRupiah(
          latestIncome.amount,
        )}.`,
        type: 'success',
        icon: '💰',
        page: 'transaksi',
      })
    }

    /*
     * 3. PENGELUARAN TERBARU
     */
    const latestExpense = [...transactions]
      .filter(
        (transaction) => transaction.type === 'expense',
      )
      .sort((a, b) => {
        const dateA = a.createdAt
          ? new Date(a.createdAt).getTime()
          : 0

        const dateB = b.createdAt
          ? new Date(b.createdAt).getTime()
          : 0

        return dateB - dateA
      })[0]

    if (latestExpense) {
      result.push({
        id: `expense-${latestExpense.id}`,
        title: 'Pengeluaran Terbaru',
        message: `${latestExpense.title} sebesar ${formatRupiah(
          latestExpense.amount,
        )}.`,
        type: 'info',
        icon: '💸',
        page: 'transaksi',
      })
    }

    /*
     * 4. JIKA TIDAK ADA NOTIFIKASI
     */
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
  }, [lowStockProducts, transactions])

  const unreadNotifications = notifications.filter(
    (notification) =>
      !readNotifications.includes(notification.id),
  )

  /*
   * SEARCH
   */
  const searchResults = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    if (!keyword) return []

    return transactions
      .filter((transaction) =>
        transaction.title
          .toLowerCase()
          .includes(keyword),
      )
      .slice(0, 5)
  }, [transactions, search])

  /*
   * SIMPAN NOTIFIKASI YANG SUDAH DIBACA
   */
  const saveReadNotifications = (
    ids: string[],
  ) => {
    setReadNotifications(ids)

    localStorage.setItem(
      NOTIFICATION_READ_KEY,
      JSON.stringify(ids),
    )
  }

  /*
   * KLIK SATU NOTIFIKASI
   */
  const handleNotificationClick = (
    notification: Notification,
  ) => {
    const updated = Array.from(
      new Set([
        ...readNotifications,
        notification.id,
      ]),
    )

    saveReadNotifications(updated)

    if (notification.page) {
      setShowNotifications(false)
      onNavigate?.(notification.page)
    }
  }

  /*
   * TANDAI SEMUA DIBACA
   */
  const markAllNotificationsRead = () => {
    const allIds = notifications.map(
      (notification) => notification.id,
    )

    saveReadNotifications(allIds)
  }

  /*
   * RESET NOTIFIKASI SAAT DATA BERUBAH BESAR
   *
   * Tidak menghapus semua status read.
   * Hanya menjaga agar localStorage tetap bersih.
   */
  useEffect(() => {
    const currentIds = new Set(
      notifications.map(
        (notification) => notification.id,
      ),
    )

    const cleaned = readNotifications.filter((id) =>
      currentIds.has(id),
    )

    if (cleaned.length !== readNotifications.length) {
      saveReadNotifications(cleaned)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications])

  /*
   * QUICK INCOME
   */
  const handleDemoIncome = () => {
    addTransaction({
      title: 'Pemasukan Cepat',
      type: 'income',
      amount: 100000,
    })
  }

  const handleQuickAction = (page: string) => {
    onNavigate?.(page)
  }

  const getTransactionColor = (
    type: Transaction['type'],
  ) => {
    if (type === 'income') return '#059669'
    if (type === 'expense') return '#dc2626'
    return '#6366f1'
  }

  const getTransactionIcon = (
    type: Transaction['type'],
  ) => {
    if (type === 'income') return '↗'
    if (type === 'expense') return '↘'
    return '◎'
  }

  const getNotificationBackground = (
    type: Notification['type'],
  ) => {
    if (type === 'warning') return '#fff7ed'
    if (type === 'success') return '#ecfdf5'
    return '#eff6ff'
  }

  const getNotificationColor = (
    type: Notification['type'],
  ) => {
    if (type === 'warning') return '#ea580c'
    if (type === 'success') return '#059669'
    return '#2563eb'
  }

  const periodLabel = {
    today: 'Hari Ini',
    week: 'Minggu Ini',
    month: 'Bulan Ini',
  }[period]

  return (
    <>
      <style>{`
        .dashboard-page {
          min-height: 100vh;
          padding: 30px;
          background:
            radial-gradient(
              circle at top right,
              rgba(37, 99, 235, 0.08),
              transparent 28%
            ),
            #f8fafc;
          color: #0f172a;
        }

        .dashboard-container {
          width: 100%;
          max-width: 1500px;
          margin: 0 auto;
        }

        .dashboard-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 24px;
        }

        .header-text {
          min-width: 0;
        }

        .welcome-text {
          margin: 0 0 6px;
          color: #64748b;
          font-size: 13px;
          font-weight: 700;
        }

        .dashboard-title {
          margin: 0;
          font-size: 32px;
          line-height: 1.15;
          font-weight: 850;
          letter-spacing: -0.035em;
        }

        .dashboard-subtitle {
          margin: 8px 0 0;
          color: #64748b;
          font-size: 14px;
        }

        .header-actions {
          position: relative;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .search-box {
          width: 260px;
          height: 44px;
          padding: 0 15px;
          border: 1px solid #e2e8f0;
          outline: none;
          border-radius: 13px;
          background: #ffffff;
          color: #0f172a;
          font-size: 13px;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
          transition: 0.2s ease;
        }

        .search-box:focus {
          border-color: #93c5fd;
          box-shadow:
            0 0 0 4px rgba(37, 99, 235, 0.08),
            0 8px 24px rgba(15, 23, 42, 0.04);
        }

        .notification-button {
          position: relative;
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          border: 1px solid #e2e8f0;
          border-radius: 13px;
          background: #ffffff;
          cursor: pointer;
          font-size: 19px;
          transition: 0.2s ease;
        }

        .notification-button:hover {
          transform: translateY(-1px);
          border-color: #bfdbfe;
          background: #eff6ff;
        }

        .notification-badge {
          position: absolute;
          right: -4px;
          top: -5px;
          min-width: 19px;
          height: 19px;
          display: grid;
          place-items: center;
          padding: 0 5px;
          border: 2px solid #f8fafc;
          border-radius: 99px;
          background: #ef4444;
          color: #ffffff;
          font-size: 9px;
          font-weight: 900;
        }

        .notification-panel {
          position: absolute;
          z-index: 100;
          top: 55px;
          right: 0;
          width: 370px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          background: #ffffff;
          box-shadow:
            0 24px 60px rgba(15, 23, 42, 0.16),
            0 5px 15px rgba(15, 23, 42, 0.06);
          animation: notificationIn 0.18s ease;
        }

        @keyframes notificationIn {
          from {
            opacity: 0;
            transform: translateY(-7px) scale(0.98);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .notification-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 17px;
          border-bottom: 1px solid #f1f5f9;
        }

        .notification-heading {
          margin: 0;
          font-size: 14px;
          font-weight: 850;
        }

        .notification-count {
          margin: 4px 0 0;
          color: #94a3b8;
          font-size: 10px;
        }

        .mark-read-button {
          border: none;
          background: transparent;
          color: #2563eb;
          cursor: pointer;
          font-size: 10px;
          font-weight: 800;
        }

        .mark-read-button:hover {
          text-decoration: underline;
        }

        .notification-list {
          max-height: 390px;
          overflow-y: auto;
        }

        .notification-item {
          width: 100%;
          display: flex;
          align-items: flex-start;
          gap: 11px;
          padding: 14px 16px;
          border: none;
          border-bottom: 1px solid #f8fafc;
          background: #ffffff;
          text-align: left;
          cursor: pointer;
          transition: 0.18s ease;
        }

        .notification-item:hover {
          background: #f8fafc;
        }

        .notification-item.unread {
          background: #f8fbff;
        }

        .notification-item:last-child {
          border-bottom: none;
        }

        .notification-icon {
          width: 36px;
          height: 36px;
          flex: 0 0 36px;
          display: grid;
          place-items: center;
          border-radius: 11px;
          font-size: 16px;
        }

        .notification-content {
          min-width: 0;
          flex: 1;
        }

        .notification-title-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .notification-title {
          margin: 0;
          color: #1e293b;
          font-size: 12px;
          font-weight: 850;
        }

        .unread-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #2563eb;
        }

        .notification-message {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 11px;
          line-height: 1.5;
        }

        .notification-footer {
          padding: 11px 16px;
          border-top: 1px solid #f1f5f9;
          background: #fafafa;
          color: #94a3b8;
          font-size: 9px;
          text-align: center;
        }

        .search-results {
          position: absolute;
          z-index: 90;
          top: 51px;
          left: 0;
          width: 260px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          background: #ffffff;
          box-shadow: 0 20px 45px rgba(15, 23, 42, 0.12);
        }

        .search-result {
          display: flex;
          align-items: center;
          gap: 9px;
          width: 100%;
          padding: 11px 13px;
          border: none;
          border-bottom: 1px solid #f1f5f9;
          background: #ffffff;
          text-align: left;
          cursor: pointer;
        }

        .search-result:hover {
          background: #f8fafc;
        }

        .search-result:last-child {
          border-bottom: none;
        }

        .search-result-icon {
          width: 30px;
          height: 30px;
          display: grid;
          place-items: center;
          border-radius: 9px;
          background: #eff6ff;
          color: #2563eb;
          font-size: 13px;
        }

        .search-result-title {
          margin: 0;
          overflow: hidden;
          color: #1e293b;
          font-size: 11px;
          font-weight: 800;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .search-result-meta {
          margin: 3px 0 0;
          color: #94a3b8;
          font-size: 9px;
        }

        .balance-card {
          position: relative;
          overflow: hidden;
          margin-bottom: 20px;
          padding: 25px;
          border-radius: 22px;
          background:
            radial-gradient(
              circle at 100% 0%,
              rgba(99, 102, 241, 0.38),
              transparent 34%
            ),
            linear-gradient(
              135deg,
              #172554,
              #1e3a8a 58%,
              #3730a3
            );
          color: #ffffff;
          box-shadow: 0 20px 45px rgba(30, 58, 138, 0.2);
        }

        .balance-card::before {
          content: '';
          position: absolute;
          width: 170px;
          height: 170px;
          right: -60px;
          bottom: -90px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .balance-top {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
        }

        .balance-label {
          margin: 0;
          color: rgba(255,255,255,0.7);
          font-size: 12px;
          font-weight: 700;
        }

        .balance-value {
          margin: 8px 0 0;
          font-size: 31px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: -0.035em;
        }

        .eye-button {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 11px;
          background: rgba(255,255,255,0.08);
          color: #ffffff;
          cursor: pointer;
        }

        .balance-bottom {
          position: relative;
          z-index: 1;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
          margin-top: 30px;
        }

        .store-info {
          color: rgba(255,255,255,0.72);
          font-size: 11px;
        }

        .store-name {
          margin: 0 0 4px;
          color: #ffffff;
          font-size: 13px;
          font-weight: 850;
        }

        .store-type {
          margin: 0;
        }

        .period-wrapper {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 5px;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          background: #ffffff;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
        }

        .period-button {
          padding: 9px 12px;
          border: none;
          border-radius: 9px;
          background: transparent;
          color: #64748b;
          cursor: pointer;
          font-size: 11px;
          font-weight: 800;
        }

        .period-button:hover {
          background: #eff6ff;
          color: #2563eb;
        }

        .period-button.active {
          background: #2563eb;
          color: #ffffff;
          box-shadow: 0 5px 14px rgba(37, 99, 235, 0.2);
        }

        .section-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 13px;
        }

        .section-title {
          margin: 0;
          font-size: 16px;
          font-weight: 850;
        }

        .section-link {
          border: none;
          background: transparent;
          color: #2563eb;
          cursor: pointer;
          font-size: 11px;
          font-weight: 800;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          padding: 20px;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          background: #ffffff;
          box-shadow: 0 8px 25px rgba(15, 23, 42, 0.045);
        }

        .stat-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .stat-label {
          margin: 0;
          color: #64748b;
          font-size: 11px;
          font-weight: 750;
        }

        .stat-icon {
          width: 35px;
          height: 35px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          font-weight: 900;
        }

        .stat-value {
          margin: 15px 0 5px;
          font-size: 20px;
          font-weight: 900;
          letter-spacing: -0.025em;
        }

        .stat-note {
          margin: 0;
          color: #94a3b8;
          font-size: 9px;
        }

        .quick-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 24px;
        }

        .quick-button {
          min-height: 94px;
          padding: 16px;
          border: 1px solid #e2e8f0;
          border-radius: 17px;
          background: #ffffff;
          text-align: left;
          cursor: pointer;
          transition: 0.2s ease;
          box-shadow: 0 7px 20px rgba(15, 23, 42, 0.035);
        }

        .quick-button:hover {
          transform: translateY(-2px);
          border-color: #bfdbfe;
          box-shadow: 0 13px 28px rgba(37, 99, 235, 0.08);
        }

        .quick-icon {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          margin-bottom: 10px;
          border-radius: 11px;
          background: #eff6ff;
          color: #2563eb;
          font-size: 17px;
        }

        .quick-title {
          margin: 0;
          color: #1e293b;
          font-size: 11px;
          font-weight: 850;
        }

        .quick-description {
          margin: 4px 0 0;
          color: #94a3b8;
          font-size: 9px;
        }

        .content-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.75fr);
          gap: 18px;
          margin-bottom: 18px;
        }

        .panel {
          overflow: hidden;
          border: 1px solid #e2e8f0;
          border-radius: 19px;
          background: #ffffff;
          box-shadow: 0 8px 25px rgba(15, 23, 42, 0.045);
        }

        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 19px 20px 10px;
        }

        .panel-title {
          margin: 0;
          font-size: 14px;
          font-weight: 850;
        }

        .panel-subtitle {
          margin: 4px 0 0;
          color: #94a3b8;
          font-size: 10px;
        }

        .transaction-list {
          padding: 4px 20px 12px;
        }

        .transaction-row {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 12px 0;
          border-bottom: 1px solid #f1f5f9;
        }

        .transaction-row:last-child {
          border-bottom: none;
        }

        .transaction-icon {
          width: 37px;
          height: 37px;
          flex: 0 0 37px;
          display: grid;
          place-items: center;
          border-radius: 11px;
          font-size: 15px;
          font-weight: 900;
        }

        .transaction-info {
          min-width: 0;
          flex: 1;
        }

        .transaction-name {
          margin: 0;
          overflow: hidden;
          color: #1e293b;
          font-size: 11px;
          font-weight: 800;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .transaction-meta {
          margin: 3px 0 0;
          color: #94a3b8;
          font-size: 9px;
        }

        .transaction-amount {
          text-align: right;
          font-size: 11px;
          font-weight: 850;
          white-space: nowrap;
        }

        .stock-list {
          padding: 5px 20px 15px;
        }

        .stock-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px 0;
          border-bottom: 1px solid #f1f5f9;
        }

        .stock-row:last-child {
          border-bottom: none;
        }

        .stock-icon {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: #fff7ed;
          font-size: 15px;
        }

        .stock-info {
          min-width: 0;
          flex: 1;
        }

        .stock-name {
          margin: 0;
          overflow: hidden;
          color: #1e293b;
          font-size: 11px;
          font-weight: 800;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .stock-price {
          margin: 3px 0 0;
          color: #94a3b8;
          font-size: 9px;
        }

        .stock-number {
          color: #ea580c;
          font-size: 10px;
          font-weight: 900;
        }

        .quick-income {
          display: flex;
          justify-content: center;
          padding: 4px 20px 20px;
        }

        .quick-income-button {
          width: 100%;
          padding: 11px 15px;
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
          box-shadow: 0 8px 18px rgba(37, 99, 235, 0.18);
        }

        .quick-income-button:hover {
          transform: translateY(-1px);
        }

        .empty-small {
          padding: 30px 20px;
          color: #94a3b8;
          font-size: 10px;
          text-align: center;
        }

        .footer {
          padding: 18px 0 5px;
          color: #94a3b8;
          font-size: 9px;
          text-align: center;
        }

        @media (max-width: 1100px) {
          .stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .content-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .dashboard-page {
            padding: 20px 15px 90px;
          }

          .dashboard-header {
            flex-direction: column;
          }

          .header-actions {
            width: 100%;
          }

          .search-box {
            flex: 1;
            width: auto;
          }

          .notification-panel {
            position: fixed;
            top: 76px;
            left: 15px;
            right: 15px;
            width: auto;
          }

          .search-results {
            width: calc(100% - 55px);
          }

          .dashboard-title {
            font-size: 26px;
          }

          .balance-card {
            padding: 20px;
            border-radius: 18px;
          }

          .balance-value {
            font-size: 25px;
          }

          .balance-bottom {
            align-items: flex-start;
            flex-direction: column;
          }

          .period-wrapper {
            width: 100%;
          }

          .period-button {
            flex: 1;
          }

          .quick-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 430px) {
          .dashboard-page {
            padding-left: 10px;
            padding-right: 10px;
          }

          .stats-grid {
            gap: 10px;
          }

          .stat-card {
            padding: 14px;
            border-radius: 15px;
          }

          .stat-label {
            font-size: 9px;
          }

          .stat-value {
            font-size: 15px;
            word-break: break-word;
          }

          .stat-note {
            font-size: 8px;
          }

          .quick-button {
            min-height: 84px;
            padding: 13px;
          }

          .panel-header {
            padding-left: 15px;
            padding-right: 15px;
          }

          .transaction-list,
          .stock-list {
            padding-left: 15px;
            padding-right: 15px;
          }

          .quick-income {
            padding-left: 15px;
            padding-right: 15px;
          }

          .transaction-amount {
            font-size: 9px;
          }
        }
      `}</style>

      <main className="dashboard-page">
        <div className="dashboard-container">

          {/* HEADER */}
          <header className="dashboard-header">
            <div className="header-text">
              <p className="welcome-text">
                Selamat datang kembali 👋
              </p>

              <h1 className="dashboard-title">
                Halo, Putra
              </h1>

              <p className="dashboard-subtitle">
                Kelola keuangan Toko Berkah Jaya dengan
                lebih mudah.
              </p>
            </div>

            <div className="header-actions">

              {/* SEARCH */}
              <div style={{ position: 'relative' }}>
                <input
                  className="search-box"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Cari transaksi..."
                />

                {searchResults.length > 0 && (
                  <div className="search-results">
                    {searchResults.map((transaction) => (
                      <button
                        className="search-result"
                        key={transaction.id}
                        onClick={() => {
                          setSearch('')
                          onNavigate?.('transaksi')
                        }}
                      >
                        <div className="search-result-icon">
                          {getTransactionIcon(
                            transaction.type,
                          )}
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <p className="search-result-title">
                            {transaction.title}
                          </p>

                          <p className="search-result-meta">
                            {formatRupiah(
                              transaction.amount,
                            )}{' '}
                            • {transaction.date}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* NOTIFICATION */}
              <div style={{ position: 'relative' }}>
                <button
                  className="notification-button"
                  onClick={() =>
                    setShowNotifications(
                      !showNotifications,
                    )
                  }
                  aria-label="Notifikasi"
                >
                  🔔

                  {unreadNotifications.length > 0 && (
                    <span className="notification-badge">
                      {unreadNotifications.length > 9
                        ? '9+'
                        : unreadNotifications.length}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="notification-panel">

                    <div className="notification-header">
                      <div>
                        <h3 className="notification-heading">
                          Notifikasi
                        </h3>

                        <p className="notification-count">
                          {unreadNotifications.length > 0
                            ? `${unreadNotifications.length} belum dibaca`
                            : 'Semua sudah dibaca'}
                        </p>
                      </div>

                      {unreadNotifications.length > 0 && (
                        <button
                          className="mark-read-button"
                          onClick={
                            markAllNotificationsRead
                          }
                        >
                          Tandai semua dibaca
                        </button>
                      )}
                    </div>

                    <div className="notification-list">
                      {notifications.map(
                        (notification) => {
                          const isUnread =
                            !readNotifications.includes(
                              notification.id,
                            )

                          const color =
                            getNotificationColor(
                              notification.type,
                            )

                          return (
                            <button
                              key={notification.id}
                              className={`notification-item ${
                                isUnread ? 'unread' : ''
                              }`}
                              onClick={() =>
                                handleNotificationClick(
                                  notification,
                                )
                              }
                            >
                              <div
                                className="notification-icon"
                                style={{
                                  background:
                                    getNotificationBackground(
                                      notification.type,
                                    ),
                                }}
                              >
                                {notification.icon}
                              </div>

                              <div className="notification-content">
                                <div className="notification-title-row">
                                  <p className="notification-title">
                                    {notification.title}
                                  </p>

                                  {isUnread && (
                                    <span
                                      className="unread-dot"
                                      style={{
                                        background: color,
                                      }}
                                    />
                                  )}
                                </div>

                                <p className="notification-message">
                                  {notification.message}
                                </p>
                              </div>
                            </button>
                          )
                        },
                      )}
                    </div>

                    <div className="notification-footer">
                      Notifikasi diperbarui otomatis dari
                      data aplikasi.
                    </div>

                  </div>
                )}
              </div>
            </div>
          </header>

          {/* BALANCE */}
          <section className="balance-card">

            <div className="balance-top">
              <div>
                <p className="balance-label">
                  Saldo Saat Ini
                </p>

                <p className="balance-value">
                  {showBalance
                    ? formatRupiah(balance)
                    : '••••••••'}
                </p>
              </div>

              <button
                className="eye-button"
                onClick={() =>
                  setShowBalance(!showBalance)
                }
              >
                {showBalance ? '◉' : '◎'}
              </button>
            </div>

            <div className="balance-bottom">

              <div className="store-info">
                <p className="store-name">
                  {data.store.name}
                </p>

                <p className="store-type">
                  {data.store.type} • {data.store.status}
                </p>
              </div>

              <div className="period-wrapper">
                {(
                  [
                    ['today', 'Hari Ini'],
                    ['week', 'Minggu Ini'],
                    ['month', 'Bulan Ini'],
                  ] as [Period, string][]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    className={`period-button ${
                      period === value
                        ? 'active'
                        : ''
                    }`}
                    onClick={() => setPeriod(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>

            </div>
          </section>

          {/* STATS */}
          <section className="stats-grid">

            <article className="stat-card">
              <div className="stat-top">
                <p className="stat-label">
                  Pemasukan
                </p>

                <div
                  className="stat-icon"
                  style={{
                    color: '#059669',
                    background: '#ecfdf5',
                  }}
                >
                  ↗
                </div>
              </div>

              <p className="stat-value">
                {formatRupiah(totalIncome)}
              </p>

              <p className="stat-note">
                {periodLabel}
              </p>
            </article>

            <article className="stat-card">
              <div className="stat-top">
                <p className="stat-label">
                  Pengeluaran
                </p>

                <div
                  className="stat-icon"
                  style={{
                    color: '#dc2626',
                    background: '#fef2f2',
                  }}
                >
                  ↘
                </div>
              </div>

              <p className="stat-value">
                {formatRupiah(totalExpense)}
              </p>

              <p className="stat-note">
                {periodLabel}
              </p>
            </article>

            <article className="stat-card">
              <div className="stat-top">
                <p className="stat-label">
                  Net Profit
                </p>

                <div
                  className="stat-icon"
                  style={{
                    color:
                      netProfit >= 0
                        ? '#2563eb'
                        : '#dc2626',
                    background:
                      netProfit >= 0
                        ? '#eff6ff'
                        : '#fef2f2',
                  }}
                >
                  ✓
                </div>
              </div>

              <p
                className="stat-value"
                style={{
                  color:
                    netProfit >= 0
                      ? '#059669'
                      : '#dc2626',
                }}
              >
                {formatRupiah(netProfit)}
              </p>

              <p className="stat-note">
                Pemasukan − Pengeluaran
              </p>
            </article>

            <article className="stat-card">
              <div className="stat-top">
                <p className="stat-label">
                  Rata-rata
                </p>

                <div
                  className="stat-icon"
                  style={{
                    color: '#6366f1',
                    background: '#eef2ff',
                  }}
                >
                  ≈
                </div>
              </div>

              <p className="stat-value">
                {formatRupiah(averageTransaction)}
              </p>

              <p className="stat-note">
                {transactionCount} transaksi
              </p>
            </article>

          </section>

          {/* QUICK ACTION */}
          <section>
            <div className="section-title-row">
              <h2 className="section-title">
                Quick Actions
              </h2>
            </div>

            <div className="quick-grid">

              <button
                className="quick-button"
                onClick={() =>
                  handleQuickAction('catat')
                }
              >
                <div className="quick-icon">
                  +
                </div>

                <p className="quick-title">
                  Catat Keuangan
                </p>

                <p className="quick-description">
                  Pemasukan & pengeluaran
                </p>
              </button>

              <button
                className="quick-button"
                onClick={() =>
                  handleQuickAction('penjualan')
                }
              >
                <div className="quick-icon">
                  💵
                </div>

                <p className="quick-title">
                  Penjualan
                </p>

                <p className="quick-description">
                  Catat transaksi jual
                </p>
              </button>

              <button
                className="quick-button"
                onClick={() =>
                  handleQuickAction('produk')
                }
              >
                <div className="quick-icon">
                  📦
                </div>

                <p className="quick-title">
                  Produk
                </p>

                <p className="quick-description">
                  Kelola stok barang
                </p>
              </button>

              <button
                className="quick-button"
                onClick={() =>
                  handleQuickAction('laporan')
                }
              >
                <div className="quick-icon">
                  📊
                </div>

                <p className="quick-title">
                  Laporan
                </p>

                <p className="quick-description">
                  Analisis keuangan
                </p>
              </button>

            </div>
          </section>

          {/* RECENT + STOCK */}
          <section className="content-grid">

            {/* RECENT TRANSACTIONS */}
            <article className="panel">

              <div className="panel-header">
                <div>
                  <h2 className="panel-title">
                    Transaksi Terbaru
                  </h2>

                  <p className="panel-subtitle">
                    Aktivitas keuangan terbaru.
                  </p>
                </div>

                <button
                  className="section-link"
                  onClick={() =>
                    onNavigate?.('transaksi')
                  }
                >
                  Lihat semua →
                </button>
              </div>

              {recentTransactions.length === 0 ? (
                <div className="empty-small">
                  Belum ada transaksi.
                </div>
              ) : (
                <div className="transaction-list">
                  {recentTransactions.map(
                    (transaction) => {
                      const color =
                        getTransactionColor(
                          transaction.type,
                        )

                      const sign =
                        transaction.type === 'income'
                          ? '+'
                          : transaction.type === 'expense'
                            ? '-'
                            : '•'

                      return (
                        <div
                          className="transaction-row"
                          key={transaction.id}
                        >
                          <div
                            className="transaction-icon"
                            style={{
                              color,
                              background:
                                transaction.type ===
                                'income'
                                  ? '#ecfdf5'
                                  : transaction.type ===
                                      'expense'
                                    ? '#fef2f2'
                                    : '#eef2ff',
                            }}
                          >
                            {getTransactionIcon(
                              transaction.type,
                            )}
                          </div>

                          <div className="transaction-info">
                            <p className="transaction-name">
                              {transaction.title}
                            </p>

                            <p className="transaction-meta">
                              {transaction.date} •{' '}
                              {transaction.time}
                            </p>
                          </div>

                          <div
                            className="transaction-amount"
                            style={{ color }}
                          >
                            {sign}{' '}
                            {formatRupiah(
                              transaction.amount,
                            )}
                          </div>
                        </div>
                      )
                    },
                  )}
                </div>
              )}

              <div className="quick-income">
                <button
                  className="quick-income-button"
                  onClick={handleDemoIncome}
                >
                  + Tambah Pemasukan Cepat Rp100.000
                </button>
              </div>
            </article>

            {/* LOW STOCK */}
            <article className="panel">

              <div className="panel-header">
                <div>
                  <h2 className="panel-title">
                    Stok Menipis
                  </h2>

                  <p className="panel-subtitle">
                    Produk dengan stok ≤ 10.
                  </p>
                </div>

                <button
                  className="section-link"
                  onClick={() =>
                    onNavigate?.('produk')
                  }
                >
                  Kelola →
                </button>
              </div>

              {lowStockProducts.length === 0 ? (
                <div className="empty-small">
                  ✓ Semua stok aman.
                </div>
              ) : (
                <div className="stock-list">
                  {lowStockProducts
                    .slice(0, 5)
                    .map((product) => (
                      <div
                        className="stock-row"
                        key={product.id}
                      >
                        <div className="stock-icon">
                          {product.icon}
                        </div>

                        <div className="stock-info">
                          <p className="stock-name">
                            {product.name}
                          </p>

                          <p className="stock-price">
                            {formatRupiah(
                              product.price,
                            )}
                          </p>
                        </div>

                        <span className="stock-number">
                          {product.stock} stok
                        </span>
                      </div>
                    ))}
                </div>
              )}

            </article>

          </section>

          <footer className="footer">
            CatatToko • Dashboard Keuangan UMKM
          </footer>

        </div>
      </main>
    </>
  )
}

export default Dashboard