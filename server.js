const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const app = express();
const port = process.env.PORT || 3000;

// Load environment variables from .env file if present
dotenv.config();

// Middleware
app.use(cors());
app.use(express.json());

// Check for required environment variables or use defaults
const DB_HOST = process.env.DB_HOST || 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com';
const DB_USER = process.env.DB_USER || '2L7pQLa7k2ePuPR.root';
const DB_PASSWORD = process.env.DB_PASSWORD || 'kJCCEP8DYMyNeA7N';
const DB_NAME = process.env.DB_NAME || 'myprojact';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Determine the correct path to the CA certificate
let caPath;
if (process.env.CA) {
    caPath = process.env.CA;
} else {
    caPath = path.join(__dirname, './certs/isrgrootx.pem');
    // Create directory if it doesn't exist
    if (!fs.existsSync(path.join(__dirname, './certs'))) {
        fs.mkdirSync(path.join(__dirname, './certs'), { recursive: true });
    }
}


// Simplify the CA certificate handling
let caContent;
try {
  if (process.env.NODE_ENV === 'production') {
    // In production (Vercel), use the environment variable or a string directly
    caContent = process.env.CA_CERT || '-----BEGIN CERTIFICATE-----\nMIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw\nTzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh\ncmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMTUwNjA0MTEwNDM4\nWhcNMzUwNjA0MTEwNDM4WjBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJu\nZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBY\nMTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAK3oJHP0FDfzm54rVygc\nh77ct984kIxuPOZXoHj3dcKi/vVqbvYATyjb3miGbESTtrFj/RQSa78f0uoxmyF+\n0TM8ukj13Xnfs7j/EvEhmkvBioZxaUpmZmyPfjxwv60pIgbz5MDmgK7iS4+3mX6U\nA5/TR5d8mUgjU+g4rk8Kb4Mu0UlXjIB0ttov0DiNewNwIRt18jA8+o+u3dpjq+sW\nT8KOEUt+zwvo/7V3LvSye0rgTBIlDHCNAymg4VMk7BPZ7hm/ELNKjD+Jo2FR3qyH\nB5T0Y3HsLuJvW5iB4YlcNHlsdu87kGJ55tukmi8mxdAQ4Q7e2RCOFvu396j3x+UC\nB5iPNgiV5+I3lg02dZ77DnKxHZu8A/lJBdiB3QW0KtZB6awBdpUKD9jf1b0SHzUv\nKBds0pjBqAlkd25HN7rOrFleaJ1/ctaJxQZBKT5ZPt0m9STJEadao0xAH0ahmbWn\nOlFuhjuefXKnEgV4We0+UXgVCwOPjdAvBbI+e0ocS3MFEvzG6uBQE3xDk3SzynTn\njh8BCNAw1FtxNrQHusEwMFxIt4I7mKZ9YIqioymCzLq9gwQbooMDQaHWBfEbwrbw\nqHyGO0aoSCqI3Haadr8faqU9GY/rOPNk3sgrDQoo//fb4hVC1CLQJ13hef4Y53CI\nrU7m2Ys6xt0nUW7/vGT1M0NPAgMBAAGjQjBAMA4GA1UdDwEB/wQEAwIBBjAPBgNV\nHRMBAf8EBTADAQH/MB0GA1UdDgQWBBR5tFnme7bl5AFzgAiIyBpY9umbbjANBgkq\nhkiG9w0BAQsFAAOCAgEAVR9YqbyyqFDQDLHYGmkgJykIrGF1XIpu+ILlaS/V9lZL\nubhzEFnTIZd+50xx+7LSYK05qAvqFyFWhfFQDlnrzuBZ6brJFe+GnY+EgPbk6ZGQ\n3BebYhtF8GaV0nxvwuo77x/Py9auJ/GpsMiu/X1+mvoiBOv/2X/qkSsisRcOj/KK\nNFtY2PwByVS5uCbMiogziUwthDyC3+6WVwW6LLv3xLfHTjuCvjHIInNzktHCgKQ5\nORAzI4JMPJ+GslWYHb4phowim57iaztXOoJwTdwJx4nLCgdNbOhdjsnvzqvHu7Ur\nTkXWStAmzOVyyghqpZXjFaH3pO3JLF+l+/+sKAIuvtd7u+Nxe5AW0wdeRlN8NwdC\njNPElpzVmbUq4JUagEiuTDkHzsxHpFKVK7q4+63SM1N95R1NbdWhscdCb+ZAJzVc\noyi3B43njTOQ5yOf+1CceWxG1bQVs5ZufpsMljq4Ui0/1lvh+wjChP4kqKOJ2qxq\n4RgqsahDYVvTH9w7jXbyLeiNdd8XM2w9U/t7y0Ff/9yi0GE44Za4rF2LN9d11TPA\nmRGunUHBcnWEvgJBQl9nJEiU0Zsnvgc/ubhPgXRR4Xq37Z0j4r7g1SgEEzwxA57d\nemyPxgcYxn/eR44/KJ4EBs+lVDR3veyJm+kXQ99b21/+jh5Xos1AnX5iItreGCc=\n-----END CERTIFICATE-----';
  } else {
    // In development, read from file
    caPath = path.join(__dirname, './certs/isrgrootx.pem');
    if (!fs.existsSync(path.join(__dirname, './certs'))) {
      fs.mkdirSync(path.join(__dirname, './certs'), { recursive: true });
    }
    
    if (!fs.existsSync(caPath)) {
      fs.writeFileSync(caPath, '-----BEGIN CERTIFICATE-----\nMIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw\nTzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh\ncmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMTUwNjA0MTEwNDM4\nWhcNMzUwNjA0MTEwNDM4WjBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJu\nZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBY\nMTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAK3oJHP0FDfzm54rVygc\nh77ct984kIxuPOZXoHj3dcKi/vVqbvYATyjb3miGbESTtrFj/RQSa78f0uoxmyF+\n0TM8ukj13Xnfs7j/EvEhmkvBioZxaUpmZmyPfjxwv60pIgbz5MDmgK7iS4+3mX6U\nA5/TR5d8mUgjU+g4rk8Kb4Mu0UlXjIB0ttov0DiNewNwIRt18jA8+o+u3dpjq+sW\nT8KOEUt+zwvo/7V3LvSye0rgTBIlDHCNAymg4VMk7BPZ7hm/ELNKjD+Jo2FR3qyH\nB5T0Y3HsLuJvW5iB4YlcNHlsdu87kGJ55tukmi8mxdAQ4Q7e2RCOFvu396j3x+UC\nB5iPNgiV5+I3lg02dZ77DnKxHZu8A/lJBdiB3QW0KtZB6awBdpUKD9jf1b0SHzUv\nKBds0pjBqAlkd25HN7rOrFleaJ1/ctaJxQZBKT5ZPt0m9STJEadao0xAH0ahmbWn\nOlFuhjuefXKnEgV4We0+UXgVCwOPjdAvBbI+e0ocS3MFEvzG6uBQE3xDk3SzynTn\njh8BCNAw1FtxNrQHusEwMFxIt4I7mKZ9YIqioymCzLq9gwQbooMDQaHWBfEbwrbw\nqHyGO0aoSCqI3Haadr8faqU9GY/rOPNk3sgrDQoo//fb4hVC1CLQJ13hef4Y53CI\nrU7m2Ys6xt0nUW7/vGT1M0NPAgMBAAGjQjBAMA4GA1UdDwEB/wQEAwIBBjAPBgNV\nHRMBAf8EBTADAQH/MB0GA1UdDgQWBBR5tFnme7bl5AFzgAiIyBpY9umbbjANBgkq\nhkiG9w0BAQsFAAOCAgEAVR9YqbyyqFDQDLHYGmkgJykIrGF1XIpu+ILlaS/V9lZL\nubhzEFnTIZd+50xx+7LSYK05qAvqFyFWhfFQDlnrzuBZ6brJFe+GnY+EgPbk6ZGQ\n3BebYhtF8GaV0nxvwuo77x/Py9auJ/GpsMiu/X1+mvoiBOv/2X/qkSsisRcOj/KK\nNFtY2PwByVS5uCbMiogziUwthDyC3+6WVwW6LLv3xLfHTjuCvjHIInNzktHCgKQ5\nORAzI4JMPJ+GslWYHb4phowim57iaztXOoJwTdwJx4nLCgdNbOhdjsnvzqvHu7Ur\nTkXWStAmzOVyyghqpZXjFaH3pO3JLF+l+/+sKAIuvtd7u+Nxe5AW0wdeRlN8NwdC\njNPElpzVmbUq4JUagEiuTDkHzsxHpFKVK7q4+63SM1N95R1NbdWhscdCb+ZAJzVc\noyi3B43njTOQ5yOf+1CceWxG1bQVs5ZufpsMljq4Ui0/1lvh+wjChP4kqKOJ2qxq\n4RgqsahDYVvTH9w7jXbyLeiNdd8XM2w9U/t7y0Ff/9yi0GE44Za4rF2LN9d11TPA\nmRGunUHBcnWEvgJBQl9nJEiU0Zsnvgc/ubhPgXRR4Xq37Z0j4r7g1SgEEzwxA57d\nemyPxgcYxn/eR44/KJ4EBs+lVDR3veyJm+kXQ99b21/+jh5Xos1AnX5iItreGCc=\n-----END CERTIFICATE-----');
    }
    caContent = fs.readFileSync(caPath);
  }
} catch (err) {
  console.error('Error with CA certificate:', err);
  // Fallback to direct string if file operations fail
  caContent = '-----BEGIN CERTIFICATE-----\nMIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw\nTzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh\ncmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMTUwNjA0MTEwNDM4\nWhcNMzUwNjA0MTEwNDM4WjBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJu\nZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBY\nMTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAK3oJHP0FDfzm54rVygc\nh77ct984kIxuPOZXoHj3dcKi/vVqbvYATyjb3miGbESTtrFj/RQSa78f0uoxmyF+\n0TM8ukj13Xnfs7j/EvEhmkvBioZxaUpmZmyPfjxwv60pIgbz5MDmgK7iS4+3mX6U\nA5/TR5d8mUgjU+g4rk8Kb4Mu0UlXjIB0ttov0DiNewNwIRt18jA8+o+u3dpjq+sW\nT8KOEUt+zwvo/7V3LvSye0rgTBIlDHCNAymg4VMk7BPZ7hm/ELNKjD+Jo2FR3qyH\nB5T0Y3HsLuJvW5iB4YlcNHlsdu87kGJ55tukmi8mxdAQ4Q7e2RCOFvu396j3x+UC\nB5iPNgiV5+I3lg02dZ77DnKxHZu8A/lJBdiB3QW0KtZB6awBdpUKD9jf1b0SHzUv\nKBds0pjBqAlkd25HN7rOrFleaJ1/ctaJxQZBKT5ZPt0m9STJEadao0xAH0ahmbWn\nOlFuhjuefXKnEgV4We0+UXgVCwOPjdAvBbI+e0ocS3MFEvzG6uBQE3xDk3SzynTn\njh8BCNAw1FtxNrQHusEwMFxIt4I7mKZ9YIqioymCzLq9gwQbooMDQaHWBfEbwrbw\nqHyGO0aoSCqI3Haadr8faqU9GY/rOPNk3sgrDQoo//fb4hVC1CLQJ13hef4Y53CI\nrU7m2Ys6xt0nUW7/vGT1M0NPAgMBAAGjQjBAMA4GA1UdDwEB/wQEAwIBBjAPBgNV\nHRMBAf8EBTADAQH/MB0GA1UdDgQWBBR5tFnme7bl5AFzgAiIyBpY9umbbjANBgkq\nhkiG9w0BAQsFAAOCAgEAVR9YqbyyqFDQDLHYGmkgJykIrGF1XIpu+ILlaS/V9lZL\nubhzEFnTIZd+50xx+7LSYK05qAvqFyFWhfFQDlnrzuBZ6brJFe+GnY+EgPbk6ZGQ\n3BebYhtF8GaV0nxvwuo77x/Py9auJ/GpsMiu/X1+mvoiBOv/2X/qkSsisRcOj/KK\nNFtY2PwByVS5uCbMiogziUwthDyC3+6WVwW6LLv3xLfHTjuCvjHIInNzktHCgKQ5\nORAzI4JMPJ+GslWYHb4phowim57iaztXOoJwTdwJx4nLCgdNbOhdjsnvzqvHu7Ur\nTkXWStAmzOVyyghqpZXjFaH3pO3JLF+l+/+sKAIuvtd7u+Nxe5AW0wdeRlN8NwdC\njNPElpzVmbUq4JUagEiuTDkHzsxHpFKVK7q4+63SM1N95R1NbdWhscdCb+ZAJzVc\noyi3B43njTOQ5yOf+1CceWxG1bQVs5ZufpsMljq4Ui0/1lvh+wjChP4kqKOJ2qxq\n4RgqsahDYVvTH9w7jXbyLeiNdd8XM2w9U/t7y0Ff/9yi0GE44Za4rF2LN9d11TPA\nmRGunUHBcnWEvgJBQl9nJEiU0Zsnvgc/ubhPgXRR4Xq37Z0j4r7g1SgEEzwxA57d\nemyPxgcYxn/eR44/KJ4EBs+lVDR3veyJm+kXQ99b21/+jh5Xos1AnX5iItreGCc=\n-----END CERTIFICATE-----';
}

