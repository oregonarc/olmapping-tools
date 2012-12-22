window.OLMap = {}

OLMap.proj = new OpenLayers.Projection("EPSG:4326");
OLMap.map = null;
OLMap.fullwidth = true;
OLMap.fullheight = false;

var useLocalTiles = false;
if (useLocalTiles) {
    //OLMap.tilesDir = "file:///Users/wilblack/AndriodDev/droidplot/DroidPlot/assets/tiles/";
    // OLMap.tilesDir = "file:///Users/tech/gitspace/RNC_CHARTS/";
    // OLMap.tilesDir = "file:///sdcard/RNC_CHARTS/";
    OLMap.tilesDir = "file:///storage/sdcard0/Android/obb/com.yaqtek.mmlite/tiles/RNC_CHARTS/";
}
OLMap.cl = [45.0,-124.5];
OLMap.bearing = 0;

OLMap.clMarker = false;
OLMap.clMarker_icon = 'media/js/theme/default/img/mm_marker.png';
OLMap.clMarkers = false;

OLMap.activeTrack = {};
OLMap.clSegment = false;

OLMap.activeTrackWidth = 7;
OLMap.trackWidth = 6;

OLMap.waypointStyle = new OpenLayers.Style({
        fillColor:"#33ee33",        
        fillOpacity:.5,
        strokeColor:"#000000",
        strokeWidth:2,
        pointRadius: 10,
    });

OLMap.wpLabelStyle = new OpenLayers.StyleMap({'default':{
        strokeColor: "#000000",
        strokeOpacity: 1,
        strokeWidth: 2,
        fillColor: "#33ee33",
        fillOpacity: 0.5,
        pointRadius: 8,
        pointerEvents: "visiblePainted",
        // label with \n linebreaks
        label : "${name}",
        
        fontColor: "#044",
        fontSize: "18px",
        fontFamily: "Helvetica, monospace",
        fontWeight: "normal",
        labelAlign: "l",
        labelXOffset: "11",
        labelYOffset: "0",
        labelOutlineColor: "#FFFFFF",
        labelOutlineWidth: 4,
    }});

OLMap.waypointLayer = new OpenLayers.Layer.Vector("Waypoints",{
        styleMap: OLMap.wpLabelStyle,
        rendererOptions: {zIndexing: true}
});

OLMap.activeTrackStyle = new OpenLayers.Style({
        fillColor:"${color}",        
        fillOpacity:1,
        strokeColor:"#E66C2C",
        strokeWidth:"${width}",
        pointRadius: OLMap.activeTrackWidth-2,
    }); 
    
OLMap.activeTrackLayer = new OpenLayers.Layer.Vector("Active Track",{
        styleMap: new OpenLayers.StyleMap(OLMap.activeTrackStyle),
        rendererOptions: {zIndexing: true}
});

OLMap.trackStyle = new OpenLayers.Style({
        fillColor:"${color}",
        strokeColor:"#f3AC87",
        strokeWidth:"${width}",
        pointRadius: OLMap.trackWidth-1,
    }); 
OLMap.trackLayer = new OpenLayers.Layer.Vector("Tracks",{
        styleMap: new OpenLayers.StyleMap(OLMap.trackStyle),
        rendererOptions: {zIndexing: true}
});

/**************************************************************************************************/

