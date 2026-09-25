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

/* =========================
   ADMIN EXTRA STYLES
========================= */

function addAdminExtraStyles() {
  if ($("#watchsaveAdminExtraStyles")) {
    return;
  }

  const style =
    document.createElement("style");

  style.id =
    "watchsaveAdminExtraStyles";

  style.textContent = `
    .ws-maintenance-control {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-left: 12px;
    }

    .ws-maintenance-btn {
      border: 1px solid rgba(255,122,0,.35);
      background: rgba(255,122,0,.10);
      color: #ff9a3d;
      border-radius: 10px;
      padding: 9px 13px;
      font-weight: 800;
      cursor: pointer;
      transition: .2s ease;
    }

    .ws-maintenance-btn:hover {
      background: rgba(255,122,0,.18);
      transform: translateY(-1px);
    }

    .ws-maintenance-btn.active {
      background: #ff7900;
      color: #fff;
      border-color: #ff7900;
    }

    .ws-maintenance-status {
      font-size: 12px;
      font-weight: 700;
      color: #aaa;
    }

    .ws-user-grid {
      display: grid;
      grid-template-columns:
        minmax(180px, 1.4fr)
        minmax(130px, 1fr)
        minmax(180px, 1.4fr)
        minmax(130px, 1fr)
        minmax(120px, .8fr);
      gap: 6px 18px;
      margin-top: 7px;
    }

    .ws-user-grid small {
      display: block;
      color: rgba(255,255,255,.58);
      font-size: 12px;
      line-height: 1.45;
    }

    .ws-balance {
      color: #ff9a3d !important;
      font-weight: 800;
      font-size: 14px !important;
    }

    .ws-referral {
      color: #ddd !important;
    }

    .ws-user-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 10px;
    }

    .ws-user-actions .mini {
      white-space: nowrap;
    }

    .ws-money-add {
      border-color: rgba(50,200,120,.35) !important;
      color: #65d99b !important;
    }

    .ws-money-remove {
      border-color: rgba(255,90,90,.35) !important;
      color: #ff7777 !important;
    }

    .ws-history {
      margin-top: 12px;
      border-top: 1px solid rgba(255,255,255,.08);
      padding-top: 12px;
      display: none;
    }

    .ws-history.open {
      display: block;
    }

    .ws-history-item {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 15px;
      padding: 10px 0;
      border-bottom: 1px solid rgba(255,255,255,.06);
    }

    .ws-history-item:last-child {
      border-bottom: 0;
    }

    .ws-history-positive {
      color: #65d99b;
      font-weight: 800;
    }

    .ws-history-negative {
      color: #ff7777;
      font-weight: 800;
    }

    .ws-history-item small {
      display: block;
      color: rgba(255,255,255,.55);
      margin-top: 3px;
    }

    .ws-modal-overlay {
      position: fixed;
      inset: 0;
      z-index: 99999;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: rgba(0,0,0,.72);
      backdrop-filter: blur(8px);
    }

    .ws-modal-overlay.show {
      display: flex;
    }

    .ws-modal-card {
      width: min(460px, 100%);
      background:
        linear-gradient(
          145deg,
          rgba(25,25,25,.99),
          rgba(8,8,8,.99)
        );
      border: 1px solid rgba(255,122,0,.25);
      border-radius: 20px;
      padding: 25px;
      box-shadow:
        0 30px 100px rgba(0,0,0,.65),
        0 0 50px rgba(255,122,0,.07);
    }

    .ws-modal-card h2 {
      margin: 0 0 7px;
    }

    .ws-modal-card p {
      margin: 0 0 20px;
      color: rgba(255,255,255,.62);
      line-height: 1.5;
    }

    .ws-modal-card label {
      display: block;
      margin: 13px 0 6px;
      font-size: 13px;
      color: rgba(255,255,255,.7);
    }

    .ws-modal-card input,
    .ws-modal-card textarea {
      width: 100%;
      box-sizing: border-box;
      padding: 12px;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,.12);
      background: #111;
      color: #fff;
      outline: none;
      resize: vertical;
    }

    .ws-modal-card input:focus,
    .ws-modal-card textarea:focus {
      border-color: #ff7900;
    }

    .ws-modal-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 20px;
    }

    .ws-modal-actions button {
      border: 0;
      border-radius: 10px;
      padding: 11px 16px;
      cursor: pointer;
      font-weight: 800;
    }

    .ws-modal-cancel {
      background: rgba(255,255,255,.08);
      color: #fff;
    }

    .ws-modal-confirm {
      background: #ff7900;
      color: #fff;
    }

    .ws-modal-confirm.danger {
      background: #b83232;
    }

    .ws-maintenance-banner {
      margin: 12px 0;
      padding: 13px 15px;
      border-radius: 12px;
      border: 1px solid rgba(255,122,0,.25);
      background: rgba(255,122,0,.08);
      color: #ff9a3d;
      font-size: 13px;
      font-weight: 700;
      display: none;
    }

    .ws-maintenance-banner.show {
      display: block;
    }

    @media (max-width: 900px) {
      .ws-user-grid {
        grid-template-columns:
          1fr 1fr;
      }
    }

    @media (max-width: 600px) {
      .ws-user-grid {
        grid-template-columns: 1fr;
      }

      .ws-maintenance-control {
        margin-left: 0;
        margin-top: 8px;
      }
    }
  `;

  document.head.appendChild(style);
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
   MAINTENANCE
========================= */

let maintenanceMode = false;

function createMaintenanceControl() {
  addAdminExtraStyles();

  if (
    $("#watchsaveMaintenanceControl")
  ) {
    return;
  }

  /*
    Put the control into the existing
    admin topbar when possible.
  */

  const topbar =
    document.querySelector(
      ".topbar",
    );

  if (!topbar) {
    return;
  }

  const control =
    document.createElement("div");

  control.id =
    "watchsaveMaintenanceControl";

  control.className =
    "ws-maintenance-control";

  control.innerHTML = `
    <span
      id="watchsaveMaintenanceStatus"
      class="ws-maintenance-status"
    >
      Checking site...
    </span>

    <button
      id="watchsaveMaintenanceBtn"
      class="ws-maintenance-btn"
      type="button"
    >
      Maintenance
    </button>
  `;

  topbar.appendChild(control);

  $("#watchsaveMaintenanceBtn").onclick =
    toggleMaintenance;
}

async function loadMaintenance() {
  try {
    const d = await api(
      "/api/admin/maintenance",
    );

    maintenanceMode =
      !!d.maintenance;

    updateMaintenanceUI();
  } catch (e) {
    console.warn(
      "Could not load maintenance state:",
      e,
    );
  }
}

function updateMaintenanceUI() {
  const btn =
    $("#watchsaveMaintenanceBtn");

  const status =
    $("#watchsaveMaintenanceStatus");

  if (!btn || !status) {
    return;
  }

  if (maintenanceMode) {
    btn.textContent =
      "Release / Resume";

    btn.classList.add(
      "active",
    );

    status.textContent =
      "Site is on hold";

    status.style.color =
      "#ff9a3d";
  } else {
    btn.textContent =
      "Put Site on Hold";

    btn.classList.remove(
      "active",
    );

    status.textContent =
      "Site is live";

    status.style.color =
      "#65d99b";
  }
}

async function toggleMaintenance() {
  const newState =
    !maintenanceMode;

  const message =
    newState
      ? "Put Watchsave into maintenance mode? Normal users will be unable to watch, claim rewards, or withdraw until you release the site."
      : "Release Watchsave from maintenance mode and allow users to continue?";

  if (!confirm(message)) {
    return;
  }

  const btn =
    $("#watchsaveMaintenanceBtn");

  if (btn) {
    btn.disabled = true;
    btn.textContent =
      "Updating...";
  }

  try {
    const d = await api(
      "/api/admin/maintenance",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          enabled: newState,
        }),
      },
    );

    maintenanceMode =
      !!d.maintenance;

    updateMaintenanceUI();

    toast(
      maintenanceMode
        ? "Watchsave is now on maintenance hold."
        : "Watchsave has been released.",
    );
  } catch (e) {
    toast(
      e.message,
      false,
    );
  } finally {
    if (btn) {
      btn.disabled = false;
    }

    updateMaintenanceUI();
  }
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

