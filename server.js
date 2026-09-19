
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
const { v2: cloudinary } = require("cloudinary");

const pool = require("./database");

const app = express();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const PORT = Number(process.env.PORT || 3000);

const JWT_SECRET =
  process.env.JWT_SECRET || "change-this-secret";

const ADMIN_EMAIL = String(
  process.env.ADMIN_EMAIL || "admin@watchsave.local"
).toLowerCase();

const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD || "WatchsaveAdmin123!";

const MIN_WITHDRAWAL =
  Number(process.env.MIN_WITHDRAWAL || 10000);

const DEFAULT_REWARD =
  Number(process.env.DEFAULT_REWARD || 50);

const DEFAULT_DURATION =
  Number(process.env.DEFAULT_DURATION || 30);

const SESSION_MAX_AGE =
  30 * 24 * 60 * 60 * 1000;


/* =========================
   DIRECTORIES
========================= */

const PERSISTENT_DIR =
  path.join(__dirname, "data");

const UPLOAD_DIR =
  path.join(PERSISTENT_DIR, "uploads");

fs.mkdirSync(UPLOAD_DIR, {
  recursive: true,
});


/* =========================
   HELPERS
========================= */

const uid = (p) =>
  `${p}_${crypto.randomBytes(8).toString("hex")}`;

const now = () =>
  new Date().toISOString();


/* =========================
   SESSION CLEANUP
========================= */

async function clean() {
  try {
    await pool.query(
      `
      DELETE FROM sessions
      WHERE created_at < NOW() - INTERVAL '30 days'
      `
    );
  } catch (err) {
    console.error("SESSION CLEANUP ERROR:", err);
  }
}


/* =========================
   ADMIN
========================= */

async function ensureAdmin() {
  const existing =
    await pool.query(
      `
      SELECT *
      FROM users
      WHERE LOWER(email) = $1
      LIMIT 1
      `,
      [ADMIN_EMAIL]
    );

  const passwordHash =
    await bcrypt.hash(
      ADMIN_PASSWORD,
      12
    );

  if (existing.rows.length === 0) {
    await pool.query(
      `
      INSERT INTO users (
        id,
        name,
        email,
        phone,
        password_hash,
        balance,
        is_admin,
        deleted,
        joined_at,
        last_login_at,
        last_seen
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
      )
      `,
      [
        uid("usr"),
        "Watchsave Admin",
        ADMIN_EMAIL,
        "",
        passwordHash,
        0,
        true,
        false,
        now(),
        null,
        null,
      ]
    );

    console.log("✅ Admin account created.");
  } else {
    await pool.query(
      `
      UPDATE users
      SET
        is_admin = TRUE,
        password_hash = $1,
        deleted = FALSE
      WHERE LOWER(email) = $2
      `,
      [
        passwordHash,
        ADMIN_EMAIL,
      ]
    );

    console.log("✅ Admin account verified.");
  }
}


/* =========================
   UPLOADS
========================= */

const upload =
  multer({
    storage:
      multer.diskStorage({
        destination: (
          _,
          __,
          cb
        ) =>
          cb(
            null,
            UPLOAD_DIR
          ),

        filename: (
          _,
          f,
          cb
        ) =>
          cb(
            null,
            `${Date.now()}_${crypto.randomBytes(5).toString("hex")}${path.extname(f.originalname).toLowerCase() || ".mp4"}`
          ),
      }),

    limits: {
      fileSize:
        250 * 1024 * 1024,
    },

    fileFilter: (
      _,
      f,
      cb
    ) =>
      cb(
        /^video\//.test(
          f.mimetype
        ) ||
          /\.(mp4|webm|ogg|mov|m4v)$/i.test(
            f.originalname
          )
          ? null
          : new Error(
              "Only video files are allowed."
            )
      ),
  });


/* =========================
   MIDDLEWARE
========================= */

app.use(
  express.json({
    limit: "2mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(cookieParser());


/* =========================
   CORS
========================= */

const allowedOrigins = [
  "https://watchsave.name.ng",
  "https://chubby1-ops.github.io",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

app.use(
  (req, res, next) => {
    const origin =
      req.headers.origin;

    if (
      origin &&
      allowedOrigins.includes(
        origin
      )
    ) {
      res.setHeader(
        "Access-Control-Allow-Origin",
        origin
      );

      res.setHeader(
        "Access-Control-Allow-Credentials",
        "true"
      );

      res.setHeader(
        "Vary",
        "Origin"
      );
    }

    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PATCH,DELETE,OPTIONS"
    );

    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );

    if (
      req.method ===
      "OPTIONS"
    ) {
      return res.sendStatus(204);
    }

    next();
  }
);


app.use(
  rateLimit({
    windowMs: 60000,
    limit: 180,
    standardHeaders: true,
    legacyHeaders: false,
  })
);


/* =========================
   AUTHENTICATION
========================= */

function token(
  u,
  sid
) {
  return jwt.sign(
    {
      uid: u.id,
      sid,
      role: u.isAdmin
        ? "admin"
        : "user",
    },
    JWT_SECRET,
    {
      expiresIn: "30d",
    }
  );
}

function getAuthToken(req) {
  const authorization =
    String(
      req.headers.authorization ||
        ""
    );

  if (
    authorization
      .toLowerCase()
      .startsWith("bearer ")
  ) {
    return authorization
      .slice(7)
      .trim();
  }

  return (
    req.cookies.ws_token ||
    ""
  );
}

async function current(req) {
  const t =
    getAuthToken(req);

  if (!t) {
    return null;
  }

  try {
    const payload =
      jwt.verify(
        t,
        JWT_SECRET
      );

    const result =
      await pool.query(
        `
        SELECT
          u.*,
          s.id AS session_id,
          s.created_at AS session_created_at
        FROM sessions s
        JOIN users u
          ON u.id = s.user_id
        WHERE
          s.id = $1
          AND s.user_id = $2
          AND u.deleted = FALSE
        LIMIT 1
        `,
        [
          payload.sid,
          payload.uid,
        ]
      );

    if (
      result.rows.length === 0
    ) {
      return null;
    }

    const row =
      result.rows[0];

    const created =
      new Date(
        row.session_created_at
      ).getTime();

    if (
      !Number.isFinite(created) ||
      Date.now() -
        created >=
        SESSION_MAX_AGE
    ) {
      await pool.query(
        `
        DELETE FROM sessions
        WHERE id = $1
        `,
        [payload.sid]
      );

      return null;
    }

    const timestamp =
      now();

    await pool.query(
      `
      UPDATE sessions
      SET last_seen = $1
      WHERE id = $2
      `,
      [
        timestamp,
        payload.sid,
      ]
    );

    await pool.query(
      `
      UPDATE users
      SET last_seen = $1
      WHERE id = $2
      `,
      [
        timestamp,
        row.id,
      ]
    );

    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone || "",
      balance: Number(row.balance || 0),
      isAdmin: !!row.is_admin,
      deleted: !!row.deleted,
      joinedAt: row.joined_at,
      lastLoginAt: row.last_login_at,
      lastSeen: timestamp,
      passwordHash: row.password_hash,
    };
  } catch {
    return null;
  }
}

async function auth(
  req,
  res,
  next
) {
  const u =
    await current(req);

  if (!u) {
    return res
      .status(401)
      .json({
        error:
          "Please log in.",
      });
  }

  req.user = u;

  next();
}

function admin(
  req,
  res,
  next
) {
  if (
    !req.user?.isAdmin
  ) {
    return res
      .status(403)
      .json({
        error:
          "Admin access required.",
      });
  }

  next();
}

const pub = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone || "",
  balance: Number(
    u.balance || 0
  ),
  isAdmin: !!u.isAdmin,
  joinedAt: u.joinedAt,
  lastLoginAt:
    u.lastLoginAt,
  lastSeen: u.lastSeen,
});


