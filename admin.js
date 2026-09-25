const BACKEND_URL = "https://watch2earn-d9im.onrender.com";

const $ = (s) => document.querySelector(s);

const money = (n) =>
  `₦${Number(n || 0).toFixed(2)}`;

const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[m],
  );

/* =========================
   AUTH TOKEN
========================= */

function getToken() {
  return (
    localStorage.getItem(
      "watchsave_token",
    ) || ""
  );
}

/* =========================
   API
========================= */

async function api(u, o = {}) {
  const headers = new Headers(
    o.headers || {},
  );

  const token = getToken();

  if (token) {
    headers.set(
      "Authorization",
      "Bearer " + token,
    );
  }

  /*
    IMPORTANT:
    Do NOT manually set Content-Type
    when sending FormData.
  */

  const r = await fetch(
    BACKEND_URL + u,
    {
      ...o,
      headers,
      credentials: "include",
    },
  );

  const d = await r
    .json()
    .catch(() => ({}));

  if (!r.ok) {
    throw Error(
      d.error ||
        `Request failed (${r.status})`,
    );
  }

  return d;
}

/* =========================
   TOAST
========================= */

function toast(
  m,
  g = true,
) {
  const x = $("#toast");

  if (!x) return;

  x.textContent = m;

  x.className =
    "toast show " +
    (g ? "good" : "bad");

  setTimeout(
    () =>
      (x.className =
        "toast"),
    3000,
  );
}

/* =====================================================
   ADMIN EXTRA STYLES
===================================================== */

function addAdminExtraStyles() {
  if (
    document.getElementById(
      "watchsave-admin-extra-styles",
    )
  ) {
    return;
  }

  const style =
    document.createElement("style");

  style.id =
    "watchsave-admin-extra-styles";

  style.textContent = `
    .admin-maintenance-card {
      margin-top: 18px;
      border: 1px solid rgba(255,122,0,.25);
      background:
        linear-gradient(
          145deg,
          rgba(255,122,0,.09),
          rgba(0,0,0,.45)
        );
      border-radius: 18px;
      padding: 18px;
    }

    .maintenance-row {
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:15px;
      flex-wrap:wrap;
    }

    .maintenance-status {
      display:inline-flex;
      align-items:center;
      gap:7px;
      padding:7px 11px;
      border-radius:999px;
      font-size:12px;
      font-weight:700;
      background:#171717;
      border:1px solid #333;
    }

    .maintenance-status.active {
      color:#ff7a00;
      border-color:rgba(255,122,0,.45);
    }

    .maintenance-status.live {
      color:#70e000;
      border-color:rgba(112,224,0,.3);
    }

    .user-balance {
      color:#ff7a00;
      font-size:16px;
      font-weight:800;
    }

    .user-stats {
      display:flex;
      flex-wrap:wrap;
      gap:6px;
      margin-top:8px;
    }

    .user-stat {
      display:inline-flex;
      align-items:center;
      padding:5px 8px;
      border-radius:7px;
      background:#111;
      border:1px solid #2b2b2b;
      font-size:11px;
      color:#bbb;
    }

    .user-actions {
      display:flex;
      flex-wrap:wrap;
      gap:6px;
      align-items:center;
    }

    .mini.money-add {
      color:#72e000;
      border-color:rgba(114,224,0,.3);
    }

    .mini.money-remove {
      color:#ff7a00;
      border-color:rgba(255,122,0,.3);
    }

    .mini.history-btn {
      color:#ddd;
    }

    .balance-modal {
      position:fixed;
      inset:0;
      z-index:100000;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:20px;
      background:rgba(0,0,0,.78);
      backdrop-filter:blur(8px);
    }

    .balance-modal.hidden {
      display:none;
    }

    .balance-modal-card {
      width:min(500px,100%);
      max-height:90vh;
      overflow:auto;
      background:#0d0d0d;
      border:1px solid #333;
      border-radius:20px;
      padding:22px;
      box-shadow:0 25px 80px rgba(0,0,0,.65);
    }

    .balance-modal-head {
      display:flex;
      justify-content:space-between;
      gap:15px;
      align-items:flex-start;
      margin-bottom:18px;
    }

    .balance-modal-head h2 {
      margin:0 0 5px;
    }

    .balance-modal-head p {
      margin:0;
      color:#aaa;
      font-size:13px;
    }

    .balance-close {
      width:38px;
      height:38px;
      border:1px solid #333;
      border-radius:10px;
      background:#151515;
      color:#fff;
      cursor:pointer;
      font-size:18px;
    }

    .balance-form label {
      display:block;
      margin-bottom:14px;
      color:#ccc;
      font-size:13px;
    }

    .balance-form input,
    .balance-form textarea {
      display:block;
      width:100%;
      margin-top:7px;
      box-sizing:border-box;
    }

    .balance-modal-actions {
      display:flex;
      gap:9px;
      margin-top:15px;
    }

    .balance-modal-actions button {
      flex:1;
    }

    .history-list {
      display:flex;
      flex-direction:column;
      gap:8px;
      margin-top:15px;
    }

    .history-item {
      padding:12px;
      border-radius:12px;
      background:#111;
      border:1px solid #292929;
    }

    .history-item-head {
      display:flex;
      justify-content:space-between;
      gap:10px;
    }

    .history-add {
      color:#72e000;
      font-weight:800;
    }

    .history-remove {
      color:#ff7a00;
      font-weight:800;
    }

    .history-item small {
      display:block;
      margin-top:5px;
      color:#888;
      line-height:1.4;
    }

    .maintenance-user-note {
      margin-top:10px;
      padding:10px 12px;
      border-radius:10px;
      background:rgba(255,122,0,.08);
      border:1px solid rgba(255,122,0,.18);
      color:#bbb;
      font-size:12px;
      line-height:1.5;
    }

    .referral-admin-card {
      margin-top:18px;
      border:1px solid rgba(255,122,0,.25);
      background:
        linear-gradient(
          145deg,
          rgba(255,122,0,.09),
          rgba(0,0,0,.45)
        );
      border-radius:18px;
      padding:18px;
    }

    .referral-admin-grid {
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:12px;
      margin-top:15px;
    }

    .referral-admin-field {
      display:block;
      color:#bbb;
      font-size:13px;
    }

    .referral-admin-field input {
      width:100%;
      box-sizing:border-box;
      margin-top:7px;
    }

    .referral-admin-actions {
      display:flex;
      gap:9px;
      flex-wrap:wrap;
      margin-top:15px;
    }

    .referral-admin-stats {
      display:flex;
      flex-wrap:wrap;
      gap:8px;
      margin-top:15px;
    }

    .referral-admin-stat {
      padding:9px 11px;
      border-radius:10px;
      background:#111;
      border:1px solid #292929;
      color:#bbb;
      font-size:12px;
    }

    .referral-admin-stat strong {
      color:#ff7a00;
    }

    @media(max-width:600px) {
      .maintenance-row {
        align-items:stretch;
      }

      .maintenance-row > div {
        width:100%;
      }

      .maintenance-row button {
        width:100%;
      }

      .balance-modal {
        padding:10px;
      }

      .balance-modal-card {
        padding:17px;
        border-radius:17px;
      }

      .balance-modal-actions {
        flex-direction:column;
      }

      .referral-admin-grid {
        grid-template-columns:1fr;
      }

      .referral-admin-actions button {
        width:100%;
      }
    }
  `;

  document.head.appendChild(
    style,
  );
}

