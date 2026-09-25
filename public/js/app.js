const BACKEND_URL = "https://watch2earn-d9im.onrender.com";

const $ = (s) => document.querySelector(s);

let user = null,
  videos = [],
  active = null,
  timer = null,
  left = 0;

let maintenanceActive = false;
let maintenanceWatcher = null;
let maintenanceLoading = false;

/* =========================
   SETTINGS
========================= */

const MIN_WITHDRAWAL = 10000;
const REFERRAL_MIN_BALANCE = 5000;

/* =========================
   MONEY
========================= */

const money = (n) =>
  `₦${Number(n || 0).toFixed(2)}`;

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
   MAINTENANCE SCREEN
========================= */

function addMaintenanceStyles() {
  if ($("#watchsaveMaintenanceStyles")) {
    return;
  }

  const style =
    document.createElement("style");

  style.id =
    "watchsaveMaintenanceStyles";

  style.textContent = `
    #watchsaveMaintenance {
      position: fixed;
      inset: 0;
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background:
        radial-gradient(
          circle at top,
          rgba(255, 122, 0, 0.16),
          transparent 42%
        ),
        #050505;
      color: #fff;
      text-align: center;
      overflow-y: auto;
    }

    #watchsaveMaintenance.hidden {
      display: none;
    }

    .ws-maintenance-card {
      width: min(520px, 100%);
      padding: 42px 30px;
      border: 1px solid rgba(255, 122, 0, 0.28);
      border-radius: 24px;
      background:
        linear-gradient(
          145deg,
          rgba(255, 122, 0, 0.09),
          rgba(255, 255, 255, 0.025)
        );
      box-shadow:
        0 30px 90px rgba(0, 0, 0, 0.65),
        0 0 60px rgba(255, 122, 0, 0.08);
      backdrop-filter: blur(16px);
      animation: wsMaintenanceIn .45s ease;
    }

    .ws-maintenance-logo {
      font-size: 28px;
      font-weight: 900;
      letter-spacing: 1px;
      margin-bottom: 28px;
    }

    .ws-maintenance-logo span {
      color: #ff7900;
    }

    .ws-maintenance-icon {
      width: 86px;
      height: 86px;
      margin: 0 auto 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40px;
      background: rgba(255, 122, 0, 0.12);
      border: 1px solid rgba(255, 122, 0, 0.3);
      box-shadow:
        0 0 0 10px rgba(255, 122, 0, 0.035),
        0 0 45px rgba(255, 122, 0, 0.12);
      animation: wsMaintenancePulse 2s infinite;
    }

    .ws-maintenance-card h1 {
      margin: 0 0 12px;
      font-size: clamp(27px, 6vw, 40px);
      line-height: 1.1;
    }

    .ws-maintenance-card p {
      margin: 0 auto;
      max-width: 430px;
      color: rgba(255, 255, 255, 0.68);
      line-height: 1.7;
      font-size: 15px;
    }

    .ws-maintenance-status {
      margin: 25px auto 0;
      width: fit-content;
      padding: 9px 15px;
      border-radius: 999px;
      background: rgba(255, 122, 0, 0.09);
      border: 1px solid rgba(255, 122, 0, 0.2);
      color: #ff9a3d;
      font-size: 13px;
      font-weight: 700;
    }

    .ws-maintenance-dots {
      display: flex;
      justify-content: center;
      gap: 7px;
      margin-top: 28px;
    }

    .ws-maintenance-dots span {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #ff7900;
      animation: wsMaintenanceDots 1.2s infinite ease-in-out;
    }

    .ws-maintenance-dots span:nth-child(2) {
      animation-delay: .15s;
    }

    .ws-maintenance-dots span:nth-child(3) {
      animation-delay: .3s;
    }

    @keyframes wsMaintenanceIn {
      from {
        opacity: 0;
        transform: translateY(18px) scale(.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes wsMaintenancePulse {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.045);
      }
    }

    @keyframes wsMaintenanceDots {
      0%, 60%, 100% {
        opacity: .3;
        transform: translateY(0);
      }
      30% {
        opacity: 1;
        transform: translateY(-4px);
      }
    }

    @media (max-width: 560px) {
      #watchsaveMaintenance {
        padding: 16px;
      }

      .ws-maintenance-card {
        padding: 34px 21px;
        border-radius: 20px;
      }
    }

    /* USERNAME NOTICE */

    #watchsaveUsernameNotice {
      position: fixed;
      left: 16px;
      right: 16px;
      bottom: 18px;
      z-index: 9000;
      display: none;
      justify-content: center;
      pointer-events: none;
    }

    #watchsaveUsernameNotice.show {
      display: flex;
    }

    .ws-username-notice {
      width: min(620px, 100%);
      padding: 16px 18px;
      border-radius: 16px;
      border: 1px solid rgba(255,122,0,.3);
      background:
        linear-gradient(
          135deg,
          rgba(25,25,25,.98),
          rgba(8,8,8,.98)
        );
      box-shadow:
        0 20px 60px rgba(0,0,0,.55),
        0 0 30px rgba(255,122,0,.08);
      backdrop-filter: blur(14px);
      pointer-events: auto;
    }

    .ws-username-title {
      font-weight: 800;
      margin-bottom: 6px;
      color: #fff;
    }

    .ws-username-text {
      color: rgba(255,255,255,.68);
      font-size: 14px;
      line-height: 1.5;
      margin-bottom: 12px;
    }

    .ws-username-row {
      display: flex;
      gap: 8px;
    }

    .ws-username-row input {
      flex: 1;
      min-width: 0;
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 10px;
      padding: 11px 12px;
      background: #111;
      color: #fff;
      outline: none;
    }

    .ws-username-row input:focus {
      border-color: #ff7900;
    }

    .ws-username-row button {
      border: 0;
      border-radius: 10px;
      padding: 11px 16px;
      background: #ff7900;
      color: #fff;
      font-weight: 800;
      cursor: pointer;
    }

    .ws-username-row button:disabled {
      opacity: .6;
      cursor: wait;
    }

    .ws-username-error {
      color: #ff7777;
      font-size: 13px;
      margin-top: 8px;
      display: none;
    }

    @media (max-width: 520px) {
      .ws-username-row {
        flex-direction: column;
      }
    }

    /* REFERRAL CARD */

    #watchsaveReferralBox {
      margin: 18px 0;
      padding: 20px;
      border-radius: 18px;
      border: 1px solid rgba(255,122,0,.22);
      background:
        linear-gradient(
          145deg,
          rgba(255,122,0,.09),
          rgba(255,255,255,.025)
        );
      box-shadow:
        0 12px 35px rgba(0,0,0,.16);
    }

    .ws-ref-title {
      font-size: 20px;
      font-weight: 900;
      margin-bottom: 6px;
    }

    .ws-ref-text {
      color: rgba(255,255,255,.67);
      font-size: 13px;
      line-height: 1.6;
      margin-bottom: 16px;
    }

    .ws-ref-code-label {
      display: block;
      color: rgba(255,255,255,.5);
      font-size: 11px;
      font-weight: 800;
      letter-spacing: .08em;
      margin-bottom: 5px;
    }

    .ws-ref-code {
      display: inline-block;
      color: #ff9a3d;
      font-size: 18px;
      font-weight: 900;
      letter-spacing: .5px;
      margin-bottom: 15px;
    }

    .ws-ref-link-row {
      display: flex;
      gap: 8px;
      width: 100%;
    }

    .ws-ref-link {
      flex: 1;
      min-width: 0;
      box-sizing: border-box;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      padding: 11px 12px;
      border-radius: 9px;
      background: rgba(0,0,0,.4);
      border: 1px solid rgba(255,255,255,.08);
      color: #ddd;
      font-size: 12px;
    }

    .ws-ref-copy {
      border: 0;
      border-radius: 9px;
      padding: 10px 15px;
      background: #ff7900;
      color: white;
      font-weight: 800;
      cursor: pointer;
      white-space: nowrap;
    }

    .ws-ref-copy:hover {
      filter: brightness(1.08);
    }

    .ws-ref-stats {
      display: grid;
      grid-template-columns:
        repeat(3, minmax(0, 1fr));
      gap: 10px;
      margin-top: 16px;
    }

    .ws-ref-stat {
      padding: 14px;
      border-radius: 12px;
      background: rgba(0,0,0,.24);
      border: 1px solid rgba(255,255,255,.05);
    }

    .ws-ref-stat-label {
      display: block;
      color: rgba(255,255,255,.48);
      font-size: 10px;
      font-weight: 800;
      letter-spacing: .06em;
      margin-bottom: 6px;
    }

    .ws-ref-stat-value {
      display: block;
      color: #fff;
      font-size: 18px;
      font-weight: 900;
    }

    .ws-ref-progress-wrap {
      margin-top: 18px;
    }

    .ws-ref-progress-top {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 7px;
      color: rgba(255,255,255,.65);
      font-size: 12px;
    }

    .ws-ref-progress-bar {
      width: 100%;
      height: 9px;
      border-radius: 999px;
      overflow: hidden;
      background: rgba(255,255,255,.08);
    }

    .ws-ref-progress-fill {
      height: 100%;
      border-radius: inherit;
      background: #ff7900;
      transition: width .45s ease;
    }

    .ws-ref-status {
      margin-top: 10px;
      color: #ff9a3d;
      font-size: 13px;
      font-weight: 700;
      line-height: 1.5;
    }

    .ws-ref-how {
      margin-top: 18px;
      padding-top: 16px;
      border-top: 1px solid rgba(255,255,255,.07);
    }

    .ws-ref-how-title {
      font-weight: 900;
      margin-bottom: 9px;
    }

    .ws-ref-how ol {
      margin: 0;
      padding-left: 20px;
      color: rgba(255,255,255,.64);
      font-size: 13px;
      line-height: 1.75;
    }

    .ws-ref-reward-paid {
      margin-top: 12px;
      padding: 10px 12px;
      border-radius: 10px;
      background: rgba(46, 204, 113, .08);
      border: 1px solid rgba(46, 204, 113, .18);
      color: #72e6a0;
      font-size: 13px;
      font-weight: 800;
    }

    @media (max-width: 700px) {
      .ws-ref-stats {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 520px) {
      .ws-ref-link-row {
        flex-direction: column;
      }

      .ws-ref-copy {
        width: 100%;
      }

      .ws-ref-link {
        width: 100%;
      }
    }
  `;

  document.head.appendChild(style);
}

