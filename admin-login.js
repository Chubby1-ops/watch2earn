const BACKEND_URL =
  "https://watch2earn-d9im.onrender.com";

const form =
  document.getElementById(
    "adminLoginForm",
  );

const passwordInput =
  document.getElementById(
    "adminPassword",
  );

const button =
  document.getElementById(
    "adminLoginButton",
  );

const message =
  document.getElementById(
    "adminLoginMessage",
  );

form.addEventListener(
  "submit",
  async (e) => {
    e.preventDefault();

    const password =
      passwordInput.value.trim();

    if (!password) {
      message.textContent =
        "Enter the admin password.";

      return;
    }

    button.disabled = true;
    button.textContent =
      "Checking...";
    message.textContent = "";

    try {
      const response =
        await fetch(
          BACKEND_URL +
            "/api/admin/login",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            credentials: "include",

            body: JSON.stringify({
              password,
            }),
          },
        );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Admin login failed.",
        );
      }

      if (
        !data.user ||
        !data.user.isAdmin
      ) {
        throw new Error(
          "This account does not have administrator access.",
        );
      }

      if (data.token) {
        localStorage.setItem(
          "watchsave_token",
          data.token,
        );
      }

      message.textContent =
        "Access granted. Opening dashboard...";

      window.location.href =
        "./admin.html";

    } catch (error) {
      console.error(
        "Admin login error:",
        error,
      );

      message.textContent =
        error.message ||
        "Admin login failed.";

      passwordInput.value = "";

    } finally {
      button.disabled = false;
      button.textContent =
        "Enter Dashboard";
    }
  },
);