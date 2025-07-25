import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export function useAuth(requireAuth = true) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (requireAuth && status === "unauthenticated") {
      router.push("/auth/login")
    }
  }, [status, router, requireAuth])

  const token = (session as any)?.backendToken
  const userId = (session as any)?.userId

  return {
    session,
    status,
    token,
    userId,
    isAuthenticated: !!session && !!token,
    isLoading: status === "loading"
  }
}