function createMaintenanceScreen() {
  if ($("#watchsaveMaintenance")) {
    return;
  }

  addMaintenanceStyles();

  const screen =
    document.createElement("div");

  screen.id =
    "watchsaveMaintenance";

  screen.className = "hidden";

  screen.innerHTML = `
    <div class="ws-maintenance-card">

      <div class="ws-maintenance-logo">
        WATCH<span>SAVE</span>
      </div>

      <div class="ws-maintenance-icon">
        🔧
      </div>

      <h1>
        We’ll be back shortly
      </h1>

      <p>
        Watchsave is currently under maintenance.
        We’re making a few improvements and the
        site should be ready again in a few minutes.
      </p>

      <div class="ws-maintenance-status">
        ● Maintenance in progress
      </div>

      <div class="ws-maintenance-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>

    </div>
  `;

  document.body.appendChild(screen);
}

/* =========================
   USERNAME NOTICE
========================= */

function createUsernameNotice() {
  if ($("#watchsaveUsernameNotice")) {
    return;
  }

  addMaintenanceStyles();

  const box =
    document.createElement("div");

  box.id =
    "watchsaveUsernameNotice";

  box.innerHTML = `
    <div class="ws-username-notice">

      <div class="ws-username-title">
        Username required for payment
      </div>

      <div class="ws-username-text">
        Please choose a unique username.
        You need a username before you can
        request a withdrawal or receive payment.
      </div>

      <div class="ws-username-row">
        <input
          id="watchsaveUsernameInput"
          type="text"
          maxlength="20"
          placeholder="Choose a username"
          autocomplete="off"
        />

        <button
          id="watchsaveUsernameSave"
          type="button"
        >
          Save username
        </button>
      </div>

      <div
        id="watchsaveUsernameError"
        class="ws-username-error"
      ></div>

    </div>
  `;

  document.body.appendChild(box);

  $("#watchsaveUsernameSave").onclick =
    saveUsername;
}

