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

/* =========================
   USERS
========================= */

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
                    u.name,
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
                    Joined:
                    ${new Date(
                      u.joinedAt,
                    ).toLocaleString()}
                    · Last login:
                    ${
                      u.lastLoginAt
                        ? new Date(
                            u.lastLoginAt,
                          ).toLocaleString()
                        : "Never"
                    }
                  </small>
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

                <button
                  class="mini danger"
                  onclick="kick('${u.id}')"
                >
                  Remove account
                </button>
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

    /* --------------------------------
       CHECK VIDEO
    -------------------------------- */

    if (!file) {
      toast(
        "Please select a video first.",
        false,
      );

      return;
    }

    /* --------------------------------
       MAXIMUM 250 MB
    -------------------------------- */

    const MAX_SIZE =
      250 * 1024 * 1024;

    if (file.size > MAX_SIZE) {
      toast(
        "Video is too large. Maximum size is 250 MB.",
        false,
      );

      return;
    }

    /* --------------------------------
       VIDEO TYPE CHECK
    -------------------------------- */

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

    /* --------------------------------
       PREVENT DOUBLE UPLOAD
    -------------------------------- */

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
      /*
        IMPORTANT:

        Do NOT set Content-Type manually.

        FormData automatically creates
        the multipart/form-data boundary.
      */

      const formData =
        new FormData(form);

      await api(
        "/api/admin/videos/upload",
        {
          method: "POST",
          body: formData,
        },
      );

      /* --------------------------------
         RESET FORM
      -------------------------------- */

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

      /* --------------------------------
         REFRESH VIDEO LIBRARY
      -------------------------------- */

      await videos();

      /* --------------------------------
         REFRESH STATISTICS
      -------------------------------- */

      await stats();

    } catch (x) {
      console.error(
        "Video upload failed:",
        x,
      );

      let message =
        x.message ||
        "Video upload failed. Please try again.";

      /*
        Give a more useful message
        for common network problems.
      */

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
      /* --------------------------------
         RESTORE BUTTON
      -------------------------------- */

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

/* =========================
   INITIAL LOAD
========================= */

(async () => {
  try {
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