import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'

import { app } from './firebase'

export const auth =
  getAuth(app)

/* =========================================================
   VALIDATION
========================================================= */

function normalizeEmail(
  email: string,
): string {
  return email
    .trim()
    .toLowerCase()
}

function validateEmail(
  email: string,
): string {
  const normalizedEmail =
    normalizeEmail(email)

  if (!normalizedEmail) {
    throw new Error(
      'Email wajib diisi.',
    )
  }

  const emailPattern =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (
    !emailPattern.test(
      normalizedEmail,
    )
  ) {
    throw new Error(
      'Format email tidak valid.',
    )
  }

  return normalizedEmail
}

function validatePassword(
  password: string,
): void {
  if (!password) {
    throw new Error(
      'Password wajib diisi.',
    )
  }

  if (
    password.length < 6
  ) {
    throw new Error(
      'Password minimal 6 karakter.',
    )
  }
}

/* =========================================================
   REGISTER
========================================================= */

export async function registerUser(
  email: string,
  password: string,
): Promise<User> {
  const normalizedEmail =
    validateEmail(email)

  validatePassword(
    password,
  )

  const credential =
    await createUserWithEmailAndPassword(
      auth,
      normalizedEmail,
      password,
    )

  return credential.user
}

/* =========================================================
   LOGIN
========================================================= */

export async function loginUser(
  email: string,
  password: string,
): Promise<User> {
  const normalizedEmail =
    validateEmail(email)

  validatePassword(
    password,
  )

  const credential =
    await signInWithEmailAndPassword(
      auth,
      normalizedEmail,
      password,
    )

  return credential.user
}

/* =========================================================
   LOGOUT
========================================================= */

export async function logoutUser(): Promise<void> {
  await signOut(auth)
}

/* =========================================================
   CURRENT USER
========================================================= */

export function getCurrentUser(): User | null {
  return auth.currentUser
}

/* =========================================================
   AUTH STATE
========================================================= */

export function subscribeToAuth(
  callback: (
    user: User | null,
  ) => void,
): () => void {
  return onAuthStateChanged(
    auth,
    callback,
  )
}

/* =========================================================
   AUTH ERROR MESSAGE
========================================================= */

export function getAuthErrorMessage(
  error: unknown,
): string {
  if (
    error instanceof Error &&
    !(
      'code' in error
    )
  ) {
    return (
      error.message ||
      'Terjadi kesalahan. Silakan coba lagi.'
    )
  }

  if (
    !error ||
    typeof error !== 'object' ||
    !('code' in error)
  ) {
    return 'Terjadi kesalahan. Silakan coba lagi.'
  }

  const code =
    String(
      (
        error as {
          code?: unknown
        }
      ).code ?? '',
    )

  switch (code) {
    case 'auth/invalid-email':
      return 'Format email tidak valid.'

    case 'auth/missing-email':
      return 'Email wajib diisi.'

    case 'auth/missing-password':
      return 'Password wajib diisi.'

    case 'auth/user-not-found':
      return 'Akun dengan email tersebut tidak ditemukan.'

    case 'auth/wrong-password':
      return 'Password salah.'

    case 'auth/invalid-credential':
      return 'Email atau password salah.'

    case 'auth/email-already-in-use':
      return 'Email tersebut sudah terdaftar.'

    case 'auth/weak-password':
      return 'Password terlalu lemah. Gunakan minimal 6 karakter.'

    case 'auth/too-many-requests':
      return 'Terlalu banyak percobaan. Silakan coba lagi nanti.'

    case 'auth/network-request-failed':
      return 'Koneksi internet bermasalah. Periksa koneksi lalu coba lagi.'

    case 'auth/operation-not-allowed':
      return 'Login Email/Password belum diaktifkan di Firebase.'

    case 'auth/user-disabled':
      return 'Akun ini telah dinonaktifkan.'

    case 'auth/requires-recent-login':
      return 'Silakan login kembali untuk melakukan tindakan ini.'

    case 'auth/popup-closed-by-user':
      return 'Proses login dibatalkan.'

    case 'auth/credential-already-in-use':
      return 'Data autentikasi tersebut sudah digunakan akun lain.'

    case 'auth/internal-error':
      return 'Terjadi kesalahan internal Firebase. Silakan coba lagi.'

    case 'auth/invalid-api-key':
      return 'API key Firebase tidak valid. Periksa konfigurasi Firebase.'

    case 'auth/app-not-authorized':
      return 'Aplikasi ini belum diizinkan menggunakan Firebase Authentication.'

    case 'auth/unauthorized-domain':
      return 'Domain aplikasi belum diizinkan di Firebase Authentication.'

    default:
      return 'Autentikasi gagal. Silakan coba lagi.'
  }
}