function showUsernameNotice() {
  createUsernameNotice();

  const box =
    $("#watchsaveUsernameNotice");

  if (box) {
    box.classList.add("show");
  }
}

function hideUsernameNotice() {
  const box =
    $("#watchsaveUsernameNotice");

  if (box) {
    box.classList.remove("show");
  }
}

function usernameIsValid(value) {
  return /^[A-Za-z0-9_]{3,20}$/.test(
    value,
  );
}

async function saveUsername() {
  const input =
    $("#watchsaveUsernameInput");

  const error =
    $("#watchsaveUsernameError");

  const button =
    $("#watchsaveUsernameSave");

  if (!input || !error || !button) {
    return;
  }

  const username =
    input.value.trim();

  error.style.display = "none";
  error.textContent = "";

  if (!usernameIsValid(username)) {
    error.textContent =
      "Username must be 3–20 characters and can only contain letters, numbers, and underscores.";

    error.style.display = "block";
    return;
  }

  button.disabled = true;
  button.textContent = "Saving...";

  try {
    const result = await api(
      "/api/auth/username",
      {
        method: "PATCH",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          username,
        }),
      },
    );

    if (result.user) {
      user = result.user;
    } else {
      user.username = username;
    }

    hideUsernameNotice();

    toast(
      "Username saved successfully.",
      true,
    );

    updateUserPaymentState();
  } catch (e) {
    if (e.maintenance) {
      return;
    }

    error.textContent =
      e.message ||
      "Could not save username.";

    error.style.display = "block";
  } finally {
    button.disabled = false;
    button.textContent =
      "Save username";
  }
}

