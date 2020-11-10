const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        min: 6,
        max: 30,
        unique: true
    },
    content: {
        type: String,
        required: true,
        min: 50,
        max: 10000
    },
    ingredients: {
        type: String,
        min: 20,
        max: 700
    },
    imageURL: String,
    public_id: String
},{
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});

const Posts = mongoose.model('posts', postSchema);

module.exports = Posts;