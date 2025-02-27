const express = require('express');
const cors = require('cors'); // นำเข้า cors
const app = express();
const port = 3000;

// อนุญาตการร้องขอจาก origin ใดๆ
app.use(cors());

// หรืออนุญาตเฉพาะ origin ที่ระบุ
// app.use(cors({ origin: 'http://127.0.0.1:5500' }));

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});