/* =========================
   USER PAYMENT STATE
========================= */

function updateUserPaymentState() {
  if (!user) {
    return;
  }

  if (!user.username) {
    showUsernameNotice();
  } else {
    hideUsernameNotice();
  }

  updateReferralBox();
}

/* =========================
   REFERRAL LINK
========================= */

function buildReferralLink(
  referralCode,
) {
  if (!referralCode) {
    return "";
  }

  const path =
    location.pathname;

  const base =
    path.endsWith("/")
      ? path
      : path.replace(
          /\/[^/]*$/,
          "/",
        );

  return (
    location.origin +
    base +
    "register.html?ref=" +
    encodeURIComponent(
      referralCode,
    )
  );
}

/* =========================
   REFERRAL BOX
========================= */

async function updateReferralBox() {
  if (!user || !user.referralCode) {
    return;
  }

  let box =
    $("#watchsaveReferralBox");

  if (!box) {
    box =
      document.createElement("section");

    box.id =
      "watchsaveReferralBox";

    const main =
      document.querySelector("main");

    if (main) {
      const history =
        $("#history");

      if (history) {
        main.insertBefore(
          box,
          history,
        );
      } else {
        main.appendChild(box);
      }
    } else {
      document.body.appendChild(box);
    }
  }

  const referralLink =
    buildReferralLink(
      user.referralCode,
    );

  let data = {
    referralCode:
      user.referralCode || "",
    qualified: Number(
      user.qualifiedReferrals || 0,
    ),
    total: 0,
    requiredReferrals: 10,
    rewardAmount: 1500,
    qualificationBalance:
      REFERRAL_MIN_BALANCE,
    remaining: 10,
    rewardClaimed: false,
  };

  try {
    const d =
      await api(
        "/api/referrals/me",
      );

    data = {
      ...data,
      ...d,
    };
  } catch (e) {
    if (e.maintenance) {
      return;
    }

    /*
      Referral information must never
      break the main dashboard.
    */
  }

  const required =
    Math.max(
      1,
      Number(
        data.requiredReferrals ||
          10,
      ),
    );

  const qualified =
    Math.max(
      0,
      Number(
        data.qualified || 0,
      ),
    );

  const total =
    Math.max(
      0,
      Number(
        data.total || 0,
      ),
    );

  const reward =
    Math.max(
      0,
      Number(
        data.rewardAmount ||
          1500,
      ),
    );

  const qualificationBalance =
    Math.max(
      0,
      Number(
        data.qualificationBalance ||
          REFERRAL_MIN_BALANCE,
      ),
    );

  const remaining =
    Math.max(
      0,
      Number(
        data.remaining !== undefined
          ? data.remaining
          : required - qualified,
      ),
    );

  const rewardClaimed =
    Boolean(
      data.rewardClaimed,
    );

  const progress =
    Math.min(
      100,
      Math.max(
        0,
        (qualified / required) *
          100,
      ),
    );

  let statusText = "";

  if (rewardClaimed) {
    statusText =
      `Your ${money(
        reward,
      )} referral reward has already been paid.`;
  } else if (remaining > 0) {
    statusText =
      `${remaining} more qualified referral${
        remaining === 1
          ? ""
          : "s"
      } needed to unlock ${money(
        reward,
      )}.`;
  } else {
    statusText =
      `You have reached the required ${required} qualified referrals.`;
  }

  box.innerHTML = `
    <div class="ws-ref-title">
      Refer & Earn
    </div>

    <div class="ws-ref-text">
      Invite people to join Watchsave using your
      referral link. When a referred user reaches
      ${money(
        qualificationBalance,
      )}
      in their balance, that referral becomes
      permanently qualified.
    </div>

    <span class="ws-ref-code-label">
      YOUR REFERRAL CODE
    </span>

    <span class="ws-ref-code">
      ${esc(
        data.referralCode ||
          user.referralCode ||
          "",
      )}
    </span>

    <div class="ws-ref-link-row">
      <input
        class="ws-ref-link"
        id="watchsaveReferralLink"
        value="${esc(
          referralLink,
        )}"
        readonly
      />

      <button
        class="ws-ref-copy"
        id="watchsaveReferralCopy"
        type="button"
      >
        Copy link
      </button>
    </div>

    <div class="ws-ref-stats">

      <div class="ws-ref-stat">
        <span class="ws-ref-stat-label">
          TOTAL REFERRALS
        </span>

        <span class="ws-ref-stat-value">
          ${total}
        </span>
      </div>

      <div class="ws-ref-stat">
        <span class="ws-ref-stat-label">
          QUALIFIED
        </span>

        <span class="ws-ref-stat-value">
          ${qualified} / ${required}
        </span>
      </div>

      <div class="ws-ref-stat">
        <span class="ws-ref-stat-label">
          REWARD
        </span>

        <span class="ws-ref-stat-value">
          ${money(reward)}
        </span>
      </div>

    </div>

    <div class="ws-ref-progress-wrap">

      <div class="ws-ref-progress-top">
        <span>
          Referral progress
        </span>

        <span>
          ${qualified}/${required}
        </span>
      </div>

      <div class="ws-ref-progress-bar">
        <div
          class="ws-ref-progress-fill"
          style="width:${progress}%"
        ></div>
      </div>

      <div class="ws-ref-status">
        ${esc(statusText)}
      </div>

    </div>

    ${
      rewardClaimed
        ? `
          <div class="ws-ref-reward-paid">
            ✓ Referral reward paid
          </div>
        `
        : ""
    }

    <div class="ws-ref-how">

      <div class="ws-ref-how-title">
        How Refer & Earn works
      </div>

      <ol>
        <li>
          Copy your referral link and share it.
        </li>

        <li>
          Your friend creates a Watchsave account
          through your referral link.
        </li>

        <li>
          Your friend watches videos and earns
          normally.
        </li>

        <li>
          When their balance reaches
          ${money(
            qualificationBalance,
          )},
          the referral becomes permanently qualified.
        </li>

        <li>
          Reach ${required} qualified referrals
          to receive ${money(
            reward,
          )}.
        </li>
      </ol>

    </div>
  `;

  const copyButton =
    $("#watchsaveReferralCopy");

  if (copyButton) {
    copyButton.onclick =
      async () => {
        const input =
          $("#watchsaveReferralLink");

        const link =
          input?.value ||
          referralLink;

        if (!link) {
          toast(
            "Referral link is unavailable.",
            false,
          );

          return;
        }

        try {
          await navigator.clipboard.writeText(
            link,
          );

          toast(
            "Referral link copied.",
            true,
          );
        } catch {
          if (input) {
            input.focus();
            input.select();
          }

          toast(
            "Select and copy the referral link.",
            false,
          );
        }
      };
  }
}

