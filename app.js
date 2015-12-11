var portToRunOn = 8081;
var mongoURL = "mongodb://localhost:27017/cars";
// You can change above this to match your needs;

var async = require("async");
var _ = require("lodash");
var numeral = require('numeral');
var moment = require("moment");

var express = require("express");
var session = require("express-session");
var mongoStore = require("connect-mongo")(session);
var cookieParser = require("cookie-parser");
var app = express();

var MongoConnect = require('./mongodb.js');
var database = new MongoConnect(mongoURL);

var bodyParser = require('body-parser');
var multer = require('multer')({"dest":"static/img/uploads/"}); 

app.set("view engine","ejs");
app.use(express.static('static'));
app.use(cookieParser())
app.use(session({
	"secret":"carsDB123MNE123",
	"resave":false,
	"saveUninitialized":false,
	"store": new mongoStore({
		"url":mongoURL,
		"touchAfter":24*3600
	})
}));
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

//Load data into templates and other nic-naks
app.use(function(req,res,next){
	res.locals._ = _;
	res.locals.moment = moment;
	res.locals.numeral = numeral;
	res.locals.stateList = {
	    "AL": "Alabama",
	    "AK": "Alaska",
	    "AS": "American Samoa",
	    "AZ": "Arizona",
	    "AR": "Arkansas",
	    "CA": "California",
	    "CO": "Colorado",
	    "CT": "Connecticut",
	    "DE": "Delaware",
	    "DC": "District Of Columbia",
	    "FM": "Federated States Of Micronesia",
	    "FL": "Florida",
	    "GA": "Georgia",
	    "GU": "Guam",
	    "HI": "Hawaii",
	    "ID": "Idaho",
	    "IL": "Illinois",
	    "IN": "Indiana",
	    "IA": "Iowa",
	    "KS": "Kansas",
	    "KY": "Kentucky",
	    "LA": "Louisiana",
	    "ME": "Maine",
	    "MH": "Marshall Islands",
	    "MD": "Maryland",
	    "MA": "Massachusetts",
	    "MI": "Michigan",
	    "MN": "Minnesota",
	    "MS": "Mississippi",
	    "MO": "Missouri",
	    "MT": "Montana",
	    "NE": "Nebraska",
	    "NV": "Nevada",
	    "NH": "New Hampshire",
	    "NJ": "New Jersey",
	    "NM": "New Mexico",
	    "NY": "New York",
	    "NC": "North Carolina",
	    "ND": "North Dakota",
	    "MP": "Northern Mariana Islands",
	    "OH": "Ohio",
	    "OK": "Oklahoma",
	    "OR": "Oregon",
	    "PW": "Palau",
	    "PA": "Pennsylvania",
	    "PR": "Puerto Rico",
	    "RI": "Rhode Island",
	    "SC": "South Carolina",
	    "SD": "South Dakota",
	    "TN": "Tennessee",
	    "TX": "Texas",
	    "UT": "Utah",
	    "VT": "Vermont",
	    "VI": "Virgin Islands",
	    "VA": "Virginia",
	    "WA": "Washington",
	    "WV": "West Virginia",
	    "WI": "Wisconsin",
	    "WY": "Wyoming"
	};

	return next();
});

//Middleware for Login in
app.use(function(req,res,next){
	res.locals.authenticated = false;

	if(!_.has(req.session,"uid")){
		return next();
	} else {
		async.waterfall([
			function(wNext){
				database.getUserById(req.session.uid,wNext)
			}
		],function(err,result){
			if(err){
				return next();
			}

			res.locals.authenticated = true;
			res.locals.user = result;
			return next();
		})
	}
});

//For flash messages from the Server to the Client.
app.use(function(req,res,next){
	if(!_.has(res.locals,"flash")){
		res.locals.flash = "";
	}
	if(_.has(req.session,"flash")){
		res.locals.flash = req.session.flash;
		req.session.flash = null;
	}
	return next();
});

//Testing if user is logged in or not.
var isAuthenticated = function(req,res,next){
	if(res.locals.authenticated){
		return next();
	} else {
		res.redirect("/");
	}
}

app.get("/",function(req,res){
	res.render('index');
});

app.get("/cars",isAuthenticated,function(req,res){
	async.waterfall([
		function(next){
			database.getAllCars(next);
		}
	],function(err,data){
		res.render("carIndex",{"cars":data});
	});
});

app.get("/cars/new",isAuthenticated,function(req,res){
	res.render("carsInsert");
});

app.post("/cars/new",isAuthenticated,multer.array('picture'),function(req,res){
	var carData = _.omit(req.body,function(value,key){
		if(value == '') return true;
		if(key == 'submit') return true;
		return false;
	});

	carData.pictures = _.pluck(req.files,"path");

	async.waterfall([
		function(next){
			database.insertCar(carData,next);
		}
	],function(err,results){
		if(err){
			req.session.flash = err;
		}
		res.redirect("/cars");
	})
});

app.get("/cars/edit/:id",isAuthenticated,function(req,res){
	var id = req.params.id;
	console.log(id);

	async.waterfall([
		function(next){
			database.getCarById(id,next);
		}
	],function(err,result){
		if(err){
			console.error(err);
			req.session.flash = err;
			res.redirect("/cars");
		}
		console.log(result);
		res.render("carEdit",{"car":result});
	});
});

