const bcrypt = require('bcrypt');

const password = 'admin123'; // replace with your desired password
bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
        console.error('Error hashing password:', err);
        return;
    }
    console.log(hashedPassword); // Use this hashed password to insert into the database
});
