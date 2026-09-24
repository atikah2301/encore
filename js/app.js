import { signIn, signOut, getSession, onAuthStateChange } from "./auth.js";
import { initWishlistView } from "./wishlist.js";
import { initHistoryView } from "./history.js";

const viewLogin = document.querySelector("#view-login");
const viewMain = document.querySelector("#view-main");
const loginForm = document.querySelector("#login-form");
const loginEmail = document.querySelector("#login-email");
const loginPassword = document.querySelector("#login-password");
const loginPasswordToggle = document.querySelector("#login-password-toggle");
const loginError = document.querySelector("#login-error");
const logoutButton = document.querySelector("#logout-button");
const tabButtons = document.querySelectorAll("nav.tabs button[data-tab]");

const panels = {
  wishlist: document.querySelector("#tab-wishlist"),
  history: document.querySelector("#tab-history"),
};

const initializers = {
  wishlist: initWishlistView,
  history: initHistoryView,
};

// Both tabs fetch fresh data from Supabase, so both re-initialize on every visit -
// e.g. marking a wishlist item as seen should be reflected in History next time
// you switch to it, without needing a full page reload.
function showTab(tabName) {
  for (const [name, panel] of Object.entries(panels)) {
    panel.hidden = name !== tabName;
  }
  tabButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tabName));
  initializers[tabName](panels[tabName]);
}

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => showTab(btn.dataset.tab));
});

function showLoggedIn() {
  viewLogin.hidden = true;
  viewMain.hidden = false;
  showTab("wishlist");
}

function showLoggedOut() {
  viewMain.hidden = true;
  viewLogin.hidden = false;
  loginPassword.value = "";
}

loginPasswordToggle.addEventListener("click", () => {
  const showing = loginPassword.type === "text";
  loginPassword.type = showing ? "password" : "text";
  loginPasswordToggle.textContent = showing ? "👁️" : "🙈";
  loginPasswordToggle.setAttribute("aria-label", showing ? "Show password" : "Hide password");
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.hidden = true;
  try {
    await signIn(loginEmail.value, loginPassword.value);
  } catch (err) {
    loginError.textContent = "Incorrect email or password.";
    loginError.hidden = false;
  }
});

logoutButton.addEventListener("click", async () => {
  await signOut();
});

onAuthStateChange((session) => {
  if (session) {
    showLoggedIn();
  } else {
    showLoggedOut();
  }
});

const session = await getSession();
if (session) {
  showLoggedIn();
} else {
  showLoggedOut();
}
