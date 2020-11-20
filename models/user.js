const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    lastname: {
        type: String,
        required: true
    },
    email: {
        type: String,
        unique: true,
        required: true       
    }

},{
    timestamps: {
    createdAt: 'create_at'
    }
});

const User = mongoose.model('User', UserSchema);

module.exports = User;