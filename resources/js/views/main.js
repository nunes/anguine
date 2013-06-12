//Window controller

function WindowCtrl($scope, $http) {

    var tasks = $scope.tasks = [];
    
    $http.get('/rest/Task').success(function(data, status, headers, config) {
        _.each(data["list"]["Task"], function(element, index, list) {
            $scope.tasks.push(element);
        });

    });
    
    var user = null;

    $scope.newTask = '';
    $scope.newTaskLabel = '';
    $scope.removeTask = '';

    $scope.taskCount = $scope.tasks.length;

    $scope.$watch('tasks', function() {
        $scope.taskCount = $scope.tasks.length;
    }, true);

    $scope.addTask = function() {
        var newTask = $scope.newTask.trim();
        if (!newTask.length) {
            return;
        }

        var newTaskLabel = $scope.newTaskLabel.trim();

        var task = {
            description : newTask,
            label : newTaskLabel
        }

        $http.post('/rest/Task', {
            Task : task
        }).success(function(data, status, headers, config) {
            
            task["key"] = data;
            
            $scope.tasks.push(task);
            
            $scope.newTask = '';
            $scope.newTaskLabel = '';

            $('#addTaskModal').modal('hide');
            
        });

    };

    $scope.confirmRemoveTask = function() {
        $http.delete('/rest/Task/' + $scope.removeTask.key).success(function(data, status, headers, config) {
            tasks.splice(tasks.indexOf($scope.removeTask), 1);
            $('#deleteTaskModal').modal('hide');
        });
    }

    $scope.openRemoveTask = function(task) {
        $scope.removeTask = task;
    }

}