// สร้าง connection pool
const dbConfig = {
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Add SSL options only if we're connecting to TiDB Cloud
if (DB_HOST !== 'localhost') {
    dbConfig.ssl = {
        ca: caContent
    };
}

const pool = mysql.createPool(dbConfig);

// ทดสอบการเชื่อมต่อฐานข้อมูล
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('Connected to MySQL/TiDB successfully!');
        
        // แสดงข้อมูล connection
        console.log(`Connected to: ${DB_HOST}`);
        console.log(`Database: ${DB_NAME}`);
        
        // Check if tables exist and create them if needed
        await setupDatabase(connection);
        
        connection.release(); // คืน connection กลับไปที่ pool
    } catch (err) {
        console.error('Error connecting to database:', err);
        console.log('Please check your database configuration and ensure TiDB/MySQL is running.');
    }
}

// Set up database tables if they don't exist
async function setupDatabase(connection) {
    try {
        // Check and create users table if it doesn't exist
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Check and create doctor table if it doesn't exist
        await connection.query(`
            CREATE TABLE IF NOT EXISTS doctor (
                id INT AUTO_INCREMENT PRIMARY KEY,
                age INT NOT NULL,
                sex VARCHAR(10),
                \`Chest pain type\` VARCHAR(50),
                trestbps INT,
                cholesterol INT,
                \`fasting blood sugar\` VARCHAR(50),
                \`resting ecg\` VARCHAR(50),
                \`max heart rate\` INT,
                \`exercise angina\` VARCHAR(50),
                oldpeak FLOAT,
                \`ST slope\` VARCHAR(50),
                target VARCHAR(10)
            )
        `);
        
        // Check and create nurses table if it doesn't exist
        await connection.query(`
            CREATE TABLE IF NOT EXISTS nurses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                first_name VARCHAR(255),
                last_name VARCHAR(255),
                specialization VARCHAR(255),
                experience_years INT,
                certification VARCHAR(255),
                department VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        
        // Check if doctor table is empty and seed some sample data if it is
        const [doctorRows] = await connection.query('SELECT COUNT(*) as count FROM doctor');
        if (doctorRows[0].count === 0) {
            await connection.query(`
                INSERT INTO doctor (age, sex, \`Chest pain type\`, trestbps, cholesterol, \`fasting blood sugar\`, \`resting ecg\`, \`max heart rate\`, \`exercise angina\`, oldpeak, \`ST slope\`, target)
                VALUES 
                (63, 1, 'typical angina', 145, 233, '1', 'normal', 150, 'no', 2.3, 'downsloping', '1'),
                (57, 1, 'atypical angina', 130, 131, '0', 'normal', 115, 'yes', 1.2, 'flat', '2'),
                (52, 1, 'non-anginal pain', 120, 182, '0', 'normal', 150, 'no', 0, 'upsloping', '1'),
                (44, 1, 'typical angina', 140, 235, '0', 'normal', 180, 'no', 0, 'upsloping', '1'),
                (59, 1, 'non-anginal pain', 170, 288, '0', 'normal', 159, 'no', 0.2, 'flat', '2')
            `);
            console.log('Seeded doctor table with sample data');
        }
        
        // Check if nurses table is empty and seed some sample data if it is
        const [nursesRows] = await connection.query('SELECT COUNT(*) as count FROM nurses');
        if (nursesRows[0].count === 0) {
            await connection.query(`
                INSERT INTO nurses (first_name, last_name, specialization, experience_years, certification, department)
                VALUES 
                ('สมศรี', 'ใจดี', 'โรคหัวใจ', 8, 'พยาบาลวิชาชีพ', 'แผนกหัวใจ'),
                ('วิภา', 'รักษ์สุขภาพ', 'โรคหัวใจวิกฤต', 12, 'พยาบาลเฉพาะทางโรคหัวใจ', 'แผนกฉุกเฉิน'),
                ('ประภา', 'สุขสมบูรณ์', 'การรักษาโรคหัวใจ', 5, 'พยาบาลวิชาชีพ', 'แผนกเวชศาสตร์ป้องกัน')
            `);
            console.log('Seeded nurses table with sample data');
        }
        
        console.log('Database setup completed successfully');
    } catch (err) {
        console.error('Error setting up database:', err);
    }
}

testConnection(); // เรียกฟังก์ชันทดสอบการเชื่อมต่อ

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

// Route: ดึงข้อมูลพยาบาล
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
app.get('/slist', authenticateToken, async (req, res, next) => {
    try {
        const [rows] = await pool.query('SELECT * FROM doctor LIMIT 30');
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

// Serve static files if needed
app.use(express.static('public'));

// เริ่มต้นเซิร์ฟเวอร์
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log(`Access the application at http://localhost:${port}`);
});

// Replace the two app.listen blocks with this:
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
      console.log(`Access the application at http://localhost:${port}`);
    });
  }
  
  // Export the app for Vercel
  module.exports = app;