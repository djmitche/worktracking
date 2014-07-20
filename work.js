angular.module('work', ['xc.indexedDB', 'googleApi', 'xml']);

/* configure */

angular.module('work').value('tracking_sheet_id', "1CiQAc5pGpV-sFFVP8-5dfnzvTxh-tStAbj32XqiO_Kg");

angular.module('work').config(function(googleLoginProvider) {
    googleLoginProvider.configure({
        /* XXX this clientId is for people.v.igoro.us */
        clientId: '267240285195-7bl2rd646k7vuag1h3rd6nk47dsg5df9.apps.googleusercontent.com',
        scopes: ['https://spreadsheets.google.com/feeds']
    });
})

angular.module('work').config(function ($indexedDBProvider) {
    $indexedDBProvider
      .connection('work')
      .upgradeDatabase(1, function(event, db, tx){
            db.createObjectStore('settings', {keyPath: 'setting'});
    });
});

angular.module('work').config(function($httpProvider) {
    $httpProvider.defaults.useXDomain = true;
    delete $httpProvider.defaults.headers.common['X-Requested-With'];
    // use the XML interceptor from angular-xml
    $httpProvider.interceptors.push('xmlHttpInterceptor');
});

/* utilities */

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

/* services */

angular.module('work').service('googleSheets', function($http, $q) {
    var headers = {};
    var initialized = $q.defer();

    // utilities
    var get = function(url) {
        return initialized.promise.then(function() {
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                useXDomain: true});
        });
    };

    // called when gapi.auth is ready and logged in
    this.initialize = function() {
        var tok = gapi.auth.getToken();
        headers.Authorization = tok.token_type + ' ' + tok.access_token;
        initialized.resolve();
    };

    // API methods -- all return a promise

    this.listSheets = function() {
        var p = get('https://spreadsheets.google.com/feeds/spreadsheets/private/full');
        return p.then(function (response) {
            return response.xml.find('entry').map(function (i, elt) {
                elt = angular.element(elt);
                var rv = {};
                rv.title = elt.find('title').text();
                rv.key = elt.find('id').text().split('/').reverse()[0];
                elt.find('link').each(function (i, elt) {
                    elt = angular.element(elt);
                    if (elt.attr('rel') == 'http://schemas.google.com/spreadsheets/2006#worksheetsfeed') {
                        rv['feed_url'] = elt.attr('href');
                    }
                });
                return rv;
            });
        });
    };

    this.getSheetUrlByTitle = function(title) {
        return this.listSheets().then(function (sheets) {
            var url = null;
            angular.forEach(sheets, function (sheet) {
                if (sheet.title == title) {
                    url = sheet.feed_url;
                }
            });
            return url;
        });
    };

    this.getWorksheets = function(url) {
        var p = get(url);
        return p.then(function (response) {
            console.log(response.data);
        });
    };

    this.getSheetRows = function(key) {
        var p = get('https://spreadsheets.google.com/feeds/worksheets/' + key + '/private/full');
        return p.then(function (response) {
            return response.xml.find('entry').map(function (i, elt) {
                elt = angular.element(elt);
                var rv = {};
                rv.work = elt.find('gsx:work').text();
                rv.key = elt.find('id').text().split('/').reverse()[0];
                return rv;
            });
        });
    };

    return this;
});

/* controllers */

angular.module('work').controller('WorkController',
function ($scope, $indexedDB, googleLogin, googleSheets, unique, select) {
    // tasks: rows from the sheet's with 'task.sheet' indicating the sheet
    $scope.tasks = [];
    // the set of all owners
    $scope.owners = [];
    // current filter for tasks
    $scope.taskFilter = {};

    // app status
    $scope.error = null;
    $scope.refreshing = true;
    $scope.authenticated = false;

    // fetch data from Google Sheets
    // TODO: should be a service
    var x = {
        key: 'https://docs.google.com/spreadsheets/d/1CiQAc5pGpV-sFFVP8-5dfnzvTxh-tStAbj32XqiO_Kg/pubhtml',
        callback: function(data, tabletop) {
            $scope.$apply(function() {
                $scope.refreshing = false;
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
        wait: true,
    };

    // settings handling
    // TODO: should be a service
    var settingsStore = $indexedDB.objectStore('settings');
    var getSetting = function(setting) {
        return settingsStore.find(setting).then(function(so) {
            if (so) {
                return so.value;
            }
        }, function(err) {
            return null;
        });
    };

    var setSetting = function(setting, value) {
        return settingsStore.upsert({'setting': setting, 'value': value});
    };

    $scope.refresh = function() {
        $scope.refreshing = true;
        // temp sheet
        //var sheet_id = '1CiQAc5pGpV-sFFVP8-5dfnzvTxh-tStAbj32XqiO_Kg';
        //var sheet_id = '1mgk0ExxeKN_0IwF3ZFkvv2FVevIlW-G-EsFjvZYgM30';
        googleSheets.getSheetUrlByTitle('My Spreadsheet').then(function (url) {
            console.log(url);
            googleSheets.getWorksheets(url).then(function (sheets) {
                console.log(sheets);
            }, function (err) {
                $scope.error = "ERROR: " + err.data;
            });
        });
    };

    $scope.setTaskFilter = function(filter) {
        setSetting('taskFilter', filter);
        $scope.taskFilter = filter;
    };

    // startup stuff, delayed until the controller is actually constructed
    $scope.$on('google:ready', function() {
        getSetting('taskFilter').then(function (setting) {
            $scope.taskFilter = setting;
        });

        // the promise returned here does not appear to fire, ever
        googleLogin.login();
    });

    $scope.$on('google:authenticated', function() {
        $scope.authenticated = true;
        googleSheets.initialize();
        $scope.refresh();
        $scope.$apply();
    });
});

/* directives */

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
