
var _data = {};
var _title_text = {};
var small_chart_height = 150;

var donut_inner = 44
var donut_outer = 70
var donut_height = 200
var duration_binsize = .25 // binsize in hours



//var valueAccessor =function(d){return d.value < 1 ? 0 : d.value}

var featureCharts = []


//----------------------------------------CLEANUP functions----------------------------------------------------------------------------

function cleanup(d) {
  
  
  d.start_at = Date.parse(d.start_at)
  d.end_at = Date.parse(d.end_at)
  d.duration = (d.end_at - d.start_at)/3600000;
  d.durationBin = Math.floor(d.duration/duration_binsize)*duration_binsize
  d.room.shortName = d.room.name.replace('Meeting Room ', '');
  return d;
}


//-------------------------------------crossfilter reduce functions------------------------------------------------------------------


//-------------------------------------Accessor functions---------------------------------


//-------------------------------------Load data and dictionaries -----------------------------------------------------------

queue()
    .defer(d3.json,  "data/getaroom_meetings_data.json")
    .defer(d3.csv,  "dictionaries/titles.csv")
    .await(showCharts);

function showCharts(err, data, title_text) {
  
  var councilNames = [];
  
    for (i in title_text){
        entry = title_text[i]
        //trimAll(entry)
        name = entry.id
        _title_text[name]=entry;     
  }
    
  for (i in data) {
    data[i] = cleanup(data[i]);
  }
  _data = data;
 

//---------------------------------some d3 for title texts-----------------------------------    
  apply_text(_title_text)

//-------------------------------------------FILTERS-----------------------------------------------
  ndx = crossfilter(_data);
  
//  dc.dataCount(".dc-data-count")
//    .dimension(ndx)
//    .group(ndx.groupAll());  
  
//-----------------------------------ORDINARY CHARTS ------------------------------------------------- 
     
  organizer = ndx.dimension(function(d) {return d.organizer.full_name});
  organizer_group = organizer.group().reduceCount();
 
  organizer_chart = dc.rowChart('#organizer')
    .dimension(organizer)
    .group(organizer_group)
    //.valueAccessor(valueAccessor)
    .transitionDuration(200)
    .height(small_chart_height*2)
    .colors(default_colors)
    .elasticX(true)
    .ordering(function(d) {return - d.value})
    .cap(10)
    .title(function(d){return d.key+': '+title_integer_format(d.value)})
    //.label(function(d){return _label_dict[d.key] ? _label_dict[d.key].Abbreviation : d.key})

  organizer_chart.xAxis().ticks(4).tickFormat(integer_format);
  organizer_chart.on('pretransition.dim', dim_zero_rows)
  
  room = ndx.dimension(function(d) {return d.room.shortName});
  room_group = room.group().reduceCount();
 
  room_chart = dc.rowChart('#room')
    .dimension(room)
    .group(room_group)
    //.valueAccessor(valueAccessor)
    .transitionDuration(200)
    .height(small_chart_height*2)
    .colors(default_colors)
    .elasticX(true)
    .ordering(function(d) {return - d.value})
    .cap(10)
    .title(function(d){return d.key+': '+title_integer_format(d.value)})
    //.label(function(d){return _label_dict[d.key] ? _label_dict[d.key].Abbreviation : d.key})

  room_chart.xAxis().ticks(4).tickFormat(integer_format);
  room_chart.on('pretransition.dim', dim_zero_rows)
  
  site = ndx.dimension(function(d) {return d.site.name});
  site_group = site.group().reduceCount();
 
  site_chart = dc.rowChart('#site')
    .dimension(site)
    .group(site_group)
    //.valueAccessor(valueAccessor)
    .transitionDuration(200)
    .height(small_chart_height)
    .colors(default_colors)
    .elasticX(true)
    .ordering(function(d) {return - d.value})
    .cap(10)
    .title(function(d){return d.key+': '+title_integer_format(d.value)})
    //.label(function(d){return _label_dict[d.key] ? _label_dict[d.key].Abbreviation : d.key})

  site_chart.xAxis().ticks(4).tickFormat(integer_format);
  site_chart.on('pretransition.dim', dim_zero_rows)
  
  size = ndx.dimension(function(d) {return d.room.metadata.room_size});
  size_group = size.group().reduceCount();
  
  size_chart = dc.rowChart('#size')
    .dimension(size)
    .group(size_group)
    //.valueAccessor(valueAccessor)
    .transitionDuration(200)
    .height(small_chart_height)
    .colors(default_colors)
    .elasticX(true)
    .ordering(function(d) {return - d.value})
    .cap(10)
    .title(function(d){return d.key+': '+title_integer_format(d.value)})
    //.label(function(d){return _label_dict[d.key] ? _label_dict[d.key].Abbreviation : d.key})

  size_chart.xAxis().ticks(4).tickFormat(integer_format);
  size_chart.on('pretransition.dim', dim_zero_rows)
  
  seats = ndx.dimension(function(d) {return d.room.metadata.seat_number});
  seats_group = seats.group().reduceCount();
  
  seats_chart = dc.rowChart('#seats')
    .dimension(seats)
    .group(seats_group)
    //.valueAccessor(valueAccessor)
    .transitionDuration(200)
    .height(small_chart_height *2)
    .colors(default_colors)
    .elasticX(true)
    .ordering(function(d) {return - +d.key})
    //.cap(10)
    .title(function(d){return d.key+': '+title_integer_format(d.value)})
    //.label(function(d){return _label_dict[d.key] ? _label_dict[d.key].Abbreviation : d.key})

  seats_chart.xAxis().ticks(4).tickFormat(integer_format);
  seats_chart.on('pretransition.dim', dim_zero_rows)
  
  duration = ndx.dimension(function(d){return d.durationBin});
  duration_group = duration.group().reduceCount();

  duration_chart = dc.barChart('#duration')
      .dimension(duration)
      .group(duration_group)
      .height(small_chart_height)
      .colors(default_colors)
      .elasticX(false)
      .elasticY(true)
      .x(d3.scale.linear().domain([0,8]))
      .xUnits(dc.units.fp.precision(duration_binsize))
      .centerBar(true)
      .renderHorizontalGridLines(true)
      .renderVerticalGridLines(true)
      .transitionDuration(200)
  
  duration_chart.yAxis().ticks(4).tickFormat(title_integer_format);
  duration_chart.xAxis().tickFormat(integer_format); 
  
  function has_feature(feature_name){
    dim = ndx.dimension(function(d){return d.room.features[feature_name]});
    group = dim.group().reduceCount();

    chart = dc.pieChart('#'+feature_name)
      .dimension(dim)
      .group(group)
      .height(small_chart_height)
      .innerRadius(donut_inner)
      .radius(donut_outer)
      .colors(default_colors)
      .transitionDuration(200)

    return chart
  }
  
  keys = Object.keys(_data[0].room.features)

  
  d3.select('#featureCharts').selectAll('div').data(keys).enter().append('div')
    .attr('id', function(d){return d})
    .classed("col-sm-6",true)
  
  d3.select('#featureCharts').selectAll('div').append('legend')
    .text(function(d){return 'Has '+d})
    .classed('bob',function(d){console.log(d); return false})
  
  
  for(feature in keys){
    featureCharts.push(has_feature(keys[feature]))
  } 
  
  
  dc.renderAll()
}
