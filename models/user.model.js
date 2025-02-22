const mongoose = require('mongoose');

// helper
const generateHelper = require('../helper/generate.help');

// Defining a model
const userSchema = new mongoose.Schema(
    {
        cart_id: String,
        fullName: String,
        avatar: {
            type: String,
            // default avatar
            default: "https://vnn-imgs-a1.vgcloud.vn/image1.ictnews.vn/_Files/2020/03/17/trend-avatar-1.jpg"
        },
        tokenUser: {
            type: String,
            default: generateHelper.randomString(20)
        },
        email: String,
        password: String,
        tel: String,
        status: {
            type: String,
            default: "active"
        },
        deleted: {
            type: Boolean,
            default: false
        },
    },
    {
        timestamps: true
    }
);

// Accessing a Model
const User = mongoose.model('User', userSchema, 'users');

// export
module.exports = User;