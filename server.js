require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret";
const ADMIN_EMAIL = String(
  process.env.ADMIN_EMAIL || "admin@watchsave.local",
).toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "WatchsaveAdmin123!";
const MIN_WITHDRAWAL = Number(process.env.MIN_WITHDRAWAL || 10000);
const DEFAULT_REWARD = Number(process.env.DEFAULT_REWARD || 50);
const DEFAULT_DURATION = Number(process.env.DEFAULT_DURATION || 30);
const WITHDRAW_UNLOCK_CLAIMS = 5;
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "watchsave-data.json");
const UPLOAD_DIR = path.join(__dirname, "public", "uploads");
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const uid = (p) => `${p}_${crypto.randomBytes(8).toString("hex")}`;
const now = () => new Date().toISOString();
function load() {
  try {
    let d = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    d.users ??= [];
    d.videos ??= [];
    d.withdrawals ??= [];
    d.sessions ??= [];
    d.chats ??= [];
    return d;
  } catch {
    return { users: [], videos: [], withdrawals: [], sessions: [], chats: [] };
  }
}
let db = load();
function save() {
  let t = DATA_FILE + ".tmp";
  fs.writeFileSync(t, JSON.stringify(db, null, 2));
  fs.renameSync(t, DATA_FILE);
}
function clean() {
  db.sessions = db.sessions.filter(
    (s) => Date.now() - new Date(s.lastSeen).getTime() < 600000,
  );
}
function ensureAdmin() {
  let u = db.users.find((x) => x.email === ADMIN_EMAIL),
    h = bcrypt.hashSync(ADMIN_PASSWORD, 12);
  if (!u) {
    db.users.push({
      id: uid("usr"),
      name: "Watchsave Admin",
      email: ADMIN_EMAIL,
      phone: "",
      passwordHash: h,
      balance: 0,
      isAdmin: true,
      deleted: false,
      joinedAt: now(),
      lastLoginAt: null,
      lastSeen: null,
      withdrawUnlockClaims: 0,
    });
    save();
  } else if (!u.isAdmin) {
    u.isAdmin = true;
    u.passwordHash = h;
    save();
  }
}
ensureAdmin();

const upload = multer({
  storage: multer.diskStorage({
    destination: (_, __, cb) => cb(null, UPLOAD_DIR),
    filename: (_, f, cb) =>
      cb(
        null,
        `${Date.now()}_${crypto.randomBytes(5).toString("hex")}${path.extname(f.originalname).toLowerCase() || ".mp4"}`,
      ),
  }),
  limits: { fileSize: 250 * 1024 * 1024 },
  fileFilter: (_, f, cb) =>
    cb(
      /^video\//.test(f.mimetype) ||
        /\.(mp4|webm|ogg|mov|m4v)$/i.test(f.originalname)
        ? null
        : new Error("Only video files are allowed."),
    ),
});
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  rateLimit({
    windowMs: 60000,
    limit: 180,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
function token(u, sid) {
  return jwt.sign(
    { uid: u.id, sid, role: u.isAdmin ? "admin" : "user" },
    JWT_SECRET,
    { expiresIn: "30d" },
  );
}
function current(req) {
  let t = req.cookies.ws_token;
  if (!t) return null;
  try {
    let p = jwt.verify(t, JWT_SECRET),
      s = db.sessions.find((x) => x.id === p.sid && x.userId === p.uid),
      u = db.users.find((x) => x.id === p.uid);
    if (!s || !u || u.deleted) return null;
    s.lastSeen = u.lastSeen = now();
    return u;
  } catch {
    return null;
  }
}
function auth(req, res, next) {
  let u = current(req);
  if (!u) return res.status(401).json({ error: "Please log in." });
  req.user = u;
  next();
}
function admin(req, res, next) {
  if (!req.user?.isAdmin)
    return res.status(403).json({ error: "Admin access required." });
  next();
}
const pub = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone || "",
  balance: Number(u.balance || 0),
  isAdmin: !!u.isAdmin,
  joinedAt: u.joinedAt,
  lastLoginAt: u.lastLoginAt,
  lastSeen: u.lastSeen,
  withdrawUnlockClaims: Number(u.withdrawUnlockClaims || 0),
});

