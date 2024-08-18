const express = require("express");
const router = express.Router();

const path = require("path");
require("dotenv").config({
  override: true,
  path: path.join(__dirname, "development.env"),
});
const { Pool, Client } = require("pg");

const client = new Client({
  host: "localhost",
  port: 5433,
  user: "postgres",
  password: "root",
  database: "postgres",
});

client
  .connect()
  .catch((err) => console.error("Database connection error:", err));

router.post("/email-verify", async (req, res) => {
  const email = req.body.email;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const query = "SELECT verified FROM public.user WHERE email = $1";
    const values = [email];
    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      console.log("inserting!!!");
      res.json({ exists: false });

      const maxIdQuery = `SELECT COALESCE(MAX(id), 0) AS max_id FROM public.user`;
      const maxIdResult = await client.query(maxIdQuery);
      const nextId = maxIdResult.rows[0].max_id + 1;

      const insertQuery = `
              INSERT INTO public.user (id, email, verified)
              VALUES ($1, $2, $3)
              RETURNING id`;
      const insertValues = [nextId, email, 0];
      try {
        const insertResult = await client.query(insertQuery, insertValues);
      } catch (insertError) {
        console.error("Error inserting new record:", insertError);
        res.status(500).json({ error: "Error creating new record." });
      }
    } else {
      console.log("not inserting!!!");
      const verified = result.rows[0].verified;

      if (verified === 1) {
        res.json({ exists: true, verified: true });
      } else if (verified === 0) {
        res.json({ exists: true, verified: false });
      } else {
        res.status(500).json({ error: "Unexpected verification status" });
      }
    }
  } catch (err) {
    console.error("Error checking email:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