OLMap.init = function(options) {
    this.fixMapSize();
    
    console.log("Map loaded. "+(useLocalTiles?"Using local tiles.":"Using web tiles."));
    
    // Make Layers, use Google Maps if available
    var layers = [];
                      
    try{
        layers.push(new OpenLayers.Layer.Google(
            "Google Physical",
            {type: google.maps.MapTypeId.TERRAIN}
        ));
        layers.push(new OpenLayers.Layer.Google(
            "Google Streets", // the default
            {numZoomLevels: 20}
        ));
        layer.push(new OpenLayers.Layer.Google(
            "Google Hybrid",
            {type: google.maps.MapTypeId.HYBRID, numZoomLevels: 20}
        ));
        layers.push(new OpenLayers.Layer.Google(
            "Google Satellite",
            {type: google.maps.MapTypeId.SATELLITE, numZoomLevels: 22}
        ));       
    
    } catch (er){}
    
    layers.push(
         new OpenLayers.Layer.TMS(
        "NOAA RNC Charts",
        "http://media.oregonarc.com/RNC_CHARTS/",
        {'type':'.png', 
         'getURL':this.get_my_url,
         'eventListeners': { tileloaded: updateStatus },
          numZoomLevels:16,
         } 
        )
    );
    
    this.map = new OpenLayers.Map("map",{
        maxExtent: new OpenLayers.Bounds(-20037508.34,-20037508.34,20037508.34,20037508.34),
        maxResolution:156543.0339,
        units:'m',
        projection: "EPSG:900913",
        displayProjection: new OpenLayers.Projection("EPSG:4326"),
        layers:layers,
    });
       
    this.setCenter(this.cl[0], this.cl[1], 8);
    this.map.addControl(new OpenLayers.Control.LayerSwitcher());
    this.map.addControl(new OpenLayers.Control.ScaleLine());
    this.map.addControl(new OpenLayers.Control.MousePosition());
       
       
};

OLMap.fixMapSize = function() {
    if (this.fullwidth) $("#map").width(window.innerWidth - 40);
    if (this.fullheight) $("#map").height(window.innerHeight - 2);
}

OLMap.get_my_url = function(bounds) {  
    var res = this.map.getResolution();
    var x = Math.round ((bounds.left - this.maxExtent.left) / (res * this.tileSize.w));
    var y = Math.round ((this.maxExtent.top - bounds.top) / (res * this.tileSize.h));
    var z = this.map.getZoom();
        
    var path  = z + "/" + x + "/" + (Math.pow(2,z)-y-1) + this.type;

    //return either local or remote tile location
    if (useLocalTiles) {
        return OLMap.tilesDir+path;
    } else {
        var url = this.url;
        if (url instanceof Array) {
            url = this.selectUrl(path, url);
        }
        return url + path;
    }
    
    
};

OLMap.setCenter = function(lat, lon, zoom) {
    // Set Center
    var center = new OpenLayers.LonLat(lon,lat);
    center.transform(OLMap.proj, this.map.getProjectionObject());     
    this.map.setCenter(center, zoom, true, true);
}

OLMap.plot_cl = function (){
    /*
     * Plots the location in OLMap.cl as the current location on the map
     */
    
    //draw segment from last active trackpoint to current location
    if (this.activeTrack.geom != null && this.activeTrack.geom.length > 0) {
        //remove previous segment
        if (this.clSegment) {
            this.activeTrack.geom.pop();
        }
        
        //add new segment
        this.activeTrack.geom.push(this.cl);
        this.plot_active_track(this.activeTrack);
        
        this.clSegment = true;
    }
    
    if (!this.clMarker){
      //this.clMarkers = new OpenLayers.Layer.Markers( "Current Location" );
        this.clMarkers = new OpenLayers.Layer.Vector("Current Location",
            {
                styleMap: new OpenLayers.StyleMap({
                    "default": {
                        externalGraphic: this.clMarker_icon,
                        graphicWidth: 40,
                        graphicHeight: 40,
                        graphicYOffset: -40/2,
                        //graphicXOffset: 30/2,
                        rotation: "${angle}",
                        
                    },
                    
                })
            });

        this.map.addLayer(this.clMarkers);  
    } else {
        this.clMarkers.removeFeatures(this.clMarker);
    }
    /*
    var size = new OpenLayers.Size(25,30);
    var offset = new OpenLayers.Pixel(-(size.w/2), -size.h);
    var icon = new OpenLayers.Icon(this.clMarker_icon,size,offset);
    var point = new OpenLayers.LonLat(this.cl[1], this.cl[0]);
       
    point.transform(this.proj, this.map.getProjectionObject());
    this.clMarker = new OpenLayers.Marker(point,icon);
    this.clMarkers.addMarker(this.clMarker);
    */
    this.clMarker = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(this.cl[1], this.cl[0]), {angle: this.bearing} )
    // Reproject the feature to Spherical Mercator projection
    var geometry = this.clMarker.geometry;
    geometry.transform(this.proj, this.map.getProjectionObject())
    this.clMarkers.addFeatures(this.clMarker);
    this.setZIndices();  
} 

