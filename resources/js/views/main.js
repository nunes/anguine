//Window controller

function WindowCtrl($scope, $http) {

	var tasks = $scope.tasks = [];

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

		$http.post('/rest/task/add', task).success(function() {
			tasks.push(task);

			$scope.newTask = '';
			$scope.newTaskLabel = '';

			$('#addTaskModal').modal('hide');
		});

	};

	$scope.confirmRemoveTask = function() {
		tasks.splice(tasks.indexOf($scope.removeTask), 1);
		$('#deleteTaskModal').modal('hide');

	}

	$scope.openRemoveTask = function(task) {
		$scope.removeTask = task;
	}

}
