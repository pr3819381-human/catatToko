type BottomNavProps = {
  activePage: string
  onChangePage: (page: string) => void
}

type MenuItem = {
  id: string
  label: string
  icon: string
}

const menus: MenuItem[] = [
  {
    id: 'home',
    label: 'Beranda',
    icon: '⌂',
  },
  {
    id: 'transactions',
    label: 'Transaksi',
    icon: '↔',
  },
  {
    id: 'record',
    label: 'Catat',
    icon: '+',
  },
  {
    id: 'products',
    label: 'Produk',
    icon: '📦',
  },
  {
    id: 'reports',
    label: 'Laporan',
    icon: '▥',
  },
]

function BottomNav({
  activePage,
  onChangePage,
}: BottomNavProps) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:px-5 sm:pb-5"
      aria-label="Navigasi utama"
    >
      <div className="relative mx-auto grid h-[72px] w-full max-w-xl grid-cols-5 items-center rounded-[2rem] border border-white/70 bg-white/95 px-2 shadow-[0_20px_55px_rgba(15,23,42,0.18)] backdrop-blur-2xl">

        {menus.map((menu) => {
          const isActive =
            activePage === menu.id

          const isRecord =
            menu.id === 'record'

          return (
            <button
              key={menu.id}
              type="button"
              onClick={() =>
                onChangePage(menu.id)
              }
              aria-label={`Buka ${menu.label}`}
              aria-current={
                isActive
                  ? 'page'
                  : undefined
              }
              className={`group relative flex h-full min-w-0 flex-col items-center justify-center rounded-2xl transition-all duration-200 active:scale-95 ${
                isRecord
                  ? 'z-10'
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              {isRecord ? (
                <>
                  <span
                    className={`-mt-8 flex h-14 w-14 items-center justify-center rounded-full border-[5px] border-white text-[30px] font-light leading-none text-white shadow-[0_12px_30px_rgba(37,99,235,0.32)] transition-all duration-200 group-hover:scale-105 group-active:scale-95 ${
                      isActive
                        ? 'bg-blue-700'
                        : 'bg-blue-600'
                    }`}
                  >
                    +
                  </span>

                  <span
                    className={`mt-1 text-[11px] font-black ${
                      isActive
                        ? 'text-blue-700'
                        : 'text-slate-500'
                    }`}
                  >
                    {menu.label}
                  </span>
                </>
              ) : (
                <>
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl text-[21px] leading-none transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-slate-400 group-hover:bg-slate-100'
                    }`}
                  >
                    {menu.icon}
                  </span>

                  <span
                    className={`mt-0.5 max-w-full truncate px-0.5 text-[10px] font-bold sm:text-[11px] ${
                      isActive
                        ? 'text-blue-600'
                        : 'text-slate-400'
                    }`}
                  >
                    {menu.label}
                  </span>

                  {isActive && (
                    <span className="absolute bottom-1 h-1 w-1 rounded-full bg-blue-600" />
                  )}
                </>
              )}
            </button>
          )
        })}

      </div>
    </nav>
  )
}

export default BottomNav