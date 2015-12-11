var async = require("async");
var _ = require("lodash");
var hash = require("mhash");
var mongoClient = require("mongodb").MongoClient;
var ObjectID = require("mongodb").ObjectID;

var databases = {};

var customMiddle = function(url){
	async.waterfall([
		function(next){
			if(!_.isUndefined(url)){
				this.connectURL = url;
				next(null,url);
			} else {
				next("MONGOCONNECT: URL is undefined - cannot connect to it.")
			}
		},
		function(checkedURL,next){
			mongoClient.connect(checkedURL,next)
		},
		function(db,next){
			console.log("Connected to MongoDB successfully at %s",this.connectURL);
			this.db = db;
			next(null,db)
		},
		function(db,next){
			db.collections(next);
		},
		function(collections,next){
			//console.log(collections); //This is for debugging on the backend.
			
			if(collections.length > 1){
				return next();
			}

			//We now now there isn't any collections in the DB. So we need to make them.
			async.parallel([
				function(pNext){
					this.db.createCollection("users",pNext);
				},
				function(pNext){
					this.db.createCollection("cars",pNext);
				},
			],next);
		},
	],function(err,results){
		if(err){
			//essentally on any error from the above - shit the bed.
			throw err;
		}

		databases.Users = this.db.collection("users");
		databases.Cars  = this.db.collection("cars");
		console.log("Databases Linked Correctly");
	});
};

customMiddle.prototype.getAllUsers = function(callback){
	async.waterfall([
		function(next){
			databases.Users.find().toArray(next);
		}
	],function(err,results){
		if(_.isFunction(callback)){
			callback(err,results);
		} else {
			if(err){
				throw err;
			}
			return results;
		}
	});
}

customMiddle.prototype.countUsers = function(query,callback){
	async.waterfall([
		function(next){
			databases.Users.count(query,next);
		}
	],function(err,count){
		if(_.isFunction(callback)){
			callback(err,count);
		} else {
			if(err){
				throw err;
			}
			return count;
		}
	});
}

customMiddle.prototype.getUserByName = function(name,callback){
	async.waterfall([
		function(next){
			databases.Users.findOne({"username":name},next);
		}
	],function(err,result){
		//console.log(err);
		//console.log(result);

		if(_.isFunction(callback)){
			callback(err,result);
		} else {
			if(err){
				throw err;
			}
			return result;
		}
	});
}

customMiddle.prototype.getUserById = function(id,callback){
	async.waterfall([
		function(next){
			databases.Users.findOne({"_id":new ObjectID(id)},next);
		}
	],function(err,result){
		//console.log(err);
		//console.log(result);

		if(_.isFunction(callback)){
			callback(err,result);
		} else {
			if(err){
				throw err;
			}
			return result;
		}
	});
}

customMiddle.prototype.hashPassword = function(password,callback){
	var fullpassword = "carsDB_"+password+"_MNE281215_"+password;
	var hashedPassword = hash("whirlpool",fullpassword);

	if(_.isFunction(callback)){
		callback(null,hashedPassword);
	} else {
		return hashedPassword;
	}
}

customMiddle.prototype.checkLogin = function(username,password,callback){
	var fullpassword = "carsDB_"+password+"_MNE281215_"+password;
	var hashedPassword = hash("whirlpool",fullpassword);

	async.waterfall([
		function(next){
			databases.Users.findOne({"username":username},next);
		},
		function(result,next){
			if(hashedPassword == result.password){
				if(result.isActive){
					next(null,result);
				} else {
					next(null,1);
				}
			} else {
				next(null,0);
			}
		}
	],function(err,result){
		if(_.isFunction(callback)){
			callback(err,result);
		} else {
			if(err){ throw err; }
			return result;
		}
	});
}

customMiddle.prototype.updateUser = function(filter,data,callback){
	async.waterfall([
		function(next){
			databases.Users.updateOne(filter,data,next);
		}
	],function(err,result){
		if(_.isFunction(callback)){
			callback(err,result);
		} else {
			if(err){
				throw err;
			}
			return result;
		}
	});
}

customMiddle.prototype.insertUser = function(data,callback){
	async.waterfall([
		function(next){
			databases.Users.insertOne(data,next);
		}
	],function(err,results){
		if(_.isFunction(callback)){
			callback(err,results);
		} else {
			if(err){
				throw err;
			}
			return results;
		}
	});
}

customMiddle.prototype.deleteUser = function(id,callback){
	async.waterfall([
		function(next){
			databases.Users.deleteOne({"_id":new ObjectID(id)},next);
		}
	],function(err,result){
		if(_.isFunction(callback)){
			callback(err,result);
		} else {
			if(err){
				throw err;
			}
			return result;
		}
	});
}

customMiddle.prototype.getAllCars = function(callback){
	async.waterfall([
		function(next){
			databases.Cars.find().toArray(next);
		}
	],function(err,results){
		if(_.isFunction(callback)){
			callback(err,results);
		} else {
			if(err){
				throw err;
			}
			return results;
		}
	});
}

customMiddle.prototype.getCarById = function(id,callback){
	async.waterfall([
		function(next){
			databases.Cars.findOne({"_id":new ObjectID(id)},next);
		}
	],function(err,result){
		//console.log(err);
		//console.log(result);

		if(_.isFunction(callback)){
			callback(err,result);
		} else {
			if(err){
				throw err;
			}
			return result;
		}
	});
}

customMiddle.prototype.updateCar = function(filter,data,callback){
	console.log(data["$set"]);

	_.forEach(["purchaseDate","openDate","closeDate"],function(item){
		if(_.has(data["$set"],item)){
			data["$set"][item] = new Date(data["$set"][item]);
		}
	});

	_.forEach([
		'year', 'milage', 'initCost','repairs','detail',
		'fuel','transport','marketing','acquisition',
		'stateFees','misc','salesPrice'
	],function(item){
		if(_.has(data["$set"],item)){
			data["$set"][item] = parseFloat(data["$set"][item]);
		}
	});

	console.log("Data after checking...");
	console.log(data);

	async.waterfall([
		function(next){
			databases.Cars.updateOne(filter,data,next);
		}
	],function(err,result){
		if(_.isFunction(callback)){
			callback(err,result);
		} else {
			if(err){
				throw err;
			}
			return result;
		}
	});
}

customMiddle.prototype.insertCar = function(data,callback){
	console.log(data["$set"]);
	
	_.forEach(["purchaseDate","openDate","closeDate"],function(item){
		if(_.has(data,item)){
			data[item] = new Date(data[item]);
		}
	});

	_.forEach([
		'year', 'milage', 'initCost','repairs','detail',
		'fuel','transport','marketing','acquisition',
		'stateFees','misc','salesPrice'
	],function(item){
		if(_.has(data,item)){
			data[item] = parseFloat(data[item]);
		}
	});

	console.log("Data after checking...");
	console.log(data);

	async.waterfall([
		function(next){
			databases.Cars.insertOne(data,next);
		}
	],function(err,results){
		if(_.isFunction(callback)){
			callback(err,results);
		} else {
			if(err){
				throw err;
			}
			return results;
		}
	});
}

customMiddle.prototype.deleteCar = function(id,callback){
	async.waterfall([
		function(next){
			databases.Cars.deleteOne({"_id":new ObjectID(id)},next);
		}
	],function(err,result){
		if(_.isFunction(callback)){
			callback(err,result);
		} else {
			if(err){
				throw err;
			}
			return result;
		}
	});
}
module.exports = customMiddle;