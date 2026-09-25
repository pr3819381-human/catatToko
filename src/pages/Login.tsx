import {
  useState,
  type FormEvent,
} from 'react'

import {
  getAuthErrorMessage,
  loginUser,
  registerUser,
} from '../auth'

type LoginProps = {
  onSuccess?: () => void
}

function Login({
  onSuccess,
}: LoginProps) {
  const [mode, setMode] =
    useState<'login' | 'register'>(
      'login',
    )

  const [email, setEmail] =
    useState('')

  const [password, setPassword] =
    useState('')

  const [confirmPassword, setConfirmPassword] =
    useState('')

  const [showPassword, setShowPassword] =
    useState(false)

  const [loading, setLoading] =
    useState(false)

  const [error, setError] =
    useState('')

  const [success, setSuccess] =
    useState('')

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    setError('')
    setSuccess('')

    const normalizedEmail =
      email.trim().toLowerCase()

    if (!normalizedEmail) {
      setError(
        'Email wajib diisi.',
      )
      return
    }

    if (!normalizedEmail.includes('@')) {
      setError(
        'Masukkan alamat email yang valid.',
      )
      return
    }

    if (!password) {
      setError(
        'Password wajib diisi.',
      )
      return
    }

    if (
      mode === 'register' &&
      password.length < 6
    ) {
      setError(
        'Password minimal 6 karakter.',
      )
      return
    }

    if (
      mode === 'register' &&
      password !== confirmPassword
    ) {
      setError(
        'Konfirmasi password tidak sama.',
      )
      return
    }

    try {
      setLoading(true)

      if (mode === 'login') {
        await loginUser(
          normalizedEmail,
          password,
        )

        onSuccess?.()
        return
      }

      await registerUser(
        normalizedEmail,
        password,
      )

      setSuccess(
        'Akun berhasil dibuat. Selamat datang di CatatToko.',
      )

      setPassword('')
      setConfirmPassword('')

      onSuccess?.()
    } catch (authError) {
      setError(
        getAuthErrorMessage(
          authError,
        ),
      )
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (
    nextMode:
      | 'login'
      | 'register',
  ) => {
    if (loading) {
      return
    }

    setMode(nextMode)
    setError('')
    setSuccess('')
    setPassword('')
    setConfirmPassword('')
  }

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 px-4 py-8 text-white sm:px-6">

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-blue-600/20 blur-3xl" />

        <div className="absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-cyan-500/15 blur-3xl" />

        <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center justify-center">

        <div className="w-full">

          <div className="mb-8 text-center">

            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br from-blue-400 via-cyan-400 to-indigo-500 text-xl font-black text-slate-950 shadow-2xl shadow-blue-500/20">
              CT
            </div>

            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.3em] text-cyan-300">
              CATATTOKO
            </p>

            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              {mode === 'login'
                ? 'Selamat Datang'
                : 'Buat Akun'}
            </h1>

            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-400">
              {mode === 'login'
                ? 'Masuk untuk mengelola kasir, stok, transaksi, dan keuangan toko.'
                : 'Daftarkan akun untuk mulai menggunakan CatatToko.'}
            </p>

          </div>

          <section className="rounded-[28px] border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-7">

            <div className="mb-6 grid grid-cols-2 rounded-2xl bg-black/20 p-1">

              <button
                type="button"
                disabled={loading}
                onClick={() =>
                  switchMode('login')
                }
                className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                  mode === 'login'
                    ? 'bg-white text-slate-950 shadow-lg'
                    : 'text-slate-400 hover:text-white'
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                Masuk
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() =>
                  switchMode(
                    'register',
                  )
                }
                className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                  mode === 'register'
                    ? 'bg-white text-slate-950 shadow-lg'
                    : 'text-slate-400 hover:text-white'
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                Daftar
              </button>

            </div>

            {error && (
              <div
                role="alert"
                className="mb-5 flex gap-3 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm leading-5 text-red-200"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-xs font-black text-red-300">
                  !
                </span>

                <p className="m-0">
                  {error}
                </p>
              </div>
            )}

            {success && (
              <div
                role="status"
                className="mb-5 flex gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm leading-5 text-emerald-200"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-black text-emerald-300">
                  ✓
                </span>

                <p className="m-0">
                  {success}
                </p>
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              noValidate
              className="space-y-5"
            >

              <div>

                <label
                  htmlFor="login-email"
                  className="mb-2 block text-sm font-bold text-slate-200"
                >
                  Email
                </label>

                <input
                  id="login-email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value,
                    )
                  }
                  placeholder="nama@email.com"
                  autoComplete="email"
                  disabled={loading}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/60 focus:bg-black/30 focus:ring-4 focus:ring-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                />

              </div>

              <div>

                <div className="mb-2 flex items-center justify-between gap-3">

                  <label
                    htmlFor="login-password"
                    className="block text-sm font-bold text-slate-200"
                  >
                    Password
                  </label>

                  {mode ===
                    'register' && (
                    <span className="text-[11px] font-medium text-slate-500">
                      Minimal 6 karakter
                    </span>
                  )}

                </div>

                <div className="relative">

                  <input
                    id="login-password"
                    name="password"
                    type={
                      showPassword
                        ? 'text'
                        : 'password'
                    }
                    value={password}
                    onChange={(event) =>
                      setPassword(
                        event.target.value,
                      )
                    }
                    placeholder="Masukkan password"
                    autoComplete={
                      mode === 'login'
                        ? 'current-password'
                        : 'new-password'
                    }
                    disabled={loading}
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 pr-24 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/60 focus:bg-black/30 focus:ring-4 focus:ring-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                  />

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() =>
                      setShowPassword(
                        (value) =>
                          !value,
                      )
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl px-3 py-2 text-xs font-bold text-slate-400 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {showPassword
                      ? 'Sembunyikan'
                      : 'Lihat'}
                  </button>

                </div>

              </div>

              {mode ===
                'register' && (
                <div>

                  <label
                    htmlFor="login-confirm-password"
                    className="mb-2 block text-sm font-bold text-slate-200"
                  >
                    Konfirmasi Password
                  </label>

                  <input
                    id="login-confirm-password"
                    name="confirmPassword"
                    type={
                      showPassword
                        ? 'text'
                        : 'password'
                    }
                    value={
                      confirmPassword
                    }
                    onChange={(event) =>
                      setConfirmPassword(
                        event.target
                          .value,
                      )
                    }
                    placeholder="Ulangi password"
                    autoComplete="new-password"
                    disabled={loading}
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/60 focus:bg-black/30 focus:ring-4 focus:ring-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                  />

                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-500 px-5 py-4 text-sm font-black text-slate-950 shadow-xl shadow-blue-500/10 transition hover:-translate-y-0.5 hover:shadow-blue-500/20 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? 'Memproses...'
                  : mode === 'login'
                    ? 'Masuk ke CatatToko'
                    : 'Buat Akun CatatToko'}
              </button>

            </form>

            <div className="mt-6 border-t border-white/10 pt-5">

              <div className="flex gap-3 rounded-2xl bg-white/[0.03] p-4">

                <span className="mt-0.5 text-base">
                  🔐
                </span>

                <p className="m-0 text-xs leading-5 text-slate-500">
                  Akun dikelola menggunakan
                  Firebase Authentication.
                  Gunakan email dan password
                  yang kamu daftarkan untuk
                  masuk kembali.
                </p>

              </div>

            </div>

          </section>

          <p className="mt-6 text-center text-xs text-slate-600">
            CatatToko • Kasir & Keuangan UMKM
          </p>

        </div>

      </div>
    </main>
  )
}

export default Login