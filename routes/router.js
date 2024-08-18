const express = require("express");
const router = express.Router();
const { validate } = require("deep-email-validator");

const path = require("path");
require("dotenv").config({
  override: true,
  path: path.join(__dirname, "development.env"),
});
const { Pool, Client } = require("pg");

const client = new Client({
  host: "localhost",
  port: 5432,
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

  const validationResult = await validate({ email });

  let reason = validationResult.reason;

  if (!validationResult.valid) {
    const message = validationResult?.validators?.[reason]?.reason;

    return res.status(500).json({
      error:
        message ??
        "Invalid Formatted Email; please check the entry and try again.",
      email_validation: false,
    });
  }

  try {
    const query = "SELECT verified FROM public.user WHERE email = $1";
    const values = [email];
    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      console.log("inserting!!!");

      const maxIdQuery = `SELECT COALESCE(MAX(id), 0) AS max_id FROM public.user`;
      const maxIdResult = await client.query(maxIdQuery);
      const nextId = Number(maxIdResult.rows[0].max_id) + 1;

      const insertQuery = `
              INSERT INTO public.user (id, email, verified)
              VALUES ($1, $2, $3)
              RETURNING id`;
      const insertValues = [nextId, email, 0];
      try {
        const insertResult = await client.query(insertQuery, insertValues);

        res.json({ exists: false, email_validation: true, verified: false });
      } catch (insertError) {
        console.error("Error inserting new record:", insertError);
        res.status(500).json({
          error: "Error creating new record.",
          email_validation: true,
        });
      }
    } else {
      console.log("not inserting!!!");
      const verified = result.rows[0].verified;

      if (verified == 1) {
        res.json({ exists: true, verified: true, email_validation: true });
      } else if (verified == 0) {
        res.json({ exists: true, verified: false, email_validation: true });
      } else {
        res.status(500).json({
          error: "Unexpected verification status",
          email_validation: true,
        });
      }
    }
  } catch (err) {
    console.error("Error checking email:", err);
    res
      .status(500)
      .json({ error: "Internal Server Error", email_validation: true });
  }
});

router.post("/resend-verification-email", async (req, res) => {
  try {
    const email = req.body.email;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const query = "SELECT verified FROM public.user WHERE email = $1";
    const values = [email?.trim()];
    const result = await client.query(query, values);

    if (!result?.rowCount) {
      return res.status(500).json({
        error: "Account not found!",
        success: false,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Verification email sent successfully",
    });
  } catch (err) {
    console.error("Error checking email:", err);
    res
      .status(500)
      .json({ error: "Internal Server Error", email_validation: true });
  }
});

router.post("/remove-email", async (req, res) => {
  try {
    const email = req.body.email;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const query = "SELECT verified FROM public.user WHERE email = $1";
    const values = [email?.trim()];
    const result = await client.query(query, values);

    if (!result?.rowCount) {
      return res.status(500).json({
        error: "Account not found!",
        success: false,
      });
    }

    const deleteQuery = "DELETE FROM public.user WHERE email = $1";

    await client.query(deleteQuery, values);

    return res.status(200).json({
      success: true,
      message: "Email removed successfully",
    });
  } catch (err) {
    console.error("Error checking email:", err);
    res
      .status(500)
      .json({ error: "Internal Server Error", email_validation: true });
  }
});

module.exports = router;
