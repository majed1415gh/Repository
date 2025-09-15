const mysql = require('mysql2/promise');

// إنشاء pool للاتصالات بدلاً من اتصال واحد
// الـ Pool أكثر كفاءة ويدير عدة اتصالات بشكل تلقائي
const pool = mysql.createPool({
    host: 'localhost',          // عادةً ما يكون localhost
    user: 'root',               // اسم المستخدم الافتراضي لـ XAMPP/MAMP هو root
    password: '',               // كلمة المرور الافتراضية فارغة، قم بتغييرها إذا لزم الأمر
    database: 'aroood_db',      // اسم قاعدة البيانات التي أنشأناها
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

console.log("تم إعداد الاتصال بقاعدة البيانات بنجاح.");

// تصدير الـ pool لاستخدامه في ملفات أخرى
module.exports = pool;