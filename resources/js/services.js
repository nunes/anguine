angular.module('taskServices', [ 'ngResource' ]).factory('Task', function($resource) {
    return $resource('/rest/Task/:key.json', {}, {
        query : {
            method : 'GET',
            params : {
                key : 'phones'
            },
            isArray : true
        }
    });
});