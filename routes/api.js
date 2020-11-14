const mongoose = require('mongoose');
const passport = require('passport');
require('dotenv').config();
const config = require('../config/database');
require('../config/passportAdmin')(passport);
const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
cloudinary.config({
	cloud_name: process.env.CLOUD_NAME,
	api_key: process.env.CLOUD_API_KEY,
	api_secret: process.env.CLOUD_API_SECRET
});
const fs = require('fs-extra');
const User = require('../models/user');
const Book = require('../models/book');
const Admin = require('../models/admin');
const Sales = require('../models/sales');
const Post = require('../models/post');








//SIGNIN - SIGNUP
router.post('/signup/admin', function(req, res) {
	if (!req.body.username || !req.body.password) {
		res.json({
			success: false,
			msg: 'Please pass username and password.'
		});
	} else {
		var newAdmin = new Admin({
			username: req.body.username,
			password: req.body.password
		});
		// save the user
		newAdmin.save(function(err) {
			if (err) {
				return res.json({
					success: false,
					msg: 'Username already exists.'
				});
			}
			res.json({
				success: true,
				msg: 'Successful created new user.'
			});
		});
	}
});

router.post('/signin/admin', function(req, res) {
	Admin.findOne(
		{
			username: req.body.username
		},
		function(err, admin) {
			if (err) throw err;

			if (!admin) {
				res.status(401).send({
					success: false,
					msg: 'Authentication failed. Admin not found.'
				});
			} else {
				// check if password matches
				admin.comparePassword(req.body.password, function(err, isMatch) {
					if (isMatch && !err) {
						// if user is found and password is right create a token
						var token = jwt.sign(admin.toObject(), config.secret, {
							expiresIn: 5000
						});
						// return the information including token as JSON
						res.json({
							success: true,
							token: 'JWT ' + token
						});
					} else {
						res.status(401).send({
							success: false,
							msg: 'Authentication failed. Wrong password.'
						});
					}
				});
			}
		}
	);
});








//POSTS
router.post(
	'/post/admin',
	passport.authenticate('jwt', {
		session: false
	}),
	async function(req, res) {
    var token = getToken(req.headers);
    if(req.file === undefined){
      res.send("NO SE CARGÓ NINGUNA IMAGEN");
    }else{
      const result = await cloudinary.uploader.upload(req.file.path);
      if (token) {
        const newPost = new Post({
          title: req.body.title,
          content: req.body.content,
          ingredients: req.body.ingredients,
          imageURL: result.url,
          public_id: result.public_id
        });
  
        await newPost.save(function(err) {
          if (err) {
            return res.json({
              success: false,
              msg: 'Save post failed.'
            });
          }
          res.json({
            success: true,
            msg: 'Successful created new post.'
          });
        });
      } else {
        return res.status(403).send({
          success: false,
          msg: 'Unauthorized.'
        });
      }
      fs.unlink(req.file.path);
    }
	}
);

router.get(
	'/posts',
	passport.authenticate('jwt', {
		session: false
	}),
	function(req, res) {
		var token = getToken(req.headers);
		if (token) {
			Post.find(function(err, posts) {
				if (err) return next(err);
				res.json(posts);
			});
		} else {
			return res.status(403).send({
				success: false,
				msg: 'Unauthorized.'
			});
		}
	}
);

router.put(
	'/posts/:id',
	passport.authenticate('jwt', {session: false}),
	async (req, res) => {
		var token = getToken(req.headers);
		if (token) {
			if (req.file === undefined) {
				const post = await Post.findByIdAndUpdate(
					req.params.id,
					{
						title: req.body.title,
						content: req.body.content,
						ingredients: req.body.ingredients
					},
					{
						new: true
					}
				);

				if (!post) {
					return res.status(404).send('ID del post no existe...');
				}

				res.status(204).json();
			} else {
				if (req.file.path === true) {
          const uploaded = await cloudinary.uploader.upload(req.file.path);
          const oldpost = await Post.findById(req.params.id);
          cloudinary.uploader.destroy(oldpost.public_id, function(error,result) {
            console.log(result, error); 
          });
					const post = await Post.findByIdAndUpdate(
						req.params.id,
						{
							title: req.body.title,
							content: req.body.content,
							ingredients: req.body.ingredients,
							imageURL: uploaded.url,
							public_id: uploaded.public_id
						},
						{
							new: true
						}
					);
					if (!post) {
						return res.status(404).send('ID del post no existe...');
					}
					fs.unlink(req.file.path);
					res.status(204).send('Successful edited the post.');
				}
			}
		}
	}
);