/* =====================================================
   BALANCE / MAINTENANCE UI
===================================================== */

function createBalanceModal() {
  if (
    document.getElementById(
      "balanceModal",
    )
  ) {
    return;
  }

  const modal =
    document.createElement("div");

  modal.id = "balanceModal";

  modal.className =
    "balance-modal hidden";

  modal.innerHTML = `
    <div class="balance-modal-card">

      <div class="balance-modal-head">
        <div>
          <h2 id="balanceModalTitle">
            Balance adjustment
          </h2>

          <p id="balanceModalUser">
            User
          </p>
        </div>

        <button
          type="button"
          class="balance-close"
          id="balanceModalClose"
        >
          ×
        </button>
      </div>

      <form
        id="balanceForm"
        class="balance-form"
      >

        <label>
          Amount ₦

          <input
            id="balanceAmount"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Enter amount"
            required
          />
        </label>

        <label>
          Reason

          <textarea
            id="balanceReason"
            rows="3"
            maxlength="500"
            placeholder="Admin adjustment"
          ></textarea>
        </label>

        <div class="balance-modal-actions">

          <button
            type="button"
            class="ghost"
            id="balanceCancel"
          >
            Cancel
          </button>

          <button
            type="submit"
            class="primary"
            id="balanceSubmit"
          >
            Continue
          </button>

        </div>

      </form>

      <div
        id="balanceHistoryArea"
        style="display:none"
      ></div>

    </div>
  `;

  document.body.appendChild(
    modal,
  );

  $("#balanceModalClose").onclick =
    closeBalanceModal;

  $("#balanceCancel").onclick =
    closeBalanceModal;

  modal.addEventListener(
    "click",
    (e) => {
      if (
        e.target === modal
      ) {
        closeBalanceModal();
      }
    },
  );

  $("#balanceForm").onsubmit =
    submitBalanceAdjustment;
}

let balanceModalUserId = "";
let balanceModalMode = "add";

function openBalanceModal(
  user,
  mode,
) {
  createBalanceModal();

  balanceModalUserId =
    user.id;

  balanceModalMode =
    mode;

  const modal =
    $("#balanceModal");

  const title =
    $("#balanceModalTitle");

  const userText =
    $("#balanceModalUser");

  const submit =
    $("#balanceSubmit");

  const reason =
    $("#balanceReason");

  $("#balanceAmount").value =
    "";

  reason.value =
    mode === "add"
      ? "Admin gift"
      : "Admin adjustment";

  title.textContent =
    mode === "add"
      ? "Add money"
      : "Remove money";

  userText.textContent =
    `${user.name || "User"} • Current balance: ${money(user.balance)}`;

  submit.textContent =
    mode === "add"
      ? "Add money"
      : "Remove money";

  modal.classList.remove(
    "hidden",
  );

  setTimeout(() => {
    $("#balanceAmount")?.focus();
  }, 50);
}