/* =========================
   SHOW MAINTENANCE
========================= */

function showMaintenance() {
  createMaintenanceScreen();

  maintenanceActive = true;

  clearInterval(timer);
  timer = null;

  active = null;

  const modal = $("#modal");

  if (modal) {
    modal.classList.add("hidden");
  }

  document.body.classList.remove(
    "modalopen",
  );

  const screen =
    $("#watchsaveMaintenance");

  if (screen) {
    screen.classList.remove(
      "hidden",
    );
  }

  startMaintenanceWatcher();
}

/* =========================
   HIDE MAINTENANCE
========================= */

function hideMaintenance() {
  maintenanceActive = false;

  const screen =
    $("#watchsaveMaintenance");

  if (screen) {
    screen.classList.add("hidden");
  }

  stopMaintenanceWatcher();

  if (user) {
    updateUserPaymentState();
  }
}

/* =========================
   MAINTENANCE WATCHER
========================= */

function startMaintenanceWatcher() {
  if (maintenanceWatcher) {
    return;
  }

  maintenanceWatcher =
    setInterval(async () => {
      if (!maintenanceActive) {
        return;
      }

      if (maintenanceLoading) {
        return;
      }

      maintenanceLoading = true;

      try {
        await api(
          "/api/videos",
        );

        hideMaintenance();

        await load();
      } catch (e) {
        if (!e.maintenance) {
          console.warn(
            "Maintenance status check failed:",
            e,
          );
        }
      } finally {
        maintenanceLoading = false;
      }
    }, 10000);
}

/* =========================
   STOP MAINTENANCE WATCHER
========================= */

function stopMaintenanceWatcher() {
  if (!maintenanceWatcher) {
    return;
  }

  clearInterval(
    maintenanceWatcher,
  );

  maintenanceWatcher = null;
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

  if (
    r.status === 503 &&
    d.maintenance === true
  ) {
    const error = new Error(
      d.error ||
        "Watchsave is currently under maintenance.",
    );

    error.maintenance = true;

    showMaintenance();

    throw error;
  }

  if (!r.ok) {
    throw Error(
      d.error ||
        `Request failed (${r.status})`,
    );
  }

  return d;
}

/* =========================
   ESCAPE HTML
========================= */

