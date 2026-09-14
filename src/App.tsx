import { useState } from 'react'

import './App.css'

import Dashboard from './pages/dashboard'
import Transaksi from './pages/Transaksi'
import Catat from './pages/Catat'
import Penjualan from './pages/Penjualan'
import Produk from './pages/produk'
import Laporan from './pages/Laporan'

import BottomNav from './components/components/BottomNav'


function App() {

  const [activePage, setActivePage] =
    useState('home')


  return (

    <div className="app">

      {activePage === 'home' && (

        <Dashboard
          onNavigate={setActivePage}
        />

      )}


      {activePage === 'transactions' && (

        <Transaksi />

      )}


      {activePage === 'record' && (

        <Catat />

      )}


      {activePage === 'sales' && (

        <Penjualan />

      )}


      {activePage === 'products' && (

        <Produk />

      )}


      {activePage === 'reports' && (

        <Laporan />

      )}


      <BottomNav
        activePage={activePage}
        onChangePage={setActivePage}
      />

    </div>

  )

}


export default App