OLMap.plot_waypoints = function(points){
    /* 
     * Plots a list of waypoint objects. Waypoints objects 
     * must contain lat and lon keywords.
     * Optional keywords are name, time. 
     */ 
    
    // Destroy waypoint layer and start fresh
    if (this.waypointLayer.features.length > 0){
        this.map.removeLayer(this.waypointLayer);
        this.waypointLayer.removeAllFeatures();
    }

    for (var i=0; i < points.length; i++){
        
        var point = new OpenLayers.Geometry.Point(points[i]['lon'], points[i]['lat']);         
        var feature = new OpenLayers.Feature.Vector(point);
        
        feature.attributes = { name: points[i]['name'] };         
                
        // Reproject the feature to Spherical Mercator projection
        var geometry = feature.geometry;
        geometry.transform(this.proj, this.map.getProjectionObject());
        this.waypointLayer.addFeatures(feature);
               
    }
    this.map.addLayer(this.waypointLayer);
    this.setZIndices();
};

   
OLMap.add_waypoint = function(wp){
    /*
     * Adds a waypoint to the wayppoints layer.
     */
    
    if (this.waypointLayer.length>0){
        var feature = new OpenLayers.Feature.Vector(
            new OpenLayers.Geometry.Point(wp['lon'], wp['lat'])
         );
        var geometry = feature.geometry;
        geometry.transform(this.proj, this.map.getProjectionObject());
        vectorLayer.addFeatures(feature);
                 
    } else {
        this.plot_waypoints([wp]);
    }
}

OLMap.plot_active_track = function(track){
    
    if (this.activeTrackLayer.features.length > 0){
        this.activeTrackLayer.removeAllFeatures();
        this.map.removeLayer(this.activeTrackLayer);  
    }   
    
    this.activeTrack = track;
    points = this.tracks2points(track.geom);
//     console.log(points);
    
    var lineString = new OpenLayers.Geometry.LineString(points);
    var feature = new OpenLayers.Feature.Vector(lineString, {width:6});
    
    // Reproject the feature to Spherical Mercator projection
    var geometry = feature.geometry;
    geometry.transform(this.proj, this.map.getProjectionObject());
    this.activeTrackLayer.addFeatures(feature);
    
    if (track.geom.length > 0) this.plot_firstPoint(track, this.activeTrackLayer);
    
    //add it to the map 
    this.map.addLayer(this.activeTrackLayer);
    this.setZIndices();
}

OLMap.update_active_track = function(tp){
    //remove previous current location
    if (this.clSegment) {
        this.activeTrack.geom.pop();
        this.clSegment = false;
    }
    
    this.activeTrack.geom.push(tp);
    this.plot_active_track(this.activeTrack);
}

OLMap.remove_active_track = function(){
    if (this.activeTrackLayer.features.length > 0){
        this.activeTrackLayer.removeAllFeatures();
        this.map.removeLayer(this.activeTrackLayer);  
    }   
    this.activeTrack.geom=[];
    this.clSegment = false;
}


OLMap.plot_tracks = function(tracks) {
    /*
     * tracks is a list of trackpoints
     */    
    
    if (this.trackLayer.features.length > 0){
        this.trackLayer.removeAllFeatures();
        this.map.removeLayer(this.trackLayer);
        
    }
       
    for (var i=0; i<tracks.length; i++){              
        var points = this.tracks2points(tracks[i].geom);
        var lineString = new OpenLayers.Geometry.LineString(points);
        var feature = new OpenLayers.Feature.Vector(lineString, {width:6});
               
        // Reproject the feature to Spherical Mercator projection
        var geometry = feature.geometry;
        geometry.transform(this.proj, this.map.getProjectionObject());
         
        this.trackLayer.addFeatures(feature);
        if (points.length > 1) {
            this.plot_firstPoint(tracks[i], this.trackLayer);
            this.plot_lastPoint(tracks[i], this.trackLayer);
        } 
     }
     
    //add it to the map 
    this.map.addLayer(this.trackLayer);
    this.setZIndices();
}

