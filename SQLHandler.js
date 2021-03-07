const Prom = require("bluebird")


// SQLHandler class deals with communication to the sql server
class SQLHandler {
	
	constructor(args) {
		if (!args){
			this.defConstructor();
		}
		else {
			this.argsConstructor(args);
		}
	}

	// default constructor
	defConstructor() {
		this.conLim = 30
		this.host = '127.0.0.1'
		this.user = 'root'
		this.pass = 'AAAAYY1234567890'
		this.database = 'geonames'
		this.connectTimeout = 180
		let mysql = require('mysql');
		// make database connection to handle 15 concurrent users
		const pool = mysql.createPool({
		connectionLimit : this.conLim,
		host : this.host,
		user : this.user,
		password : this.pass,
		database : this.database,
		connectTimeout: this.connectTimeout
		});
		SQLHandler.prototype.pool = pool
		global.mysql = Prom.promisifyAll(pool)
	}

	// args constructor
	argsConstructor(conDetails) {
		let mysql = require('mysql');
		// make database connection to handle 15 concurrent users
		const pool = mysql.createPool({
			connectionLimit : conDetails.connectionLimit,
			host : conDetails.host,
			user : conDetails.user,
			password : conDetails.password,
			database : conDetails.database,
			connectTimeout: conDetails.connectTimeout
		});
		SQLHandler.prototype.pool = pool
		global.mysql = Prom.promisifyAll(pool)
	}
	
	// get all countries in the data base
	getCountries() {
		return this.pool.queryAsync('call get_all_countries()')
		 	.then((resolve) => {
				return resolve
			}).catch((err) => {
				throw err
			})
		}

	// get POIs from users' destination, desired radius and categories of interest (fclass)
	getLocations(locationData) {
		let currLat, currLng, minLat, maxLat, minLng, maxLng, userfcl, radius, country
		currLat = locationData.currLat, currLng = locationData.currLng, minLat = locationData.minLat, maxLat = locationData.maxLat
		minLng = locationData.minLng, maxLng = locationData.maxLng, userfcl = locationData.userfcl, country = locationData.country
		radius = locationData.radius
		return this.pool.queryAsync('call radial_search(?, ?, ?, ?, ?, ?, ?, ?, ?)',
			[currLat,
			currLng,
			minLat,
			maxLat,
			minLng,
			maxLng,
			userfcl,
			radius,
			country])
		 	.then((resolve) => {
				return resolve
			}).catch((err) => {
				throw err
			})
	}

	// get POIs from the DB according to the given locationData (users' destination, 
	// desired radius, rating filter and categories of interest (fclass))
	getLocationsByRating(locationData) {
		let currLat, currLng, minLat, maxLat, minLng, maxLng, userfcl, radius, country, score
		currLat = locationData.currLat, currLng = locationData.currLng, minLat = locationData.minLat, maxLat = locationData.maxLat
		minLng = locationData.minLng, maxLng = locationData.maxLng, userfcl = locationData.userfcl, country = locationData.country
		radius = locationData.radius, score = locationData.rating
		return this.pool.queryAsync('call radial_search_rating(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
			[currLat,
			currLng,
			minLat,
			maxLat,
			minLng,
			maxLng,
			userfcl,
			radius,
			score,
			country])
		 	.then((resolve) => {
				return resolve
			}).catch((err) => {
				throw err
			})
	}

	// add new description to the data base
	addNewDescription(DescriptionData) {
		let geonameid, desc, rating
		geonameid = DescriptionData.id, desc = DescriptionData.newDesc, rating = DescriptionData.rating
		return this.pool.queryAsync('call add_description(?, ?, ?)' ,
			[geonameid,
			desc,
			rating])
		 	.then((resolve) => {
				return resolve
			}).catch((err) => {
				throw err
			})
	}
	
	// get descriptions of requested id from the data base
	getDescriptions(DescriptionData) {
		let geonameid
		geonameid =  DescriptionData
		return this.pool.queryAsync('call get_description(?)' , [parseInt(geonameid)])
		 	.then((resolve) => {
				return resolve
			}).catch((err) => {
				throw err
			})
	}

}

exports.SQLHandler = SQLHandler