function esc(s) {
  return String(s ?? "").replace(
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
}

/* =========================
   TOAST
========================= */

function toast(m, good = true) {
  const x = $("#toast");

  if (!x) return;

  x.textContent = m;

  x.className =
    "toast show " +
    (good ? "good" : "bad");

  setTimeout(
    () => (x.className = "toast"),
    3000,
  );
}

/* =========================
   VIDEO TYPE
========================= */

function type(v) {
  return v.type === "tiktok"
    ? "TikTok"
    : v.type === "youtube"
      ? "YouTube"
      : v.type === "facebook"
        ? "Facebook"
        : v.type === "instagram"
          ? "Instagram"
          : v.type === "upload"
            ? "Watchsave upload"
            : "Web video";
}

/* =========================
   THUMBNAIL
========================= */

function thumb(v) {
  if (v.type === "upload") {
    return v.source;
  }

  try {
    const u = new URL(v.source);

    if (v.type === "youtube") {
      let id =
        u.hostname === "youtu.be"
          ? u.pathname.slice(1)
          : u.searchParams.get("v");

      if (
        !id &&
        u.pathname.includes("/shorts/")
      ) {
        id = u.pathname
          .split("/shorts/")[1]
          .split("/")[0];
      }

      if (id) {
        return `https://i.ytimg.com/vi/${encodeURIComponent(
          id,
        )}/hqdefault.jpg`;
      }
    }
  } catch {}

  return "";
}

/* =========================
   RENDER VIDEOS
========================= */

function render() {
  $("#videoCount").textContent =
    videos.length;

  $("#grid").innerHTML = videos.length
    ? videos
        .map((v) => {
          const t = thumb(v);

          return `<article class="card">
            <div class="thumb ${t ? "has" : ""}" ${
              t
                ? `style="background-image:url('${esc(
                    t,
                  )}')"`
                : ""
            }>
              <div class="shade"></div>

              <button
                class="play"
                onclick="openWatch('${v.id}')"
              >
                ▶
              </button>

              <span class="plat">
                ${type(v)}
              </span>

              <span class="reward">
                ${money(v.reward)}
              </span>
            </div>

            <div class="body">
              <h3>
                ${esc(v.title)}
              </h3>

              <p>
                ${esc(
                  v.description ||
                    "Watch and complete the task.",
                )}
              </p>

              <div class="meta">
                ⏱ ${v.duration}s ${
                  v.command
                    ? " · ✓ Task"
                    : ""
                }
              </div>

              <button
                class="watchbtn"
                onclick="openWatch('${v.id}')"
              >
                Watch & earn
                <span>→</span>
              </button>
            </div>
          </article>`;
        })
        .join("")
    : '<div class="empty">No live videos yet.</div>';
}

/* =========================
   HISTORY
========================= */

function hist(a) {
  $("#historyCount").textContent =
    a.length;

  $("#historyList").innerHTML =
    a.length
      ? a
          .map(
            (x) =>
              `<div class="history">
                <div>
                  <b>${esc(
                    x.title,
                  )}</b>

                  <small>${
                    x.claimedAt
                      ? new Date(
                          x.claimedAt,
                        ).toLocaleString()
                      : ""
                  }</small>
                </div>

                <strong>
                  +${money(
                    x.reward,
                  )}
                </strong>
              </div>`,
          )
          .join("")
      : '<div class="empty">Your completed videos appear here.</div>';
}

/* =========================
   LOAD DASHBOARD
========================= */

async function load() {
  if (maintenanceActive) {
    hideMaintenance();
    maintenanceActive = false;
  }

  const me = await api(
    "/api/auth/me",
  );

  user = me.user;

  if (!user) {
    throw Error(
      "Authentication required",
    );
  }

  $("#balance").textContent =
    $("#heroBalance").textContent =
      money(user.balance);

  updateUserPaymentState();

  const v = await api(
    "/api/videos",
  );

  videos = v.videos || [];

  render();

  const h = await api(
    "/api/history",
  );

  hist(h.history || []);

  loadChat();
}

/* =========================
   YOUTUBE
========================= */

function yt(s) {
  try {
    const u = new URL(s);

    let id =
      u.hostname === "youtu.be"
        ? u.pathname.slice(1)
        : u.searchParams.get("v");

    if (
      !id &&
      u.pathname.includes("/shorts/")
    ) {
      id = u.pathname
        .split("/shorts/")[1]
        .split("/")[0];
    }

    return id
      ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(
          id,
        )}?autoplay=1&rel=0`
      : null;
  } catch {
    return null;
  }
}

/* =========================
   TIKTOK
========================= */

function tt(s) {
  const m = String(s).match(
    /\/video\/(\d+)/,
  );

  return m
    ? `https://www.tiktok.com/player/v1/${m[1]}?autoplay=1&description=1&music_info=1`
    : null;
}

