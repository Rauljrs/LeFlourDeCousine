const mongoose = require('mongoose');
const bcrypt = require('bcrypt-nodejs');

const adminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    }
});

adminSchema.pre('save', function (next) {
    const admin = this;
    if (this.isModified('password') || this.isNew) {
        bcrypt.genSalt(10, (err, salt) => {
            if (err) {
                return next(err);
            }
            bcrypt.hash(admin.password, salt, null, (err, hash) => {
                if (err) {
                    return next(err);
                }
                admin.password = hash;
                next();
            });
        });
    } else {
        return next();
    }
});

adminSchema.methods.comparePassword = function(passw, cb) {
    bcrypt.compare(passw, this.password, function(err, isMatch){
        if (err) {
            return cb(err);
        }
        cb(null, isMatch);
    });
};

const Admin = mongoose.model('admin', adminSchema);

module.exports = Admin;