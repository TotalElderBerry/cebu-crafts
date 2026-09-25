export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useUserSession()

  if (!loggedIn.value) {
    // Carry the destination so sign-in can drop the user back where they were.
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }
})
