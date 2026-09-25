import {
  getApps,
  initializeApp,
  type FirebaseApp,
} from 'firebase/app'

import {
  getAuth,
  type Auth,
} from 'firebase/auth'

import {
  getFirestore,
  type Firestore,
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey:
    'AIzaSyBSKN1l0FSzUPtR_ekBjwWzQZk9vyP3vM0',

  authDomain:
    'catattoko.firebaseapp.com',

  projectId:
    'catattoko',

  storageBucket:
    'catattoko.firebasestorage.app',

  messagingSenderId:
    '245906691521',

  appId:
    '1:245906691521:web:82afc1c34b01e6efd34b40',

  measurementId:
    'G-KYRG3SJ72R',
}

const app: FirebaseApp =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp(firebaseConfig)

export { app }

export const firebaseApp: FirebaseApp =
  app

export const db: Firestore =
  getFirestore(app)

export const firebaseAuth: Auth =
  getAuth(app)