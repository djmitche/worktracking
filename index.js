angular.module('work', []);

angular.module('work').factory('unique', function() {
    return function(array) {
        var u = {}, a = [];
        for(var i = 0, l = array.length; i < l; ++i){
            if(!u.hasOwnProperty(array[i])) {
                a.push(array[i]);
                u[array[i]] = 1;
            }
        }
        return a;
    };
});

angular.module('work').factory('select', function() {
    return function(array, key) {
        return array.map(function(e) { return e[key]; });
    };
});

angular.module('work').controller('WorkController', function ($scope, unique, select) {
    // tasks: rows from the sheet's with 'task.sheet' indicating the sheet
    $scope.tasks = [];
    // the set of all owners
    $scope.owners = [];
    // current filter for tasks
    $scope.taskFilter = {};

    var tabletop = Tabletop.init({
        key: 'https://docs.google.com/spreadsheets/d/1CiQAc5pGpV-sFFVP8-5dfnzvTxh-tStAbj32XqiO_Kg/pubhtml',
        callback: function(data, tabletop) {
            $scope.$apply(function() {
                var sheets = {
                    wip: data['Work in Progress'],
                    upcoming: data['Near-Term Upcoming Work'],
                    completed: data['Completed Work']}

                var tasks = [];
                angular.forEach(sheets, function(sheet, sheet_name) {
                    angular.forEach(sheet.elements, function(row) {
                        if (row.work) {
                            row.sheet = sheet_name;
                            tasks.push(row);
                        }
                    });
                });
                $scope.tasks = tasks;

                $scope.owners = unique(select(tasks, 'owner'));
                $scope.owners.sort();

                $scope.teams = unique(select(tasks, 'responsibleteam'))
                $scope.teams.sort();
            });
        },
        wanted: [
            'Near-Term Upcoming Work',
            'Work in Progress',
            'Completed Work',
        ],
    });

    $scope.refresh = function() {
        tabletop.fetch();
    };

    $scope.setTaskFilter = function(filter) {
        $scope.taskFilter = filter;
    };
});

angular.module('work').directive('task', function() {
    return {
        link: function( scope, element, attrs){
            scope.task = scope[attrs['task']];
        },
        replace: true,
        restrict: 'A',
        replace: false,
        template: '<span>{{task.owner}} - {{task.work}}</span>',
    };
});