function closeBalanceModal() {
  const modal =
    $("#balanceModal");

  if (modal) {
    modal.classList.add(
      "hidden",
    );
  }

  balanceModalUserId =
    "";

  balanceModalMode =
    "add";

  const form =
    $("#balanceForm");

  const historyArea =
    $("#balanceHistoryArea");

  if (form) {
    form.style.display =
      "";
  }

  if (historyArea) {
    historyArea.style.display =
      "none";
    historyArea.innerHTML =
      "";
  }
}

async function submitBalanceAdjustment(
  e,
) {
  e.preventDefault();

  if (!balanceModalUserId) {
    return;
  }

  const amount =
    Number(
      $("#balanceAmount")
        .value,
    );

  const reason =
    (
      $("#balanceReason")
        .value || ""
    ).trim() ||
    (
      balanceModalMode ===
      "add"
        ? "Admin gift"
        : "Admin adjustment"
    );

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    toast(
      "Enter a valid amount.",
      false,
    );

    return;
  }

  const submit =
    $("#balanceSubmit");

  const oldText =
    submit.textContent;

  submit.disabled = true;
  submit.textContent =
    "Saving...";

  try {
    const endpoint =
      balanceModalMode ===
      "add"
        ? `/api/admin/users/${balanceModalUserId}/add-money`
        : `/api/admin/users/${balanceModalUserId}/remove-money`;

    const result =
      await api(
        endpoint,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            amount,
            reason,
          }),
        },
      );

    toast(
      result.message ||
        (
          balanceModalMode ===
          "add"
            ? "Money added."
            : "Money removed."
        ),
    );

    closeBalanceModal();

    await users();
    await stats();

  } catch (e) {
    toast(
      e.message ||
        "Balance adjustment failed.",
      false,
    );
  } finally {
    submit.disabled =
      false;

    submit.textContent =
      oldText;
  }
}

/* =====================================================
   BALANCE HISTORY
===================================================== */

async function showBalanceHistory(
  user,
) {
  createBalanceModal();

  balanceModalUserId =
    user.id;

  const modal =
    $("#balanceModal");

  const title =
    $("#balanceModalTitle");

  const userText =
    $("#balanceModalUser");

  const form =
    $("#balanceForm");

  const historyArea =
    $("#balanceHistoryArea");

  title.textContent =
    "Balance history";

  userText.textContent =
    `${user.name || "User"} • Current balance: ${money(user.balance)}`;

  form.style.display =
    "none";

  historyArea.style.display =
    "block";

  historyArea.innerHTML =
    `<div class="empty">
      Loading balance history...
    </div>`;

  modal.classList.remove(
    "hidden",
  );

  try {
    const d =
      await api(
        `/api/admin/users/${user.id}/balance-history`,
      );

    const history =
      d.history || [];

    if (!history.length) {
      historyArea.innerHTML =
        `<div class="empty">
          No manual balance adjustments yet.
        </div>`;

      return;
    }

    historyArea.innerHTML = `
      <div class="history-list">
        ${history
          .map(
            (h) => `
              <div class="history-item">

                <div class="history-item-head">

                  <strong class="${
                    h.direction ===
                    "add"
                      ? "history-add"
                      : "history-remove"
                  }">

                    ${
                      h.direction ===
                      "add"
                        ? "+"
                        : "−"
                    }${money(
                      h.amount,
                    )}

                  </strong>

                  <small>
                    ${new Date(
                      h.createdAt,
                    ).toLocaleString()}
                  </small>

                </div>

                <small>
                  ${esc(
                    h.reason ||
                      "Admin adjustment",
                  )}
                </small>

                <small>
                  Admin:
                  ${esc(
                    h.adminName ||
                      "Admin",
                  )}
                </small>

              </div>
            `,
          )
          .join("")}
      </div>
    `;
  } catch (e) {
    historyArea.innerHTML =
      `<div class="empty">
        Could not load balance history.
      </div>`;

    toast(
      e.message,
      false,
    );
  }
}

/* =====================================================
   REFERRAL ADMIN SETTINGS
===================================================== */

