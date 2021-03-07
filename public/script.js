document.addEventListener("DOMContentLoaded",
  function () {

    loadingOff()

    // global variables:
    var selectedFeature = 0
    let featuresMap = new Map()
    var chosen = document.getElementById("chosen")
    var markersLayer = 0
    var initCenterLonLat = [31.78, 35.21]

    // show values of radius slider:
    const $valueSpan = $('.valueSpan');
 	const $value = $('#radiusSlider');
 	$valueSpan.html($value.val() + " km");
 	$value.on('input change', () => {
 	    $valueSpan.html($value.val() + " km");
 	});

 	// set map:
 	var map = new ol.Map({
            target: 'map',
            layers: [
              new ol.layer.Tile({
                source: new ol.source.OSM()
              })
            ],
            view: new ol.View({
	            center: ol.proj.fromLonLat(initCenterLonLat),
	            zoom: 2
	        })
          });

 	// servers' port:
	const port = config[0].Front.port
 	const url = `http://localhost:${port}`

 	// initialize country selection:
 	fetch(`${url}/api/getCountries`, {
	        method: 'GET', 
	        headers: {
	            'Content-Type': 'application/json',
	        }
	    })
	    .then(response => response.json())
	        .then(response => {
	        	// success
	        	var countrySelection = document.getElementById("country-selection")
	        	response.forEach((country) => {
	        		var opt = document.createElement('option')
	        		opt.value = country.country
	        		opt.innerHTML = country.country
	        		countrySelection.appendChild(opt)
	        	})    	
	        })
	        .catch((error) => {
	            // failed
	    		showMsg(`Server communication error - please try again later`);
	        });

 	// initialize categories selection:
 	var categories = ["Water (Rivers, waterfalls, glaciers)",
 					  "Nature reserves and parks",
 					  "Mountains, volcanoes, etc",
 					  "Settlements and capital cities",
 					  "Promenades and Courses",
 					  "Buildings, temples, restaurants, etc",
 					  "Forests and woods"]
 	var categoryDiv = document.getElementById("category")
 	categories.forEach(function(item, index) {
 		var opt = document.createElement('option')
		opt.value = index
		opt.innerHTML = item
		categoryDiv.appendChild(opt)
 	})


 	// turn loading On
 	function loadingOn() {
 		document.getElementById("loading").style.display = "block";
 		document.getElementById("loadingImage").style.display = "block";
 	}


 	// turn loading Off
 	function loadingOff() {
 		document.getElementById("loading").style.display = "none";
 		document.getElementById("loadingImage").style.display = "none";
 	}
 	

 	// send user input to server:
 	function sendDataToServer() {
 		var inputs = document.getElementById("form").elements
 		var country = $('#country-selection').val()
 		var dest = document.getElementById("destPoint").value
 		if (country == 0) {
 			showMsg("Please choose country")
 			return
 		}
 		if (dest == "") {
 			showMsg("Please enter destination")
 			return
 		}
 		// use nominatim to convert destination to lat,long coordinations:
 		var destLonLat = destSearch(dest, country)
 		if (destLonLat == -1) {
 			showMsg("Can't find this destination, make sure you entered it correctly")
 			document.getElementById("destPoint").value = ""
 			return
 		}
 		var radius = $('#radiusSlider').val()
 		//const url = "https://827e9816-ca75-487d-815f-b475c2ab3424.mock.pstmn.io/postdetails"
 		var selectedCategories = $('#category').val()
 		var ratingFilter = $('#rating-filter').val()
 		var file = JSON.stringify ({
 			"country": country,
 			"destLat": destLonLat[1],
 			"destLong": destLonLat[0],
 			"radius": radius,
 			"categories": `${selectedCategories}`,
 			"rating": ratingFilter
 		})
 		loadingOn()
 		// send to server:
 		fetch(`${url}/api/postdetails`, {
	        method: 'POST', 
	        headers: {
	            'Content-Type': 'application/json',
	        },
	        body: file
	    })
	    .then(response => response.json())
	        .then(response => {
	        	// success
	        	var explain = document.getElementById("explain")
	        	explain.style.display = "none"
	        	loadingOff()
		    	showResults(response, destLonLat)
	        })
	        .catch((error) => {
	            // failed sending file to server
	            loadingOff()
	            console.log(error)
	    		showMsg("failed sending your input to the server, please try again later")
	        });
 	}

 	// find coordinations of input destination
 	function destSearch(dest, country) {
 		var search = dest + ', ' + country
 		var res = 0
 		$.ajax({
 			url: 'http://nominatim.openstreetmap.org/search?format=json&limit=5&q=' + search,
 			async: false,
 			dataType: 'json',
 			success: function (data) {
 				var items = []
 				$.each(data, function(key, val) {
 					items.push([val.lon, val.lat])
 				})
 				if (items.length == 0) {
 					res = -1
 				} else {
 					res = items[0]
 				}
 			},
 			faliure: function (response) {
 				showMsg("Can't find coordinations of this destination - please try another destination")
 			}
 		})
 		return(res)
 	}

 	// show points from server on the map:
 	function showResults(data, dest) {
 		if (data.length == 0) {
 			showMsg("We didn't find any results for you :(")
 			return
 		}
 		// switch cards:
    	// hide form:
	    var card = document.getElementById("card")
 		card.style.display = "none"
 		// show list of selected places:
 		var resultPlaces = document.getElementById("resultPlaces")
 		resultPlaces.style.display = "block"
 		// create features array:
 		var features_arr = []
 		data.forEach( (location) => {
			var descArr = []
			var newFeature = new ol.Feature({
                			geometry: new ol.geom.Point(ol.proj.fromLonLat([location.long, location.lat])),
                			name: location.name,
                			alterNames: location.alternate,
                			avgScore: location.avgScore,
                			distance: location.distance,
                			class: location.class,
                			type: location.type
	            			})
			newFeature.setId(`${location.id}`)
			features_arr.push(newFeature)
			featuresMap.set(location.id, newFeature)
			addResultToTable(location)
		})

	 	markersLayer = new ol.layer.Vector({
		     source: new ol.source.Vector({
		        features: features_arr
		    })
		});
	    map.addLayer(markersLayer);
	    // zoom and center map on destination:
	    changeMapZoom(dest[0], dest[1], 12)
 	}

	// initialize popup
	var container = document.getElementById('popup');
	var content = document.getElementById('popup-content');
	var title = document.getElementById('popup-title');
	var closer = document.getElementById('popup-closer');
	var check = document.getElementById('popup-check');
	var addDesc = document.getElementById('popup-add-desc');
	var overlay = new ol.Overlay({
	    element: container,
	    autoPan: true,
	    autoPanAnimation: {
	        duration: 250
	    }
	});
	map.addOverlay(overlay);
	closer.onclick = function() {
	    overlay.setPosition(undefined);
	    closer.blur();
	    return false;
	};
	check.onclick = function() {
	    overlay.setPosition(undefined);
	    closer.blur();
	    let exist = !!document.getElementById(selectedFeature.id_ + "chosen")
		if (exist) {
			return false;
		}
	    var chosenTable = document.getElementById("chosenTable").getElementsByTagName('tbody')[0]
 		var row = chosenTable.insertRow()
 		var cell = row.insertCell()
 		cell.innerText = `${selectedFeature.values_.name}, ${parseFloat(selectedFeature.values_.distance).toFixed(3)} KM`
 		var id = selectedFeature.id_
 		row.id = id + "chosen"
 		var feature = selectedFeature
 		addDelButton(id, row)
 		row.addEventListener("click", function (e) { openPopup(feature) })
	    return false;
	};

	// show details popup for clicked feature
	map.getViewport().addEventListener("click", function (e) {
	    map.forEachFeatureAtPixel(map.getEventPixel(e), function (feature, layer) {
	    	openPopup(feature)
	    });
	})


	function openPopup(feature) {
		//var description = feature.values_.description
    	var name = feature.values_.name
    	var alterNames = feature.values_.alterNames
    	var avgScore = feature.values_.avgScore
    	title.innerHTML = `<b>${name}</b>`
    	var str = ""
    	if (alterNames != null) {
    		str += `${alterNames}<br>`
    	}
    	if (avgScore != null) {
    		str += `average rating: ${avgScore}<br>`
    	}
    	str += feature.values_.type
    	content.innerHTML = str
        var coordinate = feature.values_.geometry.flatCoordinates
        overlay.setPosition(coordinate)
        // save the selected feature:
        selectedFeature = feature
	}


	// add locations to result table
 	function addResultToTable(location) {
 		let locationsTable = document.getElementById("locationsTable").getElementsByTagName('tbody')[0]
 		let row = locationsTable.insertRow()
 		let nameCell = row.insertCell()
 		let avgScoreCell = row.insertCell()
 		let distanceCell = row.insertCell()
 		row.id = location.id
 		var feature = featuresMap.get(location.id)
 		row.addEventListener("click", function (e) { openPopup(feature) })
 		nameCell.innerText = location.name
 		if (!location.avgScore) {
 			avgScoreCell.innerText = "-"
 		} else {
 			avgScoreCell.innerText = location.avgScore
 		}
 		distanceCell.innerText = parseFloat(location.distance).toFixed(3) + " KM"
 	}


	// add new description
	var saveDesc = document.getElementById('save-desc');
	saveDesc.onclick = function() {
		var newDesc = document.getElementById("user-description").value
		var rating = $('#user-rate').val()
		var userDescription = JSON.stringify ({
			"id": `${selectedFeature.id_}`,
 			"newDesc": `${newDesc}`,
 			"rating": `${rating}`
 		})
		// send to server:
 		fetch(`${url}/api/newDesc`, {
	        method: 'POST', 
	        headers: {
	            'Content-Type': 'application/json',
	        },
	        body: userDescription
	    })
	    .then(response => response.json())
	        .then(data => {
	        	// success
		    	showMsg("Yay! Your review was saved and will help other travellers!")
		    	document.getElementById("user-description").value = ""
	    		document.getElementById("user-rate").options.selectedIndex = 0    	
	        })
	        .catch((error) => {
	            // failed sending file to server
	    		showMsg("failed saving your review, please try again later")
	        });
	    var modal = $('#addDescModal');
	    $('#addDescModal').modal('hide')
	}


	// show descriptions:
	document.getElementById('popup-show-desc').onclick = function() {
		var modal = $('#showDescModal');
		var body = modal.find('.modal-body')
		var table = document.getElementById('review-table')
		for (var i=table.rows.length-1; i>0; i--) {
			table.deleteRow(i)
		}
		// ask server for descriptions:
		fetch(`${url}/api/${selectedFeature.id_}/getDesc`, {
	        method: 'GET', 
	        headers: {
	            'Content-Type': 'application/json',
	        }
	    })
	    .then(response => response.json())
	        .then(response => {
	        	// success
		    	for (const key of Object.keys(response)) {
		 			if (response.hasOwnProperty(key)) {
		 				var row = table.insertRow(-1)
		 				var desc = row.insertCell(0)
		 				var descText = document.createTextNode(response[key].description)
		 				desc.appendChild(descText)
		 				var rating = row.insertCell(1)
		 				var ratingText = document.createTextNode(response[key].rating)
		 				rating.appendChild(ratingText)
		 				var date = row.insertCell(2)
		 				var d = response[key].date
		 				d = d.slice(0, 10)
		 				var dateText = document.createTextNode(d)
		 				date.appendChild(dateText)
		 				// body.append(response[key].description)
		 				// body.append(`<br>`)
		 			}
		 		}	    	
	        })
	        .catch((error) => {
	            // failed
	    		showMsg(`Couldn't get reviews for ${selectedFeature.values_.name}, please try again later`);
	        });
	}


	// initialize page for a new search:
	document.getElementById('new-search').onclick = function() {
		document.getElementById("explain").style.display = "block"
 		// switch cards:
 		var resultPlaces = document.getElementById("resultPlaces")
 		resultPlaces.style.display = "none"
 		// remove resulte from tables:
 		$("#locationsTable").find("tr").remove()
 		$("#chosenTable").find("tr").remove()
	    var card = document.getElementById("card")
 		card.style.display = "block"
 		// remove all features (markers) from map:
 		map.removeLayer(markersLayer)
 		// zoom out:
 		changeMapZoom(initCenterLonLat[0], initCenterLonLat[1], 2)
 		// delete all fields of form:
		$('#form')[0].reset();
		$('#radiusSlider').val = 30
		$valueSpan.html("30 km");
	}


	function showMsg(msg) {
		$('alertu').show()
		document.getElementById('msg').innerHTML = msg
		$('#alertu').fadeTo(2500, 500).slideUp(500, function() {
		    $('#alertu').slideUp(500);
		  });
	}


	function changeMapZoom(lon, lat, z) {
		map.setView(new ol.View({
            center: ol.proj.fromLonLat([lon, lat]),
            zoom: z
        }))
	}


	function removeLocation(id) {
		console.log(id)
    	let toDel = confirm("Are you want to remove this location from your list?");
    	if (toDel != true) {
       		 return;
    	} else {
    	    var row = document.getElementById(id + "chosen");
    		row.parentNode.removeChild(row);
    	}
	}


	function addDelButton(locationId, row) {
		let delB = document.createElement("a");
        delB.innerText = "❌";
        delB.id = locationId; 
      	//delB.className = "btn btn-danger";
        delB.addEventListener("click", function() {
        	removeLocation(locationId)
        })
        console.log("Location: " + locationId)
        deleteB = row.insertCell()
        deleteB.appendChild(delB)
	}


    document.querySelector("button")
        .addEventListener("click", sendDataToServer);

})
