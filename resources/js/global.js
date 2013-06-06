/*exports _A */

//_A: Application functions and utilities holder
var _A = (function() {
	return {
		installApp: function(id, folder, successHandler, errorHandler) {
			_R.invoke('installApp', {}, {
				url: '/installApp/' + id + '/' + folder, 
				successHandler: successHandler,
				errorHandler: errorHandler
			});
			
		},
		
		moveElement: function(elementId, destinationFolderId, successHandler, errorHandler) {
			_R.invoke('moveElement', {}, {
				url: '/moveElement/' + elementId + '/' + destinationFolderId, 
				successHandler: successHandler,
				errorHandler: errorHandler
			});
		},
		
		getUserPreferences: function(successHandler, errorHandler) {
			_R.invoke('getUserPreferences', {}, {
				url: '/getUserPreferences', 
				successHandler: successHandler,
				errorHandler: errorHandler,
				method: 'get'
			});
		},
		
		getDashboardSearchServices: function(successHandler, errorHandler) {
            _R.invoke('searchServices', {}, {
                url: '/searchServices', 
                successHandler: successHandler,
                errorHandler: errorHandler,
                method: 'get'
            });
		}
	}
}());