app.get("/api/health", (_, r) => r.json({ ok: true, time: now() }));
app.post("/api/auth/register", async (req, res) => {
  let name = String(req.body.name || "").trim(),
    email = String(req.body.email || "")
      .trim()
      .toLowerCase(),
    phone = String(req.body.phone || "").trim(),
    password = String(req.body.password || "");
  if (name.length < 2)
    return res.status(400).json({ error: "Enter your name." });
  if (!/^\S+@\S+\.\S+$/.test(email))
    return res.status(400).json({ error: "Enter a valid email." });
  if (password.length < 6)
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters." });
  if (db.users.some((u) => u.email === email && !u.deleted))
    return res
      .status(409)
      .json({ error: "An account with that email already exists." });
  let u = {
      id: uid("usr"),
      name,
      email,
      phone,
      passwordHash: await bcrypt.hash(password, 12),
      balance: 0,
      isAdmin: false,
      deleted: false,
      joinedAt: now(),
      lastLoginAt: null,
      lastSeen: now(),
      withdrawUnlockClaims: 0,
    },
    sid = uid("ses");
  db.users.push(u);
  db.sessions.push({
    id: sid,
    userId: u.id,
    createdAt: now(),
    lastSeen: now(),
  });
  save();
  res.cookie("ws_token", token(u, sid), {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 2592000000,
  });
  res.json({ user: pub(u) });
});
app.post("/api/auth/login", async (req, res) => {
  let email = String(req.body.email || "")
      .trim()
      .toLowerCase(),
    password = String(req.body.password || ""),
    u = db.users.find((x) => x.email === email && !x.deleted);
  if (!u || !(await bcrypt.compare(password, u.passwordHash)))
    return res.status(401).json({ error: "Invalid email or password." });
  u.lastLoginAt = u.lastSeen = now();
  let sid = uid("ses");
  db.sessions.push({
    id: sid,
    userId: u.id,
    createdAt: now(),
    lastSeen: now(),
  });
  save();
  res.cookie("ws_token", token(u, sid), {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 2592000000,
  });
  res.json({ user: pub(u) });
});
app.post("/api/auth/logout", auth, (req, res) => {
  try {
    let p = jwt.verify(req.cookies.ws_token, JWT_SECRET);
    db.sessions = db.sessions.filter((s) => s.id !== p.sid);
    save();
  } catch {}
  res.clearCookie("ws_token");
  res.json({ ok: true });
});
app.get("/api/auth/me", auth, (req, res) => res.json({ user: pub(req.user) }));
app.post("/api/presence", auth, (req, res) => {
  req.user.lastSeen = now();
  try {
    let p = jwt.verify(req.cookies.ws_token, JWT_SECRET),
      s = db.sessions.find((x) => x.id === p.sid);
    if (s) s.lastSeen = req.user.lastSeen;
    save();
  } catch {}
  res.json({ online: true });
});

function pv(v) {
  return {
    id: v.id,
    title: v.title,
    description: v.description,
    type: v.type,
    source: v.source,
    reward: Number(v.reward || 0),
    duration: Number(v.duration || 30),
    command: v.command || "",
    active: v.active !== false,
    createdAt: v.createdAt,
  };
}
app.get("/api/videos", auth, (req, res) =>
  res.json({
    videos: db.videos
      .filter((v) => v.active !== false)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(pv),
  }),
);
app.post("/api/videos/:id/claim", auth, (req, res) => {
  let v = db.videos.find((x) => x.id === req.params.id && x.active !== false);
  if (!v) return res.status(404).json({ error: "Video not found." });
  v.claims ??= [];
  v.claimTimes ??= {};
  if (v.claims.includes(req.user.id))
    return res.status(409).json({ error: "You already claimed this video." });
  const balanceBefore = Number(req.user.balance || 0);
  v.claims.push(req.user.id);
  v.claimTimes[req.user.id] = now();
  req.user.balance = balanceBefore + Number(v.reward || 0);
  if (
    balanceBefore >= MIN_WITHDRAWAL &&
    Number(req.user.withdrawUnlockClaims || 0) < WITHDRAW_UNLOCK_CLAIMS
  )
    req.user.withdrawUnlockClaims =
      Number(req.user.withdrawUnlockClaims || 0) + 1;
  save();
  res.json({
    ok: true,
    reward: Number(v.reward || 0),
    balance: req.user.balance,
    withdrawUnlockClaims: Number(req.user.withdrawUnlockClaims || 0),
    withdrawUnlockNeeded: WITHDRAW_UNLOCK_CLAIMS,
  });
});
app.get("/api/history", auth, (req, res) => {
  let a = [];
  for (let v of db.videos)
    if (v.claims?.includes(req.user.id))
      a.push({
        id: v.id,
        title: v.title,
        reward: Number(v.reward || 0),
        claimedAt: v.claimTimes?.[req.user.id] || null,
      });
  res.json({
    history: a.sort(
      (a, b) => new Date(b.claimedAt || 0) - new Date(a.claimedAt || 0),
    ),
  });
});

