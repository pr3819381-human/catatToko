import {
  useEffect,
  useRef,
  useState,
} from 'react'

import type { User } from 'firebase/auth'

import './App.css'

import {
  logoutUser,
  subscribeToAuth,
} from './auth'

import {
  initializeCloudData,
  resetCloudSession,
} from './data/storage'

import Login from './pages/Login'
import Dashboard from './pages/dashboard'
import Catat from './pages/Catat'
import Penjualan from './pages/Penjualan'
import Transaksi from './pages/Transaksi'
import Laporan from './pages/Laporan'
import Produk from './pages/produk'

import BottomNav from './components/components/BottomNav'

function getDataErrorMessage(
  error: unknown,
): string {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error
  ) {
    const code = String(
      (error as { code?: unknown }).code,
    )

    switch (code) {
      case 'permission-denied':
      case 'firestore/permission-denied':
        return 'Akses database ditolak. Periksa Firebase Authentication dan Firestore Security Rules.'

      case 'unauthenticated':
      case 'firestore/unauthenticated':
        return 'Sesi login tidak valid. Silakan login kembali.'

      case 'unavailable':
      case 'firestore/unavailable':
        return 'Firebase sedang tidak tersedia. Periksa koneksi internet lalu coba lagi.'

      case 'failed-precondition':
        return 'Firebase belum dikonfigurasi dengan benar. Periksa Firestore Database.'

      case 'network-request-failed':
        return 'Koneksi internet bermasalah. Silakan coba lagi.'
    }
  }

  if (error instanceof Error) {
    return error.message || 'Data toko gagal dimuat.'
  }

  return 'Data toko gagal dimuat. Silakan coba lagi.'
}