/* =========================
   VIDEO PLAYER
========================= */

function player(v) {
  const p = $("#player");

  p.innerHTML = "";

  if (v.type === "upload") {
    const x =
      document.createElement(
        "video",
      );

    x.src = v.source;

    x.controls = true;
    x.autoplay = true;
    x.playsInline = true;

    p.appendChild(x);

    return;
  }

  const src =
    v.type === "youtube"
      ? yt(v.source)
      : v.type === "tiktok"
        ? tt(v.source)
        : null;

  if (src) {
    const x =
      document.createElement(
        "iframe",
      );

    x.src = src;

    x.allow =
      "autoplay; encrypted-media; picture-in-picture; fullscreen";

    x.allowFullscreen = true;

    p.appendChild(x);

    return;
  }

  p.innerHTML = `<div class="external">
    <div>↗</div>

    <h3>
      Open on ${esc(type(v))}
    </h3>

    <p>
      This platform does not permit this post to play inside another website.
    </p>

    <a
      class="primary link"
      href="${esc(v.source)}"
      target="_blank"
      rel="noopener"
    >
      Open video ↗
    </a>

    <small>
      Keep this Watchsave window open while you complete the task.
    </small>
  </div>`;
}

/* =========================
   OPEN VIDEO
========================= */

window.openWatch = (id) => {
  if (maintenanceActive) {
    showMaintenance();
    return;
  }

  active = videos.find(
    (v) => v.id === id,
  );

  if (!active) return;

  $("#wt").textContent =
    active.title;

  $("#task").classList.toggle(
    "hidden",
    !active.command,
  );

  $("#taskText").textContent =
    active.command || "";

  $("#claim").disabled = true;

  $("#note").textContent = "";

  player(active);

  left = Math.max(
    5,
    Number(
      active.duration || 30,
    ),
  );

  $("#timer").textContent =
    left + "s";

  $("#modal").classList.remove(
    "hidden",
  );

  document.body.classList.add(
    "modalopen",
  );

  clearInterval(timer);

  timer = setInterval(() => {
    if (maintenanceActive) {
      clearInterval(timer);
      timer = null;
      close();
      showMaintenance();
      return;
    }

    left--;

    $("#timer").textContent =
      Math.max(0, left) + "s";

    if (left <= 0) {
      clearInterval(timer);

      $("#claim").disabled = false;

      $("#note").textContent =
        `Reward ready: ${money(
          active.reward,
        )}. Complete the task before claiming.`;
    }
  }, 1000);
};

/* =========================
   CLOSE VIDEO
========================= */

function close() {
  clearInterval(timer);

  timer = null;

  $("#modal").classList.add(
    "hidden",
  );

  document.body.classList.remove(
    "modalopen",
  );

  $("#player").innerHTML = "";
}

$("#close").onclick = close;

$("#modal").onclick = (e) => {
  if (e.target.id === "modal") {
    close();
  }
};

/* =========================
   CLAIM REWARD
========================= */

$("#claim").onclick = async () => {
  if (!active || maintenanceActive) {
    if (maintenanceActive) {
      showMaintenance();
    }

    return;
  }

  try {
    const r = await api(
      "/api/videos/" +
        active.id +
        "/claim",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: "{}",
      },
    );

    user.balance = r.balance;

    $("#balance").textContent =
      $("#heroBalance").textContent =
        money(user.balance);

    $("#claim").disabled = true;

    $("#note").textContent =
      "Reward claimed ✓";

    toast(
      `You earned ${money(
        r.reward,
      )}!`,
    );

    await load();
  } catch (e) {
    if (e.maintenance) {
      return;
    }

    toast(
      e.message,
      false,
    );
  }
};

/* =========================
   REFRESH
========================= */

$("#refresh").onclick = () => {
  if (maintenanceActive) {
    showMaintenance();
    return;
  }

  load().catch((e) => {
    if (e.maintenance) {
      return;
    }

    toast(
      e.message,
      false,
    );
  });
};

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
   USER CHAT
========================= */

async function loadChat() {
  try {
    const d = await api(
      "/api/chat/me",
    );

    const box =
      $("#supportChat");

    if (!box) return;

    if (!d.chat) {
      box.classList.add(
        "hidden",
      );

      return;
    }

    box.classList.remove(
      "hidden",
    );

    const list =
      $("#userChatMessages");

    list.innerHTML =
      d.chat.messages
        .map(
          (m) =>
            `<div class="chat-msg ${
              m.sender === "user"
                ? "mine"
                : m.sender ===
                    "admin"
                  ? "theirs"
                  : "system-msg"
            }">

              <span>${
                m.sender ===
                "admin"
                  ? "Admin"
                  : m.sender ===
                      "user"
                    ? "You"
                    : "Watchsave"
              }</span>

              <p>
                ${esc(m.text)}
              </p>

              <small>
                ${new Date(
                  m.createdAt,
                ).toLocaleString()}
              </small>

            </div>`,
        )
        .join("");

    list.scrollTop =
      list.scrollHeight;
  } catch (e) {
    if (e.maintenance) {
      return;
    }
  }
}

