
var MainWindow = {
	dialogs: [ ],

	initialize: function () {
        
		Modernizr.load({
			  test: Modernizr.borderradius && Modernizr.boxshadow,
			  nope: '/css/style-borderradius-polyfill.css'
			});

        _G.debug("Window initialized");
    }

};

Event.observe(document, 'dom:loaded', function() {
	MainWindow.initialize();

});