const BANKS = [
  ["Access Bank", "044"],
  ["Citibank Nigeria", "023"],
  ["Ecobank Nigeria", "050"],
  ["Fidelity Bank", "070"],
  ["First Bank of Nigeria", "011"],
  ["First City Monument Bank", "214"],
  ["Globus Bank", "103"],
  ["Guaranty Trust Bank", "058"],
  ["Keystone Bank", "082"],
  ["Kuda Bank", "50211"],
  ["Moniepoint MFB", "50515"],
  ["OPay", "999992"],
  ["PalmPay", "999991"],
  ["Polaris Bank", "076"],
  ["PremiumTrust Bank", "105"],
  ["Stanbic IBTC Bank", "221"],
  ["Sterling Bank", "232"],
  ["Union Bank of Nigeria", "032"],
  ["United Bank for Africa", "033"],
  ["Unity Bank", "215"],
  ["Wema Bank", "035"],
  ["Zenith Bank", "057"],
].map(([name, code]) => ({ name, code }));
app.get("/api/banks", auth, (_, res) => res.json({ banks: BANKS }));

app.post("/api/withdrawals", auth, (req, res) => {
  let amount = Number(req.body.amount),
    account = String(req.body.account || "").replace(/\D/g, ""),
    method = String(req.body.method || "Manual Bank Transfer").trim(),
    bankName = String(req.body.bankName || "").trim(),
    accountName = String(req.body.accountName || "").trim();
  const progress = Number(req.user.withdrawUnlockClaims || 0);
  if (!Number.isFinite(amount) || amount < MIN_WITHDRAWAL)
    return res
      .status(400)
      .json({
        error: `You can request withdrawal from ₦${MIN_WITHDRAWAL.toFixed(2)} and above.`,
      });
  if (amount > Number(req.user.balance || 0))
    return res
      .status(400)
      .json({
        error:
          "Insufficient funds. The amount you entered is higher than your available balance.",
      });
  if (
    Number(req.user.balance || 0) >= MIN_WITHDRAWAL &&
    progress < WITHDRAW_UNLOCK_CLAIMS
  )
    return res
      .status(400)
      .json({
        error: `Watch ${WITHDRAW_UNLOCK_CLAIMS - progress} more ads before requesting withdrawal.`,
      });
  if (!/^\d{10}$/.test(account))
    return res
      .status(400)
      .json({ error: "Enter a valid 10-digit account number." });
  if (!bankName)
    return res.status(400).json({ error: "Enter your bank name." });
  if (accountName.length < 2)
    return res
      .status(400)
      .json({ error: "Enter the correct account holder name." });
  req.user.balance -= amount;
  const wd = {
    id: uid("wd"),
    userId: req.user.id,
    amount,
    method,
    account,
    bankName,
    accountName,
    status: "pending",
    createdAt: now(),
  };
  db.withdrawals.push(wd);
  let chat = db.chats.find((c) => c.userId === req.user.id);
  if (!chat) {
    chat = {
      id: uid("chat"),
      userId: req.user.id,
      createdAt: now(),
      updatedAt: now(),
      messages: [],
    };
    db.chats.push(chat);
  }
  chat.updatedAt = now();
  chat.messages.push({
    id: uid("msg"),
    sender: "system",
    text: `Withdrawal request of ₦${amount.toFixed(2)} submitted. The admin can contact you here.`,
    createdAt: now(),
  });
  save();
  res.json({ ok: true, balance: req.user.balance, chatId: chat.id });
});
app.get("/api/withdrawals", auth, (req, res) =>
  res.json({
    withdrawals: db.withdrawals
      .filter((w) => w.userId === req.user.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
  }),
);

// Private support chat: a user can only chat with the admin; users cannot discover or message other users.
app.get("/api/chat/me", auth, (req, res) => {
  let chat = db.chats.find((c) => c.userId === req.user.id);
  if (!chat) return res.json({ chat: null });
  res.json({
    chat: {
      id: chat.id,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      messages: chat.messages,
    },
  });
});
app.post("/api/chat/me/messages", auth, (req, res) => {
  const text = String(req.body.text || "").trim();
  if (!text) return res.status(400).json({ error: "Enter a message." });
  let chat = db.chats.find((c) => c.userId === req.user.id);
  if (!chat)
    return res
      .status(404)
      .json({
        error:
          "Your private admin chat is created after you submit a withdrawal request.",
      });
  chat.messages.push({
    id: uid("msg"),
    sender: "user",
    text: text.slice(0, 2000),
    createdAt: now(),
  });
  chat.updatedAt = now();
  save();
  res.json({ ok: true, message: chat.messages.at(-1) });
});

app.get("/api/admin/chats", auth, admin, (req, res) => {
  const chats = db.chats
    .map((c) => {
      const u = db.users.find((x) => x.id === c.userId);
      return {
        ...c,
        userId: c.userId,
        userName: u?.name || "Deleted user",
        userEmail: u?.email || "",
      };
    })
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  res.json({ chats });
});
app.post("/api/admin/chats/:id/messages", auth, admin, (req, res) => {
  const text = String(req.body.text || "").trim();
  if (!text) return res.status(400).json({ error: "Enter a message." });
  const chat = db.chats.find((c) => c.id === req.params.id);
  if (!chat) return res.status(404).json({ error: "Chat not found." });
  chat.messages.push({
    id: uid("msg"),
    sender: "admin",
    text: text.slice(0, 2000),
    createdAt: now(),
  });
  chat.updatedAt = now();
  save();
  res.json({ ok: true, message: chat.messages.at(-1) });
});

app.get("/api/admin/stats", auth, admin, (req, res) => {
  clean();
  let online = new Set(
    db.sessions
      .filter((s) => Date.now() - new Date(s.lastSeen).getTime() < 90000)
      .map((s) => s.userId),
  );
  res.json({
    users: db.users.filter((u) => !u.isAdmin && !u.deleted).length,
    online: online.size,
    videos: db.videos.filter((v) => v.active !== false).length,
    pendingWithdrawals: db.withdrawals.filter((w) => w.status === "pending")
      .length,
  });
});
app.get("/api/admin/users", auth, admin, (req, res) => {
  clean();
  let online = new Set(
    db.sessions
      .filter((s) => Date.now() - new Date(s.lastSeen).getTime() < 90000)
      .map((s) => s.userId),
  );
  res.json({
    users: db.users
      .filter((u) => !u.isAdmin)
      .map((u) => ({
        ...pub(u),
        deleted: !!u.deleted,
        online: online.has(u.id),
      }))
      .sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt)),
  });
});
app.delete("/api/admin/users/:id", auth, admin, (req, res) => {
  let u = db.users.find((x) => x.id === req.params.id && !x.isAdmin);
  if (!u) return res.status(404).json({ error: "User not found." });
  u.deleted = true;
  db.sessions = db.sessions.filter((s) => s.userId !== u.id);
  save();
  res.json({ ok: true });
});
app.get("/api/admin/videos", auth, admin, (_, res) =>
  res.json({ videos: db.videos.map(pv) }),
);
function validUrl(x) {
  try {
    let u = new URL(String(x || "").trim());
    if (!["http:", "https:"].includes(u.protocol)) throw 0;
    return u.href;
  } catch {
    return null;
  }
}
function kind(x) {
  let h = new URL(x).hostname.toLowerCase().replace(/^www\./, "");
  if (h.includes("tiktok.com")) return "tiktok";
  if (
    h.includes("youtube.com") ||
    h === "youtu.be" ||
    h.includes("youtube-nocookie.com")
  )
    return "youtube";
  if (h.includes("facebook.com") || h === "fb.watch") return "facebook";
  if (h.includes("instagram.com")) return "instagram";
  return "url";
}
app.post("/api/admin/videos/url", auth, admin, (req, res) => {
  let title = String(req.body.title || "").trim(),
    source = validUrl(req.body.source),
    reward = Number(req.body.reward ?? DEFAULT_REWARD),
    duration = Math.max(
      5,
      Math.floor(Number(req.body.duration ?? DEFAULT_DURATION)),
    ),
    command = String(req.body.command || "").trim(),
    description = String(req.body.description || "").trim();
  if (!title) return res.status(400).json({ error: "Enter a title." });
  if (!source)
    return res.status(400).json({ error: "Enter a valid http/https URL." });
  if (!Number.isFinite(reward) || reward < 0)
    return res.status(400).json({ error: "Reward must be 0 or higher." });
  let v = {
    id: uid("vid"),
    title,
    description,
    type: kind(source),
    source,
    reward,
    duration,
    command,
    active: true,
    claims: [],
    claimTimes: {},
    createdAt: now(),
  };
  db.videos.push(v);
  save();
  res.json({ video: pv(v) });
});
app.post(
  "/api/admin/videos/upload",
  auth,
  admin,
  upload.single("video"),
  (req, res) => {
    if (!req.file)
      return res.status(400).json({ error: "Choose a video file." });
    let reward = Number(req.body.reward ?? DEFAULT_REWARD);
    if (!Number.isFinite(reward) || reward < 0) {
      fs.unlinkSync(path.join(UPLOAD_DIR, req.file.filename));
      return res.status(400).json({ error: "Reward must be 0 or higher." });
    }
    let v = {
      id: uid("vid"),
      title: String(req.body.title || req.file.originalname).trim(),
      description: String(req.body.description || "").trim(),
      type: "upload",
      source: "/uploads/" + req.file.filename,
      reward,
      duration: Math.max(
        5,
        Math.floor(Number(req.body.duration ?? DEFAULT_DURATION)),
      ),
      command: String(req.body.command || "").trim(),
      active: true,
      claims: [],
      claimTimes: {},
      createdAt: now(),
    };
    db.videos.push(v);
    save();
    res.json({ video: pv(v) });
  },
);
app.patch("/api/admin/videos/:id", auth, admin, (req, res) => {
  let v = db.videos.find((x) => x.id === req.params.id);
  if (!v) return res.status(404).json({ error: "Video not found." });
  if (req.body.reward !== undefined)
    v.reward = Math.max(0, Number(req.body.reward));
  if (req.body.duration !== undefined)
    v.duration = Math.max(5, Math.floor(Number(req.body.duration)));
  if (req.body.command !== undefined) v.command = String(req.body.command);
  if (req.body.title !== undefined) v.title = String(req.body.title);
  if (req.body.description !== undefined)
    v.description = String(req.body.description);
  if (req.body.active !== undefined) v.active = !!req.body.active;
  save();
  res.json({ video: pv(v) });
});
app.delete("/api/admin/videos/:id", auth, admin, (req, res) => {
  let i = db.videos.findIndex((v) => v.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: "Video not found." });
  let v = db.videos[i];
  if (v.type === "upload") {
    let f = path.join(UPLOAD_DIR, path.basename(v.source));
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
  db.videos.splice(i, 1);
  save();
  res.json({ ok: true });
});
app.get("/api/admin/withdrawals", auth, admin, (_, res) =>
  res.json({
    withdrawals: db.withdrawals.map((w) => {
      let u = db.users.find((x) => x.id === w.userId);
      return {
        ...w,
        userName: u?.name || "Deleted user",
        userEmail: u?.email || "",
      };
    }),
  }),
);
app.patch("/api/admin/withdrawals/:id", auth, admin, (req, res) => {
  let w = db.withdrawals.find((x) => x.id === req.params.id),
    status = String(req.body.status || "");
  if (!w) return res.status(404).json({ error: "Withdrawal not found." });
  if (!["approved", "rejected"].includes(status))
    return res.status(400).json({ error: "Invalid status." });
  if (w.status !== "pending")
    return res.status(400).json({ error: "Already processed." });
  w.status = status;
  w.processedAt = now();
  if (status === "rejected") {
    let u = db.users.find((x) => x.id === w.userId);
    if (u && !u.deleted) u.balance += Number(w.amount);
  }
  save();
  res.json({ ok: true });
});
app.use(express.static(path.join(__dirname, "public")));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(400).json({ error: err.message || "Request failed." });
});
app.listen(PORT, () =>
  console.log(`Watchsave running: http://localhost:${PORT}`),
);
