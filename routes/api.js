const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const passport = require('passport');
const bcrypt = require('bcrypt');
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
const Sale = require('../models/sales');


var transporter = nodemailer.createTransport({
	host: "smtp.gmail.com",
	port: 587,
	secure: false, // true for 587, false for other ports
	requireTLS: true,
	auth: {
		user: process.env.EMAIL_USER,
		pass: process.env.EMAIL_PASS
	}
});

//SIGNIN - SIGNUP
//CREA NUEVO USUARIO ADMINISTRADOR
router.post('/signup/admin', passport.authenticate('jwt', {
	session: false
}), async function (req, res) {
	let admin = await Admin.findOne({
		role: "admin"
	});

	var token = getToken(req.headers);

	if (token) {
		if (admin.role == "admin") {
			if (!req.body.username || !req.body.password) {
				res.status(401).json({
					success: false,
					msg: 'Please pass username and password.'
				});
			} else {
				var newAdmin = new Admin({
					username: req.body.username,
					password: req.body.password,
					role: req.body.role
				});
				// save the user
				newAdmin.save(function (err) {
					if (err) {
						return res.status(401).json({
							success: false,
							msg: 'Username already exists.'
						});
					}
					res.status(200).json({
						success: true,
						msg: 'Successful created new user.'
					});
				});
			}

		}
	}

});