/* =========================
   USER MODALS
========================= */

let moneyModalUser = null;
let moneyModalAction = null;

function createMoneyModal() {
  if ($("#watchsaveMoneyModal")) {
    return;
  }

  addAdminExtraStyles();

  const modal =
    document.createElement("div");

  modal.id =
    "watchsaveMoneyModal";

  modal.className =
    "ws-modal-overlay";

  modal.innerHTML = `
    <div class="ws-modal-card">

      <h2 id="wsMoneyTitle">
        Adjust balance
      </h2>

      <p id="wsMoneyDescription">
        Adjust this user's balance.
      </p>

      <label>
        Amount
      </label>

      <input
        id="wsMoneyAmount"
        type="number"
        min="0.01"
        step="0.01"
        placeholder="5000"
      >

      <label>
        Reason
      </label>

      <textarea
        id="wsMoneyReason"
        rows="3"
        maxlength="250"
        placeholder="Admin adjustment"
      ></textarea>

      <div class="ws-modal-actions">

        <button
          id="wsMoneyCancel"
          class="ws-modal-cancel"
          type="button"
        >
          Cancel
        </button>

        <button
          id="wsMoneyConfirm"
          class="ws-modal-confirm"
          type="button"
        >
          Confirm
        </button>

      </div>

    </div>
  `;

  document.body.appendChild(
    modal,
  );

  $("#wsMoneyCancel").onclick =
    closeMoneyModal;

  $("#wsMoneyConfirm").onclick =
    submitMoneyAdjustment;

  modal.onclick = (e) => {
    if (
      e.target === modal
    ) {
      closeMoneyModal();
    }
  };
}

