const bcrypt = require('bcryptjs'); // Add this line to import bcrypt
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

require('dotenv').config();

const userSchema = new Schema({
    userName: { type: String, unique: true },
    password: String,
    email: String,
    loginHistory: [{
        dateTime: Date,
        userAgent: String
    }]
});

let User;

function initialize() {
    return new Promise(function (resolve, reject) {
        let db = mongoose.createConnection(process.env.MONGODB);
        db.on('error', (err) => {
            reject(err);
        });
        db.once('open', () => {
            User = db.model("users", userSchema);
            resolve();
        });
    });
}

function registerUser(userData) {
    return new Promise((resolve, reject) => {
        if (userData.password !== userData.password2) {
            reject("Passwords do not match");
        } else {
            // Hash the password before saving
            bcrypt.hash(userData.password, 10)
                .then((hash) => {
                    let newUser = new User({
                        userName: userData.userName,
                        password: hash, // Save the hashed password
                        email: userData.email
                    });
                    return newUser.save();
                })
                .then(() => resolve())
                .catch((err) => {
                    if (err.code === 11000) {
                        reject("User Name already taken");
                    } else {
                        reject(`There was an error creating the user: ${err}`);
                    }
                });
        }
    });
}

function checkUser(userData) {
    return new Promise((resolve, reject) => {
        User.find({ userName: userData.userName })
            .then((users) => {
                if (users.length === 0) {
                    reject(`Unable to find user: ${userData.userName}`);
                } else {
                    const user = users[0];
                    // Compare hashed passwords
                    bcrypt.compare(userData.password, user.password)
                        .then((result) => {
                            if (result) {
                                if (user.loginHistory.length === 8) {
                                    user.loginHistory.pop();
                                }
                                user.loginHistory.unshift({ dateTime: new Date(), userAgent: userData.userAgent });
                                User.updateOne({ userName: user.userName }, { $set: { loginHistory: user.loginHistory } })
                                    .then(() => resolve(user))
                                    .catch((err) => reject(`There was an error verifying the user: ${err}`));
                            } else {
                                reject(`Incorrect Password for user: ${userData.userName}`);
                            }
                        });
                }
            })
            .catch(() => reject(`Unable to find user: ${userData.userName}`));
    });
}

module.exports = {
    initialize,
    registerUser,
    checkUser
};