function App() {
  const [user, setUser] =
    useState<User | null>(null)

  const [authLoading, setAuthLoading] =
    useState(true)

  const [dataLoading, setDataLoading] =
    useState(false)

  const [dataError, setDataError] =
    useState('')

  const [activePage, setActivePage] =
    useState('home')

  const [menuOpen, setMenuOpen] =
    useState(false)

  const [menuPosition, setMenuPosition] =
    useState({
      x: 18,
      y: 18,
    })

  const menuButtonRef =
    useRef<HTMLButtonElement | null>(
      null,
    )

  const dragStartRef = useRef({
    pointerX: 0,
    pointerY: 0,
    startX: 18,
    startY: 18,
  })

  const hasMovedRef =
    useRef(false)

  /* =========================================================
     AUTH STATE
  ========================================================= */

  useEffect(() => {
    const unsubscribe =
      subscribeToAuth(
        (currentUser) => {
          setUser(currentUser)
          setAuthLoading(false)
        },
      )

    return unsubscribe
  }, [])

  /* =========================================================
     LOAD CLOUD DATA AFTER LOGIN
  ========================================================= */

  useEffect(() => {
    if (!user) {
      resetCloudSession()
      setDataLoading(false)
      setDataError('')
      setActivePage('home')
      return
    }

    let cancelled = false

    const loadData = async () => {
      try {
        setDataLoading(true)
        setDataError('')

        await initializeCloudData()

        if (cancelled) {
          return
        }

        setDataLoading(false)
      } catch (error) {
        console.error(
          'Gagal memuat data CatatToko:',
          error,
        )

        if (cancelled) {
          return
        }

        setDataLoading(false)
        setDataError(
          getDataErrorMessage(error),
        )
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [user])

  /* =========================================================
     CLOSE MENU
  ========================================================= */

  const closeMenu = () => {
    setMenuOpen(false)

    window.requestAnimationFrame(() => {
      menuButtonRef.current?.focus()
    })
  }

  /* =========================================================
     NAVIGATION
  ========================================================= */

  const navigate = (
    page: string,
  ) => {
    setActivePage(page)
    closeMenu()
  }

  /* =========================================================
     ESCAPE
  ========================================================= */

  useEffect(() => {
    const handleEscape = (
      event: KeyboardEvent,
    ) => {
      if (
        event.key === 'Escape' &&
        menuOpen
      ) {
        closeMenu()
      }
    }

    window.addEventListener(
      'keydown',
      handleEscape,
    )

    return () => {
      window.removeEventListener(
        'keydown',
        handleEscape,
      )
    }
  }, [menuOpen])

  /* =========================================================
     DRAG MENU
  ========================================================= */

  const handleMenuPointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    const button =
      menuButtonRef.current

    if (!button) {
      return
    }

    button.setPointerCapture(
      event.pointerId,
    )

    hasMovedRef.current = false

    dragStartRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      startX: menuPosition.x,
      startY: menuPosition.y,
    }
  }

  const handleMenuPointerMove = (
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    const button =
      menuButtonRef.current

    if (
      !button ||
      !button.hasPointerCapture(
        event.pointerId,
      )
    ) {
      return
    }

    const deltaX =
      event.clientX -
      dragStartRef.current.pointerX

    const deltaY =
      event.clientY -
      dragStartRef.current.pointerY

    const distance = Math.sqrt(
      deltaX * deltaX +
        deltaY * deltaY,
    )

    if (distance > 5) {
      hasMovedRef.current = true
    }

    if (!hasMovedRef.current) {
      return
    }

    const buttonWidth =
      button.offsetWidth

    const buttonHeight =
      button.offsetHeight

    const maxX =
      window.innerWidth -
      buttonWidth -
      8

    const maxY =
      window.innerHeight -
      buttonHeight -
      8

    const newX = Math.min(
      Math.max(
        8,
        dragStartRef.current.startX +
          deltaX,
      ),
      Math.max(8, maxX),
    )

    const newY = Math.min(
      Math.max(
        8,
        dragStartRef.current.startY +
          deltaY,
      ),
      Math.max(8, maxY),
    )

    setMenuPosition({
      x: newX,
      y: newY,
    })
  }

  const handleMenuPointerUp = (
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    const button =
      menuButtonRef.current

    if (
      button &&
      button.hasPointerCapture(
        event.pointerId,
      )
    ) {
      button.releasePointerCapture(
        event.pointerId,
      )
    }

    if (!hasMovedRef.current) {
      setMenuOpen(true)
    }
  }

  const handleMenuPointerCancel = (
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    const button =
      menuButtonRef.current

    if (
      button &&
      button.hasPointerCapture(
        event.pointerId,
      )
    ) {
      button.releasePointerCapture(
        event.pointerId,
      )
    }

    hasMovedRef.current = false
  }

  /* =========================================================
     LOGOUT
  ========================================================= */

  const handleLogout = async () => {
    try {
      closeMenu()
      resetCloudSession()
      await logoutUser()
    } catch (error) {
      console.error(
        'Logout gagal:',
        error,
      )
    }
  }

  /* =========================================================
     AUTH LOADING
  ========================================================= */

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="text-center">

          <div className="mx-auto mb-5 flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-blue-500 font-black text-slate-950">
            CT
          </div>

          <p className="text-sm font-semibold text-slate-400">
            Memeriksa sesi...
          </p>

        </div>
      </div>
    )
  }

  /* =========================================================
     LOGIN
  ========================================================= */

  if (!user) {
    return <Login />
  }

  /* =========================================================
     DATA LOADING
  ========================================================= */

  if (dataLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="w-full max-w-sm text-center">

          <div className="mx-auto mb-5 flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-blue-500 font-black text-slate-950">
            CT
          </div>

          <h1 className="text-xl font-black">
            Menyiapkan CatatToko
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Menghubungkan data toko kamu
            dengan Firebase...
          </p>

        </div>
      </div>
    )
  }

  /* =========================================================
     DATA ERROR
  ========================================================= */

  if (dataError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-white">

        <div className="w-full max-w-md rounded-[28px] border border-red-400/20 bg-white/[0.06] p-6 text-center shadow-2xl">

          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-2xl font-black text-red-400">
            !
          </div>

          <h1 className="text-xl font-black">
            Data belum bisa dimuat
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            {dataError}
          </p>

          <button
            type="button"
            onClick={() => {
              setDataError('')
              setDataLoading(true)

              initializeCloudData()
                .then(() => {
                  setDataLoading(false)
                })
                .catch((error) => {
                  console.error(
                    'Retry data gagal:',
                    error,
                  )

                  setDataLoading(false)
                  setDataError(
                    getDataErrorMessage(
                      error,
                    ),
                  )
                })
            }}
            className="mt-6 w-full rounded-2xl bg-white px-5 py-3.5 text-sm font-black text-slate-950 transition hover:bg-slate-100"
          >
            Coba Lagi
          </button>

          <button
            type="button"
            onClick={
              handleLogout
            }
            className="mt-3 w-full rounded-2xl border border-white/10 px-5 py-3.5 text-sm font-bold text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            Keluar
          </button>

        </div>

      </div>
    )
  }

  /* =========================================================
     PAGE RENDER
  ========================================================= */

  const renderPage = () => {
    switch (activePage) {
      case 'home':
        return (
          <Dashboard
            onNavigate={navigate}
          />
        )

      case 'transactions':
        return <Transaksi />

      case 'record':
        return <Catat />

      case 'sales':
        return <Penjualan />

      case 'products':
        return (
          <Produk
            onNavigate={navigate}
          />
        )

      case 'reports':
        return (
          <Laporan
            onNavigate={navigate}
          />
        )

      default:
        return (
          <Dashboard
            onNavigate={navigate}
          />
        )
    }
  }

  const drawerMenus = [
    {
      id: 'home',
      label: 'Beranda',
      description:
        'Dashboard utama',
      icon: '⌂',
    },
    {
      id: 'sales',
      label: 'Kasir',
      description:
        'Proses penjualan toko',
      icon: '▣',
    },
    {
      id: 'record',
      label: 'Catat Keuangan',
      description:
        'Pemasukan & pengeluaran',
      icon: '+',
    },
    {
      id: 'transactions',
      label: 'Transaksi',
      description:
        'Riwayat transaksi',
      icon: '↔',
    },
    {
      id: 'products',
      label: 'Produk & Stok',
      description:
        'Kelola barang toko',
      icon: '📦',
    },
    {
      id: 'reports',
      label: 'Laporan',
      description:
        'Laporan keuangan',
      icon: '▥',
    },
  ]

  return (
    <div className="mobile-device">

      <div className="app-shell">

        {/* FLOATING MENU */}

        <button
          ref={menuButtonRef}
          type="button"
          className={`menu-trigger ${
            hasMovedRef.current
              ? 'is-dragging'
              : ''
          }`}
          style={{
            left: `${menuPosition.x}px`,
            top: `${menuPosition.y}px`,
          }}
          onPointerDown={
            handleMenuPointerDown
          }
          onPointerMove={
            handleMenuPointerMove
          }
          onPointerUp={
            handleMenuPointerUp
          }
          onPointerCancel={
            handleMenuPointerCancel
          }
          aria-label="Buka menu"
          aria-expanded={
            menuOpen
          }
        >
          <span />
          <span />
          <span />
        </button>

        {/* TOP AREA */}

        <div className="mobile-app-top">
          <div className="mobile-status-space" />
        </div>

        {/* CONTENT */}

        <main className="app-content">
          {renderPage()}
        </main>

        {/* BOTTOM NAV */}

        <div className="app-bottom-nav">
          <BottomNav
            activePage={
              activePage
            }
            onChangePage={
              navigate
            }
          />
        </div>

        {/* DRAWER OVERLAY */}

        <div
          className={`drawer-overlay ${
            menuOpen
              ? 'open'
              : ''
          }`}
          onClick={
            closeMenu
          }
          aria-hidden="true"
        />

        {/* SIDE DRAWER */}

        <aside
          className={`side-drawer ${
            menuOpen
              ? 'open'
              : ''
          }`}
          aria-hidden={
            !menuOpen
          }
          inert={
            !menuOpen
          }
        >

          <div className="drawer-header">

            <div>
              <p className="drawer-kicker">
                CATATTOKO
              </p>

              <h2>
                Menu
              </h2>

              <p className="drawer-subtitle">
                Kelola toko dengan mudah
              </p>
            </div>

            <button
              type="button"
              className="drawer-close"
              onClick={
                closeMenu
              }
              aria-label="Tutup menu"
            >
              ×
            </button>

          </div>

          {/* USER */}

          <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">

            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Akun
            </p>

            <p className="mt-1 truncate text-sm font-bold text-slate-800">
              {user.email ||
                'Pengguna CatatToko'}
            </p>

          </div>

          {/* MENU */}

          <div className="drawer-menu-list">

            {drawerMenus.map(
              (menu) => {
                const isActive =
                  activePage ===
                  menu.id

                return (
                  <button
                    key={menu.id}
                    type="button"
                    className={`drawer-menu-item ${
                      isActive
                        ? 'active'
                        : ''
                    }`}
                    onClick={() =>
                      navigate(
                        menu.id,
                      )
                    }
                  >

                    <span className="drawer-menu-icon">
                      {menu.icon}
                    </span>

                    <span className="drawer-menu-content">

                      <strong>
                        {menu.label}
                      </strong>

                      <small>
                        {
                          menu.description
                        }
                      </small>

                    </span>

                    <span className="drawer-menu-arrow">
                      ›
                    </span>

                  </button>
                )
              },
            )}

          </div>

          {/* LOGOUT */}

          <button
            type="button"
            onClick={
              handleLogout
            }
            className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-red-400/10 bg-red-500/5 px-4 py-3.5 text-left transition hover:bg-red-500/10"
          >

            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-lg">
              ↪
            </span>

            <span>

              <strong className="block text-sm text-red-300">
                Keluar
              </strong>

              <small className="text-xs text-slate-500">
                Keluar dari akun
              </small>

            </span>

          </button>

          <div className="drawer-footer">

            <strong>
              CatatToko
            </strong>

            <span>
              Kasir & Keuangan UMKM
            </span>

          </div>

        </aside>

      </div>

    </div>
  )
}

export default App