function openMoneyModal(
  userId,
  action,
) {
  createMoneyModal();

  const modal =
    $("#watchsaveMoneyModal");

  const amount =
    $("#wsMoneyAmount");

  const reason =
    $("#wsMoneyReason");

  const title =
    $("#wsMoneyTitle");

  const description =
    $("#wsMoneyDescription");

  const confirmButton =
    $("#wsMoneyConfirm");

  const targetUser =
    window.__watchsaveUsers?.find(
      (u) =>
        String(u.id) ===
        String(userId),
    );

  if (!targetUser) {
    toast(
      "User not found.",
      false,
    );

    return;
  }

  moneyModalUser =
    targetUser;

  moneyModalAction =
    action;

  amount.value = "";
  reason.value =
    "Admin adjustment";

  if (action === "add") {
    title.textContent =
      "Add money";

    description.textContent =
      `${targetUser.name} currently has ${money(
        targetUser.balance,
      )}. Enter the amount to add.`;

    confirmButton.textContent =
      "Add Money";

    confirmButton.classList.remove(
      "danger",
    );
  } else {
    title.textContent =
      "Remove money";

    description.textContent =
      `${targetUser.name} currently has ${money(
        targetUser.balance,
      )}. Enter the amount to remove.`;

    confirmButton.textContent =
      "Remove Money";

    confirmButton.classList.add(
      "danger",
    );
  }

  modal.classList.add(
    "show",
  );

  setTimeout(
    () =>
      amount.focus(),
    50,
  );
}

function closeMoneyModal() {
  const modal =
    $("#watchsaveMoneyModal");

  if (modal) {
    modal.classList.remove(
      "show",
    );
  }

  moneyModalUser = null;
  moneyModalAction = null;
}