/* =========================
   HEALTH
========================= */

app.get(
  "/api/health",
  async (_, res) => {
    try {
      await pool.query(
        "SELECT 1"
      );

      res.json({
        ok: true,
        time: now(),
        database: "postgresql",
      });
    } catch (err) {
      console.error(
        "HEALTH ERROR:",
        err
      );

      res.status(500).json({
        ok: false,
        database: "error",
      });
    }
  }
);


/* =========================
   REGISTER
========================= */

app.post(
  "/api/auth/register",
  async (
    req,
    res
  ) => {
    try {
      const name =
        String(
          req.body.name ||
            ""
        ).trim();

      const email =
        String(
          req.body.email ||
            ""
        )
          .trim()
          .toLowerCase();

      const phone =
        String(
          req.body.phone ||
            ""
        ).trim();

      const password =
        String(
          req.body.password ||
            ""
        );

      if (
        name.length < 2
      ) {
        return res
          .status(400)
          .json({
            error:
              "Enter your name.",
          });
      }

      if (
        !/^\S+@\S+\.\S+$/.test(
          email
        )
      ) {
        return res
          .status(400)
          .json({
            error:
              "Enter a valid email.",
          });
      }

      if (
        password.length < 6
      ) {
        return res
          .status(400)
          .json({
            error:
              "Password must be at least 6 characters.",
          });
      }

      const existing =
        await pool.query(
          `
          SELECT id
          FROM users
          WHERE LOWER(email) = $1
          AND deleted = FALSE
          LIMIT 1
          `,
          [email]
        );

      if (
        existing.rows.length
      ) {
        return res
          .status(409)
          .json({
            error:
              "An account with that email already exists.",
          });
      }

      const timestamp =
        now();

      const id =
        uid("usr");

      const passwordHash =
        await bcrypt.hash(
          password,
          12
        );

      const sid =
        uid("ses");

      await pool.query(
        `
        INSERT INTO users (
          id,
          name,
          email,
          phone,
          password_hash,
          balance,
          is_admin,
          deleted,
          joined_at,
          last_login_at,
          last_seen
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
        )
        `,
        [
          id,
          name,
          email,
          phone,
          passwordHash,
          0,
          false,
          false,
          timestamp,
          timestamp,
          timestamp,
        ]
      );

      await pool.query(
        `
        INSERT INTO sessions (
          id,
          user_id,
          created_at,
          last_seen
        )
        VALUES ($1,$2,$3,$4)
        `,
        [
          sid,
          id,
          timestamp,
          timestamp,
        ]
      );

      await clean();

      const u = {
        id,
        name,
        email,
        phone,
        balance: 0,
        isAdmin: false,
        joinedAt: timestamp,
        lastLoginAt: timestamp,
        lastSeen: timestamp,
      };

      const accessToken =
        token(u, sid);

      res.cookie(
        "ws_token",
        accessToken,
        {
          httpOnly: true,
          sameSite: "none",
          secure: true,
          maxAge:
            SESSION_MAX_AGE,
          path: "/",
        }
      );

      return res
        .status(201)
        .json({
          ok: true,
          token:
            accessToken,
          user: pub(u),
        });
    } catch (err) {
      console.error(
        "REGISTER ERROR:",
        err
      );

      return res
        .status(500)
        .json({
          error:
            "Account creation failed. Please try again.",
        });
    }
  }
);


/* =========================
   LOGIN
========================= */

app.post(
  "/api/auth/login",
  async (
    req,
    res
  ) => {
    try {
      const email =
        String(
          req.body.email ||
            ""
        )
          .trim()
          .toLowerCase();

      const password =
        String(
          req.body.password ||
            ""
        );

      if (
        !email ||
        !password
      ) {
        return res
          .status(400)
          .json({
            error:
              "Email and password are required.",
          });
      }

      const result =
        await pool.query(
          `
          SELECT *
          FROM users
          WHERE LOWER(email) = $1
          AND deleted = FALSE
          LIMIT 1
          `,
          [email]
        );

      if (
        result.rows.length === 0
      ) {
        return res
          .status(401)
          .json({
            error:
              "Invalid email or password.",
          });
      }

      const row =
        result.rows[0];

      const passwordOk =
        await bcrypt.compare(
          password,
          row.password_hash
        );

      if (!passwordOk) {
        return res
          .status(401)
          .json({
            error:
              "Invalid email or password.",
          });
      }

      const timestamp =
        now();

      const sid =
        uid("ses");

      await pool.query(
        `
        UPDATE users
        SET
          last_login_at = $1,
          last_seen = $1
        WHERE id = $2
        `,
        [
          timestamp,
          row.id,
        ]
      );

      await pool.query(
        `
        INSERT INTO sessions (
          id,
          user_id,
          created_at,
          last_seen
        )
        VALUES ($1,$2,$3,$4)
        `,
        [
          sid,
          row.id,
          timestamp,
          timestamp,
        ]
      );

      await clean();

      const u = {
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone || "",
        balance: Number(row.balance || 0),
        isAdmin: !!row.is_admin,
        joinedAt: row.joined_at,
        lastLoginAt: timestamp,
        lastSeen: timestamp,
      };

      const accessToken =
        token(u, sid);

      res.cookie(
        "ws_token",
        accessToken,
        {
          httpOnly: true,
          sameSite: "none",
          secure: true,
          maxAge:
            SESSION_MAX_AGE,
          path: "/",
        }
      );

      return res.json({
        ok: true,
        token:
          accessToken,
        user: pub(u),
      });
    } catch (err) {
      console.error(
        "LOGIN ERROR:",
        err
      );

      return res
        .status(500)
        .json({
          error:
            "Login failed. Please try again.",
        });
    }
  }
);


