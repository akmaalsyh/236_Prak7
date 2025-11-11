const express = require('express');
const path = require('path');
const crypto = require('crypto');
const mysql = require('mysql2/promise');
require('dotenv').config(); // 1. BARU: Muat variabel dari file .env

const app = express();
const port = 3000;

// --- Konfigurasi Database ---
// 2. BARU: Sesuaikan dengan nama variabel di file .env Anda
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,      // <-- Diubah dari DB_PASSWORD
    database: process.env.DB_DATABASE,  // <-- Diubah dari DB_NAME
    port: process.env.DB_PORT,        // <-- BARU: Menambahkan port 3308
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Cek koneksi database saat server start
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log('Database berhasil terkoneksi!');
        connection.release(); 
    } catch (error) {
        // Ini adalah error yang Anda lihat di terminal
        console.error('Database GAGAL terkoneksi:', error.message);
    }
})();


// --- Middleware ---
app.use(express.json()); 
app.use(express.static(path.join(__dirname, 'public'))); 

// --- Routes ---

app.post('/create', async (req, res) => {
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Nama API key diperlukan' });
    }

    const apiKey = 'sk_' + crypto.randomBytes(16).toString('hex');

    let connection; 

    try {
        connection = await pool.getConnection();

        const sql = "INSERT INTO `data_api` (nama, api_key_hash) VALUES (?, ?)";
        const [result] = await connection.execute(sql, [name, apiKey]);

        console.log(`Berhasil membuat key: Nama = ${name}, Key = ${apiKey}`);
        console.log(`Disimpan ke database dengan ID: ${result.insertId}`);

        res.status(201).json({
            message: 'Key berhasil dibuat dan disimpan',
            name: name,
            apiKey: apiKey
        });

    } catch (error) {
        // Ini adalah error yang menyebabkan munculnya 'alert' di browser
        console.error('Error saat menyimpan ke database:', error);
        res.status(500).json({ error: 'Gagal menyimpan key ke database' });

    } finally {
        if (connection) {
            connection.release();
        }
    }
});

app.post('/validate', async (req, res) => {
    const { apiKey } = req.body;

    if (!apiKey) {
        return res.status(400).json({ error: 'API key diperlukan untuk validasi' });
    }

    let connection;

    try {
        connection = await pool.getConnection();

        const sql = "SELECT * FROM `data_api` WHERE api_key_hash = ?";
        const [rows] = await connection.execute(sql, [apiKey]);

        if (rows.length > 0) {
            console.log(`Validasi berhasil untuk key: ${apiKey}`);
            res.status(200).json({
                valid: true,
                message: 'API key valid.',
                data: rows[0] 
            });
        } else {
            console.log(`Validasi GAGAL untuk key: ${apiKey}`);
            res.status(404).json({
                valid: false,
                message: 'API key tidak ditemukan atau tidak valid.'
            });
        }

    } catch (error) {
        console.error('Error saat validasi key:', error);
        res.status(500).json({ error: 'Gagal memvalidasi key' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});


// --- Server Start ---
app.listen(port, () => {
    console.log(`Server berjalan! Buka http://localhost:${port} di browser Anda`);
});