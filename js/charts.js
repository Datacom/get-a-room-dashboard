
var _data = {};
var _title_text = {};
var small_chart_height = 150;

var donut_inner = 40
var donut_outer = 70
var donut_height = 200
var duration_binsize = .25 // binsize in hours
var ms_per_hour = 3600000
var ms_per_day = ms_per_hour*24
var day_labels =['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

//var valueAccessor =function(d){return d.value < 1 ? 0 : d.value}

var featureCharts = {}


//----------------------------------------CLEANUP functions----------------------------------------------------------------------------

function cleanup(d) {
  
  
  d.start_at = Date.parse(d.start_at)
  d.end_at = Date.parse(d.end_at)
  d.duration = (d.end_at - d.start_at)/ms_per_hour;
  d.durationBin = Math.floor(d.duration/duration_binsize)*duration_binsize
  d.room.shortName = d.room.name.replace('Meeting Room ', '');
  d.day = new Date(d.start_at).getDay()
  d.hour = new Date(d.start_at).getHours()
  d.date = new Date(Math.floor(d.start_at/ms_per_day)*ms_per_day)
  
  
  //fake some .features data -----REMOVE THIS AS SOON AS WE HAVE REAL DATA----
  d.room.features.whiteboard = Math.round(Math.random()*3) >= 1?true:false
  d.room.features.video_conference = Math.round(Math.random()*.8) >= 1?true:false
  d.room.features.teleconference = Math.round(Math.random()*1.2) >= 1?true:false
  d.room.features.projector = Math.round(Math.random()*.8) >= 1?true:false
  return d;
}


//--------------------------crossfilter reduce functions-----------------------------


//--------------------------Accessor functions---------------------------------


//--------------------------Load data and dictionaries -----------------------------

queue()
    .defer(d3.json,  "data/getaroom_meetings_data.json")
    .defer(d3.csv,   "dictionaries/titles.csv")
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
  
  dc.dataCount(".dc-data-count")
    .dimension(ndx)
    .group(ndx.groupAll());  
  
//-----------------------------------ORDINARY CHARTS ------------------------------------------------- 
     
  organizer = ndx.dimension(function(d) {return d.organizer.full_name});
  organizer_group = organizer.group().reduceCount();
  function isOther(d) {
    return d && !!d.actual_value;
  }
 
  
  function otherizeChart(chart, cap) {
    cap = cap || 10;
    chart.data(function(group) {
      var data = group.all();
      data = _.sortBy(data, function(d){return -d.value})
      var head = _.head(data, cap);
      var tail = _.tail(data, cap);
      var max_value = d3.max(head, _.property("value"))
      var other_value = d3.sum(tail, _.property("value"))
      row_value = Math.min(max_value + 1, other_value)
      head.push({key:"Other", value:row_value, actual_value:other_value});
      return head;
    })
    .label(function(d){return d.key + (d.actual_value?(': ' + d.actual_value):'')})
    .title(function(d){return d.key+': '+title_integer_format(d.actual_value || d.value)})
    .on('postRender', function(chart){
      grad = chart.selectAll("g.row").filter(isOther).append("svg:linearGradient")
        .attr("id", 'organizer_chart_other_grad')
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "0%")
      grad.append("svg:stop")
        .attr("stop-color", default_colors('Other')).attr("offset","75%")
      grad.append("svg:stop")
        .attr("stop-color", default_colors('Other')).attr("offset","75%")
      grad.append("svg:stop")
        .attr("stop-color", '#fbfbfb').attr("offset","100%")
    })
    .on('pretransition.classify_other', function(chart){
      chart.selectAll("rect").classed("other", isOther);
      var other_g = chart.selectAll("g").filter(isOther);
      other_g.selectAll("rect").attr("fill",default_colors('Other'));
      var data = other_g.data()[0];
      if (data && data.actual_value != data.value) {
        other_g.selectAll("rect").attr("fill",'url(#organizer_chart_other_grad)')
      }
    })

  }
  
  organizer_chart = dc.rowChart('#organizer')
    .dimension(organizer)
    .group(organizer_group)
    .transitionDuration(200)
    .height(small_chart_height*2)
    .colors(default_colors)
    .elasticX(true)
    .x(d3.scale.linear().domain[0,10])
    .label(function(d){return d.key + (d.actual_value?(': ' + d.actual_value):'')})
    .title(function(d){return d.key+': '+title_integer_format(d.actual_value || d.value)})

  
  organizer_chart.xAxis().ticks(4).tickFormat(integer_format);
  //organizer_chart.x(d3.scale.linear().domain[0,organizer_group.top(1)[0].value])
  organizer_chart.on('pretransition.dim', dim_zero_rows)
  otherizeChart(organizer_chart,10)

  
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
  otherizeChart(room_chart)
  
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
  
  day = ndx.dimension(function(d){return d.day});
  day_group = day.group().reduceCount();

  day_chart = dc.barChart('#day')
      .dimension(day)
      .group(day_group)
      .height(small_chart_height)
      .colors(default_colors)
      .elasticX(false)
      .elasticY(true)
      .x(d3.scale.linear().domain([-0.5,6.5]))
      .xUnits(dc.units.fp.precision(1))
      .centerBar(true)
      .renderHorizontalGridLines(true)
      .renderVerticalGridLines(true)
      .transitionDuration(200)
  
  day_chart.yAxis().ticks(4).tickFormat(title_integer_format);
  day_chart.xAxis().ticks(6).tickFormat(function(d){return day_labels[d]}); 
  
  hour = ndx.dimension(function(d){return d.hour});
  hour_group = hour.group().reduceCount();

  hour_chart = dc.barChart('#hour')
      .dimension(hour)
      .group(hour_group)
      .height(small_chart_height)
      .colors(default_colors)
      .elasticX(false)
      .elasticY(true)
      .x(d3.scale.linear().domain([hour_group.all()[0].key-.5, hour_group.all()[hour_group.all().length-1].key+.5]))
      .xUnits(dc.units.fp.precision(1))
      .centerBar(true)
      .renderHorizontalGridLines(true)
      .renderVerticalGridLines(true)
      .transitionDuration(200)
  
  hour_chart.yAxis().ticks(4).tickFormat(title_integer_format);
  hour_chart.xAxis().ticks(hour_group.all()[hour_group.all().length-1].key-hour_group.all()[0].key).tickFormat(integer_format)
                    .tickFormat(hours_12); 
  
  date = ndx.dimension(function(d){return d.date});
  date_group = date.group().reduceCount();

  date_chart = dc.barChart('#date')
      .dimension(date)
      .group(date_group)
      .height(small_chart_height)
      .colors(default_colors)
      .elasticX(false)
      .elasticY(true)
      .x(d3.time.scale().domain([date_group.all()[0].key, date_group.all()[date_group.all().length-1].key]))
      .xUnits(dc.units.fp.precision(ms_per_day))
      .centerBar(true)
      .renderHorizontalGridLines(true)
      .renderVerticalGridLines(true)
      .transitionDuration(200)
  
  date_chart.yAxis().ticks(4).tickFormat(title_integer_format);
 date_chart.xAxis().tickFormat(d3.time.format("%b")); 
  
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
  
  seats2_chart = dc.barChart('#seats2')
      .dimension(seats)
      .group(seats_group)
      .height(small_chart_height)
      .colors(default_colors)
      .elasticX(false)
      .elasticY(true)
      .x(d3.scale.linear().domain([0,80]))
      .xUnits(dc.units.fp.precision(1))
      .centerBar(true)
      .renderHorizontalGridLines(true)
      .renderVerticalGridLines(true)
      .transitionDuration(200)
  
  seats2_chart.yAxis().ticks(4).tickFormat(title_integer_format);
  seats2_chart.xAxis().tickFormat(integer_format); 
  
  
//----------------------- functionally generated pies -----------------  
  
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
    
 featureCharts_selection = d3.select('#featureCharts').selectAll('div').data(keys).enter().append('div')
    .attr('id', function(d){return d})
    .classed("col-sm-6",true)
  
  featureCharts_selection.append('legend')
    .text(function(d){return 'Has '+ titleCase(d.replace('_',' '))})
  
  for(i in keys){
    feature = keys[i]
    chart = has_feature(feature)
    featureCharts[feature] = chart;
  }

  featureCharts_selection.select('legend').append('a')
    .attr('style','display:none;')
    .classed('pull-right reset',true)
    .on('click',function (d){featureCharts[d].filterAll(); dc.redrawAll();})
          
  featureCharts_selection.select('legend').select('a').append('i').classed('fa fa-refresh',true)
//  
  dc.renderAll()
}
