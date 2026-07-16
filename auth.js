// Shared auth guard, included after supabase-config.js on every dashboard page
// except login.html. Redirects to login if there's no active session.
async function requireSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = "login.html";
    return null;
  }
  return session;
}

function wireLogoutButton(buttonEl) {
  buttonEl.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "login.html";
  });
}