function createReferralAdminPanel() {
  const dash =
    $("#dash");

  if (!dash) return;

  if (
    $("#adminReferralCard")
  ) {
    return;
  }

  const card =
    document.createElement(
      "div",
    );

  card.id =
    "adminReferralCard";

  card.className =
    "referral-admin-card";

  card.innerHTML = `
    <div class="eyebrow">
      REFER & EARN CONTROL
    </div>

    <h2 style="margin:6px 0 5px">
      Referral Settings
    </h2>

    <p
      style="
        margin:0;
        color:#aaa;
        font-size:13px;
        line-height:1.5;
      "
    >
      Configure how many qualified referrals are required
      and how much the referrer receives after reaching
      the requirement.
    </p>

    <div class="referral-admin-grid">

      <label class="referral-admin-field">
        Required qualified referrals

        <input
          id="referralRequiredInput"
          type="number"
          min="1"
          step="1"
          value="10"
          placeholder="10"
        />
      </label>

      <label class="referral-admin-field">
        Reward amount ₦

        <input
          id="referralRewardInput"
          type="number"
          min="1"
          step="0.01"
          value="1500"
          placeholder="1500"
        />
      </label>

    </div>

    <div class="referral-admin-actions">

      <button
        id="saveReferralSettings"
        class="primary"
        type="button"
      >
        Save Referral Settings
      </button>

      <button
        id="refreshReferralSettings"
        class="ghost"
        type="button"
      >
        Refresh
      </button>

    </div>

    <div
      id="referralAdminStatus"
      class="maintenance-user-note"
    >
      Loading referral settings...
    </div>

    <div
      id="referralAdminStats"
      class="referral-admin-stats"
    ></div>
  `;

  dash.appendChild(
    card,
  );

  $("#saveReferralSettings").onclick =
    saveReferralSettings;

  $("#refreshReferralSettings").onclick =
    loadReferralAdminSettings;
}

async function loadReferralAdminSettings() {
  const status =
    $("#referralAdminStatus");

  try {
    const d =
      await api(
        "/api/admin/referrals",
      );

    const required =
      Number(
        d.requiredReferrals ??
          10,
      );

    const reward =
      Number(
        d.rewardAmount ??
          1500,
      );

    if (
      $("#referralRequiredInput")
    ) {
      $("#referralRequiredInput").value =
        required;
    }

    if (
      $("#referralRewardInput")
    ) {
      $("#referralRewardInput").value =
        reward;
    }

    if (status) {
      status.textContent =
        `Current setting: ${required} qualified referrals = ${money(reward)} reward. Qualification balance is ${money(d.qualificationBalance || 5000)}.`;
    }

    const statsBox =
      $("#referralAdminStats");

    if (statsBox) {
      statsBox.innerHTML = `
        <div class="referral-admin-stat">
          Required:
          <strong>
            ${required}
          </strong>
        </div>

        <div class="referral-admin-stat">
          Reward:
          <strong>
            ${money(reward)}
          </strong>
        </div>

        <div class="referral-admin-stat">
          Qualification balance:
          <strong>
            ${money(
              d.qualificationBalance ||
                5000,
            )}
          </strong>
        </div>

        <div class="referral-admin-stat">
          Referrers rewarded:
          <strong>
            ${Number(
              d.rewardedReferrers ||
                0,
            )}
          </strong>
        </div>
      `;
    }

  } catch (e) {
    if (status) {
      status.textContent =
        e.message ||
        "Could not load referral settings.";
    }

    toast(
      e.message ||
        "Could not load referral settings.",
      false,
    );
  }
}

async function saveReferralSettings() {
  const requiredInput =
    $("#referralRequiredInput");

  const rewardInput =
    $("#referralRewardInput");

  const button =
    $("#saveReferralSettings");

  if (
    !requiredInput ||
    !rewardInput ||
    !button
  ) {
    return;
  }

  const required =
    Number(
      requiredInput.value,
    );

  const reward =
    Number(
      rewardInput.value,
    );

  if (
    !Number.isFinite(required) ||
    required < 1 ||
    !Number.isInteger(required)
  ) {
    toast(
      "Required referrals must be a whole number of at least 1.",
      false,
    );

    return;
  }

  if (
    !Number.isFinite(reward) ||
    reward <= 0
  ) {
    toast(
      "Enter a valid referral reward.",
      false,
    );

    return;
  }

  const oldText =
    button.textContent;

  button.disabled = true;
  button.textContent =
    "Saving...";

  try {
    const d =
      await api(
        "/api/admin/referrals",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            requiredReferrals:
              required,
            rewardAmount:
              reward,
          }),
        },
      );

    toast(
      d.message ||
        "Referral settings saved.",
    );

    await loadReferralAdminSettings();

  } catch (e) {
    toast(
      e.message ||
        "Could not save referral settings.",
      false,
    );
  } finally {
    button.disabled =
      false;

    button.textContent =
      oldText;
  }
}

/* =====================================================
   MAINTENANCE
===================================================== */

async function maintenance() {
  try {
    const d =
      await api(
        "/api/admin/maintenance",
      );

    renderMaintenance(
      Boolean(d.maintenance),
    );
  } catch (e) {
    console.warn(
      "Maintenance status failed:",
      e,
    );
  }
}