/* =========================
   ADMIN PASSWORD LOGIN
========================= */

app.post(
  "/api/admin/login",
  async (req, res) => {
    try {
      const password =
        String(
          req.body?.password || ""
        );

      if (!password) {
        return res.status(400).json({
          error:
            "Admin password is required.",
        });
      }

      const result =
        await pool.query(
          `
          SELECT *
          FROM users
          WHERE LOWER(email) = $1
          AND is_admin = TRUE
          AND deleted = FALSE
          LIMIT 1
          `,
          [ADMIN_EMAIL]
        );

      if (
        result.rows.length === 0
      ) {
        return res.status(401).json({
          error:
            "Admin account not found.",
        });
      }

      const row =
        result.rows[0];

      const passwordOk =
        await bcrypt.compare(
          password,
          row.password_hash
        );

      if (!passwordOk) {
        return res.status(401).json({
          error:
            "Incorrect admin password.",
        });
      }

      const timestamp =
        now();

      const sid =
        uid("ses");

      await pool.query(
        `
        INSERT INTO sessions (
          id,
          user_id,
          created_at,
          last_seen
        )
        VALUES ($1,$2,$3,$4)
        `,
        [
          sid,
          row.id,
          timestamp,
          timestamp,
        ]
      );

      await pool.query(
        `
        UPDATE users
        SET
          last_login_at = $1,
          last_seen = $1
        WHERE id = $2
        `,
        [
          timestamp,
          row.id,
        ]
      );

      const u = {
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone || "",
        balance: Number(
          row.balance || 0
        ),
        isAdmin: true,
        joinedAt: row.joined_at,
        lastLoginAt: timestamp,
        lastSeen: timestamp,
      };

      const accessToken =
        token(u, sid);

      res.cookie(
        "ws_token",
        accessToken,
        {
          httpOnly: true,
          sameSite: "none",
          secure: true,
          maxAge:
            SESSION_MAX_AGE,
          path: "/",
        }
      );

      return res.json({
        ok: true,
        token: accessToken,
        user: pub(u),
      });
    } catch (err) {
      console.error(
        "ADMIN LOGIN ERROR:",
        err
      );

      return res.status(500).json({
        error:
          "Admin login failed. Please try again.",
      });
    }
  }
);


/* =========================
   LOGOUT
========================= */

app.post(
  "/api/auth/logout",
  auth,
  async (req, res) => {
    try {
      const t =
        getAuthToken(req);

      if (t) {
        const p =
          jwt.verify(
            t,
            JWT_SECRET
          );

        await pool.query(
          `
          DELETE FROM sessions
          WHERE id = $1
          `,
          [p.sid]
        );
      }
    } catch {}

    res.clearCookie(
      "ws_token",
      {
        httpOnly: true,
        sameSite: "none",
        secure: true,
        path: "/",
      }
    );

    res.json({
      ok: true,
    });
  }
);


/* =========================
   CURRENT USER
========================= */

app.get(
  "/api/auth/me",
  auth,
  (req, res) =>
    res.json({
      user: pub(
        req.user
      ),
    })
);


/* =========================
   PRESENCE
========================= */

app.post(
  "/api/presence",
  auth,
  async (req, res) => {
    try {
      const timestamp =
        now();

      const t =
        getAuthToken(req);

      if (t) {
        const p =
          jwt.verify(
            t,
            JWT_SECRET
          );

        await pool.query(
          `
          UPDATE sessions
          SET last_seen = $1
          WHERE id = $2
          `,
          [
            timestamp,
            p.sid,
          ]
        );

        await pool.query(
          `
          UPDATE users
          SET last_seen = $1
          WHERE id = $2
          `,
          [
            timestamp,
            req.user.id,
          ]
        );
      }

      res.json({
        online: true,
      });
    } catch {
      res.json({
        online: true,
      });
    }
  }
);


/* =========================
   VIDEOS
========================= */

function pv(v) {
  return {
    id: v.id,
    title: v.title,
    description:
      v.description || "",
    type: v.type,
    source: v.source,
    reward: Number(
      v.reward || 0
    ),
    duration: Number(
      v.duration || 30
    ),
    command:
      v.command || "",
    active:
      v.active !== false,
    createdAt:
      v.createdAt || v.created_at,
  };
}

function videoFromRow(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type,
    source: row.source,
    reward: Number(row.reward || 0),
    duration: Number(row.duration || 30),
    command: row.command || "",
    active: !!row.active,
    createdAt: row.created_at,
  };
}

app.get(
  "/api/videos",
  auth,
  async (req, res) => {
    try {
      const result =
        await pool.query(
          `
          SELECT *
          FROM videos
          WHERE active = TRUE
          ORDER BY created_at DESC
          `
        );

      res.json({
        videos:
          result.rows.map(
            videoFromRow
          ),
      });
    } catch (err) {
      console.error(
        "VIDEOS ERROR:",
        err
      );

      res.status(500).json({
        error:
          "Could not load videos.",
      });
    }
  }
);


/* =========================
   CLAIM VIDEO
========================= */

