const express = require('express');
const path = require('path'); // 1. Impor modul 'path'
const crypto = require('crypto'); // BARU: Impor modul crypto

const app = express();
const port = 3000;

// --- Middleware ---

// BARU: Middleware untuk mem-parsing JSON body dari request POST/PUT
// Ini penting agar 'req.body' bisa terbaca
app.use(express.json());

// 2. Gunakan middleware express.static
// Ini memberitahu Express untuk menyajikan file apa pun dari dalam folder 'public'
app.use(express.static(path.join(__dirname, 'public')));

// --- Routes ---

// 3. Route untuk API
// Ketika client mengirim request POST ke /create...
app.post('/create', (req, res) => {
    // 4. Ambil 'name' dari body request
    // Berkat 'app.use(express.json())', kita bisa membaca req.body
    const { name } = req.body;

    if (!name) {
        // Jika tidak ada nama yang dikirim, kirim error
        return res.status(400).json({ error: 'Nama API key diperlukan' });
    }

    // 5. Gunakan 'crypto' untuk membuat key yang aman di server
    // crypto.randomBytes(16) -> membuat 16 byte acak
    // .toString('hex')      -> mengubahnya menjadi string hexadesimal (32 karakter)
    const apiKey = 'sk_' + crypto.randomBytes(16).toString('hex'); // 'sk_' = secret key

    console.log(`Berhasil membuat key: Nama = ${name}, Key = ${apiKey}`);

    // 6. Kirim key baru kembali ke client sebagai JSON
    // Menggunakan status 201 (Created)
    res.status(201).json({
        name: name,
        apiKey: apiKey
    });
});

// --- Server Start ---

app.listen(port, () => {
  // Saya perbarui sedikit log-nya agar lebih jelas
  console.log(`Server berjalan! Buka http://localhost:${port} di browser Anda`);
});