router.delete('/posts/:id', passport.authenticate('jwt', {session: false}),async(req, res) => {
  const post = await Post.findById(req.params.id);
  cloudinary.uploader.destroy(post.public_id, function(error,result) {
    console.log(result, error); 
  });
  const deletepost = await Post.findByIdAndDelete(req.params.id);

  if(!deletepost){
      return res.status(404).send('ID del post no existe...');
  }

  res.status(200).send('Post borrado con exito');
});






//BOOKS
router.get('/books', function(req, res) {
	Book.find(function(err, books) {
  	if (err) return next(err);
		res.json(books);
	});
});

router.post(
	'/book/admin',
	passport.authenticate('jwt', {
		session: false
	}),
	function(req, res) {
		var token = getToken(req.headers);
		if (token) {
			console.log(req.body);
			var newBook = new Book({
				title: req.body.title,
				author: req.body.author,
				publisher: req.body.publisher
			});

			newBook.save(function(err) {
				if (err) {
					return res.json({
						success: false,
						msg: 'Save book failed.'
					});
				}
				res.json({
					success: true,
					msg: 'Successful created new book.'
				});
			});
		} else {
			return res.status(403).send({
				success: false,
				msg: 'Unauthorized.'
			});
		}
	}
);

router.delete('/books/:id', passport.authenticate('jwt', {session: false}),async(req, res) => {
  const book = await Post.findByIdAndDelete(req.params.id);

  if(!book){
      return res.status(404).send('ID del libro no existe...');
  }

  res.status(200).send('Libro borrado con exito');
});








//SALES
router.post('/books/:id', function(req, res) {
	if (!req.body.name || !req.body.lastname || !req.body.email) {
		res.json({
			success: false,
			msg: 'Please pass name, last name and email.'
		});
	} else {
		var newUser = new User({
			name: req.body.name,
			lastname: req.body.lastname,
			email: req.body.email
		});

		var newSale = new Sales({
			users: newUser._id,
			books: req.params.id,
			price: req.body.price
		});

		newUser.save(function(err) {
			if (err) {
				console.log(err);
				return res.json({
					success: false,
					msg: 'Error.'
				});
			}
			newSale.save(function(err) {
				if (err) {
					return res.json({
						success: false,
						msg: 'Sale Error.'
					});
				}
				res.json({
					success: true,
					msg: 'Successful.'
				});
			});
		});
	}
});

router.get(
	'/sales/admin',
	passport.authenticate('jwt', {session: false}),
	function(req, res) {
		var token = getToken(req.headers);
		if (token) {
			Sales.find(function(err, sales) {
				User.populate(
					sales,
					{
						path: 'users',
						select: 'email'
					},
					function(err, sales) {
						Book.populate(
							sales,
							{
								path: 'books',
								select: 'title author publisher'
							},
							function(err, sales) {
								res.json(sales);
							}
						);
					}
				);
			});
		} else {
			return res.status(403).send({
				success: false,
				msg: 'Unauthorized.'
			});
		}
	}
);








//USERS
router.get(
	'/users/admin',
	passport.authenticate('jwt', {
		session: false
	}),
	function(req, res) {
		var token = getToken(req.headers);
		if (token) {
			User.find(function(err, users) {
				if (err) return next(err);
				res.json(users);
			});
		} else {
			return res.status(403).send({
				success: false,
				msg: 'Unauthorized.'
			});
		}
	}
);

getToken = function(headers) {
	if (headers && headers.authorization) {
		var parted = headers.authorization.split(' ');
		if (parted.length === 2) {
			return parted[1];
		} else {
			return null;
		}
	} else {
		return null;
	}
};

module.exports = router;