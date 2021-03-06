(function(app, $){

  app.addRoute('/precincts/:state/:county/:precinctId', function(data){

    var state = data.state.toLowerCase();
    var county = data.county.toLowerCase();
    var precinctId = data.precinctId;

    // placeholder name until data is loaded from firebase
    var element = app.render(app.compile('precinct_full', {
      name: county + ', ' + state + ' ' + precinctId,
      wait: app.waitInfo(-1), // unknown wait
      lastUpdated: 'Never',
      showButtons: true //TODO: don't show to unauthorized users
    }));

    // get the node containing precinct data from firebase
    var precinctNode = app.db.child('precincts').child(state).child(county).child(precinctId);

    var waitNode = app.db.child('wait-times');

    var timeUpdateInterval = null;

    // when a wait time button is clicked

    function addButtonListeners(element){
        $(element).find('.btn-wait').click(function(){

          // the severity of the wait is pulled from the 'wait' attribute on the button html
          var wait = $(this).attr('wait');

          // create a new wait time estimate at this moment
          // TODO: Authentication - don't let just anyone submit times
          var newNode = waitNode.push({
            timestamp: new Date().toISOString(),
            wait: wait,
            state: state,
            county: county,
            precinct: precinctId
          });

          // update the precinct with the latest wait id
          precinctNode.update({lastWait: newNode.key()});

          // updating the data will cause on('value') to be called, so we don't have to draw the new data
        });
    }

    addButtonListeners(element);

    // get basic precinct data
    precinctNode.on('value', function(valSnapshot){
      var precinct = valSnapshot.val();

      // TODO: map link
      if(precinct && precinct.lastWait){
        // get new wait time
        waitNode.child(precinct.lastWait).once('value', function(waitSnapshot){
          var waitTime = waitSnapshot.val();
          // update wait time
          var element = app.render(app.compile('precinct_full', {
            name: precinct.name,
            wait: app.waitInfo(waitTime.wait),
            lastUpdated: new Date(waitTime.timestamp).toRelativeString(),
            showButtons: true //TODO: don't show to unauthorized users
          }));
          addButtonListeners(element); // re-add listeners

          //update last updated. we do this on an interval so the time updates regularly
          // (e.g. 3 minutes ago, 4 minutes ago, ...)
          // `toRelativeString` is thanks to bower library `natural_dates`
          var lastUpdated = $(element).find('.last-updated');
          var interval = setInterval(function(){
            lastUpdated.text(new Date(waitTime.timestamp).toRelativeString());
          }, 5 * 1000);
          lastUpdated.on('remove', function(){
            clearInterval(interval);
          });
        });
      }
    });
  });

})(window.app, window.jQuery);