app.post(
  "/api/videos/:id/claim",
  auth,
  async (req, res) => {
    const client =
      await pool.connect();

    try {
      await client.query(
        "BEGIN"
      );

      const videoResult =
        await client.query(
          `
          SELECT *
          FROM videos
          WHERE id = $1
          AND active = TRUE
          LIMIT 1
          `,
          [req.params.id]
        );

      if (
        videoResult.rows.length === 0
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res
          .status(404)
          .json({
            error:
              "Video not found.",
          });
      }

      const v =
        videoResult.rows[0];

      const claimId =
        uid("claim");

      const claimResult =
        await client.query(
          `
          INSERT INTO video_claims (
            id,
            video_id,
            user_id,
            claimed_at
          )
          VALUES ($1,$2,$3,$4)
          ON CONFLICT (video_id, user_id)
          DO NOTHING
          RETURNING id
          `,
          [
            claimId,
            v.id,
            req.user.id,
            now(),
          ]
        );

      if (
        claimResult.rows.length === 0
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res
          .status(409)
          .json({
            error:
              "You already claimed this video.",
          });
      }

      const reward =
        Number(v.reward || 0);

      const balanceResult =
        await client.query(
          `
          UPDATE users
          SET balance = balance + $1,
              last_seen = $2
          WHERE id = $3
          AND deleted = FALSE
          RETURNING balance
          `,
          [
            reward,
            now(),
            req.user.id,
          ]
        );

      await client.query(
        "COMMIT"
      );

      res.json({
        ok: true,
        reward,
        balance:
          Number(
            balanceResult.rows[0]
              .balance
          ),
      });
    } catch (err) {
      await client.query(
        "ROLLBACK"
      );

      console.error(
        "CLAIM ERROR:",
        err
      );

      res.status(500).json({
        error:
          "Could not claim this video.",
      });
    } finally {
      client.release();
    }
  }
);


/* =========================
   HISTORY
========================= */

app.get(
  "/api/history",
  auth,
  async (req, res) => {
    try {
      const result =
        await pool.query(
          `
          SELECT
            v.id,
            v.title,
            v.reward,
            vc.claimed_at
          FROM video_claims vc
          JOIN videos v
            ON v.id = vc.video_id
          WHERE vc.user_id = $1
          ORDER BY vc.claimed_at DESC
          `,
          [req.user.id]
        );

      res.json({
        history:
          result.rows.map(
            (row) => ({
              id: row.id,
              title: row.title,
              reward: Number(
                row.reward || 0
              ),
              claimedAt:
                row.claimed_at,
            })
          ),
      });
    } catch (err) {
      console.error(
        "HISTORY ERROR:",
        err
      );

      res.status(500).json({
        error:
          "Could not load history.",
      });
    }
  }
);


/* =========================
   BANKS
========================= */

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
].map(
  ([name, code]) => ({
    name,
    code,
  })
);

app.get(
  "/api/banks",
  auth,
  (_, res) =>
    res.json({
      banks: BANKS,
    })
);


/* =========================
   WITHDRAWALS
========================= */

app.post(
  "/api/withdrawals",
  auth,
  async (req, res) => {
    const amount =
      Number(
        req.body.amount
      );

    const account =
      String(
        req.body.account ||
          ""
      ).replace(
        /\D/g,
        ""
      );

    const method =
      String(
        req.body.method ||
          "Manual Bank Transfer"
      ).trim();

    const bankName =
      String(
        req.body.bankName ||
          ""
      ).trim();

    const accountName =
      String(
        req.body.accountName ||
          ""
      ).trim();

    if (
      !Number.isFinite(amount) ||
      amount < MIN_WITHDRAWAL
    ) {
      return res
        .status(400)
        .json({
          error: `You can request withdrawal from ₦${MIN_WITHDRAWAL.toFixed(2)} and above.`,
        });
    }

    if (
      !/^\d{10}$/.test(account)
    ) {
      return res
        .status(400)
        .json({
          error:
            "Enter a valid 10-digit account number.",
        });
    }

    if (!bankName) {
      return res
        .status(400)
        .json({
          error:
            "Enter your bank name.",
        });
    }

    if (
      accountName.length < 2
    ) {
      return res
        .status(400)
        .json({
          error:
            "Enter the correct account holder name.",
        });
    }

    const client =
      await pool.connect();

    try {
      await client.query(
        "BEGIN"
      );

      const userResult =
        await client.query(
          `
          SELECT *
          FROM users
          WHERE id = $1
          AND deleted = FALSE
          FOR UPDATE
          `,
          [req.user.id]
        );

      if (
        userResult.rows.length === 0
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res
          .status(404)
          .json({
            error:
              "User not found.",
          });
      }

      const user =
        userResult.rows[0];

      const balance =
        Number(
          user.balance || 0
        );

      if (
        amount > balance
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res
          .status(400)
          .json({
            error:
              "Insufficient funds. The amount you entered is higher than your available balance.",
          });
      }

      const newBalance =
        balance - amount;

      await client.query(
        `
        UPDATE users
        SET balance = $1
        WHERE id = $2
        `,
        [
          newBalance,
          req.user.id,
        ]
      );

      const withdrawalId =
        uid("wd");

      await client.query(
        `
        INSERT INTO withdrawals (
          id,
          user_id,
          amount,
          method,
          account,
          bank_name,
          account_name,
          status,
          created_at
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9
        )
        `,
        [
          withdrawalId,
          req.user.id,
          amount,
          method,
          account,
          bankName,
          accountName,
          "pending",
          now(),
        ]
      );

      let chatResult =
        await client.query(
          `
          SELECT *
          FROM chats
          WHERE user_id = $1
          LIMIT 1
          `,
          [req.user.id]
        );

      let chat;

      if (
        chatResult.rows.length === 0
      ) {
        const chatId =
          uid("chat");

        const timestamp =
          now();

        const inserted =
          await client.query(
            `
            INSERT INTO chats (
              id,
              user_id,
              created_at,
              updated_at
            )
            VALUES ($1,$2,$3,$4)
            RETURNING *
            `,
            [
              chatId,
              req.user.id,
              timestamp,
              timestamp,
            ]
          );

        chat =
          inserted.rows[0];
      } else {
        chat =
          chatResult.rows[0];

        await client.query(
          `
          UPDATE chats
          SET updated_at = $1
          WHERE id = $2
          `,
          [
            now(),
            chat.id,
          ]
        );
      }

      const messageId =
        uid("msg");

      await client.query(
        `
        INSERT INTO chat_messages (
          id,
          chat_id,
          sender,
          text,
          created_at
        )
        VALUES ($1,$2,$3,$4,$5)
        `,
        [
          messageId,
          chat.id,
          "system",
          `Withdrawal request of ₦${amount.toFixed(2)} submitted. The admin can contact you here.`,
          now(),
        ]
      );

      await client.query(
        "COMMIT"
      );

      res.json({
        ok: true,
        balance: newBalance,
        chatId: chat.id,
      });
    } catch (err) {
      await client.query(
        "ROLLBACK"
      );

      console.error(
        "WITHDRAWAL ERROR:",
        err
      );

      res.status(500).json({
        error:
          "Withdrawal request failed. Please try again.",
      });
    } finally {
      client.release();
    }
  }
);

