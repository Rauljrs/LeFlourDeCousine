const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false
})
    .then(db => console.log('DB is connected'))
    .catch(err => console.log(err));

module.exports = {
    'secret':'nodeauthsecret',
    'database': process.env.MONGODB_URI
};