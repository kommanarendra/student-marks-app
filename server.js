require("dotenv").config();

const express = require("express");
const { Pool } = require("pg");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware: read JSON data from frontend
app.use(express.json());

// Serve frontend files from public folder
app.use(express.static(path.join(__dirname, "public")));

// PostgreSQL database connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

// Test PostgreSQL connection
pool.connect()
  .then((client) => {
    console.log("Connected to PostgreSQL database");
    client.release();
  })
  .catch((error) => {
    console.log("Database connection failed:", error.message);
  });

// Open index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// API: Add student
app.post("/api/students", async (req, res) => {
  try {
    const { rollNumber, studentName, marks } = req.body;

    if (!rollNumber || !studentName || marks === "") {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    if (Number(marks) < 0 || Number(marks) > 100) {
      return res.status(400).json({
        message: "Marks should be between 0 and 100"
      });
    }

    const countResult = await pool.query("SELECT COUNT(*) FROM students");
    const totalStudents = Number(countResult.rows[0].count);

    if (totalStudents >= 10) {
      return res.status(400).json({
        message: "Only 10 student records are allowed"
      });
    }

    const sql = `
      INSERT INTO students (roll_number, student_name, marks)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const result = await pool.query(sql, [
      rollNumber,
      studentName,
      marks
    ]);

    res.json({
      message: "Student marks saved successfully",
      student: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to save student marks",
      error: error.message
    });
  }
});

// API: Get all students
app.get("/api/students", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM students
      ORDER BY id ASC
    `);

    res.json(result.rows);

  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch students",
      error: error.message
    });
  }
});

// API: Update student by id
app.put("/api/students/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { rollNumber, studentName, marks } = req.body;

    if (!rollNumber || !studentName || marks === "") {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    if (Number(marks) < 0 || Number(marks) > 100) {
      return res.status(400).json({
        message: "Marks should be between 0 and 100"
      });
    }

    const sql = `
      UPDATE students
      SET roll_number = $1,
          student_name = $2,
          marks = $3
      WHERE id = $4
      RETURNING *
    `;

    const result = await pool.query(sql, [
      rollNumber,
      studentName,
      marks,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Student record not found"
      });
    }

    res.json({
      message: "Student updated successfully",
      student: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to update student",
      error: error.message
    });
  }
});

// API: Delete one student
app.delete("/api/students/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const result = await pool.query(
      "DELETE FROM students WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Student record not found"
      });
    }

    res.json({
      message: "Student record deleted successfully"
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to delete student record",
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});