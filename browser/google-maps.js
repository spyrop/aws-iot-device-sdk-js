var marks = [];

//{
// id: ,
// marker: ,
// icon: ,
// accuracy:
//}

function initMap() {
	map = new google.maps.Map(document.getElementById('map'), {
			mapTypeId : google.maps.MapTypeId.TERRAIN,
			zoom : 17
		});

	//geocoder = new google.maps.Geocoder;
	myMarker = new google.maps.Marker({
			map : map
		});

	 directionsDisplay = new google.maps.DirectionsRenderer;
	 directionsDisplay.setMap(map);
     directionsService = new google.maps.DirectionsService;

	heading_icon = {
		scale : 10,
		anchor : new google.maps.Point(0, 0),
		//rotation: Math.floor(Math.random() * (360 - 0 + 1)) + 0,
		path : google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
		fillColor : '#008b00',
		fillOpacity : 1,
		strokeColor : 'white',
		strokeWeight : 3
	}
	
	newMark = createMark(-1, '#008b00');
	
	marks.push( newMark );
}

function createMark(id, color) {
	image = 'https://www.google.com/support/enterprise/static/geo/cdate/art/markers-shadow/job_completed_grey32.png';
	marker = new google.maps.Marker({
		map: map,
		icon: image
	});
	
	if (!color) {
	 color = '#4db8ff';
	}
	
	mark = {
		id: id, 
		marker: marker,
		icon: null,
		accuracy: null,
		accuracy_options: {
			strokeColor : color,
			strokeOpacity : 0.3,
			strokeWeight : 1,
			fillColor : color,
			fillOpacity : 0.10,
		map : map} }
	return mark;
}

REACTMAP_NONE = -1;
REACTMAP_CENTER = 1;
REACTMAP_FITALLMARKS = 2;
function showPositionOnMap(id, position, reactMap) {
	i = findById(marks, id);
	if (i.length > 0) {
		mark = i[0];
	}
	else {
		mark = createMark(id);
		marks.push(mark);
	}
	
	if (mark.accuracy != null)
		mark.accuracy.setMap(null);

	if (position.coords.latitude && typeof position.coords.latitude == 'string') {
		position.coords.latitude = parseFloat(position.coords.latitude);
	}
	
	if (position.coords.longitude && typeof position.coords.longitude == 'string') {
		position.coords.longitude = parseFloat(position.coords.longitude);
	}
		
	var latlng = new google.maps.LatLng(
			position.coords.latitude,
			position.coords.longitude);
		
	mark.accuracy_options.center = latlng;
	mark.accuracy_options.radius = position.coords.accuracy / 100 * map.zoom;
	mark.accuracy = new google.maps.Circle(mark.accuracy_options);

	/* Bias the autocomplete object to the user's geographical location */
	//autocomplete.setBounds(accuracyCircle.getBounds());

	//$("#accuracy").html(' (' + current_pos.coords.accuracy + ', ' +
	//	current_pos.coords.heading + ', ' + current_pos.coords.speed + ') ');

	if (mark.marker != null)
		mark.marker.setMap(null);
	mark.marker = new google.maps.Marker({map : map});
	mark.marker.setPosition(latlng);
	
	if (!reactMap || reactMap == REACTMAP_FITALLMARKS) {
		fitAllMarks();
	}
	else if (reactMap == REACTMAP_CENTER) {
		if (map.getBounds() == null || !check_is_in_or_out(mark.marker))
			map.setCenter(latlng);
	}
}

function fitAllMarks() {
	var bounds = new google.maps.LatLngBounds();
	for (var i = 0; i < marks.length; i++) {
		if (marks[i] != null)
			bounds.extend(marks[i].marker.position);
	}
	map.fitBounds(bounds);
}

function check_is_in_or_out(marker){
  return map.getBounds().contains(marker.getPosition());
}