function renderMaintenance(
  enabled,
) {
  const status =
    $("#maintenanceStatus");

  const button =
    $("#maintenanceButton");

  const note =
    $("#maintenanceNote");

  if (!status || !button)
    return;

  if (enabled) {
    status.className =
      "maintenance-status active";

    status.innerHTML =
      "● Maintenance ON";

    button.textContent =
      "Release / Resume Site";

    button.className =
      "primary";

    if (note) {
      note.textContent =
        "Users are currently blocked from watching videos, claiming rewards and making withdrawals. The admin dashboard remains available.";
    }
  } else {
    status.className =
      "maintenance-status live";

    status.innerHTML =
      "● Site LIVE";

    button.textContent =
      "Put Site On Hold";

    button.className =
      "ghost";

    if (note) {
      note.textContent =
        "The site is currently available to normal users.";
    }
  }
}

function createMaintenancePanel() {
  const dash =
    $("#dash");

  if (!dash) return;

  if (
    $("#adminMaintenanceCard")
  ) {
    return;
  }

  const card =
    document.createElement(
      "div",
    );

  card.id =
    "adminMaintenanceCard";

  card.className =
    "admin-maintenance-card";

  card.innerHTML = `
    <div class="maintenance-row">

      <div>
        <div class="eyebrow">
          SITE CONTROL
        </div>

        <h2 style="margin:6px 0 5px">
          Maintenance / Hold Mode
        </h2>

        <p
          id="maintenanceNote"
          style="
            margin:0;
            color:#aaa;
            font-size:13px;
            line-height:1.5;
          "
        >
          Checking site status...
        </p>
      </div>

      <div
        style="
          display:flex;
          align-items:center;
          gap:9px;
          flex-wrap:wrap;
          justify-content:flex-end;
        "
      >
        <span
          id="maintenanceStatus"
          class="maintenance-status"
        >
          Checking...
        </span>

        <button
          id="maintenanceButton"
          class="ghost"
          type="button"
        >
          Checking...
        </button>
      </div>

    </div>

    <div class="maintenance-user-note">
      Admin access remains available while maintenance
      mode is active. Normal users will see a maintenance
      message instead of being allowed to earn or withdraw.
    </div>
  `;

  dash.appendChild(
    card,
  );

  $("#maintenanceButton").onclick =
    toggleMaintenance;
}

async function toggleMaintenance() {
  const button =
    $("#maintenanceButton");

  if (!button) return;

  const currentlyOn =
    $("#maintenanceStatus")?.classList.contains(
      "active",
    );

  const newState =
    !currentlyOn;

  const actionText =
    newState
      ? "put the site on maintenance?"
      : "release the site and allow users again?";

  if (
    !confirm(
      `Are you sure you want to ${actionText}`,
    )
  ) {
    return;
  }

  const oldText =
    button.textContent;

  button.disabled = true;
  button.textContent =
    "Updating...";

  try {
    const d =
      await api(
        "/api/admin/maintenance",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            active: newState,
          }),
        },
      );

    renderMaintenance(
      Boolean(d.maintenance),
    );

    toast(
      d.maintenance
        ? "Site placed on maintenance."
        : "Site released. Users can continue.",
    );
  } catch (e) {
    toast(
      e.message ||
        "Could not change maintenance mode.",
      false,
    );

    button.textContent =
      oldText;
  } finally {
    button.disabled =
      false;
  }
}

/* =========================
   TABS
========================= */

document
  .querySelectorAll(".tab")
  .forEach(
    (b) =>
      (b.onclick = () => {
        document
          .querySelectorAll(
            ".tab",
          )
          .forEach((x) =>
            x.classList.remove(
              "active",
            ),
          );

        document
          .querySelectorAll(
            ".pane",
          )
          .forEach((x) =>
            x.classList.remove(
              "active",
            ),
          );

        b.classList.add(
          "active",
        );

        const pane = $(
          "#" + b.dataset.tab,
        );

        if (pane) {
          pane.classList.add(
            "active",
          );
        }

        if (
          b.dataset.tab ===
          "users"
        ) {
          users();
        }

        if (
          b.dataset.tab ===
          "vids"
        ) {
          videos();
        }

        if (
          b.dataset.tab ===
          "wd"
        ) {
          withdrawals();
        }

        if (
          b.dataset.tab ===
          "chats"
        ) {
          chats();
        }
      }),
  );

/* =========================
   STATS
========================= */

async function stats() {
  const s = await api(
    "/api/admin/stats",
  );

  $("#su").textContent =
    s.users;

  $("#so").textContent =
    $("#topOnline").textContent =
      s.online;

  $("#sv").textContent =
    s.videos;

  $("#sp").textContent =
    s.pendingWithdrawals;
}

/* =========================
   VIDEOS
========================= */

