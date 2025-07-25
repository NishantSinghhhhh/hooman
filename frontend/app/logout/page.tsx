"use client"

import { signOut } from "next-auth/react"
import { useEffect } from "react"

export default function LogoutPage() {
  useEffect(() => {
    signOut({ callbackUrl: "/login", redirect: true })
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">Signing out...</p>
      </div>
    </div>
  )
}