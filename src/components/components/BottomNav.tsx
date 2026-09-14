type BottomNavProps = {
  activePage: string
  onChangePage: (page: string) => void
}


function BottomNav({
  activePage,
  onChangePage
}: BottomNavProps) {


  const menus = [

    {
      id: 'home',
      label: 'Beranda',
      icon: '⌂'
    },

    {
      id: 'transactions',
      label: 'Transaksi',
      icon: '↔'
    },

    {
      id: 'record',
      label: 'Catat',
      icon: '+'
    },

    {
      id: 'sales',
      label: 'Penjualan',
      icon: '▣'
    },

    {
      id: 'products',
      label: 'Produk',
      icon: '📦'
    },

    {
      id: 'reports',
      label: 'Laporan',
      icon: '▥'
    }

  ]


  return (

    <nav className="bottom-nav">

      {menus.map(
        menu => (

          <button
            key={menu.id}
            type="button"

            className={
              activePage === menu.id
                ? 'nav-item active'
                : 'nav-item'
            }

            onClick={() =>
              onChangePage(
                menu.id
              )
            }
          >

            <span className="nav-icon">

              {menu.icon}

            </span>


            <span className="nav-label">

              {menu.label}

            </span>

          </button>

        )
      )}

    </nav>

  )

}


export default BottomNav