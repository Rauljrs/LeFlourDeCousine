const mongoose = require('mongoose');

const BookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  author: {
    type: String,
    required: true
  },
  publisher: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    require: true
  },
  url: {
    type: String,
    required: true
  },
  imageURL: String,
  public_id: String
},{
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});

const Book = mongoose.model('books', BookSchema);

module.exports = Book;