async function submitMoneyAdjustment() {
  if (
    !moneyModalUser ||
    !moneyModalAction
  ) {
    return;
  }

  const amountInput =
    $("#wsMoneyAmount");

  const reasonInput =
    $("#wsMoneyReason");

  const button =
    $("#wsMoneyConfirm");

  const amount =
    Number(amountInput.value);

  const reason =
    reasonInput.value.trim() ||
    "Admin adjustment";

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

  if (
    moneyModalAction ===
      "remove" &&
    amount >
      Number(
        moneyModalUser.balance ||
          0,
      )
  ) {
    toast(
      "You cannot remove more than the user's current balance.",
      false,
    );

    return;
  }

  button.disabled = true;
  button.textContent =
    "Processing...";

  try {
    const endpoint =
      moneyModalAction ===
      "add"
        ? `/api/admin/users/${encodeURIComponent(
            moneyModalUser.id,
          )}/add-money`
        : `/api/admin/users/${encodeURIComponent(
            moneyModalUser.id,
          )}/remove-money`;

    const d = await api(
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

    closeMoneyModal();

    toast(
      d.message ||
        "Balance updated successfully.",
    );

    await users();
  } catch (e) {
    toast(
      e.message,
      false,
    );
  } finally {
    button.disabled = false;
  }
}

window.openAddMoney =
  (id) =>
    openMoneyModal(
      id,
      "add",
    );

window.openRemoveMoney =
  (id) =>
    openMoneyModal(
      id,
      "remove",
    );

/* =========================
   BALANCE HISTORY
========================= */

async function toggleBalanceHistory(
  userId,
) {
  const container =
    document.querySelector(
      `.balance-history[data-user="${userId}"]`,
    );

  if (!container) {
    return;
  }

  if (
    container.classList.contains(
      "open",
    )
  ) {
    container.classList.remove(
      "open",
    );

    return;
  }

  container.innerHTML =
    '<small>Loading balance history...</small>';

  container.classList.add(
    "open",
  );

  try {
    const d = await api(
      `/api/admin/users/${encodeURIComponent(
        userId,
      )}/balance-history`,
    );

    const history =
      d.history || [];

    if (!history.length) {
      container.innerHTML =
        '<small>No balance adjustments yet.</small>';

      return;
    }

    container.innerHTML =
      history
        .map(
          (h) => {
            const positive =
              h.direction ===
              "add";

            return `
              <div class="ws-history-item">

                <div>
                  <strong>
                    ${esc(
                      h.userName ||
                        "",
                    )}
                  </strong>

                  <small>
                    ${esc(
                      h.reason ||
                        "Admin adjustment",
                    )}
                  </small>

                  <small>
                    ${new Date(
                      h.createdAt,
                    ).toLocaleString()}
                  </small>

                  <small>
                    Admin:
                    ${esc(
                      h.adminName ||
                        "Admin",
                    )}
                  </small>
                </div>

                <strong
                  class="${
                    positive
                      ? "ws-history-positive"
                      : "ws-history-negative"
                  }"
                >
                  ${
                    positive
                      ? "+"
                      : "-"
                  }${money(
                    h.amount,
                  )}
                </strong>

              </div>
            `;
          },
        )
        .join("");
  } catch (e) {
    container.innerHTML =
      `<small>${esc(
        e.message ||
          "Could not load balance history.",
      )}</small>`;
  }
}

window.toggleBalanceHistory =
  toggleBalanceHistory;

/* =========================
   USERS
========================= */

async function users() {
  const d = await api(
    "/api/admin/users",
  );

  window.__watchsaveUsers =
    d.users || [];

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

                <div style="min-width:0;flex:1">

                  <b>
                    ${esc(
                      u.name,
                    )}
                  </b>

                  <div class="ws-user-grid">

                    <small>
                      Username:
                      <strong>
                        ${
                          u.username
                            ? "@" +
                              esc(
                                u.username,
                              )
                            : "Not set"
                        }
                      </strong>
                    </small>

                    <small>
                      Email:
                      ${esc(
                        u.email,
                      )}
                    </small>

                    <small>
                      Phone:
                      ${
                        u.phone
                          ? esc(
                              u.phone,
                            )
                          : "Not supplied"
                      }
                    </small>

                    <small class="ws-balance">
                      Balance:
                      ${money(
                        u.balance,
                      )}
                    </small>

                    <small>
                      Joined:
                      ${new Date(
                        u.joinedAt,
                      ).toLocaleDateString()}
                    </small>

                    <small>
                      Videos watched:
                      <strong>
                        ${Number(
                          u.videosWatched ||
                            0,
                        )}
                      </strong>
                    </small>

                    <small class="ws-referral">
                      Qualified referrals:
                      <strong>
                        ${Number(
                          u.qualifiedReferrals ||
                            0,
                        )}
                      </strong>
                    </small>

                    <small>
                      Referral code:
                      ${
                        u.referralCode
                          ? esc(
                              u.referralCode,
                            )
                          : "Not available"
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

                  </div>

                  <div class="ws-user-actions">

                    <span
                      class="status ${
                        u.online
                          ? "on"
                          : "off"
                      }"
                    >
                      ●
                      ${
                        u.online
                          ? "Online"
                          : "Offline"
                      }
                    </span>

                    <button
                      class="mini ws-money-add"
                      onclick="openAddMoney('${u.id}')"
                    >
                      + Add Money
                    </button>

                    <button
                      class="mini ws-money-remove"
                      onclick="openRemoveMoney('${u.id}')"
                    >
                      − Remove Money
                    </button>

                    <button
                      class="mini"
                      onclick="toggleBalanceHistory('${u.id}')"
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

                  <div
                    class="ws-history balance-history"
                    data-user="${u.id}"
                  ></div>

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

async function loadReferralSettings() {
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/admin/referrals`,
      {
        credentials: "include",
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data.error ||
          "Could not load referral settings."
      );
    }

    const requiredInput =
      document.getElementById(
        "referralRequired"
      );

    const rewardInput =
      document.getElementById(
        "referralReward"
      );

    const info =
      document.getElementById(
        "referralQualificationInfo"
      );

    if (requiredInput) {
      requiredInput.value =
        data.requiredReferrals ?? 10;
    }

    if (rewardInput) {
      rewardInput.value =
        data.rewardAmount ?? 1500;
    }

    if (info) {
      info.textContent =
        `A referral becomes successful after the referred user reaches ₦${Number(
          data.qualificationBalance ?? 5000
        ).toLocaleString()} in balance.`;
    }
  } catch (err) {
    console.error(
      "REFERRAL SETTINGS LOAD ERROR:",
      err
    );
  }
}

async function saveReferralSettings(event) {
  event.preventDefault();

  const requiredReferrals = Number(
    document.getElementById(
      "referralRequired"
    )?.value
  );

  const rewardAmount = Number(
    document.getElementById(
      "referralReward"
    )?.value
  );

  if (
    !Number.isInteger(requiredReferrals) ||
    requiredReferrals < 1
  ) {
    toast(
      "Enter a valid number of required referrals."
    );
    return;
  }

  if (
    !Number.isFinite(rewardAmount) ||
    rewardAmount < 1
  ) {
    toast(
      "Enter a valid referral reward."
    );
    return;
  }

  try {
    const res = await fetch(
      `${BACKEND_URL}/api/admin/referrals`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          requiredReferrals,
          rewardAmount,
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data.error ||
          "Could not save referral settings."
      );
    }

    toast(
      data.message ||
        "Referral settings saved successfully."
    );

    await loadReferralSettings();
  } catch (err) {
    console.error(
      "REFERRAL SETTINGS SAVE ERROR:",
      err
    );

    toast(
      err.message ||
        "Could not save referral settings."
    );
  }
}

document.addEventListener(
  "DOMContentLoaded",
  () => {
    const form =
      document.getElementById(
        "referralSettingsForm"
      );

    if (form) {
      form.addEventListener(
        "submit",
        saveReferralSettings
      );
    }
  }
);

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

/* =========================
   AUTO REFRESH
========================= */

setInterval(() => {
  stats().catch(() => {});

  loadMaintenance().catch(
    () => {},
  );

  if (
    $("#users")?.classList.contains(
      "active",
    )
  ) {
    users().catch(() => {});
  }

  if (
    $("#chats")?.classList.contains(
      "active",
    )
  ) {
    chats().catch(() => {});
  }
}, 7000);

/* =========================
   INITIAL LOAD
========================= */

(async () => {
  try {
    addAdminExtraStyles();
    createMoneyModal();
    createMaintenanceControl();

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

async function loadReferralSettings() {
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/admin/referrals`,
      {
        credentials: "include",
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data.error ||
          "Could not load referral settings."
      );
    }

    const requiredInput =
      document.getElementById(
        "referralRequired"
      );

    const rewardInput =
      document.getElementById(
        "referralReward"
      );

    const info =
      document.getElementById(
        "referralQualificationInfo"
      );

    if (requiredInput) {
      requiredInput.value =
        data.requiredReferrals ?? 10;
    }

    if (rewardInput) {
      rewardInput.value =
        data.rewardAmount ?? 1500;
    }

    if (info) {
      info.textContent =
        `A referral becomes successful after the referred user reaches ₦${Number(
          data.qualificationBalance ?? 5000
        ).toLocaleString()} in balance.`;
    }
  } catch (err) {
    console.error(
      "REFERRAL SETTINGS LOAD ERROR:",
      err
    );
  }
}

