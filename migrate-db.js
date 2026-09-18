require("dotenv").config();

const fs = require("fs");
const path = require("path");
const pool = require("./database");

const DATA_FILE = path.join(__dirname, "data", "watchsave-data.json");

async function migrate() {
  const client = await pool.connect();

  try {
    console.log("Reading old JSON database...");

    if (!fs.existsSync(DATA_FILE)) {
      throw new Error(`Database file not found: ${DATA_FILE}`);
    }

    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));

    console.log("Starting PostgreSQL migration...");

    await client.query("BEGIN");

    // -------------------------
    // USERS
    // -------------------------
    const users = Array.isArray(data.users) ? data.users : [];

    for (const user of users) {
      await client.query(
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
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (id) DO NOTHING
        `,
        [
          user.id,
          user.name || "",
          user.email,
          user.phone || "",
          user.passwordHash || "",
          Number(user.balance || 0),
          Boolean(user.isAdmin),
          Boolean(user.deleted),
          user.joinedAt || new Date().toISOString(),
          user.lastLoginAt || null,
          user.lastSeen || null,
        ]
      );
    }

    console.log(`Users migrated: ${users.length}`);

    // -------------------------
    // VIDEOS
    // -------------------------
    const videos = Array.isArray(data.videos) ? data.videos : [];

    for (const video of videos) {
      await client.query(
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
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT (id) DO NOTHING
        `,
        [
          video.id,
          video.title || "",
          video.description || "",
          video.type || "url",
          video.source || "",
          Number(video.reward || 0),
          Number(video.duration || 30),
          video.command || "",
          video.active !== false,
          video.createdAt || new Date().toISOString(),
        ]
      );
    }

    console.log(`Videos migrated: ${videos.length}`);

    // -------------------------
    // VIDEO CLAIMS
    // -------------------------
    let claimsCount = 0;

    for (const video of videos) {
      const claims = Array.isArray(video.claims) ? video.claims : [];
      const claimTimes = video.claimTimes || {};

      for (const userId of claims) {
        const claimTime =
          claimTimes[userId] || video.createdAt || new Date().toISOString();

        await client.query(
          `
          INSERT INTO video_claims (
            id,
            video_id,
            user_id,
            claimed_at
          )
          VALUES ($1,$2,$3,$4)
          ON CONFLICT (video_id, user_id) DO NOTHING
          `,
          [
            `${video.id}_${userId}`,
            video.id,
            userId,
            claimTime,
          ]
        );

        claimsCount++;
      }
    }

    console.log(`Video claims processed: ${claimsCount}`);

    // -------------------------
    // SESSIONS
    // -------------------------
    const sessions = Array.isArray(data.sessions) ? data.sessions : [];

    for (const session of sessions) {
      await client.query(
        `
        INSERT INTO sessions (
          id,
          user_id,
          created_at,
          last_seen
        )
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (id) DO NOTHING
        `,
        [
          session.id,
          session.userId,
          session.createdAt || new Date().toISOString(),
          session.lastSeen || session.createdAt || new Date().toISOString(),
        ]
      );
    }

    console.log(`Sessions migrated: ${sessions.length}`);

    // -------------------------
    // WITHDRAWALS
    // -------------------------
    const withdrawals = Array.isArray(data.withdrawals)
      ? data.withdrawals
      : [];

    for (const withdrawal of withdrawals) {
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
          created_at,
          processed_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT (id) DO NOTHING
        `,
        [
          withdrawal.id,
          withdrawal.userId,
          Number(withdrawal.amount || 0),
          withdrawal.method || "Manual Bank Transfer",
          withdrawal.account || "",
          withdrawal.bankName || "",
          withdrawal.accountName || "",
          withdrawal.status || "pending",
          withdrawal.createdAt || new Date().toISOString(),
          withdrawal.processedAt || null,
        ]
      );
    }

    console.log(`Withdrawals migrated: ${withdrawals.length}`);

    // -------------------------
    // CHATS
    // -------------------------
    const chats = Array.isArray(data.chats) ? data.chats : [];

    for (const chat of chats) {
      await client.query(
        `
        INSERT INTO chats (
          id,
          user_id,
          created_at,
          updated_at
        )
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (id) DO NOTHING
        `,
        [
          chat.id,
          chat.userId,
          chat.createdAt || new Date().toISOString(),
          chat.updatedAt || chat.createdAt || new Date().toISOString(),
        ]
      );

      const messages = Array.isArray(chat.messages)
        ? chat.messages
        : [];

      for (const message of messages) {
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
          ON CONFLICT (id) DO NOTHING
          `,
          [
            message.id,
            chat.id,
            message.sender || "user",
            message.text || "",
            message.createdAt || new Date().toISOString(),
          ]
        );
      }
    }

    console.log(`Chats migrated: ${chats.length}`);

    await client.query("COMMIT");

    console.log("");
    console.log("======================================");
    console.log("✅ MIGRATION COMPLETED SUCCESSFULLY");
    console.log("======================================");
    console.log("");
    console.log("Your old JSON database is still untouched.");
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("");
    console.error("❌ MIGRATION FAILED");
    console.error(error);
    console.error("");
    console.error("No partial migration was committed.");
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();