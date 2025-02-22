const mongoose = require('mongoose');

// Defining a model
const orderSchema = new mongoose.Schema(
    {
        // user_id: String,
        cart_id: String,
        inforUser: {
            fullName: String,
            email: String,
            tel: String,
            address: String,
            note: String,
        },
        products: [
            {
                product_id: String,
                price: Number, //old price
                discountPercentage: Number,
                quantity: Number,
                // discount_code: String
            }
        ]
    },
    {
        timestamps: true
    }
);

// Accessing a Model
const Order = mongoose.model('Order', orderSchema, 'orders');

// export
module.exports = Order;