async function videos() {
  const d = await api(
    "/api/admin/videos",
  );

  $("#videoList").innerHTML =
    d.videos.length
      ? d.videos
          .map(
            (v) =>
              `<div class="table">
                <div>
                  <b>${esc(
                    v.title,
                  )}</b>

                  <small>
                    ${esc(
                      v.type,
                    )}
                    ·
                    ${esc(
                      v.source,
                    )}
                  </small>
                </div>

                <label>
                  ₦
                  <input
                    class="edit reward"
                    data-id="${v.id}"
                    type="number"
                    min="0"
                    value="${v.reward}"
                  >
                </label>

                <label>
                  <input
                    class="edit duration"
                    data-id="${v.id}"
                    type="number"
                    min="5"
                    value="${v.duration}"
                  >
                  sec
                </label>

                <button
                  class="mini"
                  onclick="saveVideo('${v.id}')"
                >
                  Save
                </button>

                <button
                  class="mini danger"
                  onclick="delVideo('${v.id}')"
                >
                  Delete
                </button>
              </div>`,
          )
          .join("")
      : '<div class="empty">No videos.</div>';
}

window.saveVideo =
  async (id) => {
    const r =
      document.querySelector(
        `.reward[data-id="${id}"]`,
      );

    const d =
      document.querySelector(
        `.duration[data-id="${id}"]`,
      );

    try {
      await api(
        "/api/admin/videos/" +
          id,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            reward: r.value,
            duration:
              d.value,
          }),
        },
      );

      toast("Saved.");

      videos();
    } catch (e) {
      toast(
        e.message,
        false,
      );
    }
  };

window.delVideo =
  async (id) => {
    if (
      !confirm(
        "Delete this video?",
      )
    )
      return;

    try {
      await api(
        "/api/admin/videos/" +
          id,
        {
          method: "DELETE",
        },
      );

      toast(
        "Video deleted.",
      );

      videos();
      stats();
    } catch (e) {
      toast(
        e.message,
        false,
      );
    }
  };

/* =====================================================
   USERS
===================================================== */

async function users() {
  const d = await api(
    "/api/admin/users",
  );

  $("#usersList").innerHTML =
    d.users.length
      ? d.users
          .map(
            (u) =>
              `<div class="user">

                <div class="avatar">
                  ${esc(
                    (
                      u.name ||
                      "?"
                    )[0].toUpperCase(),
                  )}
                </div>

                <div>

                  <b>${esc(
                    u.name ||
                      "Unnamed user",
                  )}</b>

                  <small>
                    ${esc(
                      u.email,
                    )}
                    ${
                      u.phone
                        ? " · " +
                          esc(
                            u.phone,
                          )
                        : ""
                    }
                  </small>

                  <small>
                    Username:
                    ${
                      u.username
                        ? esc(
                            u.username,
                          )
                        : "—"
                    }
                  </small>

                  <small>
                    Joined:
                    ${new Date(
                      u.joinedAt,
                    ).toLocaleString()}
                  </small>

                  <small>
                    Last login:
                    ${
                      u.lastLoginAt
                        ? new Date(
                            u.lastLoginAt,
                          ).toLocaleString()
                        : "Never"
                    }
                  </small>

                  <small>
                    Last seen:
                    ${
                      u.lastSeen
                        ? new Date(
                            u.lastSeen,
                          ).toLocaleString()
                        : "Never"
                    }
                  </small>

                  <div class="user-stats">

                    <span class="user-stat">
                      Balance:
                      <span
                        class="user-balance"
                        style="margin-left:4px"
                      >
                        ${money(
                          u.balance,
                        )}
                      </span>
                    </span>

                    <span class="user-stat">
                      Videos watched:
                      ${
                        Number(
                          u.videosWatched ||
                            0,
                        )
                      }
                    </span>

                    <span class="user-stat">
                      Referral code:
                      ${
                        u.referralCode
                          ? esc(
                              u.referralCode,
                            )
                          : "—"
                      }
                    </span>

                    <span class="user-stat">
                      Qualified referrals:
                      ${
                        u.qualifiedReferrals ??
                        "—"
                      }
                    </span>

                    <span class="user-stat">
                      Referral status:
                      ${
                        u.referralQualified
                          ? "Qualified"
                          : "Not qualified"
                      }
                    </span>

                  </div>

                </div>

                <span class="status ${
                  u.online
                    ? "on"
                    : "off"
                }">
                  ●
                  ${
                    u.online
                      ? "Online"
                      : "Offline"
                  }
                </span>

                <div class="user-actions">

                  <button
                    class="mini money-add"
                    onclick='openBalanceModal(${JSON.stringify(
                      {
                        id: u.id,
                        name:
                          u.name,
                        balance:
                          u.balance,
                      },
                    )}, "add")'
                  >
                    + Add Money
                  </button>

                  <button
                    class="mini money-remove"
                    onclick='openBalanceModal(${JSON.stringify(
                      {
                        id: u.id,
                        name:
                          u.name,
                        balance:
                          u.balance,
                      },
                    )}, "remove")'
                  >
                    − Remove Money
                  </button>

                  <button
                    class="mini history-btn"
                    onclick='showBalanceHistory(${JSON.stringify(
                      {
                        id: u.id,
                        name:
                          u.name,
                        balance:
                          u.balance,
                      },
                    )})'
                  >
                    Balance History
                  </button>

                  <button
                    class="mini danger"
                    onclick="kick('${u.id}')"
                  >
                    Remove account
                  </button>

                </div>

              </div>`,
          )
          .join("")
      : '<div class="empty">No users.</div>';
}

