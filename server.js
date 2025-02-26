const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ตั้งค่าการเชื่อมต่อ MySQL
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
    port: process.env.DB_PORT || 4000,
    user: process.env.DB_USER || '2L7pQLa7k2ePuPR.root',
    password: process.env.DB_PASSWORD || 'kJCCEP8DYMyNeA7N',
    database: process.env.DB_NAME || 'myprojact',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: {
        minVersion: 'TLSv1.2'
    }
});


// ทดสอบการเชื่อมต่อฐานข้อมูล
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('Connected to MySQL');
        connection.release();
    } catch (err) {
        console.error('Error connecting to MySQL:', err);
    }
}
testConnection();

// Middleware ตรวจสอบ token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Authentication token required' });
    }

    try {
        const user = jwt.verify(token, JWT_SECRET);
        req.user = user;
        next();
    } catch (err) {
        return res.status(403).json({ message: 'Invalid or expired token' });
    }
};

// Middleware จัดการ errors
const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
};

app.use(errorHandler);

// เพิ่ม Route สำหรับดึงข้อมูลพยาบาล
app.get('/nurses', authenticateToken, async (req, res, next) => {
    try {
        const [rows] = await pool.query('SELECT * FROM nurses ORDER BY id ASC');
        res.status(200).json(rows);
    } catch (error) {
        next(error);
    }
});

// Route: สมัครสมาชิก
app.post('/register', async (req, res, next) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
        }

        const [existingUser] = await pool.query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );

        if (existingUser.length > 0) {
            return res.status(400).json({ message: 'Username นี้ถูกใช้งานแล้ว' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await pool.query(
            'INSERT INTO users (username, password) VALUES (?, ?)',
            [username, hashedPassword]
        );

        res.status(201).json({ message: 'สมัครสมาชิกสำเร็จ' });
    } catch (error) {
        next(error);
    }
});

// Route: เข้าสู่ระบบ
app.post('/login', async (req, res, next) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'กรุณากรอก username และ password' });
        }

        const [users] = await pool.query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(401).json({ message: 'ไม่พบผู้ใช้งาน' });
        }

        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
            return res.status(401).json({ message: 'รหัสผ่านไม่ถูกต้อง' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'เข้าสู่ระบบสำเร็จ',
            token,
            user: {
                id: user.id,
                username: user.username
            }
        });
    } catch (error) {
        next(error);
    }
});


// Route: ดึงข้อมูลทั้งหมด
app.get('/slist', (req, res) => {
    res.json({ message: 'API พร้อมใช้งาน' });
    try {
        const [rows] = pool.query('SELECT * FROM doctor');
        res.status(200).json(rows);
    } catch (error) {
        next(error);
    }
});

// Route: ดึงข้อมูลตาม ID
app.get('/slist/:id', authenticateToken, async (req, res, next) => {
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

// Route: ค้นหาข้อมูลตามอายุ
app.get('/api/search', authenticateToken, async (req, res, next) => {
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

// Route: อัปเดตข้อมูลตาม ID
app.put('/slist/:id', authenticateToken, async (req, res, next) => {
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

// Route: ลบข้อมูลตาม ID
app.delete('/slist/:id', authenticateToken, async (req, res, next) => {
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

// Route: เพิ่มข้อมูลใหม่
app.post('/slist', authenticateToken, async (req, res, next) => {
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

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});