app.get(
  "/api/withdrawals",
  auth,
  async (req, res) => {
    try {
      const result =
        await pool.query(
          `
          SELECT
            id,
            user_id AS "userId",
            amount,
            method,
            account,
            bank_name AS "bankName",
            account_name AS "accountName",
            status,
            created_at AS "createdAt",
            processed_at AS "processedAt"
          FROM withdrawals
          WHERE user_id = $1
          ORDER BY created_at DESC
          `,
          [req.user.id]
        );

      res.json({
        withdrawals:
          result.rows.map(
            (w) => ({
              ...w,
              amount: Number(
                w.amount || 0
              ),
            })
          ),
      });
    } catch (err) {
      console.error(
        "WITHDRAWALS ERROR:",
        err
      );

      res.status(500).json({
        error:
          "Could not load withdrawals.",
      });
    }
  }
);


/* =========================
   USER CHAT
========================= */

app.get(
  "/api/chat/me",
  auth,
  async (req, res) => {
    try {
      const chatResult =
        await pool.query(
          `
          SELECT *
          FROM chats
          WHERE user_id = $1
          LIMIT 1
          `,
          [req.user.id]
        );

      if (
        chatResult.rows.length === 0
      ) {
        return res.json({
          chat: null,
        });
      }

      const chat =
        chatResult.rows[0];

      const messages =
        await pool.query(
          `
          SELECT
            id,
            sender,
            text,
            created_at AS "createdAt"
          FROM chat_messages
          WHERE chat_id = $1
          ORDER BY created_at ASC
          `,
          [chat.id]
        );

      res.json({
        chat: {
          id: chat.id,
          createdAt:
            chat.created_at,
          updatedAt:
            chat.updated_at,
          messages:
            messages.rows,
        },
      });
    } catch (err) {
      console.error(
        "CHAT ERROR:",
        err
      );

      res.status(500).json({
        error:
          "Could not load chat.",
      });
    }
  }
);

app.post(
  "/api/chat/me/messages",
  auth,
  async (req, res) => {
    const text =
      String(
        req.body.text ||
          ""
      ).trim();

    if (!text) {
      return res
        .status(400)
        .json({
          error:
            "Enter a message.",
        });
    }

    try {
      const chatResult =
        await pool.query(
          `
          SELECT *
          FROM chats
          WHERE user_id = $1
          LIMIT 1
          `,
          [req.user.id]
        );

      if (
        chatResult.rows.length === 0
      ) {
        return res
          .status(404)
          .json({
            error:
              "Your private admin chat is created after you submit a withdrawal request.",
          });
      }

      const chat =
        chatResult.rows[0];

      const message = {
        id: uid("msg"),
        sender: "user",
        text:
          text.slice(0, 2000),
        createdAt: now(),
      };

      await pool.query(
        `
        INSERT INTO chat_messages (
          id,
          chat_id,
          sender,
          text,
          created_at
        )
        VALUES ($1,$2,$3,$4,$5)
        `,
        [
          message.id,
          chat.id,
          message.sender,
          message.text,
          message.createdAt,
        ]
      );

      await pool.query(
        `
        UPDATE chats
        SET updated_at = $1
        WHERE id = $2
        `,
        [
          message.createdAt,
          chat.id,
        ]
      );

      res.json({
        ok: true,
        message,
      });
    } catch (err) {
      console.error(
        "CHAT MESSAGE ERROR:",
        err
      );

      res.status(500).json({
        error:
          "Could not send message.",
      });
    }
  }
);


/* =========================
   ADMIN CHATS
========================= */

app.get(
  "/api/admin/chats",
  auth,
  admin,
  async (req, res) => {
    try {
      const chatsResult =
        await pool.query(
          `
          SELECT
            c.*,
            COALESCE(u.name, 'Deleted user') AS user_name,
            COALESCE(u.email, '') AS user_email
          FROM chats c
          LEFT JOIN users u
            ON u.id = c.user_id
          ORDER BY c.updated_at DESC
          `
        );

      const chats = [];

      for (
        const row of chatsResult.rows
      ) {
        const messages =
          await pool.query(
            `
            SELECT
              id,
              sender,
              text,
              created_at AS "createdAt"
            FROM chat_messages
            WHERE chat_id = $1
            ORDER BY created_at ASC
            `,
            [row.id]
          );

        chats.push({
          id: row.id,
          userId: row.user_id,
          userName: row.user_name,
          userEmail: row.user_email,
          createdAt:
            row.created_at,
          updatedAt:
            row.updated_at,
          messages:
            messages.rows,
        });
      }

      res.json({
        chats,
      });
    } catch (err) {
      console.error(
        "ADMIN CHATS ERROR:",
        err
      );

      res.status(500).json({
        error:
          "Could not load chats.",
      });
    }
  }
);