router.put('/signin/admin/change', passport.authenticate('jwt', {
	session: false
}), async function (req, res) {

	var token = getToken(req.headers);
	if (token) {
		Admin.findOne({
				username: req.body.username
			},
			function (err, admin) {
				if (err) throw err;

				if (!admin) {
					res.status(401).send({
						success: false,
						msg: 'Authentication failed. Admin not found.'
					});
				} else {
					// check if password matches
					admin.comparePassword(req.body.oldpassword, function (err, isMatch) {
						if (isMatch && !err) {
							Admin.updateOne({
								username: req.body.username
							}, {
								$set: {
									password: req.body.newpassword
								}
							}).exec();
							res.send("Password changed");

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
	}

});

//INICIA SESIÓN EL USUARIO ADMINISTRADOR
router.post('/signin/admin', async function (req, res) {

	Admin.findOne({
			username: req.body.username
		},
		function (err, admin) {
			if (err) throw err;

			if (!admin) {
				res.status(401).send({
					success: false,
					msg: 'Authentication failed. Admin not found.'
				});
			} else {
				// check if password matches
				admin.comparePassword(req.body.password, function (err, isMatch) {
					if (isMatch && !err) {
						// if user is found and password is right create a token
						var token = jwt.sign(admin.toObject(), config.secret, {
							expiresIn: 5000 //TIEMPO DE EXPIRACIÓN DE A SESIÓN
						});
						// return the information including token as JSON
						res.json({
							success: true,
							username: admin.username,
							role: admin.role,
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
//PUBLICAR POST
router.post(
	'/post/admin',
	passport.authenticate('jwt', {
		session: false
	}), //SE LLAMA A LA FUNCIÓN PASSPORT DE VALIDAR SESIÓN
	async function (req, res) {

		//SE LLAMA A LA FUNCIÓN QUE SOLICITA EL TOKEN EN LOS HEADERS
		var token = getToken(req.headers);

		//SE VERIFICA SI LA IMAGEN FUE CARGADA O NO
		if (req.file === undefined) {
			res.send("NO IMAGE FOUND");
		} else {

			//PROMESA PARA SUBIR EL ARCHIVO A CLOUDINARY
			const result = await cloudinary.uploader.upload(req.file.path);

			//UNA VEZ SUBIDO EL ARCHIVO SE PUEDEN UTILIZAR LOS DATOS DE LA IMAGEN SUBIDA
			if (token) {
				const newPost = new Post({
					title: req.body.title,
					content: req.body.content,
					ingredients: req.body.ingredients,
					imageURL: result.url,
					public_id: result.public_id
				});

				await newPost.save(function (err) {
					if (err) {
						return res.json({
							success: false,
							msg: 'Save post failed.'
						});
					}
					fs.unlink(req.file.path);
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

		}
	}
);

//MUESTRA TODOS LOS POSTS
router.get(
	'/posts',
	function (req, res) {
		Post.find(function (err, posts) {
			if (err) return next(err);
			res.json(posts);
		});
	}
);

//un solo post
router.get(
	'/posts/:id',
	function (req, res) {
		Post.findById(req.params.id)
			.then(post => {
				return res.json(post);
			}).catch(err => {
				return res.status('404').send('ID del post no existe...');
			});
	}
);

//EDITAR POST
router.put(
	'/posts/:id',
	passport.authenticate('jwt', {
		session: false
	}),
	async (req, res) => {
		var token = getToken(req.headers);
		if (token) {

			if (req.file == undefined) {
				const post = await Post.findByIdAndUpdate(
					req.params.id, {
						title: req.body.title,
						content: req.body.content,
						ingredients: req.body.ingredients
					}, {
						new: true
					}
				);

				if (!post) {
					return res.status(404).send('ID del post no existe...');
				}

				res.status(204).json({
					msg: "post editado sin cambiar la imagen"
				});
			}


			const uploaded = await cloudinary.uploader.upload(req.file.path);
			const oldpost = await Post.findById(req.params.id);
			cloudinary.uploader.destroy(oldpost.public_id, function (error, result) {
				console.log(result, error);
			});

			const post = await Post.findByIdAndUpdate(
				req.params.id, {
					title: req.body.title,
					content: req.body.content,
					ingredients: req.body.ingredients,
					imageURL: uploaded.url,
					public_id: uploaded.public_id
				}, {
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
);

router.delete('/posts/:id', passport.authenticate('jwt', {
	session: false
}), async (req, res) => {
	const post = await Post.findById(req.params.id);
	cloudinary.uploader.destroy(post.public_id, function (error, result) {
		console.log(result, error);
	});
	const deletepost = await Post.findByIdAndDelete(req.params.id);

	if (!deletepost) {
		return res.status(404).send('ID del post no existe...');
	}

	res.status(200).send('Post borrado con exito');
});






//BOOKS
router.get('/books', function (req, res) {

	Book.find({}, {
		"url": 0
	}, function (err, books) {
		if (err) return next(err);
		res.json(books);
	});

});

router.post(
	'/book/admin',
	passport.authenticate('jwt', {
		session: false
	}),
	async function (req, res) {
		var token = getToken(req.headers);

		if (req.file === undefined) {
			res.send("NO IMAGE FOUND");
		} else {

			if (token) {
				const result = await cloudinary.uploader.upload(req.file.path);

				var newBook = new Book({
					title: req.body.title,
					description: req.body.description,
					author: req.body.author,
					publisher: req.body.publisher,
					url: req.body.url,
					price: req.body.price,
					imageURL: result.url,
					public_id: result.public_id
				});

				newBook.save(function (err) {
					if (err) {
						return res.status(400).json({
							success: false,
							msg: 'Save book failed.'
						});
					}
					fs.unlink(req.file.path);
					res.status(200).json({
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

	}
);


router.put('/admin/books/:id',
	passport.authenticate('jwt', {
		session: false
	}),
	async (req, res) => {
		var token = getToken(req.headers);
		if (token) {
			if ((req.file === undefined)&&(req.body.url)){

				const book = await Book.findByIdAndUpdate(
					req.params.id, {
						title: req.body.title,
						description: req.body.description,
						author: req.body.author,
						publisher: req.body.publisher,
						price: req.body.price,
						url: req.body.url
					}, {
						new: true
					}
				);

				if (!book) {
					return res.status(404).send('ID not found...');
				}

				res.status(204).json();
			} 

			if ((req.file === undefined)&&(!req.body.url)){

				const book = await Book.findByIdAndUpdate(
					req.params.id, {
						title: req.body.title,
						description: req.body.description,
						author: req.body.author,
						publisher: req.body.publisher,
						price: req.body.price
					}, {
						new: true
					}
				);

				if (!book) {
					return res.status(404).send('ID not found...');
				}

				res.status(204).json();
			} 

			if ((req.file !== undefined)&&(req.body.url)){

				const uploaded = await cloudinary.uploader.upload(req.file.path);
				const oldbook = await Book.findById(req.params.id);
				cloudinary.uploader.destroy(oldbook.public_id, function (error, result) {
					console.log(result, error);
				});

				const book = await Book.findByIdAndUpdate(
					req.params.id, {
						title: req.body.title,
						description: req.body.description,
						author: req.body.author,
						publisher: req.body.publisher,
						price: req.body.price,
						url: req.body.url,
						imageURL: uploaded.url,
						public_id: uploaded.public_id
					}, {
						new: true
					}
				);
				if (!book) {
					return res.status(404).send('ID not found...');
				}
				fs.unlink(req.file.path);
				res.status(204).send('Successful edited the book.');
			} 

			if((req.file !== undefined)&&(!req.body.url)){

				const uploaded = await cloudinary.uploader.upload(req.file.path);
				const oldbook = await Book.findById(req.params.id);
				cloudinary.uploader.destroy(oldbook.public_id, function (error, result) {
					console.log(result, error);
				});

				const book = await Book.findByIdAndUpdate(
					req.params.id, {
						title: req.body.title,
						description: req.body.description,
						author: req.body.author,
						publisher: req.body.publisher,
						price: req.body.price,
						imageURL: uploaded.url,
						public_id: uploaded.public_id
					}, {
						new: true
					}
				);
				if (!book) {
					return res.status(404).send('ID not found...');
				}
				fs.unlink(req.file.path);
				res.status(204).send('Successful edited the book.');
			}

		}
	}

);


router.delete('/admin/books/:id', passport.authenticate('jwt', {
	session: false
}), async (req, res) => {
	const book = await Book.findById(req.params.id);
	cloudinary.uploader.destroy(book.public_id, function (error, result) {
		console.log(result, error);
	});
	const deletebook = await Book.findByIdAndDelete(req.params.id);

	if (!deletebook) {
		return res.status(404).send('ID del libro no existe...');
	}

	res.status(200).send('Libro borrado con exito');
});








//SALES
router.post('/books/:id', async function (req, res) {

	let user = await User.findOne({
		email: req.body.email
	});
	let book = await Book.findOne({
		_id: req.params.id
	});

	if (!book) {
		return res.status(404).send('ID del libro no existe...');
	}

	if (!user) {
		if (!req.body.name || !req.body.lastname || !req.body.email) {
			res.json({
				success: false,
				msg: 'Por favor introduzca los datos requeridos correctamente'
			});
		} else {
			var newUser = new User({
				name: req.body.name,
				lastname: req.body.lastname,
				email: req.body.email,
			});

			var newSales = new Sales({
				users: newUser._id,
				books: book.title,
				price: book.price
			});


			newUser.save(function (err) {
				if (err) {
					console.log(err);
					return res.json({
						success: false,
						msg: 'Error en la creación del usuario'
					});
				}
				newSales.save(async function (err) {
					if (err) {
						return res.json({
							success: false,
							msg: 'Error en la creación de la venta'
						});
					}

					res.json({
						success: true,
						msg: 'Venta cargada exitosamente'
					});

					const book = await Book.findById(req.params.id);

					var mailOptions = {
						from: 'leflourdecousine@gmail.com', // sender address                                   
						to: `${newUser.email}`, // list of receivers                                 
						subject: 'Le Flour de Cousine: Gracias por su compra!', // Subject line                                                 
						text: book.url // plaintext body                                                                                             
					};

					// send mail with defined transport object                                                 
					transporter.sendMail(mailOptions, function (error, info) {
						if (error) {
							return console.log(error);
						}
						console.log('Message sent: ' + info.response);
					});
				});
			});

		}
	} else {
		var newSale = new Sales({
			users: user._id,
			books: book.title,
			price: book.price
		});

		newSale.save(async function (err) {
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

			const book = await Book.findById(req.params.id);

			var mailOptions = {
				from: 'leflourdecousine@gmail.com', // sender address                                   
				to: `${user.email}`, // list of receivers                                 
				subject: 'Le Flour de Cousine: Gracias por su compra!', // Subject line                                                 
				text: book.url // plaintext body                                                                                             
			};

			// send mail with defined transport object                                                 
			transporter.sendMail(mailOptions, function (error, info) {
				if (error) {
					return console.log(error);
				}
				console.log('Message sent: ' + info.response);
			});
		});
	}

});




router.get(
	'/sales/admin',
	passport.authenticate('jwt', {
		session: false
	}),
	function (req, res) {
		var token = getToken(req.headers);
		if (token) {
			Sales.find(function (err, sales) {
				User.populate(
					sales, {
						path: 'users',
						select: 'name lastname email'
					},
					function (err, sales) {
						res.json(sales);						
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


//Admin
router.get(
	'/admins',
	passport.authenticate('jwt', {
		session: false
	}),
	function (req, res) {
		var token = getToken(req.headers);
		if (token) {
			Admin.find({}, {
				password: 0,
				update_at: 0,
				__v: 0
			}, function (err, users) {
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

router.delete('/admin/:id', passport.authenticate('jwt', {
	session: false
}), async (req, res) => {
	const admin = await Admin.findByIdAndDelete(req.params.id);

	if (!admin) {
		return res.status(404).send('ID not found...');
	}

	res.status(200).send('Admin deleted.');
});


getToken = function (headers) {
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