async function saveReferralSettings(event) {
  event.preventDefault();

  const requiredReferrals = Number(
    document.getElementById(
      "referralRequired"
    )?.value
  );

  const rewardAmount = Number(
    document.getElementById(
      "referralReward"
    )?.value
  );

  if (
    !Number.isInteger(requiredReferrals) ||
    requiredReferrals < 1
  ) {
    toast(
      "Enter a valid number of required referrals."
    );
    return;
  }

  if (
    !Number.isFinite(rewardAmount) ||
    rewardAmount < 1
  ) {
    toast(
      "Enter a valid referral reward."
    );
    return;
  }

  try {
    const res = await fetch(
      `${BACKEND_URL}/api/admin/referrals`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          requiredReferrals,
          rewardAmount,
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data.error ||
          "Could not save referral settings."
      );
    }

    toast(
      data.message ||
        "Referral settings saved successfully."
    );

    await loadReferralSettings();
  } catch (err) {
    console.error(
      "REFERRAL SETTINGS SAVE ERROR:",
      err
    );

    toast(
      err.message ||
        "Could not save referral settings."
    );
  }
}

document.addEventListener(
  "DOMContentLoaded",
  () => {
    const form =
      document.getElementById(
        "referralSettingsForm"
      );

    if (form) {
      form.addEventListener(
        "submit",
        saveReferralSettings
      );
    }
  }
);

    await videos();
    await loadMaintenance();

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