OLMap.plot_firstPoint = function(track, layer){
    // Add beginning point
    window.bp = new OpenLayers.Feature.Vector(
       new OpenLayers.Geometry.Point(track.geom[0][1],track.geom[0][0]), 
           {color:"#33ee33", width:2}
    );
       
    var geometry = bp.geometry;
    geometry.transform(this.proj, this.map.getProjectionObject());
    layer.addFeatures(bp);  
}

OLMap.plot_lastPoint = function(track, layer){
    // Add end point 
    N = track.geom.length-1;
    window.ep = new OpenLayers.Feature.Vector( 
       new OpenLayers.Geometry.Point(track.geom[N][1],track.geom[N][0]), 
           {color:"#FF0000", width:0} 
    );
       
    geometry = ep.geometry;
    geometry.transform(this.proj, this.map.getProjectionObject());
    layer.addFeatures(ep);  
}


OLMap.recenterMap = function() {
    /*
     * Call to recenter the map with current location.
     */
    var newCenter;
    if (this.cl[0] != 0.0) {
        newCenter = new OpenLayers.LonLat(OLMap.cl[1],OLMap.cl[0]);   
    } else {
        newCenter = new OpenLayers.LonLat(44, -123);
    }
    newCenter.transform(this.proj, this.map.getProjectionObject());
    
    OLMap.map.panTo(newCenter);
}

OLMap.set_wp_labels = function(label) {
    this.waypointLayer.styleMap.styles.default.defaultStyle.label = label?"${name}":"";
    this.waypointLayer.redraw();
}

OLMap.tracks2points = function(trackpoints){
    /*
     * Takes a list of lat, lons, and returns a list of OpenLayer points.
     */
    
    var points = [];
    
    for (i=0;i<trackpoints.length;i++){
        if (trackpoints[i][0] != 0.0) {
            // Remeber this takes lon, lat. 
            points.push(new OpenLayers.Geometry.Point(trackpoints[i][1], trackpoints[i][0]));
        }
    }
    return points;
}


OLMap.write_cache_mode = function() {
    console.log("Changing to Write mode");
    if (window.cacheRead != undefined){
        this.map.removeControl(cacheRead);
        cacheRead.deactivate();
    }
    
    this.map.addControl(this.cacheWrite);
}

OLMap.read_cache_mode = function() {
    console.log("Changing to Read mode");
    this.map.addControl(this.cacheRead);
}

OLMap.destroyLayer = function(layer) {
    OLMap.map.removeLayer(layer);
    layer.destroy();
}

OLMap.setZIndices = function() {
    if (this.trackLayer) this.trackLayer.setZIndex(200);
    if (this.waypointLayer) this.waypointLayer.setZIndex(300);
    if (this.activeTrackLayer) this.activeTrackLayer.setZIndex(400);
    if (this.clMarkers) this.clMarkers.setZIndex(500);
}


/************** HELPER FUNCTIONS (THESE BELONG IN A VIEW) *****************/

// update the number of cache hits and detect missing CORS support
function updateStatus() {
//     console.log("in updateStatus");
    
}
 
/****************** Dummy Data ***************************/

wps=[{lon:-123.0, lat:45, name:'Bob'},{lon:-124.0, lat:45, name:'George'}];
wp = {lon:-123.0, lat:44, name:'Hank'};

track = {name:'Shirley',trackId:1,geom:[] };
tps = [[44,-123],[45,-123],[45,-124],[45,-126]];


track1 = {name:'Shirley',trackId:1,geom:[[44,-123],[45,-123],[45,-124],[45,-126]] };
track2 = {name:'May',trackId:2,geom:[[43,-123],[44,-123],[44,-124],[44,-126]] };


/*********************************************************/