window.kick =
  async (id) => {
    if (
      !confirm(
        "Remove this account and kick the user out? They will need to create a new account.",
      )
    )
      return;

    try {
      await api(
        "/api/admin/users/" +
          id,
        {
          method: "DELETE",
        },
      );

      toast(
        "Account removed.",
      );

      users();
      stats();
    } catch (e) {
      toast(
        e.message,
        false,
      );
    }
  };

/* =========================
   WITHDRAWALS
========================= */

async function withdrawals() {
  const d = await api(
    "/api/admin/withdrawals",
  );

  $("#wdList").innerHTML =
    d.withdrawals.length
      ? d.withdrawals
          .map(
            (w) =>
              `<div class="table">
                <div>
                  <b>${esc(
                    w.userName,
                  )}</b>

                  <small>
                    ${esc(
                      w.userEmail,
                    )}
                    ·
                    ${esc(
                      w.method,
                    )}
                  </small>

                  <small>
                    Bank:
                    ${esc(
                      w.bankName ||
                        "Not supplied",
                    )}
                    · Account:
                    ${esc(
                      w.account ||
                        "",
                    )}
                  </small>

                  <small>
                    Account name:
                    ${esc(
                      w.accountName ||
                        "Not verified",
                    )}
                  </small>
                </div>

                <strong>
                  ${money(
                    w.amount,
                  )}
                </strong>

                <span class="status">
                  ${esc(
                    w.status,
                  )}
                </span>

                ${
                  w.status ===
                  "pending"
                    ? `
                      <button
                        class="mini"
                        onclick="proc('${w.id}','approved')"
                      >
                        Approve
                      </button>

                      <button
                        class="mini danger"
                        onclick="proc('${w.id}','rejected')"
                      >
                        Reject
                      </button>
                    `
                    : ""
                }
              </div>`,
          )
          .join("")
      : '<div class="empty">No withdrawal requests.</div>';
}

window.proc =
  async (
    id,
    status,
  ) => {
    try {
      await api(
        "/api/admin/withdrawals/" +
          id,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            status,
          }),
        },
      );

      toast(
        "Withdrawal " +
          status +
          ".",
      );

      withdrawals();
      stats();
    } catch (e) {
      toast(
        e.message,
        false,
      );
    }
  };

/* =========================
   CHATS
========================= */

async function chats() {
  const d = await api(
    "/api/admin/chats",
  );

  $("#chatList").innerHTML =
    d.chats.length
      ? d.chats
          .map(
            (c) =>
              `<div class="chat-card">

                <div class="chat-card-head">
                  <div>
                    <b>${esc(
                      c.userName,
                    )}</b>

                    <small>
                      ${esc(
                        c.userEmail,
                      )}
                    </small>
                  </div>

                  <span>
                    ${new Date(
                      c.updatedAt,
                    ).toLocaleString()}
                  </span>
                </div>

                <div class="chat-messages admin-messages">

                  ${c.messages
                    .map(
                      (m) =>
                        `<div class="chat-msg ${
                          m.sender ===
                          "admin"
                            ? "mine"
                            : m.sender ===
                                "user"
                              ? "theirs"
                              : "system-msg"
                        }">

                          <span>
                            ${
                              m.sender ===
                              "admin"
                                ? "You"
                                : m.sender ===
                                    "user"
                                  ? esc(
                                      c.userName,
                                    )
                                  : "Watchsave"
                            }
                          </span>

                          <p>
                            ${esc(
                              m.text,
                            )}
                          </p>

                          <small>
                            ${new Date(
                              m.createdAt,
                            ).toLocaleString()}
                          </small>

                        </div>`,
                    )
                    .join("")}

                </div>

                <form
                  class="chat-form admin-chat-form"
                  data-chat="${c.id}"
                >

                  <input
                    maxlength="2000"
                    placeholder="Message ${esc(
                      c.userName,
                    )}..."
                    required
                  >

                  <button
                    class="primary"
                    type="submit"
                  >
                    Send
                  </button>

                </form>

              </div>`,
          )
          .join("")
      : '<div class="empty">No private chats yet. A chat is created automatically when a user submits a withdrawal request.</div>';

  document
    .querySelectorAll(
      ".admin-chat-form",
    )
    .forEach(
      (f) =>
        (f.onsubmit =
          async (e) => {
            e.preventDefault();

            const input =
              f.querySelector(
                "input",
              );

            const text =
              input.value.trim();

            if (!text) return;

            try {
              await api(
                "/api/admin/chats/" +
                  f.dataset.chat +
                  "/messages",
                {
                  method:
                    "POST",
                  headers: {
                    "Content-Type":
                      "application/json",
                  },
                  body: JSON.stringify(
                    {
                      text,
                    },
                  ),
                },
              );

              input.value =
                "";

              chats();
            } catch (x) {
              toast(
                x.message,
                false,
              );
            }
          }),
    );
}

