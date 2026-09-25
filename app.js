const BACKEND_URL = "http://localhost:3000";

const $ = (s) =>
document.querySelector(s);

let user = null;
let videos = [];
let active = null;
let timer = null;
let left = 0;

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

/*
SERVER-SIDE MAINTENANCE
*/

if (
r.status === 503 &&
d.maintenance
) {
showMaintenanceScreen();

```
throw Error(
  d.error ||
    "Watchsave is currently under maintenance.",
);
```

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
"&": "&",
"<": "<",
">": ">",
'"': """,
"'": "'",
})[m],
);
}

/* =========================
TOAST
========================= */

function toast(
m,
good = true,
) {
const x = $("#toast");

if (!x) return;

x.textContent = m;

x.className =
"toast show " +
(good ? "good" : "bad");

setTimeout(
() =>
(x.className =
"toast"),
3000,
);
}

/* =====================================================
ACCOUNT / USERNAME / REFERRAL EXTRA STYLES
===================================================== */

function addAccountNoticeStyles() {
if (
document.getElementById(
"watchsave-account-extra-styles",
)
) {
return;
}

const style =
document.createElement("style");

style.id =
"watchsave-account-extra-styles";

style.textContent = `
.watchsave-account-panel {
margin: 16px 0;
padding: 16px;
border-radius: 16px;
background:
linear-gradient(
145deg,
rgba(255,122,0,.10),
rgba(0,0,0,.35)
);
border: 1px solid rgba(255,122,0,.25);
}

```
.watchsave-account-panel h3 {
  margin: 0 0 6px;
}

.watchsave-account-panel p {
  color: #aaa;
  font-size: 13px;
  line-height: 1.5;
  margin: 0 0 12px;
}

.watchsave-account-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.watchsave-account-row input {
  flex: 1;
  min-width: 180px;
  box-sizing: border-box;
}

.watchsave-referral {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #292929;
}

.watchsave-referral-code {
  color: #ff7a00;
  font-weight: 800;
  word-break: break-all;
}

.watchsave-maintenance {
  position: fixed;
  inset: 0;
  z-index: 999999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background:
    radial-gradient(
      circle at center,
      rgba(255,122,0,.12),
      rgba(0,0,0,.97) 65%
    );
  backdrop-filter: blur(12px);
}

.watchsave-maintenance.hidden {
  display: none;
}

.watchsave-maintenance-card {
  width: min(520px, 100%);
  text-align: center;
  padding: 32px 24px;
  border-radius: 22px;
  background: #0d0d0d;
  border: 1px solid rgba(255,122,0,.28);
  box-shadow: 0 25px 90px rgba(0,0,0,.7);
}

.watchsave-maintenance-icon {
  font-size: 42px;
  margin-bottom: 12px;
}

.watchsave-maintenance-card h2 {
  margin: 0 0 10px;
}

.watchsave-maintenance-card p {
  color: #aaa;
  line-height: 1.6;
  margin: 0;
}

.watchsave-username-modal {
  position: fixed;
  inset: 0;
  z-index: 999998;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0,0,0,.78);
  backdrop-filter: blur(8px);
}

.watchsave-username-modal.hidden {
  display: none;
}

.watchsave-username-card {
  width: min(450px, 100%);
  background: #0d0d0d;
  border: 1px solid #333;
  border-radius: 20px;
  padding: 22px;
}

.watchsave-username-card h2 {
  margin-top: 0;
}

.watchsave-username-card p {
  color: #aaa;
  line-height: 1.5;
  font-size: 13px;
}

.watchsave-username-card input {
  width: 100%;
  box-sizing: border-box;
  margin: 8px 0 14px;
}

.watchsave-account-warning {
  color: #ff7a00 !important;
}

@media (max-width: 600px) {
  .watchsave-account-row {
    align-items: stretch;
  }

  .watchsave-account-row input,
  .watchsave-account-row button {
    width: 100%;
  }

  .watchsave-maintenance-card {
    padding: 26px 18px;
  }
}
```

`;

document.head.appendChild(style);
}

/* =====================================================
MAINTENANCE SCREEN
===================================================== */

function createMaintenanceScreen() {
if (
document.getElementById(
"watchsaveMaintenance",
)
) {
return;
}

const box =
document.createElement("div");

box.id =
"watchsaveMaintenance";

box.className =
"watchsave-maintenance hidden";

box.innerHTML = ` <div class="watchsave-maintenance-card">


  <div class="watchsave-maintenance-icon">
    🛠️
  </div>

  <h2>
    Watchsave is under maintenance
  </h2>

  <p>
    We're making some updates right now.
    Please check back in a few minutes.
    Normal earning, video watching and
    withdrawals will resume when the site
    is ready.
  </p>

</div>
```

`;

document.body.appendChild(box);
}

function showMaintenanceScreen() {
createMaintenanceScreen();

const box =
$("#watchsaveMaintenance");

if (box) {
box.classList.remove(
"hidden",
);
}

clearInterval(timer);
}

function hideMaintenanceScreen() {
createMaintenanceScreen();

const box =
$("#watchsaveMaintenance");

if (box) {
box.classList.add(
"hidden",
);
}
}

/* =====================================================
USERNAME MODAL
===================================================== */

function createUsernameModal() {
if (
document.getElementById(
"watchsaveUsernameModal",
)
) {
return;
}

const modal =
document.createElement("div");

modal.id =
"watchsaveUsernameModal";

modal.className =
"watchsave-username-modal hidden";

modal.innerHTML = ` <div class="watchsave-username-card">

```
  <h2>
    Set your username
  </h2>

  <p>
    Please choose a username. Your username
    is required before you can receive
    payments from Watchsave.
  </p>

  <input
    id="watchsaveUsernameInput"
    maxlength="20"
    minlength="3"
    pattern="[A-Za-z0-9_]{3,20}"
    placeholder="Choose a username"
  >

  <button
    id="watchsaveUsernameSave"
    class="primary"
    type="button"
  >
    Save username
  </button>

  <p
    id="watchsaveUsernameError"
    style="margin-top:10px"
  ></p>

</div>
```

`;

document.body.appendChild(modal);

$("#watchsaveUsernameSave").onclick =
saveUsername;

modal.addEventListener(
"click",
(e) => {
if (e.target === modal) {
closeUsernameModal();
}
},
);
}

function showUsernameModal() {
createUsernameModal();

const modal =
$("#watchsaveUsernameModal");

const input =
$("#watchsaveUsernameInput");

const error =
$("#watchsaveUsernameError");

if (error) {
error.textContent = "";
}

if (input) {
input.value =
user?.username || "";
}

modal.classList.remove(
"hidden",
);

setTimeout(() => {
input?.focus();
}, 50);
}

function closeUsernameModal() {
const modal =
$("#watchsaveUsernameModal");

if (modal) {
modal.classList.add(
"hidden",
);
}
}

async function saveUsername() {
const input =
$("#watchsaveUsernameInput");

const error =
$("#watchsaveUsernameError");

const button =
$("#watchsaveUsernameSave");

const username =
input?.value.trim() || "";

if (
!/^[A-Za-z0-9_]{3,20}$/.test(
username,
)
) {
if (error) {
error.textContent =
"Username must be 3–20 characters and use only letters, numbers or underscore.";
}

```
return;
```

}

button.disabled = true;

button.textContent =
"Saving...";

try {
const d =
await api(
"/api/auth/username",
{
method: "PATCH",

```
      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        username,
      }),
    },
  );

user =
  d.user || {
    ...user,
    username,
  };

toast(
  "Username saved successfully.",
);

closeUsernameModal();

renderAccountPanel();
```

} catch (e) {
if (error) {
error.textContent =
e.message ||
"Could not save username.";
}
} finally {
button.disabled = false;

```
button.textContent =
  "Save username";
```

}
}

/* =====================================================
ACCOUNT / REFERRAL PANEL
===================================================== */

function createAccountPanel() {
if (
document.getElementById(
"watchsaveAccountPanel",
)
) {
return;
}

const panel =
document.createElement(
"section",
);

panel.id =
"watchsaveAccountPanel";

panel.className =
"watchsave-account-panel";

/*
Put the account panel before the
main content without changing the
existing HTML structure.
*/

const target =
document.querySelector(
"main",
) ||
document.body;

target.prepend(panel);

renderAccountPanel();
}

function renderAccountPanel() {
const panel =
$("#watchsaveAccountPanel");

if (!panel || !user) {
return;
}

const hasUsername =
Boolean(
user.username &&
user.username.trim(),
);

const referralCode =
user.referralCode || "";

let referralLink = "";

if (referralCode) {
const registerPath =
location.pathname
.replace(
//[^/]*$/,
"/register.html",
);

```
referralLink =
  `${location.origin}${registerPath}?ref=${encodeURIComponent(
    referralCode,
  )}`;
```

}

panel.innerHTML = `    ${
      !hasUsername
        ?` <h3>
Set your username </h3>

```
      <p class="watchsave-account-warning">
        Please choose a username.
        You need a username before you
        can receive payments.
      </p>

      <button
        class="primary"
        type="button"
        id="setUsernameButton"
      >
        Set username
      </button>
    `
    : `
      <h3>
        @${esc(user.username)}
      </h3>

      <p>
        Your username is set and your
        account is ready for payments.
      </p>
    `
}

${
  referralCode
    ? `
      <div class="watchsave-referral">

        <strong>
          Your referral code
        </strong>

        <p>
          <span
            class="watchsave-referral-code"
          >
            ${esc(referralCode)}
          </span>
        </p>

        <div
          class="watchsave-account-row"
        >

          <input
            id="watchsaveReferralLink"
            value="${esc(
              referralLink,
            )}"
            readonly
          >

          <button
            class="ghost"
            type="button"
            id="copyReferralButton"
          >
            Copy link
          </button>

        </div>

        <p style="margin-top:8px">
          A referral becomes qualified
          permanently when the referred
          user reaches ₦5,000 balance.
        </p>

        ${
          user.qualifiedReferrals !==
          undefined
            ? `
              <p>
                Qualified referrals:
                <strong>
                  ${Number(
                    user.qualifiedReferrals ||
                      0,
                  )}
                </strong>
              </p>
            `
            : ""
        }

      </div>
    `
    : ""
}
```

`;

const setUsernameButton =
$("#setUsernameButton");

if (setUsernameButton) {
setUsernameButton.onclick =
showUsernameModal;
}

const copyButton =
$("#copyReferralButton");

if (copyButton) {
copyButton.onclick =
async () => {
const value =
$("#watchsaveReferralLink")
?.value || "";

```
    try {
      await navigator.clipboard.writeText(
        value,
      );

      toast(
        "Referral link copied.",
      );
    } catch {
      const input =
        $("#watchsaveReferralLink");

      if (input) {
        input.select();
      }

      toast(
        "Select and copy the referral link.",
        false,
      );
    }
  };
```

}
}

function usernameRequiredForPayment() {
return !(
user?.username &&
user.username.trim()
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
/*
Cloudinary uploads already have
a complete HTTPS URL in v.source.
*/

if (v.type === "upload") {
return v.source;
}

try {
const u =
new URL(v.source);

```
if (
  v.type === "youtube"
) {
  let id =
    u.hostname ===
    "youtu.be"
      ? u.pathname.slice(1)
      : u.searchParams.get(
          "v",
        );

  if (
    !id &&
    u.pathname.includes(
      "/shorts/",
    )
  ) {
    id =
      u.pathname
        .split("/shorts/")[1]
        .split("/")[0];
  }

  if (id) {
    return `https://i.ytimg.com/vi/${encodeURIComponent(
      id,
    )}/hqdefault.jpg`;
  }
}
```

} catch {}

return "";
}

/* =========================
RENDER VIDEOS
========================= */

function render() {
$("#videoCount").textContent =
videos.length;

$("#grid").innerHTML =
videos.length
? videos
.map((v) => {
const t =
thumb(v);

```
        return `
          <article class="card">

            <div
              class="thumb ${
                t
                  ? "has"
                  : ""
              }"
              ${
                t
                  ? `style="background-image:url('${esc(
                      t,
                    )}')"`
                  : ""
              }
            >

              <div class="shade"></div>

              <button
                class="play"
                onclick="openWatch('${esc(
                  v.id,
                )}')"
              >
                ▶
              </button>

              <span class="plat">
                ${type(v)}
              </span>

              <span class="reward">
                ${money(
                  v.reward,
                )}
              </span>

            </div>

            <div class="body">

              <h3>
                ${esc(
                  v.title,
                )}
              </h3>

              <p>
                ${esc(
                  v.description ||
                    "Watch and complete the task.",
                )}
              </p>

              <div class="meta">
                ⏱ ${
                  v.duration
                }s
                ${
                  v.command
                    ? " · ✓ Task"
                    : ""
                }
              </div>

              <button
                class="watchbtn"
                onclick="openWatch('${esc(
                  v.id,
                )}')"
              >
                Watch & earn
                <span>→</span>
              </button>

            </div>

          </article>
        `;
      })
      .join("")
  : '<div class="empty">No live videos yet.</div>';
```

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
` <div class="history">

```
              <div>

                <b>
                  ${esc(
                    x.title,
                  )}
                </b>

                <small>
                  ${
                    x.claimedAt
                      ? new Date(
                          x.claimedAt,
                        ).toLocaleString()
                      : ""
                  }
                </small>

              </div>

              <strong>
                +${money(
                  x.reward,
                )}
              </strong>

            </div>
          `,
      )
      .join("")
  : '<div class="empty">Your completed videos appear here.</div>';
```

}

/* =========================
LOAD DASHBOARD
========================= */

async function load() {
const me =
await api(
"/api/auth/me",
);

user =
me.user;

if (!user) {
throw Error(
"Authentication required",
);
}

hideMaintenanceScreen();

$("#balance").textContent =
$("#heroBalance").textContent =
money(
user.balance,
);

createAccountPanel();

renderAccountPanel();

/*
Video loading is intentionally
after account loading.
*/

const v =
await api(
"/api/videos",
);

videos =
v.videos || [];

render();

const h =
await api(
"/api/history",
);

hist(
h.history || [],
);

loadChat();
}

/* =========================
YOUTUBE
========================= */

function yt(s) {
try {
const u =
new URL(s);

```
let id =
  u.hostname ===
  "youtu.be"
    ? u.pathname.slice(1)
    : u.searchParams.get(
        "v",
      );

if (
  !id &&
  u.pathname.includes(
    "/shorts/",
  )
) {
  id =
    u.pathname
      .split("/shorts/")[1]
      .split("/")[0];
}

return id
  ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(
      id,
    )}?autoplay=1&rel=0`
  : null;
```

} catch {
return null;
}
}

/* =========================
TIKTOK
========================= */

function tt(s) {
const m =
String(s).match(
//video/(\d+)/,
);

return m
? `https://www.tiktok.com/player/v1/${m[1]}?autoplay=1&description=1&music_info=1`
: null;
}

/* =========================
VIDEO PLAYER
========================= */

function player(v) {
const p =
$("#player");

p.innerHTML =
"";

/*
Cloudinary video.
*/

if (
v.type ===
"upload"
) {
const x =
document.createElement(
"video",
);

```
x.src =
  v.source;

x.controls =
  true;

x.autoplay =
  true;

x.playsInline =
  true;

p.appendChild(
  x,
);

return;
```

}

const src =
v.type ===
"youtube"
? yt(
v.source,
)
: v.type ===
"tiktok"
? tt(
v.source,
)
: null;

if (src) {
const x =
document.createElement(
"iframe",
);

```
x.src =
  src;

x.allow =
  "autoplay; encrypted-media; picture-in-picture; fullscreen";

x.allowFullscreen =
  true;

p.appendChild(
  x,
);

return;
```

}

p.innerHTML = ` <div class="external">

```
  <div>↗</div>

  <h3>
    Open on ${esc(
      type(v),
    )}
  </h3>

  <p>
    This platform does not permit
    this post to play inside another
    website.
  </p>

  <a
    class="primary link"
    href="${esc(
      v.source,
    )}"
    target="_blank"
    rel="noopener"
  >
    Open video ↗
  </a>

  <small>
    Keep this Watchsave window open
    while you complete the task.
  </small>

</div>
```

`;
}

/* =========================
OPEN VIDEO
========================= */

window.openWatch =
(id) => {
/*
Maintenance check before opening
an earning video.
*/

```
if (
  document
    .getElementById(
      "watchsaveMaintenance",
    )
    ?.classList.contains(
      "hidden",
    ) === false
) {
  return;
}

active =
  videos.find(
    (v) =>
      v.id ===
      id,
  );

if (!active)
  return;

$("#wt").textContent =
  active.title;

$("#task").classList.toggle(
  "hidden",
  !active.command,
);

$("#taskText").textContent =
  active.command ||
  "";

$("#claim").disabled =
  true;

$("#note").textContent =
  "";

player(
  active,
);

left =
  Math.max(
    5,
    Number(
      active.duration ||
        30,
    ),
  );

$("#timer").textContent =
  left +
  "s";

$("#modal").classList.remove(
  "hidden",
);

document.body.classList.add(
  "modalopen",
);

clearInterval(
  timer,
);

timer =
  setInterval(
    () => {
      left--;

      $("#timer").textContent =
        Math.max(
          0,
          left,
        ) +
        "s";

      if (
        left <=
        0
      ) {
        clearInterval(
          timer,
        );

        $("#claim").disabled =
          false;

        $("#note").textContent =
          `Reward ready: ${money(
            active.reward,
          )}. Complete the task before claiming.`;
      }
    },
    1000,
  );
```

};

/* =========================
CLOSE VIDEO
========================= */

function close() {
clearInterval(
timer,
);

$("#modal").classList.add(
"hidden",
);

document.body.classList.remove(
"modalopen",
);

$("#player").innerHTML =
"";
}

$("#close").onclick =
close;

$("#modal").onclick =
(e) => {
if (
e.target.id ===
"modal"
) {
close();
}
};

/* =========================
CLAIM REWARD
========================= */

$("#claim").onclick =
async () => {
if (!active)
return;

```
try {
  const r =
    await api(
      "/api/videos/" +
        active.id +
        "/claim",
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          "{}",
      },
    );

  user.balance =
    r.balance;

  $("#balance").textContent =
    $("#heroBalance").textContent =
      money(
        user.balance,
      );

  $("#claim").disabled =
    true;

  $("#note").textContent =
    "Reward claimed ✓";

  toast(
    `You earned ${money(
      r.reward,
    )}!`,
  );

  await load();

} catch (e) {
  toast(
    e.message,
    false,
  );
}
```

};

/* =========================
REFRESH
========================= */

$("#refresh").onclick =
() =>
load().catch(
(e) =>
toast(
e.message,
false,
),
);

/* =========================
LOGOUT
========================= */

$("#logout").onclick =
async () => {
try {
await api(
"/api/auth/logout",
{
method:
"POST",
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

```
  location.href =
    "./login.html";
}
```

};

/* =========================
USER CHAT
========================= */

async function loadChat() {
try {
const d =
await api(
"/api/chat/me",
);

```
const box =
  $("#supportChat");

if (!box)
  return;

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

if (!list)
  return;

list.innerHTML =
  d.chat.messages
    .map(
      (m) =>
        `
          <div
            class="chat-msg ${
              m.sender ===
              "user"
                ? "mine"
                : m.sender ===
                    "admin"
                  ? "theirs"
                  : "system-msg"
            }"
          >

            <span>
              ${
                m.sender ===
                "admin"
                  ? "Admin"
                  : m.sender ===
                      "user"
                    ? "You"
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

          </div>
        `,
    )
    .join("");

list.scrollTop =
  list.scrollHeight;
```

} catch {}
}

/* =========================
SEND CHAT MESSAGE
========================= */

$("#userChatForm").onsubmit =
async (e) => {
e.preventDefault();

```
const text =
  $(
    "#userChatInput",
  )
    .value.trim();

if (!text)
  return;

try {
  await api(
    "/api/chat/me/messages",
    {
      method:
        "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body:
        JSON.stringify({
          text,
        }),
    },
  );

  $("#userChatInput").value =
    "";

  await loadChat();

} catch (x) {
  toast(
    x.message,
    false,
  );
}
```

};

/* =========================
WITHDRAWAL
========================= */

$("#withdraw").onsubmit =
async (e) => {
e.preventDefault();

```
/*
  Username is required before
  payment/withdrawal.
*/

if (
  usernameRequiredForPayment()
) {
  showUsernameModal();

  $("#withdrawHint").textContent =
    "Please set your username before requesting payment.";

  return;
}

const account =
  $("#account")
    .value.trim();

const bankName =
  $("#bank")
    .value.trim();

const accountName =
  $(
    "#accountNameInput",
  )
    .value.trim();

const amount =
  Number(
    $("#amount")
      .value,
  );

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

if (
  !/^\d{10}$/.test(
    account,
  )
) {
  hint.textContent =
    "Account number must contain exactly 10 digits.";

  return;
}

if (
  amount <
  10000
) {
  hint.textContent =
    "Minimum withdrawal is ₦10,000.";

  return;
}

if (
  amount >
  Number(
    user?.balance ||
      0,
  )
) {
  hint.textContent =
    "Insufficient balance.";

  return;
}

btn.disabled =
  true;

hint.textContent =
  "Submitting withdrawal request...";

try {
  const r =
    await api(
      "/api/withdrawals",
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            amount,
            account,
            method:
              "Manual Bank Transfer",
            bankName,
            accountName,
          }),
      },
    );

  user.balance =
    Number(
      r.balance ||
        0,
    );

  $("#balance").textContent =
    $("#heroBalance").textContent =
      money(
        user.balance,
      );

  hint.textContent =
    "Withdrawal request sent successfully.";

  toast(
    `Withdrawal request of ${money(
      amount,
    )} sent successfully!`,
  );

  $("#account").value =
    "";

  $("#bank").value =
    "";

  $("#accountNameInput").value =
    "";

  $("#amount").value =
    "";

  await loadChat();

} catch (e) {
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
  btn.disabled =
    false;
}
```

};

/* =====================================================
PRESENCE + CHAT REFRESH
===================================================== */

setInterval(
() => {
api(
"/api/presence",
{
method:
"POST",
},
).catch(
() => {},
);

```
loadChat().catch(
  () => {},
);
```

},
30000,
);

/* =====================================================
MAINTENANCE STATUS CHECK
===================================================== */

setInterval(
async () => {
try {
const d =
await api(
"/api/maintenance",
);

```
  if (
    d.maintenance
  ) {
    showMaintenanceScreen();
  } else {
    hideMaintenanceScreen();
  }
} catch (e) {
  /*
    Do not log users out simply because
    the maintenance status endpoint fails.
  */
}
```

},
15000,
);

/* =====================================================
INITIAL LOAD
===================================================== */

(async () => {
try {
addAccountNoticeStyles();

```
createMaintenanceScreen();

createUsernameModal();

/*
  Check maintenance state before
  loading earning content.
*/

try {
  const status =
    await fetch(
      BACKEND_URL +
        "/api/maintenance",
      {
        credentials:
          "include",
      },
    );

  const data =
    await status
      .json()
      .catch(
        () => ({}),
      );

  if (
    data.maintenance
  ) {
    showMaintenanceScreen();
  }
} catch {}

await load();
```

} catch (e) {
console.error(
"Dashboard authentication failed:",
e,
);

```
/*
  Maintenance is NOT an authentication
  failure.
*/

if (
  e.message &&
  e.message
    .toLowerCase()
    .includes(
      "maintenance",
    )
) {
  return;
}

localStorage.removeItem(
  "watchsave_token",
);

location.href =
  "./login.html";


}
})();