/* =========================
   SEND CHAT MESSAGE
========================= */

$("#userChatForm").onsubmit =
  async (e) => {
    e.preventDefault();

    if (maintenanceActive) {
      showMaintenance();
      return;
    }

    const text = $(
      "#userChatInput",
    ).value.trim();

    if (!text) return;

    try {
      await api(
        "/api/chat/me/messages",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            text,
          }),
        },
      );

      $("#userChatInput").value =
        "";

      await loadChat();
    } catch (x) {
      if (x.maintenance) {
        return;
      }

      toast(
        x.message,
        false,
      );
    }
  };

/* =========================
   WITHDRAWAL
========================= */

$("#withdraw").onsubmit = async (e) => {
  e.preventDefault();

  if (maintenanceActive) {
    showMaintenance();
    return;
  }

  /*
    Username is now required before payment.
    This applies to old accounts too.
  */
  if (!user?.username) {
    showUsernameNotice();

    const hint =
      $("#withdrawHint");

    if (hint) {
      hint.textContent =
        "Please set your username before requesting a withdrawal.";
    }

    toast(
      "Set your username before requesting payment.",
      false,
    );

    return;
  }

  const account =
    $("#account").value.trim();

  const bankName =
    $("#bank").value.trim();

  const accountName =
    $("#accountNameInput").value.trim();

  const amount =
    Number($("#amount").value);

  const btn =
    $("#withdrawBtn");

  const hint =
    $("#withdrawHint");

  if (
    !account ||
    !bankName ||
    !accountName ||
    !amount
  ) {
    hint.textContent =
      "Please complete all withdrawal fields.";

    return;
  }

  if (!/^\d{10}$/.test(account)) {
    hint.textContent =
      "Account number must contain exactly 10 digits.";

    return;
  }

  if (amount < MIN_WITHDRAWAL) {
    hint.textContent =
      `Minimum withdrawal is ${money(
        MIN_WITHDRAWAL,
      )}.`;

    return;
  }

  if (
    amount >
    Number(user?.balance || 0)
  ) {
    hint.textContent =
      "Insufficient balance.";

    return;
  }

  btn.disabled = true;

  hint.textContent =
    "Submitting withdrawal request...";

  try {
    const r = await api(
      "/api/withdrawals",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          amount,
          account,
          method:
            "Manual Bank Transfer",
          bankName,
          accountName,
        }),
      },
    );

    user.balance = Number(
      r.balance || 0,
    );

    $("#balance").textContent =
      $("#heroBalance").textContent =
        money(user.balance);

    hint.textContent =
      "Withdrawal request sent successfully.";

    toast(
      `Withdrawal request of ${money(
        amount,
      )} sent successfully!`,
    );

    $("#account").value = "";
    $("#bank").value = "";
    $("#accountNameInput").value =
      "";
    $("#amount").value = "";

    await loadChat();
  } catch (e) {
    if (e.maintenance) {
      return;
    }

    console.error(
      "WITHDRAWAL ERROR:",
      e,
    );

    hint.textContent =
      e.message ||
      "Withdrawal request failed.";

    toast(
      e.message ||
        "Withdrawal request failed.",
      false,
    );
  } finally {
    btn.disabled = false;
  }
};

/* =========================
   PRESENCE + CHAT REFRESH
========================= */

setInterval(() => {
  api("/api/presence", {
    method: "POST",
  }).catch(() => {});

  loadChat().catch(() => {});
}, 30000);

/* =========================
   INITIAL LOAD
========================= */

(async () => {
  try {
    createMaintenanceScreen();
    createUsernameNotice();

    await load();
  } catch (e) {
    console.error(
      "Dashboard authentication failed:",
      e,
    );

    if (e.maintenance) {
      showMaintenance();
      return;
    }

    localStorage.removeItem(
      "watchsave_token",
    );

    location.href =
      "./login.html";
  }
})();

window.logout = async function () {
  localStorage.removeItem("watchsave_token");
  sessionStorage.removeItem("watchsave_token");
  try { await fetch(BACKEND_URL + "/api/auth/logout", { method: "POST", credentials: "include" }); } catch (e) {}
  window.location.href = "./login.html";
};
