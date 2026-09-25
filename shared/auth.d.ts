declare module '#auth-utils' {
  interface User {
    id: string
    email: string
    name: string
    role: 'buyer' | 'maker' | 'admin'
    /** Null until the user opens a shop. Cached on the session so maker-only
     *  endpoints do not hit the database just to authorise. */
    makerId: string | null
    avatarUrl: string | null
  }

  interface UserSession {
    loggedInAt: number
  }
}

export {}
