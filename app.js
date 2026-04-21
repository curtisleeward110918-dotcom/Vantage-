const SUPABASE_URL = "https://wvptlyyxygoyipwbtzmp.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2cHRseXl4eWdveWlwd2J0em1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NTM2NjksImV4cCI6MjA5MTUyOTY2OX0.uuUUrmvR5lEXvuemHkE7ERr0Ef7vULBmkgKeJxJfI18";

const sbClient =
  window.sb || supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function refreshAuthUI() {
  const { data: { session } } = await sbClient.auth.getSession();

  const out = document.getElementById("loggedOutView");
  const inn = document.getElementById("loggedInView");
  const userEmail = document.getElementById("userEmail");

  if (!out || !inn) return;

  if (session && session.user) {
    out.style.display = "none";
    inn.style.display = "block";
    if (userEmail) userEmail.textContent = session.user.email;
  } else {
    out.style.display = "block";
    inn.style.display = "none";
    if (userEmail) userEmail.textContent = "-";
  }
}

document.getElementById("signUpBtn")?.addEventListener("click", async () => {
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value.trim();

  const { error } = await sbClient.auth.signUp({
    email,
    password
  });

  document.getElementById("authFeedback").textContent =
    error ? error.message : "Signup successful. Check your email.";
});

document.getElementById("signInBtn")?.addEventListener("click", async () => {
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value.trim();

  const { error } = await sbClient.auth.signInWithPassword({
    email,
    password
  });

  document.getElementById("authFeedback").textContent =
    error ? error.message : "Logged in.";

  refreshAuthUI();
});

document.getElementById("logOutBtn")?.addEventListener("click", async () => {
  await sbClient.auth.signOut();
  refreshAuthUI();
});

sbClient.auth.onAuthStateChange(() => {
  refreshAuthUI();
});

refreshAuthUI();