app.post(
  "/api/admin/chats/:id/messages",
  auth,
  admin,
  async (req, res) => {
    const text =
      String(
        req.body.text ||
          ""
      ).trim();

    if (!text) {
      return res
        .status(400)
        .json({
          error:
            "Enter a message.",
        });
    }

    try {
      const chatResult =
        await pool.query(
          `
          SELECT *
          FROM chats
          WHERE id = $1
          LIMIT 1
          `,
          [req.params.id]
        );

      if (
        chatResult.rows.length === 0
      ) {
        return res
          .status(404)
          .json({
            error:
              "Chat not found.",
          });
      }

      const message = {
        id: uid("msg"),
        sender: "admin",
        text:
          text.slice(0, 2000),
        createdAt: now(),
      };

      await pool.query(
        `
        INSERT INTO chat_messages (
          id,
          chat_id,
          sender,
          text,
          created_at
        )
        VALUES ($1,$2,$3,$4,$5)
        `,
        [
          message.id,
          req.params.id,
          message.sender,
          message.text,
          message.createdAt,
        ]
      );

      await pool.query(
        `
        UPDATE chats
        SET updated_at = $1
        WHERE id = $2
        `,
        [
          message.createdAt,
          req.params.id,
        ]
      );

      res.json({
        ok: true,
        message,
      });
    } catch (err) {
      console.error(
        "ADMIN CHAT MESSAGE ERROR:",
        err
      );

      res.status(500).json({
        error:
          "Could not send message.",
      });
    }
  }
);


/* =========================
   ADMIN STATS
========================= */

app.get(
  "/api/admin/stats",
  auth,
  admin,
  async (req, res) => {
    try {
      await clean();

      const result =
        await pool.query(
          `
          SELECT
            (
              SELECT COUNT(*)
              FROM users
              WHERE is_admin = FALSE
              AND deleted = FALSE
            ) AS users,

            (
              SELECT COUNT(DISTINCT user_id)
              FROM sessions
              WHERE last_seen >= NOW() - INTERVAL '90 seconds'
            ) AS online,

            (
              SELECT COUNT(*)
              FROM videos
              WHERE active = TRUE
            ) AS videos,

            (
              SELECT COUNT(*)
              FROM withdrawals
              WHERE status = 'pending'
            ) AS pending_withdrawals
          `
        );

      const row =
        result.rows[0];

      res.json({
        users:
          Number(row.users),
        online:
          Number(row.online),
        videos:
          Number(row.videos),
        pendingWithdrawals:
          Number(
            row.pending_withdrawals
          ),
      });
    } catch (err) {
      console.error(
        "ADMIN STATS ERROR:",
        err
      );

      res.status(500).json({
        error:
          "Could not load admin statistics.",
      });
    }
  }
);


/* =========================
   ADMIN USERS
========================= */

app.get(
  "/api/admin/users",
  auth,
  admin,
  async (req, res) => {
    try {
      await clean();

      const result =
        await pool.query(
          `
          SELECT
            u.*,
            EXISTS (
              SELECT 1
              FROM sessions s
              WHERE s.user_id = u.id
              AND s.last_seen >= NOW() - INTERVAL '90 seconds'
            ) AS online
          FROM users u
          WHERE u.is_admin = FALSE
          ORDER BY u.joined_at DESC
          `
        );

      res.json({
        users:
          result.rows.map(
            (u) => ({
              id: u.id,
              name: u.name,
              email: u.email,
              phone: u.phone || "",
              balance: Number(
                u.balance || 0
              ),
              isAdmin:
                !!u.is_admin,
              joinedAt:
                u.joined_at,
              lastLoginAt:
                u.last_login_at,
              lastSeen:
                u.last_seen,
              deleted:
                !!u.deleted,
              online:
                !!u.online,
            })
          ),
      });
    } catch (err) {
      console.error(
        "ADMIN USERS ERROR:",
        err
      );

      res.status(500).json({
        error:
          "Could not load users.",
      });
    }
  }
);

app.delete(
  "/api/admin/users/:id",
  auth,
  admin,
  async (req, res) => {
    try {
      const result =
        await pool.query(
          `
          SELECT *
          FROM users
          WHERE id = $1
          AND is_admin = FALSE
          LIMIT 1
          `,
          [req.params.id]
        );

      if (
        result.rows.length === 0
      ) {
        return res
          .status(404)
          .json({
            error:
              "User not found.",
          });
      }

      await pool.query(
        `
        UPDATE users
        SET deleted = TRUE
        WHERE id = $1
        `,
        [req.params.id]
      );

      await pool.query(
        `
        DELETE FROM sessions
        WHERE user_id = $1
        `,
        [req.params.id]
      );

      res.json({
        ok: true,
      });
    } catch (err) {
      console.error(
        "DELETE USER ERROR:",
        err
      );

      res.status(500).json({
        error:
          "Could not delete user.",
      });
    }
  }
);


/* =========================
   ADMIN VIDEOS
========================= */

app.get(
  "/api/admin/videos",
  auth,
  admin,
  async (_, res) => {
    try {
      const result =
        await pool.query(
          `
          SELECT *
          FROM videos
          ORDER BY created_at DESC
          `
        );

      res.json({
        videos:
          result.rows.map(
            videoFromRow
          ),
      });
    } catch (err) {
      console.error(
        "ADMIN VIDEOS ERROR:",
        err
      );

      res.status(500).json({
        error:
          "Could not load videos.",
      });
    }
  }
);

function validUrl(x) {
  try {
    const u =
      new URL(
        String(
          x || ""
        ).trim()
      );

    if (
      ![
        "http:",
        "https:",
      ].includes(
        u.protocol
      )
    ) {
      throw 0;
    }

    return u.href;
  } catch {
    return null;
  }
}

function kind(x) {
  const h =
    new URL(x)
      .hostname
      .toLowerCase()
      .replace(
        /^www\./,
        ""
      );

  if (
    h.includes(
      "tiktok.com"
    )
  )
    return "tiktok";

  if (
    h.includes(
      "youtube.com"
    ) ||
    h === "youtu.be" ||
    h.includes(
      "youtube-nocookie.com"
    )
  )
    return "youtube";

  if (
    h.includes(
      "facebook.com"
    ) ||
    h === "fb.watch"
  )
    return "facebook";

  if (
    h.includes(
      "instagram.com"
    )
  )
    return "instagram";

  return "url";
}


/* =========================
   PUBLISH URL VIDEO
========================= */

