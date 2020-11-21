const mongoose = require('mongoose');

const salesSchema = new mongoose.Schema({
    users: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users'
    },
    books: {
        type: String,
        require: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    }
},{
    timestamps: {
        createdAt: 'created_at'
    }
});

const Sale = mongoose.model('sales', salesSchema);

module.exports = Sale;