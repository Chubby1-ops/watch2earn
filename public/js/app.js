const $ = (s) => document.querySelector(s);

let user = null,
  videos = [],
  active = null,
  timer = null,
  left = 0;

const money = (n) => `₦${Number(n || 0).toFixed(2)}`;

async function api(u, o = {}) {
  const r = await fetch(u, { credentials: "same-origin", ...o }),
    d = await r.json().catch(() => ({}));

  if (!r.ok) throw Error(d.error || "Request failed");

  return d;
}

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

function toast(m, good = true) {
  const x = $("#toast");

  x.textContent = m;
  x.className = "toast show " + (good ? "good" : "bad");

  setTimeout(() => (x.className = "toast"), 3000);
}

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

function thumb(v) {
  if (v.type === "upload") return v.source;

  try {
    const u = new URL(v.source);

    if (v.type === "youtube") {
      let id =
        u.hostname === "youtu.be"
          ? u.pathname.slice(1)
          : u.searchParams.get("v");

      if (!id && u.pathname.includes("/shorts/"))
        id = u.pathname.split("/shorts/")[1].split("/")[0];

      if (id)
        return `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;
    }
  } catch {}

  return "";
}

function render() {
  $("#videoCount").textContent = videos.length;

  $("#grid").innerHTML = videos.length
    ? videos
        .map((v) => {
          const t = thumb(v);

          return `<article class="card">
            <div class="thumb ${t ? "has" : ""}" ${
              t ? `style="background-image:url('${esc(t)}')"` : ""
            }>
              <div class="shade"></div>
              <button class="play" onclick="openWatch('${v.id}')">▶</button>
              <span class="plat">${type(v)}</span>
              <span class="reward">${money(v.reward)}</span>
            </div>

            <div class="body">
              <h3>${esc(v.title)}</h3>
              <p>${esc(v.description || "Watch and complete the task.")}</p>
              <div class="meta">
                ⏱ ${v.duration}s ${v.command ? " · ✓ Task" : ""}
              </div>

              <button class="watchbtn" onclick="openWatch('${v.id}')">
                Watch & earn <span>→</span>
              </button>
            </div>
          </article>`;
        })
        .join("")
    : '<div class="empty">No live videos yet.</div>';
}

function hist(a) {
  $("#historyCount").textContent = a.length;

  $("#historyList").innerHTML = a.length
    ? a
        .map(
          (x) =>
            `<div class="history">
              <div>
                <b>${esc(x.title)}</b>
                <small>${
                  x.claimedAt
                    ? new Date(x.claimedAt).toLocaleString()
                    : ""
                }</small>
              </div>
              <strong>+${money(x.reward)}</strong>
            </div>`,
        )
        .join("")
    : '<div class="empty">Your completed videos appear here.</div>';
}

async function load() {
  const me = await api("/api/auth/me");

  user = me.user;

  $("#balance").textContent = $("#heroBalance").textContent = money(
    user.balance,
  );

  const v = await api("/api/videos");

  videos = v.videos;

  render();

  hist((await api("/api/history")).history);

  loadChat();
}

function yt(s) {
  try {
    const u = new URL(s);

    let id =
      u.hostname === "youtu.be"
        ? u.pathname.slice(1)
        : u.searchParams.get("v");

    if (!id && u.pathname.includes("/shorts/"))
      id = u.pathname.split("/shorts/")[1].split("/")[0];

    return id
      ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(
          id,
        )}?autoplay=1&rel=0`
      : null;
  } catch {
    return null;
  }
}

function tt(s) {
  const m = String(s).match(/\/video\/(\d+)/);

  return m
    ? `https://www.tiktok.com/player/v1/${m[1]}?autoplay=1&description=1&music_info=1`
    : null;
}

function player(v) {
  const p = $("#player");

  p.innerHTML = "";

  if (v.type === "upload") {
    const x = document.createElement("video");

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
    const x = document.createElement("iframe");

    x.src = src;
    x.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    x.allowFullscreen = true;

    p.appendChild(x);

    return;
  }

  p.innerHTML = `<div class="external">
    <div>↗</div>
    <h3>Open on ${esc(type(v))}</h3>
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

window.openWatch = (id) => {
  active = videos.find((v) => v.id === id);

  if (!active) return;

  $("#wt").textContent = active.title;

  $("#task").classList.toggle("hidden", !active.command);

  $("#taskText").textContent = active.command || "";

  $("#claim").disabled = true;

  $("#note").textContent = "";

  player(active);

  left = Math.max(5, Number(active.duration || 30));

  $("#timer").textContent = left + "s";

  $("#modal").classList.remove("hidden");

  document.body.classList.add("modalopen");

  clearInterval(timer);

  timer = setInterval(() => {
    left--;

    $("#timer").textContent = Math.max(0, left) + "s";

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

function close() {
  clearInterval(timer);

  $("#modal").classList.add("hidden");

  document.body.classList.remove("modalopen");

  $("#player").innerHTML = "";
}

$("#close").onclick = close;

$("#modal").onclick = (e) => {
  if (e.target.id === "modal") close();
};

$("#claim").onclick = async () => {
  try {
    const r = await api("/api/videos/" + active.id + "/claim", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: "{}",
    });

    user.balance = r.balance;

    $("#balance").textContent = $("#heroBalance").textContent = money(
      user.balance,
    );

    $("#claim").disabled = true;

    $("#note").textContent = "Reward claimed ✓";

    toast(`You earned ${money(r.reward)}!`);

    load();
  } catch (e) {
    toast(e.message, false);
  }
};

$("#refresh").onclick = () =>
  load().catch((e) => toast(e.message, false));

$("#logout").onclick = async () => {
  await api("/api/auth/logout", {
    method: "POST",
  });

  location = "/login.html";
};

async function loadChat() {
  try {
    const d = await api("/api/chat/me"),
      box = $("#supportChat");

    if (!d.chat) {
      box.classList.add("hidden");
      return;
    }

    box.classList.remove("hidden");

    const list = $("#userChatMessages");

    list.innerHTML = d.chat.messages
      .map(
        (m) =>
          `<div class="chat-msg ${
            m.sender === "user"
              ? "mine"
              : m.sender === "admin"
                ? "theirs"
                : "system-msg"
          }">
            <span>${
              m.sender === "admin"
                ? "Admin"
                : m.sender === "user"
                  ? "You"
                  : "Watchsave"
            }</span>

            <p>${esc(m.text)}</p>

            <small>${new Date(m.createdAt).toLocaleString()}</small>
          </div>`,
      )
      .join("");

    list.scrollTop = list.scrollHeight;
  } catch {}
}

$("#userChatForm").onsubmit = async (e) => {
  e.preventDefault();

  const text = $("#userChatInput").value.trim();

  if (!text) return;

  try {
    await api("/api/chat/me/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
      }),
    });

    $("#userChatInput").value = "";

    await loadChat();
  } catch (x) {
    toast(x.message, false);
  }
};

setInterval(() => {
  api("/api/presence", {
    method: "POST",
  }).catch(() => {});

  loadChat().catch(() => {});
}, 30000);

(async () => {
  try {
    await load();
  } catch {
    location = "/login.html";
  }
})();