app.post(
  "/api/admin/videos/url",
  auth,
  admin,
  async (req, res) => {
    const title =
      String(
        req.body.title ||
          ""
      ).trim();

    const source =
      validUrl(
        req.body.source
      );

    const reward =
      Number(
        req.body.reward ??
          DEFAULT_REWARD
      );

    const duration =
      Math.max(
        5,
        Math.floor(
          Number(
            req.body.duration ??
              DEFAULT_DURATION
          )
        )
      );

    const command =
      String(
        req.body.command ||
          ""
      ).trim();

    const description =
      String(
        req.body.description ||
          ""
      ).trim();

    if (!title) {
      return res
        .status(400)
        .json({
          error:
            "Enter a title.",
        });
    }

    if (!source) {
      return res
        .status(400)
        .json({
          error:
            "Enter a valid http/https URL.",
        });
    }

    if (
      !Number.isFinite(reward) ||
      reward < 0
    ) {
      return res
        .status(400)
        .json({
          error:
            "Reward must be 0 or higher.",
        });
    }

    const v = {
      id: uid("vid"),
      title,
      description,
      type: kind(source),
      source,
      reward,
      duration,
      command,
      active: true,
      createdAt: now(),
    };

    try {
      await pool.query(
        `
        INSERT INTO videos (
          id,
          title,
          description,
          type,
          source,
          reward,
          duration,
          command,
          active,
          created_at
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10
        )
        `,
        [
          v.id,
          v.title,
          v.description,
          v.type,
          v.source,
          v.reward,
          v.duration,
          v.command,
          v.active,
          v.createdAt,
        ]
      );

      res.json({
        video: pv(v),
      });
    } catch (err) {
      console.error(
        "CREATE VIDEO ERROR:",
        err
      );

      res.status(500).json({
        error:
          "Could not create video.",
      });
    }
  }
);


/* =========================
   UPLOAD VIDEO
   CLOUDINARY VERSION
========================= */

app.post(
  "/api/admin/videos/upload",
  auth,
  admin,
  upload.single("video"),
  async (req, res) => {
    if (!req.file) {
      return res
        .status(400)
        .json({
          error:
            "Choose a video file.",
        });
    }

    const tempFile =
      req.file.path;

    const reward =
      Number(
        req.body.reward ??
          DEFAULT_REWARD
      );

    if (
      !Number.isFinite(reward) ||
      reward < 0
    ) {
      try {
        fs.unlinkSync(
          tempFile
        );
      } catch {}

      return res
        .status(400)
        .json({
          error:
            "Reward must be 0 or higher.",
        });
    }

    const v = {
      id: uid("vid"),

      title:
        String(
          req.body.title ||
            req.file.originalname
        ).trim(),

      description:
        String(
          req.body.description ||
            ""
        ).trim(),

      type: "upload",

      source: "",

      reward,

      duration:
        Math.max(
          5,
          Math.floor(
            Number(
              req.body.duration ??
                DEFAULT_DURATION
            )
          )
        ),

      command:
        String(
          req.body.command ||
            ""
        ).trim(),

      active: true,
      createdAt: now(),
    };

    let cloudinaryUploaded =
      false;

    try {
      console.log(
        "Uploading video to Cloudinary..."
      );

      const uploaded =
        await cloudinary.uploader.upload(
          tempFile,
          {
            resource_type: "video",
            folder: "watchsave/videos",
            public_id: v.id,
            overwrite: false,
            type: "upload",
          }
        );

      cloudinaryUploaded =
        true;

      v.source =
        uploaded.secure_url;

      console.log(
        "✅ Cloudinary upload successful:",
        v.source
      );

      await pool.query(
        `
        INSERT INTO videos (
          id,
          title,
          description,
          type,
          source,
          reward,
          duration,
          command,
          active,
          created_at
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10
        )
        `,
        [
          v.id,
          v.title,
          v.description,
          v.type,
          v.source,
          v.reward,
          v.duration,
          v.command,
          v.active,
          v.createdAt,
        ]
      );

      try {
        fs.unlinkSync(
          tempFile
        );
      } catch {}

      console.log(
        "✅ Video saved to PostgreSQL."
      );

      res.json({
        video: pv(v),
      });
    } catch (err) {
      try {
        fs.unlinkSync(
          tempFile
        );
      } catch {}

      if (
        cloudinaryUploaded
      ) {
        try {
          await cloudinary.uploader.destroy(
            `watchsave/videos/${v.id}`,
            {
              resource_type:
                "video",
              type: "upload",
            }
          );

          console.log(
            "Cloudinary upload rolled back."
          );
        } catch (
          cloudinaryErr
        ) {
          console.error(
            "CLOUDINARY ROLLBACK ERROR:",
            cloudinaryErr
          );
        }
      }

      console.error(
        "UPLOAD VIDEO ERROR:",
        err
      );

      res.status(500).json({
        error:
          "Could not upload video.",
      });
    }
  }
);


/* =========================
   EDIT VIDEO
========================= */

app.patch(
  "/api/admin/videos/:id",
  auth,
  admin,
  async (req, res) => {
    try {
      const existing =
        await pool.query(
          `
          SELECT *
          FROM videos
          WHERE id = $1
          LIMIT 1
          `,
          [req.params.id]
        );

      if (
        existing.rows.length === 0
      ) {
        return res
          .status(404)
          .json({
            error:
              "Video not found.",
          });
      }

      const v =
        existing.rows[0];

      let reward =
        Number(v.reward || 0);

      let duration =
        Number(v.duration || 30);

      let command =
        v.command || "";

      let title =
        v.title;

      let description =
        v.description || "";

      let active =
        !!v.active;

      if (
        req.body.reward !==
        undefined
      ) {
        reward =
          Math.max(
            0,
            Number(
              req.body.reward
            )
          );
      }

      if (
        req.body.duration !==
        undefined
      ) {
        duration =
          Math.max(
            5,
            Math.floor(
              Number(
                req.body.duration
              )
            )
          );
      }

      if (
        req.body.command !==
        undefined
      ) {
        command =
          String(
            req.body.command
          );
      }

      if (
        req.body.title !==
        undefined
      ) {
        title =
          String(
            req.body.title
          );
      }

      if (
        req.body.description !==
        undefined
      ) {
        description =
          String(
            req.body.description
          );
      }

      if (
        req.body.active !==
        undefined
      ) {
        active =
          !!req.body.active;
      }

      const updated =
        await pool.query(
          `
          UPDATE videos
          SET
            reward = $1,
            duration = $2,
            command = $3,
            title = $4,
            description = $5,
            active = $6
          WHERE id = $7
          RETURNING *
          `,
          [
            reward,
            duration,
            command,
            title,
            description,
            active,
            req.params.id,
          ]
        );

      res.json({
        video:
          videoFromRow(
            updated.rows[0]
          ),
      });
    } catch (err) {
      console.error(
        "EDIT VIDEO ERROR:",
        err
      );

      res.status(500).json({
        error:
          "Could not update video.",
      });
    }
  }
);


