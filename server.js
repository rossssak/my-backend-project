const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// เปลี่ยนการเชื่อมต่อฐานข้อมูลไปใช้ TiDB
const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1', // เปลี่ยนเป็น host ของ TiDB
    port: parseInt(process.env.DB_PORT || '4000'), // พอร์ตของ TiDB
    user: process.env.DB_USER || 'root', // ผู้ใช้ของ TiDB
    password: process.env.DB_PASSWORD || '', // รหัสผ่านของ TiDB
    database: process.env.DB_NAME || 'test', // ชื่อฐานข้อมูลใน TiDB
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: {
        minVersion: 'TLSv1.2'
    }
});

// Middleware จัดการ errors
const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
};

app.use(errorHandler);

// Routes
app.get('/nurses', async (req, res, next) => {
    try {
        const [rows] = await pool.query('SELECT * FROM nurses ORDER BY id ASC');
        res.status(200).json(rows);
    } catch (error) {
        next(error);
    }
});

app.get('/slist', async (req, res, next) => {
    try {
        const [rows] = await pool.query('SELECT * FROM doctor');
        res.status(200).json(rows);
    } catch (error) {
        next(error);
    }
});

app.get('/slist/:id', async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ message: 'Invalid ID' });
        }
        const [rows] = await pool.query('SELECT * FROM doctor WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Record not found' });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        next(error);
    }
});

app.get('/api/search', async (req, res, next) => {
    try {
        const age = parseInt(req.query.age);
        if (isNaN(age) || age <= 0) {
            return res.status(400).json({ message: 'Invalid age parameter' });
        }
        const [rows] = await pool.query('SELECT * FROM doctor WHERE age = ?', [age]);
        res.status(200).json(rows);
    } catch (error) {
        next(error);
    }
});

app.put('/slist/:id', async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ message: 'Invalid ID' });
        }
        const updatedData = req.body;

        const query = `
            UPDATE doctor 
            SET age=?, sex=?, \`Chest pain type\`=?, trestbps=?, cholesterol=?, 
                \`fasting blood sugar\`=?, \`resting ecg\`=?, \`max heart rate\`=?, 
                \`exercise angina\`=?, oldpeak=?, \`ST slope\`=?, target=? 
            WHERE id=?
        `;
        const values = [
            updatedData.age, updatedData.sex, updatedData["Chest pain type"], 
            updatedData.trestbps, updatedData.cholesterol, updatedData["fasting blood sugar"], 
            updatedData["resting ecg"], updatedData["max heart rate"], 
            updatedData["exercise angina"], updatedData.oldpeak, 
            updatedData["ST slope"], updatedData.target, id
        ];

        const [result] = await pool.query(query, values);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Record not found' });
        }

        res.status(200).json({ message: 'Record updated successfully' });
    } catch (error) {
        next(error);
    }
});

app.delete('/slist/:id', async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ message: 'Invalid ID' });
        }

        const [result] = await pool.query('DELETE FROM doctor WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Record not found' });
        }

        res.status(200).json({ message: 'Record deleted successfully' });
    } catch (error) {
        next(error);
    }
});

app.post('/slist', async (req, res, next) => {
    try {
        const newData = req.body;
        if (!newData.age || isNaN(newData.age) || newData.age <= 0) {
            return res.status(400).json({ message: 'Invalid age' });
        }

        const query = `
            INSERT INTO doctor 
            (age, sex, \`Chest pain type\`, trestbps, cholesterol, \`fasting blood sugar\`, 
            \`resting ecg\`, \`max heart rate\`, \`exercise angina\`, oldpeak, \`ST slope\`, target) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [
            newData.age, newData.sex, newData["Chest pain type"], newData.trestbps, 
            newData.cholesterol, newData["fasting blood sugar"], newData["resting ecg"], 
            newData["max heart rate"], newData["exercise angina"], newData.oldpeak, 
            newData["ST slope"], newData.target
        ];

        const [result] = await pool.query(query, values);
        res.status(201).json({ message: 'Record created successfully', id: result.insertId });
    } catch (error) {
        next(error);
    }
});

app.get('/', (req, res) => {
    res.send('API is running');
});

// Export handler for serverless function
module.exports = app;