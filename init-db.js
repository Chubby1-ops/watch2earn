require("dotenv").config();

const fs = require("fs");
const path = require("path");
const pool = require("./database");

async function initDatabase() {
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, "database.sql"),
      "utf8"
    );

    await pool.query(sql);

    console.log("✅ PostgreSQL database initialized successfully.");
  } catch (error) {
    console.error("❌ Database initialization failed:");
    console.error(error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

initDatabase();