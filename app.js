const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const ExcelJS = require('exceljs');

const app = express();
const db = new sqlite3.Database('attendance.db');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Route for the login page
app.get('/', (req, res) => {
    res.render('login');
});

// Handle login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM teachers WHERE username = ? AND password = ?', [username, password], (err, teacher) => {
        if (err) {
            return res.status(500).send('Database error');
        }
        if (!teacher) {
            return res.status(400).send('Invalid credentials');
        }
        db.all('SELECT * FROM sessions WHERE teacher_id = ?', [teacher.id], (err, sessions) => {
            if (err) {
                return res.status(500).send('Database error');
            }
            res.render('sessions', { teacher, sessions });
        });
    });
});

// Route for attendance page
app.get('/attendance/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    db.get('SELECT * FROM sessions WHERE id = ?', [sessionId], (err, session) => {
        if (err) {
            return res.status(500).send('Database error');
        }
        if (!session) {
            return res.status(404).send('Session not found');
        }
        db.all('SELECT * FROM students WHERE session_id = ?', [sessionId], (err, students) => {
            if (err) {
                return res.status(500).send('Database error');
            }
            res.render('attendance', { session, students });
        });
    });
});

// Handle attendance updates
app.post('/attendance/:studentId', (req, res) => {
    const { studentId } = req.params;
    const { attendance } = req.body;
    const time = new Date().toLocaleString(); // Get current date and time

    db.run('UPDATE students SET attendance = ?, time = ? WHERE id = ?', [attendance, time, studentId], function(err) {
        if (err) {
            return res.status(500).json({ success: false });
        }
        res.json({ success: true });
    });
});

// Route to download attendance as Excel file
app.get('/download/:sessionId', (req, res) => {
    const sessionId = req.params.sessionId;

    // Fetch session details
    db.get('SELECT sessions.name AS session_name, teachers.username AS teacher_name FROM sessions JOIN teachers ON sessions.teacher_id = teachers.id WHERE sessions.id = ?', [sessionId], (err, session) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Database error');
        }

        // Fetch student details
        db.all('SELECT * FROM students WHERE session_id = ?', [sessionId], (err, students) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).send('Database error');
            }

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Attendance');

            worksheet.columns = [
                { header: 'Student No', key: 'student_no', width: 15 },
                { header: 'Name', key: 'name', width: 25 },
                { header: 'Attendance', key: 'attendance', width: 15 },
                { header: 'Last Updated', key: 'time', width: 25 }
            ];

            worksheet.addRow(['Teacher:', session.teacher_name]);
            worksheet.addRow(['Session:', session.session_name]);
            worksheet.addRow([]);
            worksheet.addRow(worksheet.columns.map(col => col.header));

            students.forEach(student => {
                worksheet.addRow({
                    student_no: student.student_no,
                    name: student.name,
                    attendance: student.attendance,
                    time: student.time || 'Not updated yet'
                });
            });

            // Send Excel file
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=attendance.xlsx');

            workbook.xlsx.write(res)
                .then(() => {
                    res.end();
                })
                .catch(err => {
                    console.error('Excel write error:', err);
                    res.status(500).send('Error generating Excel file');
                });
        });
    });
});
// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:3000`);
});
