// configuration and dependencies
const express = require('express');
let CONFIG = require('./ConfigServer.json')
console.log(CONFIG)
const {SQLHandler} = require('./SQLHandler.js')
const app = express();
const path = require('path');
var cors = require('cors')
let sql = new SQLHandler(CONFIG.db)
app.use(cors())
app.use(
    express.urlencoded({
      extended: true
    })
  )
app.use(express.json())
const port = CONFIG.app.port;


// degrees to radians
function radians(degrees) {
    var TAU = 2 * Math.PI;
    return degrees * TAU / 360;
}


// ask sql handler for the list of countries in the DB and send them to the client
app.get('/api/getCountries', function (req, res) {function init() {
	 	loadJSON(function(response) {
	  		// parse JSON string to object
	    	var actual_JSON = JSON.parse(response);
	 	});
	}
	// ask sql handler for countries
	sql.getCountries().then((sqldata) => {
		res.send(sqldata[0])
	})
})


// recieve users' input, parse & do necessary calculations,
// ask sql handler for locations and send the result back to the client
app.post('/api/postdetails', function (req, res) {
	let locations = []
	var requestDetails = detsForSqlServer(req.body)
    if (req.body.rating != 0) {  
    	// client inputed a rating filter
    	requestDetails['rating'] = req.body.rating
    	sql.getLocationsByRating(requestDetails).then((sqldata) => {
    		// arrange data for client:
    		locations = arrangeData(sqldata[0])
			// send result to client:
    		res.send(locations)
    	})
    } else {  
    	// client didn't input a rating filter
    	sql.getLocations(requestDetails).then((sqldata) => {
    		// arrange data for client:
    		locations = arrangeData(sqldata[0])
    		// send result to client:
    		res.send(locations)
    	})
	}
})


// arange data from the sql in order to send it to client
function arrangeData(Data) {
	let locations = []
    let categoryDict = { 'H': 0, 'L': 1, 'T': 2, 'P': 3, 'R': 4, 'S': 5, 'V': 6 }
	Data.forEach((DataPacket) => {
		var l = {
 			"id": DataPacket.geonameid,
 			"name": DataPacket.name,
 			"long": DataPacket.longitude,
 			"lat": DataPacket.latitude,
 			"alternate": DataPacket.alternateName,
 			"avgScore": DataPacket.avgRate,
            "distance": DataPacket.distance,
            "class": categoryDict[DataPacket.fclass],
            "type": DataPacket.meaning
		}
    	locations.push(l)
	})
	return locations
}


// arrange and calculate details for the sql handler
function detsForSqlServer(data) {
	// calculate cropping square:
    var lngStart = parseFloat(data.destLong) - parseFloat(data.radius)/Math.abs(Math.cos(radians(parseFloat(data.destLat)))*69)
    var lngEnd = parseFloat(data.destLong) + parseFloat(data.radius)/Math.abs(Math.cos(radians(parseFloat(data.destLat)))*69)
    var latStart = parseFloat(data.destLat) - (parseFloat(data.radius)/69)
    var latEnd = parseFloat(data.destLat) + (parseFloat(data.radius)/69)
    var details = {
    	currLat: data.destLat,
    	currLng: data.destLong,
    	minLat: latStart,
    	maxLat: latEnd,
    	minLng: lngStart,
    	maxLng: lngEnd,
    	country: data.country,
    	radius: data.radius
    }
    // parse input fclass (categories of interest)
	var fclass = ""
	if (data.categories != '') {
		var categories = data.categories.split(',')
		var categoryDict = { 0: 'H', 1: 'L', 2: 'T', 3: 'P', 4: 'R', 5: 'S', 6: 'V' }
		for (c of categories) {
			fclass += (categoryDict[c])
		}
	} else {
		// all categories
		fclass = 'HLTPRSV'
	}
	details['userfcl'] = fclass
    return details
}


// recieve new description from client
app.post('/api/newDesc', function (req, res) {
	sql.addNewDescription(req.body).then((sqldata) => {
		var ok = JSON.stringify ({
 			"status": 200,
 		})
		res.send(ok)
	})
});


// recieve request for descriptions of a certain location, ask sql handler 
// for the descriptions by the given id and send the result to the client
app.get('/api/:id/getDesc', function (req, res) {
    var id = req.params.id;
    sql.getDescriptions(id).then((sqldata) => {
    	res.send(sqldata[0])
    })
});


// supply all the resources for the client
app.use(express.static(__dirname));
app.use(express.static("public"))


// open port for communication with the client
app.listen(port, 'localhost',() => {
  console.log(`listening on port ${port}!`)
});

module.exports = app;