/* =========================
   DELETE VIDEO
   CLOUDINARY VERSION
========================= */

app.delete(
  "/api/admin/videos/:id",
  auth,
  admin,
  async (req, res) => {
    try {
      const result =
        await pool.query(
          `
          SELECT *
          FROM videos
          WHERE id = $1
          LIMIT 1
          `,
          [req.params.id]
        );

      if (
        result.rows.length === 0
      ) {
        return res
          .status(404)
          .json({
            error:
              "Video not found.",
          });
      }

      const v =
        result.rows[0];

      if (
        v.type ===
        "upload"
      ) {
        try {
          console.log(
            "Deleting video from Cloudinary..."
          );

          const cloudinaryResult =
            await cloudinary.uploader.destroy(
              `watchsave/videos/${v.id}`,
              {
                resource_type:
                  "video",
                type: "upload",
              }
            );

          console.log(
            "Cloudinary delete result:",
            cloudinaryResult
          );
        } catch (
          cloudinaryErr
        ) {
          console.error(
            "CLOUDINARY DELETE ERROR:",
            cloudinaryErr
          );

          return res
            .status(500)
            .json({
              error:
                "Could not delete video from Cloudinary.",
            });
        }
      }

      await pool.query(
        `
        DELETE FROM videos
        WHERE id = $1
        `,
        [req.params.id]
      );

      console.log(
        "✅ Video deleted from database."
      );

      res.json({
        ok: true,
      });
    } catch (err) {
      console.error(
        "DELETE VIDEO ERROR:",
        err
      );

      res.status(500).json({
        error:
          "Could not delete video.",
      });
    }
  }
);


/* =========================
   ADMIN WITHDRAWALS
========================= */

app.get(
  "/api/admin/withdrawals",
  auth,
  admin,
  async (_, res) => {
    try {
      const result =
        await pool.query(
          `
          SELECT
            w.id,
            w.user_id AS "userId",
            w.amount,
            w.method,
            w.account,
            w.bank_name AS "bankName",
            w.account_name AS "accountName",
            w.status,
            w.created_at AS "createdAt",
            w.processed_at AS "processedAt",
            COALESCE(u.name, 'Deleted user') AS "userName",
            COALESCE(u.email, '') AS "userEmail"
          FROM withdrawals w
          LEFT JOIN users u
            ON u.id = w.user_id
          ORDER BY w.created_at DESC
          `
        );

      res.json({
        withdrawals:
          result.rows.map(
            (w) => ({
              ...w,
              amount:
                Number(
                  w.amount || 0
                ),
            })
          ),
      });
    } catch (err) {
      console.error(
        "ADMIN WITHDRAWALS ERROR:",
        err
      );

      res.status(500).json({
        error:
          "Could not load withdrawals.",
      });
    }
  }
);

app.patch(
  "/api/admin/withdrawals/:id",
  auth,
  admin,
  async (req, res) => {
    const status =
      String(
        req.body.status ||
          ""
      );

    if (
      ![
        "approved",
        "rejected",
      ].includes(status)
    ) {
      return res
        .status(400)
        .json({
          error:
            "Invalid status.",
        });
    }

    const client =
      await pool.connect();

    try {
      await client.query(
        "BEGIN"
      );

      const withdrawalResult =
        await client.query(
          `
          SELECT *
          FROM withdrawals
          WHERE id = $1
          FOR UPDATE
          `,
          [req.params.id]
        );

      if (
        withdrawalResult.rows.length === 0
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res
          .status(404)
          .json({
            error:
              "Withdrawal not found.",
          });
      }

      const w =
        withdrawalResult.rows[0];

      if (
        w.status !==
        "pending"
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res
          .status(400)
          .json({
            error:
              "Already processed.",
          });
      }

      const processedAt =
        now();

      await client.query(
        `
        UPDATE withdrawals
        SET
          status = $1,
          processed_at = $2
        WHERE id = $3
        `,
        [
          status,
          processedAt,
          req.params.id,
        ]
      );

      if (
        status ===
        "rejected"
      ) {
        await client.query(
          `
          UPDATE users
          SET balance = balance + $1
          WHERE id = $2
          AND deleted = FALSE
          `,
          [
            Number(
              w.amount
            ),
            w.user_id,
          ]
        );
      }

      await client.query(
        "COMMIT"
      );

      res.json({
        ok: true,
      });
    } catch (err) {
      await client.query(
        "ROLLBACK"
      );

      console.error(
        "ADMIN WITHDRAWAL ERROR:",
        err
      );

      res.status(500).json({
        error:
          "Could not process withdrawal.",
      });
    } finally {
      client.release();
    }
  }
);


/* =========================
   STATIC FRONTEND
========================= */

app.use(
  "/uploads",
  express.static(
    UPLOAD_DIR
  )
);

app.use(
  express.static(
    path.join(
      __dirname,
      "public"
    )
  )
);


/* =========================
   ERROR HANDLER
========================= */

app.use(
  (
    err,
    req,
    res,
    next
  ) => {
    console.error(err);

    res.status(400).json({
      error:
        err.message ||
        "Request failed.",
    });
  }
);


/* =========================
   START
========================= */

async function start() {
  try {
    await pool.query(
      "SELECT 1"
    );

    await ensureAdmin();

    await clean();

    app.listen(
      PORT,
      "0.0.0.0",
      () => {
        console.log(
          `Watchsave running on port ${PORT}`
        );

        console.log(
          "Database: PostgreSQL"
        );

        console.log(
          `Upload directory: ${UPLOAD_DIR}`
        );

        console.log(
          "Cloudinary: configured"
        );
      }
    );
  } catch (err) {
    console.error(
      "❌ SERVER STARTUP FAILED:"
    );

    console.error(err);

    process.exit(1);
  }
}

start();