$("#refreshChats").onclick =
  chats;

/* =========================
   PUBLISH URL VIDEO
========================= */

$("#urlForm").onsubmit =
  async (e) => {
    e.preventDefault();

    try {
      await api(
        "/api/admin/videos/url",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            Object.fromEntries(
              new FormData(
                e.target,
              ),
            ),
          ),
        },
      );

      e.target.reset();

      e.target.reward.value =
        50;

      e.target.duration.value =
        30;

      toast(
        "Video published.",
      );

      videos();
      stats();
    } catch (x) {
      toast(
        x.message,
        false,
      );
    }
  };

/* =========================
   PHONE VIDEO SELECTION
========================= */

const videoInput =
  document.querySelector(
    '#uploadForm input[name="video"]',
  );

if (videoInput) {
  videoInput.addEventListener(
    "change",
    () => {
      const file =
        videoInput.files?.[0];

      if (!file) return;

      console.log(
        "Selected video:",
        file.name,
        file.size,
        file.type,
      );
    },
  );
}

/* =========================
   UPLOAD VIDEO
========================= */

$("#uploadForm").onsubmit =
  async (e) => {
    e.preventDefault();

    const form = e.target;

    const button =
      form.querySelector(
        'button[type="submit"]',
      );

    const fileInput =
      form.querySelector(
        'input[name="video"]',
      );

    const file =
      fileInput?.files?.[0];

    if (!file) {
      toast(
        "Please select a video first.",
        false,
      );

      return;
    }

    const MAX_SIZE =
      250 * 1024 * 1024;

    if (file.size > MAX_SIZE) {
      toast(
        "Video is too large. Maximum size is 250 MB.",
        false,
      );

      return;
    }

    if (
      !file.type.startsWith(
        "video/",
      )
    ) {
      toast(
        "Please select a valid video file.",
        false,
      );

      return;
    }

    if (button) {
      button.disabled = true;
      button.dataset.oldText =
        button.textContent;
      button.textContent =
        "Uploading...";
      button.style.opacity =
        "0.7";
      button.style.cursor =
        "wait";
    }

    try {
      const formData =
        new FormData(form);

      await api(
        "/api/admin/videos/upload",
        {
          method: "POST",
          body: formData,
        },
      );

      form.reset();

      if (form.reward) {
        form.reward.value =
          50;
      }

      if (form.duration) {
        form.duration.value =
          30;
      }

      toast(
        "Video uploaded successfully.",
      );

      await videos();
      await stats();

    } catch (x) {
      console.error(
        "Video upload failed:",
        x,
      );

      let message =
        x.message ||
        "Video upload failed. Please try again.";

      if (
        message
          .toLowerCase()
          .includes("failed to fetch")
      ) {
        message =
          "Cannot connect to the Watchsave server. Check your internet connection and Render backend.";
      }

      toast(
        message,
        false,
      );

    } finally {
      if (button) {
        button.disabled = false;

        button.textContent =
          button.dataset.oldText ||
          "Upload & publish";

        button.style.opacity =
          "";

        button.style.cursor =
          "";
      }
    }
  };

/* =========================
   REFRESH USERS
========================= */

$("#refreshUsers").onclick =
  users;

/* =========================
   LOGOUT
========================= */

$("#logout").onclick =
  async () => {
    try {
      await api(
        "/api/auth/logout",
        {
          method: "POST",
        },
      );
    } catch (e) {
      console.warn(
        "Logout request failed:",
        e,
      );
    } finally {
      localStorage.removeItem(
        "watchsave_token",
      );

      location.href =
        "./login.html";
    }
  };

/* =====================================================
   AUTO REFRESH
===================================================== */

setInterval(() => {
  stats().catch(() => {});
  maintenance().catch(() => {});
  loadReferralAdminSettings().catch(
    () => {},
  );

  if (
    $("#users").classList.contains(
      "active",
    )
  ) {
    users().catch(() => {});
  }

  if (
    $("#chats").classList.contains(
      "active",
    )
  ) {
    chats().catch(() => {});
  }
}, 7000);

/* =====================================================
   INITIAL LOAD
===================================================== */

(async () => {
  try {
    addAdminExtraStyles();
    createMaintenancePanel();
    createReferralAdminPanel();
    createBalanceModal();

    const m = await api(
      "/api/auth/me",
    );

    if (
      !m.user ||
      !m.user.isAdmin
    ) {
      throw Error(
        "Admin access required",
      );
    }

    await stats();
    await videos();
    await maintenance();
    await loadReferralAdminSettings();

  } catch (e) {
    console.error(
      "Admin authentication failed:",
      e,
    );

    localStorage.removeItem(
      "watchsave_token",
    );

    location.href =
      "./login.html";
  }
})();