app.post("/cars/edit/:id",isAuthenticated,multer.array('picture'),function(req,res){
	var ObjectID = require("mongodb").ObjectID;
	var id = req.params.id;
	var cardata = _.omit(req.body,function(value,key){
		if(value == '') return true;
		if(key == 'submit') return true;
		return false;
	});

	var newPictures = _.pluck(req.files,"path");

	async.waterfall([
		function(next){
			database.getCarById(id,next);
		},
		function(car,next){
			var fs = require("fs");
			var ToRemove = _.difference(car.pictures,cardata.pictures);
			cardata.pictures = _.union(cardata.pictures,newPictures);

			async.each(ToRemove,function(picture,eNext){
				fs.unlink(picture,eNext);
			},next);
		},
		function(next){
			database.updateCar({"_id":new ObjectID(id)},{"$set":cardata},next);
			next();
		}
	],function(err,result){
		if(err){
			console.error(err);
			req.session.flash = err;
		}
		console.log(result);
		res.redirect("/cars");
	});
});

app.get("/cars/delete/:id",isAuthenticated,function(req,res){
	var id = req.params.id;

	async.waterfall([
		function(next){
			database.getCarById(id,next);
		},
		function(car,next){
			if(!_.has(car,"pictures")) return next();

			var fs = require("fs");

			async.each(car.pictures,function(picture,eNext){
				fs.unlink(picture,eNext);
			},function(err){
				if(err) console.log(err);
				next();
			});
		},
		function(next){
			database.deleteCar(id,next);
		}
	],function(err,result){
		if(err){
			console.error(err);
			req.session.flash = err;
		}
		res.redirect("/cars");
	});
});

app.get("/cars/details/:id",isAuthenticated,function(req,res){
	var id = req.params.id;

	async.waterfall([
		function(next){
			database.getCarById(id,next);
		}
	],function(err,result){
		if(err){
			console.error(err);
			req.session.flash = err;
			res.redirect("/cars");
		}
		res.render("carDetail",{"car":result});
	});
});

app.get("/register",function(req,res){
	console.log("Register");
	if(res.locals.authenticated){
		return res.redirect("/");
	}
	res.render("register");
});

app.post("/register",function(req,res){
	console.log("Register - post");

	//insert into DB.

	var userdata = {
		"username":req.body.username,
		"password":req.body.password,
		"isActive":false
	}

	async.waterfall([
		function(next){
			database.countUsers({},next);
		},
		function(data,next){
			console.log(data);
			if(data == 0){
				userdata.isActive = true;
			}
			return next();
		},
		function(next){
			async.parallel([
				function(pNext){
					if(_.isUndefined(userdata.username) || _.isEmpty(userdata.username)){
						return pNext("Username is not Filled In.");
					}
					return pNext();
				},
				function(pNext){
					if(_.isUndefined(userdata.password) || _.isEmpty(userdata.password)){
						return pNext("Password is not Filled In.");
					}

					if(userdata.password.length < 8){
						return pNext("Password needs to be at least 8 characters");
					}
					return pNext();
				}
			],next);
		},
		function(results,next){
			console.log("About to do the count for the username itself.");
			var query = {"username":userdata.username};
			database.countUsers(query,next);
		},
		function(data,next){
			console.log("Looking at Userdata");
			console.log(data);
			if(data != 0){
				return next("Username is already being used.");
			}
			return next();
		},
		function(next){
			database.hashPassword(userdata.password,next);
		},
		function(hashedPassword,next){
			userdata.password = hashedPassword;
			return next();
		},
		function(next){
			console.log("About to Insert into DB");
			database.insertUser(userdata,next);
		}
	],function(err,data){
		if(err){
			req.session.flash = err;
			res.redirect("/register");
		} else {
			req.session.flash = "Sucessfully Registered. Awaiting Activation by Admin";
			res.redirect("/");
		}
	});
});

app.post("/login",function(req,res){
	var username = req.body.username;
	var password = req.body.password;
	console.log("Username: %s, Password: %s",username,password);

	async.waterfall([
		function(next){
			database.checkLogin(username,password,next);
		}
	],function(err,result){
		if(err){
			req.session.flash = err;
		}
		if(_.isNumber(result)){
			req.session.flash = "User/Pass is not correct.";
		}
		if(_.isObject(result)){
			console.log(result);
			req.session['uid'] = result._id;
		}

		res.redirect("/");
	});
});

app.get("/logout",isAuthenticated,function(req,res){
	delete req.session.uid;
	res.redirect("/");
});

app.get("/users",isAuthenticated,function(req,res){
	async.waterfall([
		function(next){
			database.getAllUsers(next);
		}
	],function(err,data){
		res.render("userIndex",{"users":data});
	});
});

app.get("/users/activate/:id",isAuthenticated,function(req,res){
	var ObjectID = require("mongodb").ObjectID;
	var id = req.params.id;
	
	async.waterfall([
		function(next){
			database.getUserById(id,next);
		},
		function(data,next){
			database.updateUser({"_id":new ObjectID(id)},{"$set":{"isActive":!data.isActive}},next);
		}
	],function(err,result){
		if(err) console.error(err);
		console.log(result);
		res.redirect("/users");
	});
});

app.get("/users/delete/:id",isAuthenticated,function(req,res){
	var id = req.params.id;

	async.waterfall([
		function(next){
			database.deleteUser(id,next);
		}
	],function(err,result){
		if(err) console.error(err);
		res.redirect("/users");
	});
});

var server = app.listen(portToRunOn,function(){
	var host = server.address().address;
	var port = server.address().port;

	console.log("CarDB App Running on http://%s:%s",host,port);
});