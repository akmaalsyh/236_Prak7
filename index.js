const express = require('express');
const path = require('path');
const crypto = require('crypto');
const mysql = require('mysql2/promise'); // 1. Impor mysql2 (versi promise)

const app = express();
const port = 3000;

// --- Konfigurasi Database ---
// 2. Buat "pool" koneksi. Pool lebih efisien daripada satu koneksi
// TODO: Ganti ini dengan detail koneksi database Anda!
const pool = mysql.createPool({
    host: 'localhost',      // Biasanya 'localhost' atau 127.0.0.1
    user: 'root',           // User database Anda
    password: 'mysql123',           // Password database Anda
    database: 'api_key',    // Nama database yang Anda buat
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Cek koneksi database saat server start
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log('Database berhasil terkoneksi!');
        connection.release(); // Kembalikan koneksi ke pool
    } catch (error) {
        console.error('Database GAGAL terkoneksi:', error.message);
    }
})();


// --- Middleware ---
app.use(express.json()); // Mem-parsing JSON body
app.use(express.static(path.join(__dirname, 'public'))); // Menyajikan file statis

// --- Routes ---

/**
 * Route (BARU) untuk menyimpan API key ke database
 */
app.post('/create', async (req, res) => { // 3. Ubah menjadi 'async'
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Nama API key diperlukan' });
    }

    // Buat API key
    const apiKey = 'sk_' + crypto.randomBytes(16).toString('hex');

    let connection; // Deklarasikan di luar try-catch agar bisa diakses di 'finally'

    try {
        // 4. Ambil koneksi dari pool
        connection = await pool.getConnection();

        // 5. Jalankan query INSERT untuk menyimpan ke tabel 'keys'
        // Menggunakan '?' (placeholders) untuk mencegah SQL Injection
        const sql = "INSERT INTO `keys` (name, api_key) VALUES (?, ?)";
        const [result] = await connection.execute(sql, [name, apiKey]);

        console.log(`Berhasil membuat key: Nama = ${name}, Key = ${apiKey}`);
        console.log(`Disimpan ke database dengan ID: ${result.insertId}`);

        // 6. Kirim key baru kembali ke client
        res.status(201).json({
            message: 'Key berhasil dibuat dan disimpan',
            name: name,
            apiKey: apiKey
        });

    } catch (error) {
        // Tangani jika ada error database
        console.error('Error saat menyimpan ke database:', error);
        res.status(500).json({ error: 'Gagal menyimpan key ke database' });

    } finally {
        // 7. Selalu kembalikan koneksi ke pool setelah selesai
        if (connection) {
            connection.release();
        }
    }
});


/**
 * Route (BARU) untuk memvalidasi API key dari database
 */
app.post('/validate', async (req, res) => { // 8. Route validasi (async)
    // Kita akan validasi berdasarkan api_key saja
    const { apiKey } = req.body;

    if (!apiKey) {
        return res.status(400).json({ error: 'API key diperlukan untuk validasi' });
    }

    let connection;

    try {
        // 9. Ambil koneksi dari pool
        connection = await pool.getConnection();

        // 10. Jalankan query SELECT untuk mencari key
        const sql = "SELECT * FROM `keys` WHERE api_key = ?";
        const [rows] = await connection.execute(sql, [apiKey]);

        // 11. Cek hasilnya
        if (rows.length > 0) {
            // Key ditemukan dan valid
            console.log(`Validasi berhasil untuk key: ${apiKey}`);
            res.status(200).json({
                valid: true,
                message: 'API key valid.',
                data: rows[0] // Kirim data key yg ditemukan (tanpa mengirim ulang key)
            });
        } else {
            // Key tidak ditemukan
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