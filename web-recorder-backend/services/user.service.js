var _ = require('lodash');
var jwt = require('jsonwebtoken');
var bcrypt = require('bcryptjs');
var Q = require('q');
var mongo = require('mongoskin');
var webdriver = require("selenium-webdriver");
var chromeDriver = require('selenium-webdriver/chrome');
var options = new chromeDriver.Options().addArguments('headless', 'disable-gpu', 'window-size=1080, 1920');
var randomID = require('random-id');
var CronJob = require('cron').CronJob;
var Promise = require('bluebird');
var api_key = process.env.MAILGUN_API_KEY;
var domain = process.env.MAILGUN_DOMAIN;
var mailgun = require('mailgun-js')({ apiKey: api_key, domain: domain });
var RandExp = require('randexp');
var db = mongo.db(process.env.WEB_RECORDER_CONNECTION_STRING, { native_parser: true });
var websiteURL = 'http://snf-766614.vm.okeanos.grnet.gr:8080/';
db.bind('users');

var service = {};

service.authenticate = authenticate;
service.forgotPassword = forgotPassword;
service.resetPassword = resetPassword;
service.getUserById = getUserById;
service.getUserStats = getUserStats;
service.getSuitesById = getSuitesById;
service.getSuite = getSuite;
service.getSuiteNames = getSuiteNames;
service.getSuiteStats = getSuiteStats;
service.getTestsBySuite = getTestsBySuite;
service.getTestNamesBySuite = getTestNamesBySuite;
service.getTest = getTest;
service.getTestResult = getTestResult;
service.getSuiteHistory = getSuiteHistory;
service.getSuiteTestsHistory = getSuiteTestsHistory;
service.getSuiteTestHistory = getSuiteTestHistory;
service.getTestHistory = getTestHistory;
service.getTestStats = getTestStats;
service.postTests = postTests;
service.duplicate = duplicate;
service.createUser = createUser;
service.createSuite = createSuite;
service.createTest = createTest;
service.updateUser = updateUser;
service.updateUserPassword = updateUserPassword;
service.updateStepsID = updateStepsID;
service.updateTest = updateTest;
service.updateTestResult = updateTestResult;
service.updateTestSettings = updateTestSettings;
service.updateSuiteSettings = updateSuiteSettings;
service.updateSuiteHistory = updateSuiteHistory;
service.deleteTest = deleteTest;
service.deleteSuite = deleteSuite;
service.deleteSuiteHistory = deleteSuiteHistory;
service.deleteSuiteTestHistory = deleteSuiteTestHistory;
service.deleteTestHistory = deleteTestHistory;
service.deleteUser = deleteUser;

module.exports = service;

var job = new CronJob({
    cronTime: '00 00 09 * * 0-6',
    onTick: function() {
        schedule();
    },
    start: true
});

function schedule() {
    var deferred = Q.defer();

    db.users.find().toArray(function(err, users) {
        if (err) deferred.reject(err.name + ': ' + err.message);

        for (var k = 0; k < users.length; k++) {
            var suites = _.pick(users[k], 'suites').suites;
            var tests = _.pick(users[k], 'tests').tests;
            var suite_promises = [];

            for (var i = 0; i < suites.length; i++) {
                if (suites[i].schedule == "daily") {
                    var prom = new Promise((resolve, reject) => {
                        var promises = [];

                        for (var j = 0; j < tests.length; j++) {
                            if (tests[j].suiteName == suites[i].name) {
                                var promise = new Promise((resolve, reject) => {
                                    Promise.try(function() {
                                        return [users[k]._id, suites[i].name, tests[j].testName, getTestResult(users[k]._id, suites[i].name, tests[j].testName)];
                                    }).spread(function(_id, suite_name, test_name, res) {
                                        return updateTestResult(_id, suite_name, test_name, res);
                                    }).then(function(res) {
                                        resolve(res);
                                    });
                                });

                                promises.push(promise);
                            }
                        }

                        Promise.all(promises).then(function(values) {
                            return updateSuiteHistory(values[0].id, values[0].suiteName);
                        }).then(function(id) {
                            resolve(id);
                        });
                    });

                    suite_promises.push(prom);
                }
            }

            Promise.all(suite_promises).then(function(id) {
                schedule_mail(id[0]);
            });
        }
    });

    return deferred.promise;
}

function schedule_mail(_id) {
    var deferred = Q.defer();

    db.users.findById(_id, function(err, user) {
        if (err) deferred.reject(err.name + ': ' + err.message);

        if (user) {
            var suites = _.pick(user, 'suites').suites;

            for (var i = 0; i < suites.length; i++) {
                if (suites[i].schedule != "none" && suites[i].history[0].status.failed != 0) {
                    var link = websiteURL + 'dashboard/suites/' + suites[i].name + '/history/' + suites[i].history[0].id;
                    var data = {
                        from: 'Web Recorder <postmaster@' + domain + '>',
                        to: user.email,
                        subject: 'Suite "' + suites[i].name + '" Scheduled Test Failed',
                        html: '<html><p>Hello ' + user.firstName + ',</p><p>The suite "<b>' + suites[i].name + '</b>" scheduled test has failed. You can <a href="' + link + '">view the full result here</a>.</p></html>'
                    };

                    mailgun.messages().send(data, function(error, body) {
                        console.log(body);
                    });
                }
            }
        } else {
            deferred.resolve();
        }

    });

    return deferred.promise;
}

function authenticate(email, password) {
    var deferred = Q.defer();

    db.users.findOne({ email: email }, function(err, user) {
        if (err) deferred.reject(err.name + ': ' + err.message);

        if (user && bcrypt.compareSync(password, user.hash)) {
            deferred.resolve({
                _id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                token: jwt.sign({ sub: user._id }, process.env.JWT_SECRET_KEY)
            });
        } else {
            deferred.resolve();
        }
    });

    return deferred.promise;
}

function forgotPassword(email) {
    var deferred = Q.defer();

    db.users.findOne({ email: email }, function(err, user) {
        if (err) deferred.reject(err.name + ': ' + err.message);

        if (user) {
            var temp_pass = randomID(30, "aA0");
            var link = websiteURL + 'reset-password/' + temp_pass;
            var data = {
                from: 'Web Recorder <postmaster@' + domain + '>',
                to: user.email,
                subject: 'Password Reset Request',
                html: '<html><p>Hello ' + user.firstName + ',</p><p>You let us know that you need to reset your password. If you follow the link below, you\'ll be able to specify a new password.</p><br><p><a href="' + link + '">' + link + '</a></p></html>'
            };

            mailgun.messages().send(data, function(error, body) {
                console.log(body);
            });

            db.users.update({ _id: mongo.helper.toObjectID(user._id) }, { $set: { "temp_pass": temp_pass } }, function(err, doc) {
                if (err) deferred.reject(err.name + ': ' + err.message);

                deferred.resolve();
            });

        } else {
            deferred.reject('Email "' + email + '" is not used.');
        }
    });

    return deferred.promise;
}

function resetPassword(temp_pass, password) {
    var deferred = Q.defer();

    db.users.findOne({ temp_pass: temp_pass }, function(err, user) {
        if (err) deferred.reject(err.name + ': ' + err.message);

        if (user) {
            var newHash = bcrypt.hashSync(password, 10);

            db.users.update({ _id: mongo.helper.toObjectID(user._id) }, { $set: { "hash": newHash, "temp_pass": "" } }, function(err, doc) {
                if (err) deferred.reject(err.name + ': ' + err.message);

                deferred.resolve();
            });
        } else {
            deferred.reject('Temporary password is not exists.');
        }
    });

    return deferred.promise;
}

function getUserById(_id) {
    var deferred = Q.defer();

    db.users.findById(_id, function(err, user) {
        if (err) deferred.reject(err.name + ': ' + err.message);

        if (user) {
            deferred.resolve(_.omit(user, 'hash'));
        } else {
            deferred.resolve();
        }
    });

    return deferred.promise;
}

function getUserStats(_id) {
    var deferred = Q.defer();

    db.users.findById(_id, function(err, user) {
        if (err) deferred.reject(err.name + ': ' + err.message);

        if (user) {
            var suites_length = _.pick(user, 'suites').suites.length;
            var tests = _.pick(user, 'tests').tests;
            var passing = 0;
            var failing = 0;
            var not_tested = 0;
            var last_week_passed = 0;
            var week_runs = 0;
            var all_time_passed = 0;
            var all_time_runs = 0;
            var dt = new Date();
            var tdt = new Date(dt.valueOf());
            var dayn = (dt.getDay() + 6) % 7;
            tdt.setDate(tdt.getDate() - dayn + 3);
            var firstThursday = tdt.valueOf();
            tdt.setMonth(0, 1);
            if (tdt.getDay() !== 4) tdt.setMonth(0, 1 + ((4 - tdt.getDay()) + 7) % 7);
            var week = 1 + Math.ceil((firstThursday - tdt) / 604800000);

            for (var i = 0; i < tests.length; i++) {
                if (tests[i].status == "PASSED") passing++;
                else if (tests[i].status == "FAILED") failing++;
                else not_tested++;

                for (var j = 0; j < tests[i].history.length; j++) {
                    if (tests[i].history[j].status == "PASSED") all_time_passed++;

                    if (tests[i].history[j].week == week - 1) {
                        if (tests[i].history[j].status == "PASSED") last_week_passed++;
                        week_runs++;
                    }
                }

                all_time_runs += tests[i].history.length;
            }

            var set = {
                "suites": suites_length,
                "tests": tests.length,
                "passing": passing,
                "failing": failing,
                "not_tested": not_tested,
                "last_week_passed": last_week_passed,
                "week_runs": week_runs,
                "all_time_passed": all_time_passed,
                "all_time_runs": all_time_runs
            };

            deferred.resolve(set);
        } else {
            deferred.resolve();
        }
    });

    return deferred.promise;
}

function getSuitesById(_id) {
    var deferred = Q.defer();

    db.users.findById(_id, function(err, user) {
        if (err) deferred.reject(err.name + ': ' + err.message);

        if (user) {
            var suites = _.pick(user, 'suites').suites;
            var tests = _.pick(user, 'tests').tests;

            for (var i = 0; i < suites.length; i++) {
                suites[i].passed = 0;
                suites[i].failed = 0;
                suites[i].not_tested = 0;

                for (var j = 0; j < tests.length; j++) {
                    if (tests[j].suiteName == suites[i].name) {
                        if (tests[j].status == "PASSED") suites[i].passed++;
                        else if (tests[j].status == "FAILED") suites[i].failed++;
                        else suites[i].not_tested++;
                    }
                }
            }

            deferred.resolve(suites);
        } else {
            deferred.resolve();
        }
    });

    return deferred.promise;
}

function getSuite(_id, suite_name) {
    var deferred = Q.defer();

    db.users.findById(_id, function(err, user) {
        if (err) deferred.reject(err.name + ': ' + err.message);

        if (user) {
            var suites = _.pick(user, 'suites').suites;

            for (var i = 0; i < suites.length; i++) {
                if (suites[i].name == suite_name) {
                    deferred.resolve(suites[i]);
                    break;
                }
            }
        } else {
            deferred.resolve();
        }
    });

    return deferred.promise;
}

function getSuiteNames(_id) {
    var deferred = Q.defer();

    db.users.findById(_id, function(err, user) {
        if (err) deferred.reject(err.name + ': ' + err.message);

        if (user) {
            names = _.map(_.pick(user, 'suites').suites, function(suite) {
                return suite.name;
            });

            deferred.resolve(names);
        } else {
            deferred.resolve();
        }
    });

    return deferred.promise;
}

function getSuiteStats(_id, suite_name) {
    var deferred = Q.defer();

    db.users.findById(_id, function(err, user) {
        if (err) deferred.reject(err.name + ': ' + err.message);

        if (user) {
            var tests = _.pick(user, 'tests').tests;
            var set = {
                "latest_passed": 0,
                "last_week_passed": 0,
                "all_time_passed": 0,
                "tests_number": 0,
                "week_runs": 0,
                "all_time_runs": 0
            }

            for (var i = 0; i < tests.length; i++) {
                if (tests[i].suiteName == suite_name) {
                    if (tests[i].history.length !== 0) {
                        var dt = new Date();
                        var tdt = new Date(dt.valueOf());
                        var dayn = (dt.getDay() + 6) % 7;
                        tdt.setDate(tdt.getDate() - dayn + 3);
                        var firstThursday = tdt.valueOf();
                        tdt.setMonth(0, 1);
                        if (tdt.getDay() !== 4) tdt.setMonth(0, 1 + ((4 - tdt.getDay()) + 7) % 7);
                        var week = 1 + Math.ceil((firstThursday - tdt) / 604800000);

                        for (var j = 0; j < tests[i].history.length; j++) {
                            if (tests[i].history[j].week == week - 1) {
                                if (tests[i].history[j].status == "PASSED") set.last_week_passed++;

                                set.week_runs++;
                            }

                            if (tests[i].history[j].status == "PASSED") set.all_time_passed++;
                        }

                        set.all_time_runs += tests[i].history.length;

                        if (tests[i].history[0].status == "PASSED") set.latest_passed++;
                    }

                    set.tests_number++;
                }
            }

            deferred.resolve(set);
        } else {
            deferred.resolve();
        }
    });

    return deferred.promise;
}

function getTestsBySuite(_id, suite_name) {
    var deferred = Q.defer();

    db.users.findById(_id, function(err, user) {
        if (err) deferred.reject(err.name + ': ' + err.message);

        if (user) {
            var tests = _.pick(user, 'tests').tests;
            var selectedTests = [];

            for (var i = 0; i < tests.length; i++) {
                if (tests[i].suiteName == suite_name) {
                    selectedTests.push(tests[i]);
                }
            }

            deferred.resolve(selectedTests);
        } else {
            deferred.resolve();
        }
    });

    return deferred.promise;
}

function getTestNamesBySuite(_id, suite_name) {
    var deferred = Q.defer();

    db.users.findById(_id, function(err, user) {
        if (err) deferred.reject(err.name + ': ' + err.message);

        if (user) {
            var tests = _.pick(user, 'tests').tests;
            var selectedTests = [];

            for (var i = 0; i < tests.length; i++) {
                if (tests[i].suiteName == suite_name) {
                    selectedTests.push(tests[i].testName);
                }
            }

            deferred.resolve(selectedTests);
        } else {
            deferred.resolve();
        }
    });

    return deferred.promise;
}

function getTest(_id, suite_name, test_name) {
    var deferred = Q.defer();

    db.users.findById(_id, function(err, user) {
        if (err) deferred.reject(err.name + ': ' + err.message);

        if (user) {
            var tests = _.pick(user, 'tests').tests;
            var selectedtest = [];

            for (var i = 0; i < tests.length; i++) {
                if (tests[i].testName == test_name && tests[i].suiteName == suite_name) {
                    selectedTest = tests[i];
                    break;
                }
            }

            try {
                selectedTest = JSON.parse(selectedTest);
            } catch (e) {
                selectedTest = selectedTest;
            }

            deferred.resolve(selectedTest);
        } else {
            deferred.resolve();
        }
    });

    return deferred.promise;
}

function getSuiteHistory(_id, suite_name) {
    var deferred = Q.defer();

    db.users.findById(_id, function(err, user) {
        if (err) deferred.reject(err.name + ': ' + err.message);

        if (user) {
            var suites = _.pick(user, 'suites').suites;

            for (var i = 0; i < suites.length; i++) {
                if (suites[i].name == suite_name) {
                    deferred.resolve(suites[i].history);
                    break;
                }
            }

        } else {
            deferred.resolve();
        }
    });

    return deferred.promise;
}

function getSuiteTestsHistory(_id, suite_name, history_id) {
    var deferred = Q.defer();

    db.users.findById(_id, function(err, user) {
        if (err) deferred.reject(err.name + ': ' + err.message);

        if (user) {
            var suites = _.pick(user, 'suites').suites;

            for (var i = 0; i < suites.length; i++) {
                if (suites[i].name == suite_name) {
                    for (j = 0; j < suites[i].history.length; j++) {
                        if (suites[i].history[j].id == history_id) {
                            deferred.resolve(suites[i].history[j]);
                            break;
                        }
                    }
                }
            }

        } else {
            deferred.resolve();
        }

    });

    return deferred.promise;
}

function getTestHistory(_id, suite_name, test_name, history_id) {
    var deferred = Q.defer();

    db.users.findById(_id, function(err, user) {
        if (err) deferred.reject(err.name + ': ' + err.message);

        if (user) {
            var tests = _.pick(user, 'tests').tests;

            for (var i = 0; i < tests.length; i++) {
                if (tests[i].suiteName == suite_name && tests[i].testName == test_name) {
                    for (j = 0; j < tests[i].history.length; j++) {
                        if (tests[i].history[j].id == history_id) {
                            deferred.resolve(tests[i].history[j]);
                            break;
                        }
                    }
                }
            }

        } else {
            deferred.resolve();
        }
    });

    return deferred.promise;
}

function getSuiteTestHistory(_id, suite_name, history_id, test_name) {
    var deferred = Q.defer();

    db.users.findById(_id, function(err, user) {
        if (err) deferred.reject(err.name + ': ' + err.message);

        if (user) {
            var suites = _.pick(user, 'suites').suites;

            for (var i = 0; i < suites.length; i++) {
                if (suites[i].name == suite_name) {
                    for (j = 0; j < suites[i].history.length; j++) {
                        if (suites[i].history[j].id == history_id) {
                            for (k = 0; k < suites[i].history[j].tests.length; k++) {
                                if (suites[i].history[j].tests[k].testName == test_name) {
                                    deferred.resolve(suites[i].history[j].tests[k]);
                                    break;
                                }
                            }
                        }
                    }
                }
            }

        } else {
            deferred.resolve();
        }

    });

    return deferred.promise;
}

function getTestStats(_id, suite_name, test_name) {
    var deferred = Q.defer();

    db.users.findById(_id, function(err, user) {
        if (err) deferred.reject(err.name + ': ' + err.message);

        if (user) {
            var tests = _.pick(user, 'tests').tests;
            var set = {
                "latest_result": "",
                "last_week_passed": 0,
                "all_time_passed": 0,
                "week_runs": 0,
                "all_time_runs": 0
            }

            for (var i = 0; i < tests.length; i++) {
                if (tests[i].suiteName == suite_name && tests[i].testName == test_name) {
                    if (tests[i].history.length !== 0) {
                        var dt = new Date();
                        var tdt = new Date(dt.valueOf());
                        var dayn = (dt.getDay() + 6) % 7;
                        tdt.setDate(tdt.getDate() - dayn + 3);
                        var firstThursday = tdt.valueOf();
                        tdt.setMonth(0, 1);
                        if (tdt.getDay() !== 4) tdt.setMonth(0, 1 + ((4 - tdt.getDay()) + 7) % 7);
                        var week = 1 + Math.ceil((firstThursday - tdt) / 604800000);

                        for (var j = 0; j < tests[i].history.length; j++) {
                            if (tests[i].history[j].week == week - 1) {
                                if (tests[i].history[j].status == "PASSED") set.last_week_passed++;

                                set.week_runs++;
                            }

                            if (tests[i].history[j].status == "PASSED") set.all_time_passed++;
                        }

                        set.all_time_runs = tests[i].history.length;
                    }

                    set.latest_result = tests[i].status;

                    break;
                }
            }

            deferred.resolve(set);

        } else {
            deferred.resolve();
        }
    });

    return deferred.promise;
}

function getTestResult(_id, suite_name, test_name) {
    var deferred = Q.defer();

    db.users.findById(_id, function(err, user) {
        if (err) deferred.reject(err.name + ': ' + err.message);

        if (user) {
            var tests = _.pick(user, 'tests').tests;
            var selectedTest;
            var By = webdriver.By;
            var until = webdriver.until;
            var driver;
            var resArray = [];

            for (var i = 0; i < tests.length; i++) {
                if (tests[i].testName == test_name && tests[i].suiteName == suite_name) {
                    selectedTest = tests[i].testObject;

                    if (tests[i].preconditions.length != 0) {
                        for (var j = tests[i].preconditions.length - 1; j >= 0; j--) {
                            for (var k = 0; k < tests.length; k++) {
                                if (tests[k].testName == tests[i].preconditions[j].testName && tests[k].suiteName == tests[i].preconditions[j].suiteName) {
                                    for (var l = tests[k].testObject.length - 1; l >= 0; l--) {
                                        selectedTest.unshift(tests[k].testObject[l]);
                                    }
                                }
                            }
                        }
                    }

                    if (tests[i].postconditions.length != 0) {
                        for (var m = 0; m < tests[i].postconditions.length; m++) {
                            for (var n = 0; n < tests.length; n++) {
                                if (tests[n].testName == tests[i].postconditions[m].testName && tests[n].suiteName == tests[i].postconditions[m].suiteName) {
                                    for (var p = 0; p < tests[n].testObject.length; p++) {
                                        selectedTest.push(tests[n].testObject[p]);
                                    }
                                }
                            }
                        }
                    }

                    break;
                }
            }

            try {
                selectedTest = JSON.parse(selectedTest);
            } catch (e) {
                selectedTest = selectedTest;
            }

            var driver = new webdriver.Builder().forBrowser("chrome").setChromeOptions(options).build();

            var result = webdriver.promise.consume(function*() {
                for (var i = 0; i < selectedTest.length; i++) {
                    webdriver.promise.consume(function*() {
                        return selenium(selectedTest[i], driver, until, By, webdriver);
                    }).then((res) => { resArray.push(res) });
                }

                driver.quit();
            });

            result.then(_ => deferred.resolve(resArray), e => deferred.resolve('FAILURE: ' + e));

        } else {
            deferred.resolve();
        }
    });

    return deferred.promise;
}

function selenium(object, driver, until, By, webdriver) {
    var deferred = Q.defer();
    var timeout = 8000;
    var sleeping = 250;

    if (object.type == "get") {
        driver.sleep(sleeping);

        driver.get(object.URL)
            .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
            .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'URL NOT FOUND' }) });
    } else if (object.type == "refresh") {
        driver.sleep(sleeping);

        driver.get(driver.getCurrentUrl())
            .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
            .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'URL NOT FOUND' }) });
    } else if (object.type == "pause") {
        driver.sleep(sleeping);

        driver.sleep(object.input)
            .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
            .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'TEST EXECUTION COULD NOT BE PAUSED' }) });
    } else if (object.type == "present") {
        driver.sleep(sleeping);

        if (object.identifier === "id")
            driver.wait(until.elementLocated({ id: object.id }), timeout)
            .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
            .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT IS NOT PRESENT' }) });
        else if (object.identifier === "name")
            driver.wait(until.elementLocated({ name: object.id }), timeout)
            .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
            .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT IS NOT PRESENT' }) });
        else if (object.identifier === "linkText")
            driver.wait(until.elementLocated({ linkText: object.id }), timeout)
            .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
            .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT IS NOT PRESENT' }) });
        else if (object.identifier === "className")
            driver.wait(until.elementLocated({ className: object.id }), timeout)
            .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
            .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT IS NOT PRESENT' }) });
        else if (object.identifier === "xpath")
            driver.wait(until.elementLocated({ xpath: object.id }), timeout)
            .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
            .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT IS NOT PRESENT' }) });
        else if (object.identifier === "css")
            driver.wait(until.elementLocated({ css: object.id }), timeout)
            .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
            .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT IS NOT PRESENT' }) });
    } else if (object.type == "not-present") {
        driver.sleep(sleeping);

        if (object.identifier === "id")
            driver.wait(until.elementLocated({ id: object.id }), timeout)
            .then(() => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT IS PRESENT' }) })
            .catch((e) => { deferred.resolve({ 'result': 'OK', 'error': '' }) });
        else if (object.identifier === "name")
            driver.wait(until.elementLocated({ name: object.id }), timeout)
            .then(() => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT IS PRESENT' }) })
            .catch((e) => { deferred.resolve({ 'result': 'OK', 'error': '' }) });
        else if (object.identifier === "linkText")
            driver.wait(until.elementLocated({ linkText: object.id }), timeout)
            .then(() => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT IS PRESENT' }) })
            .catch((e) => { deferred.resolve({ 'result': 'OK', 'error': '' }) });
        else if (object.identifier === "className")
            driver.wait(until.elementLocated({ className: object.id }), timeout)
            .then(() => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT IS PRESENT' }) })
            .catch((e) => { deferred.resolve({ 'result': 'OK', 'error': '' }) });
        else if (object.identifier === "xpath")
            driver.wait(until.elementLocated({ xpath: object.id }), timeout)
            .then(() => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT IS PRESENT' }) })
            .catch((e) => { deferred.resolve({ 'result': 'OK', 'error': '' }) });
        else if (object.identifier === "css")
            driver.wait(until.elementLocated({ css: object.id }), timeout)
            .then(() => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT IS PRESENT' }) })
            .catch((e) => { deferred.resolve({ 'result': 'OK', 'error': '' }) });
    } else {
        if (object.identifier === "id")
            driver.wait(until.elementLocated({ id: object.id }), timeout)
            .then(() => { targeting() })
            .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT NOT FOUND' }) });
        else if (object.identifier === "name")
            driver.wait(until.elementLocated({ name: object.id }), timeout)
            .then(() => { targeting() })
            .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT NOT FOUND' }) });
        else if (object.identifier === "linkText")
            driver.wait(until.elementLocated({ linkText: object.id }), timeout)
            .then(() => { targeting() })
            .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT NOT FOUND' }) });
        else if (object.identifier === "className")
            driver.wait(until.elementLocated({ className: object.id }), timeout)
            .then(() => { targeting() })
            .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT NOT FOUND' }) });
        else if (object.identifier === "xpath")
            driver.wait(until.elementLocated({ xpath: object.id }), timeout)
            .then(() => { targeting() })
            .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT NOT FOUND' }) });
        else if (object.identifier === "css")
            driver.wait(until.elementLocated({ css: object.id }), timeout)
            .then(() => { targeting() })
            .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT NOT FOUND' }) });
    }

    function targeting() {
        driver.sleep(sleeping);

        if (object.type === "click") {
            if (object.identifier === "id")
                driver.actions().mouseMove(driver.findElement(By.id(object.id))).click().perform()
                .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT NOT CLICKABLE' }) });
            else if (object.identifier === "name")
                driver.actions().mouseMove(driver.findElement(By.name(object.id))).click().perform()
                .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT NOT CLICKABLE' }) });
            else if (object.identifier === "linkText")
                driver.actions().mouseMove(driver.findElement(By.linkText(object.id))).click().perform()
                .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT NOT CLICKABLE' }) });
            else if (object.identifier === "className")
                driver.actions().mouseMove(driver.findElement(By.className(object.id))).click().perform()
                .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT NOT CLICKABLE' }) });
            else if (object.identifier === "xpath")
                driver.actions().mouseMove(driver.findElement(By.xpath(object.id))).click().perform()
                .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT NOT CLICKABLE' }) });
            else if (object.identifier === "css")
                driver.actions().mouseMove(driver.findElement(By.css(object.id))).click().perform()
                .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT NOT CLICKABLE' }) });
        } else if (object.type === "db-click") {
            if (object.identifier === "id")
                driver.actions().mouseMove(driver.findElement(By.id(object.id))).doubleClick().perform()
                .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT NOT CLICKABLE' }) });
            else if (object.identifier === "name")
                driver.actions().mouseMove(driver.findElement(By.name(object.id))).doubleClick().perform()
                .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT NOT CLICKABLE' }) });
            else if (object.identifier === "linkText")
                driver.actions().mouseMove(driver.findElement(By.linkText(object.id))).doubleClick().perform()
                .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT NOT CLICKABLE' }) });
            else if (object.identifier === "className")
                driver.actions().mouseMove(driver.findElement(By.className(object.id))).doubleClick().perform()
                .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT NOT CLICKABLE' }) });
            else if (object.identifier === "xpath")
                driver.actions().mouseMove(driver.findElement(By.xpath(object.id))).doubleClick().perform()
                .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT NOT CLICKABLE' }) });
            else if (object.identifier === "css")
                driver.actions().mouseMove(driver.findElement(By.css(object.id))).doubleClick().perform()
                .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT NOT CLICKABLE' }) });
        } else if (object.type == "right-click") {
            if (object.identifier === "id")
                driver.actions().mouseMove(driver.findElement(By.id(object.id))).click(webdriver.Button.RIGHT).perform()
                .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT NOT CLICKABLE' }) });
            else if (object.identifier === "name")
                driver.actions().mouseMove(driver.findElement(By.name(object.id))).click(webdriver.Button.RIGHT).perform()
                .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT NOT CLICKABLE' }) });
            else if (object.identifier === "linkText")
                driver.actions().mouseMove(driver.findElement(By.linkText(object.id))).click(webdriver.Button.RIGHT).perform()
                .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT NOT CLICKABLE' }) });
            else if (object.identifier === "className")
                driver.actions().mouseMove(driver.findElement(By.className(object.id))).click(webdriver.Button.RIGHT).perform()
                .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT NOT CLICKABLE' }) });
            else if (object.identifier === "xpath")
                driver.actions().mouseMove(driver.findElement(By.xpath(object.id))).click(webdriver.Button.RIGHT).perform()
                .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT NOT CLICKABLE' }) });
            else if (object.identifier === "css")
                driver.actions().mouseMove(driver.findElement(By.css(object.id))).click(webdriver.Button.RIGHT).perform()
                .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT NOT CLICKABLE' }) });
        } else if (object.type === "mouse-over") {
            if (object.identifier === "id")
                driver.actions().mouseMove(driver.findElement(By.id(object.id))).perform()
                .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'CAN NOT MOVE OVER THIS ELEMENT' }) });
            else if (object.identifier === "name")
                driver.actions().mouseMove(driver.findElement(By.name(object.id))).perform()
                .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'CAN NOT MOVE OVER THIS ELEMENT' }) });
            else if (object.identifier === "linkText")
                driver.actions().mouseMove(driver.findElement(By.linkText(object.id))).perform()
                .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'CAN NOT MOVE OVER THIS ELEMENT' }) });
            else if (object.identifier === "className")
                driver.actions().mouseMove(driver.findElement(By.className(object.id))).perform()
                .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'CAN NOT MOVE OVER THIS ELEMENT' }) });
            else if (object.identifier === "xpath")
                driver.actions().mouseMove(driver.findElement(By.xpath(object.id))).perform()
                .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'CAN NOT MOVE OVER THIS ELEMENT' }) });
            else if (object.identifier === "css")
                driver.actions().mouseMove(driver.findElement(By.css(object.id))).perform()
                .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'CAN NOT MOVE OVER THIS ELEMENT' }) });
        } else if (object.type === "change") {
            if (object.inputType == "regex") {
                object.input = new RandExp(object.regex).gen();
            } else if (object.inputType == "int_range") {
                var minimum = Math.ceil(object.from);
                var maximum = Math.floor(object.to);

                object.input = Math.floor(Math.random() * (maximum - minimum + 1) + minimum);
            } else if (object.inputType == "num_range") {
                object.input = (Math.random() * (object.to - object.from)) + Number(object.from);
            }

            if (object.identifier === "id") {
                driver.findElement(By.id(object.id)).clear().catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT CANNOT BE CLEARED' }) });
                driver.findElement(By.id(object.id)).sendKeys(object.input)
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '', 'input': object.input }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT CANNOT BE ASSIGNED', 'input': object.input }) });
            } else if (object.identifier === "name") {
                driver.findElement(By.name(object.id)).clear().catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT CANNOT BE CLEARED' }) });
                driver.findElement(By.name(object.id)).sendKeys(object.input)
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '', 'input': object.input }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT CANNOT BE ASSIGNED', 'input': object.input }) });
            } else if (object.identifier === "linkText") {
                driver.findElement(By.linkText(object.id)).clear().catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT CANNOT BE CLEARED' }) });
                driver.findElement(By.linkText(object.id)).sendKeys(object.input)
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '', 'input': object.input }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT CANNOT BE ASSIGNED', 'input': object.input }) });
            } else if (object.identifier === "className") {
                driver.findElement(By.className(object.id)).clear().catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT CANNOT BE CLEARED' }) });
                driver.findElement(By.className(object.id)).sendKeys(object.input)
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '', 'input': object.input }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT CANNOT BE ASSIGNED', 'input': object.input }) });
            } else if (object.identifier === "xpath") {
                driver.findElement(By.xpath(object.id)).clear().catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT CANNOT BE CLEARED' }) });
                driver.findElement(By.xpath(object.id)).sendKeys(object.input)
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '', 'input': object.input }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT CANNOT BE ASSIGNED', 'input': object.input }) });
            } else if (object.identifier === "css") {
                driver.findElement(By.css(object.id)).clear().catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT CANNOT BE CLEARED' }) });
                driver.findElement(By.css(object.id)).sendKeys(object.input)
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '', 'input': object.input }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT CANNOT BE ASSIGNED', 'input': object.input }) });
            }
        } else if (object.type == "select") {
            if (object.identifier === "id") {
                driver.actions().mouseMove(driver.findElement(By.id(object.id))).click().sendKeys(object.input).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT CANNOT BE SELECTED' }) });
            } else if (object.identifier === "name") {
                driver.actions().mouseMove(driver.findElement(By.name(object.id))).click().sendKeys(object.input).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT CANNOT BE SELECTED' }) });
            } else if (object.identifier === "linkText") {
                driver.actions().mouseMove(driver.findElement(By.linkText(object.id))).click().sendKeys(object.input).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT CANNOT BE SELECTED' }) });
            } else if (object.identifier === "className") {
                driver.actions().mouseMove(driver.findElement(By.className(object.id))).click().sendKeys(object.input).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT CANNOT BE SELECTED' }) });
            } else if (object.identifier === "xpath") {
                driver.actions().mouseMove(driver.findElement(By.xpath(object.id))).click().sendKeys(object.input).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT CANNOT BE SELECTED' }) });
            } else if (object.identifier === "css") {
                driver.actions().mouseMove(driver.findElement(By.css(object.id))).click().sendKeys(object.input).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT CANNOT BE SELECTED' }) });
            }
        } else if (object.type == "keypress") {
            if (object.identifier === "id") {
                if (object.input == "backspace")
                    driver.actions().mouseMove(driver.findElement(By.id(object.id))).sendKeys(webdriver.Key.BACK_SPACE).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'BACKSPACE CAN NOT BE PRESSED IN THIS ELEMENT' }) });
                else if (object.input == "enter")
                    driver.actions().mouseMove(driver.findElement(By.id(object.id))).sendKeys(webdriver.Key.ENTER).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ENTER CAN NOT BE PRESSED IN THIS ELEMENT' }) });
                else if (object.input == "escape")
                    driver.actions().mouseMove(driver.findElement(By.id(object.id))).sendKeys(webdriver.Key.ESCAPE).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ESCAPE CAN NOT BE PRESSED IN THIS ELEMENT' }) });
                else if (object.input == "tab")
                    driver.actions().mouseMove(driver.findElement(By.id(object.id))).sendKeys(webdriver.Key.TAB).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'TAB CAN NOT BE PRESSED IN THIS ELEMENT' }) });
                else if (object.input == "up")
                    driver.actions().mouseMove(driver.findElement(By.id(object.id))).sendKeys(webdriver.Key.UP).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'UP ARROW CAN NOT BE PRESSED IN THIS ELEMENT' }) });
                else if (object.input == "down")
                    driver.actions().mouseMove(driver.findElement(By.id(object.id))).sendKeys(webdriver.Key.DOWN).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'DOWN ARROW CAN NOT BE PRESSED IN THIS ELEMENT' }) });
                else if (object.input == "left")
                    driver.actions().mouseMove(driver.findElement(By.id(object.id))).sendKeys(webdriver.Key.LEFT).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'LEFT ARROW CAN NOT BE PRESSED IN THIS ELEMENT' }) });
                else if (object.input == "right")
                    driver.actions().mouseMove(driver.findElement(By.id(object.id))).sendKeys(webdriver.Key.RIGHT).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'RIGHT ARROW CAN NOT BE PRESSED IN THIS ELEMENT' }) });
            } else if (object.identifier === "name") {
                if (object.input == "backspace")
                    driver.actions().mouseMove(driver.findElement(By.name(object.id))).sendKeys(webdriver.Key.BACK_SPACE).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'BACKSPACE CAN NOT BE PRESSED IN THIS ELEMENT' }) });
                else if (object.input == "enter") {
                    driver.actions().mouseMove(driver.findElement(By.name(object.id))).sendKeys(webdriver.Key.ENTER).perform()
                        .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                        .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ENTER CAN NOT BE PRESSED IN THIS ELEMENT' }) });
                } else if (object.input == "escape")
                    driver.actions().mouseMove(driver.findElement(By.name(object.id))).sendKeys(webdriver.Key.ESCAPE).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ESCAPE CAN NOT BE PRESSED IN THIS ELEMENT' }) });
                else if (object.input == "tab")
                    driver.actions().mouseMove(driver.findElement(By.name(object.id))).sendKeys(webdriver.Key.TAB).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'TAB CAN NOT BE PRESSED IN THIS ELEMENT' }) });
                else if (object.input == "up")
                    driver.actions().mouseMove(driver.findElement(By.name(object.id))).sendKeys(webdriver.Key.UP).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'UP ARROW CAN NOT BE PRESSED IN THIS ELEMENT' }) });
                else if (object.input == "down")
                    driver.actions().mouseMove(driver.findElement(By.name(object.id))).sendKeys(webdriver.Key.DOWN).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'DOWN ARROW CAN NOT BE PRESSED IN THIS ELEMENT' }) });
                else if (object.input == "left")
                    driver.actions().mouseMove(driver.findElement(By.name(object.id))).sendKeys(webdriver.Key.LEFT).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'LEFT ARROW CAN NOT BE PRESSED IN THIS ELEMENT' }) });
                else if (object.input == "right")
                    driver.actions().mouseMove(driver.findElement(By.name(object.id))).sendKeys(webdriver.Key.RIGHT).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'RIGHT ARROW CAN NOT BE PRESSED IN THIS ELEMENT' }) });
            } else if (object.identifier === "linkText") {
                if (object.input == "backspace")
                    driver.actions().mouseMove(driver.findElement(By.linkText(object.id))).sendKeys(webdriver.Key.BACK_SPACE).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'BACKSPACE CAN NOT BE PRESSED IN THIS ELEMENT' }) });
                else if (object.input == "enter")
                    driver.actions().mouseMove(driver.findElement(By.linkText(object.id))).sendKeys(webdriver.Key.ENTER).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ENTER CAN NOT BE PRESSED IN THIS ELEMENT' }) });
                else if (object.input == "escape")
                    driver.actions().mouseMove(driver.findElement(By.linkText(object.id))).sendKeys(webdriver.Key.ESCAPE).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ESCAPE CAN NOT BE PRESSED IN THIS ELEMENT' }) });
                else if (object.input == "tab")
                    driver.actions().mouseMove(driver.findElement(By.linkText(object.id))).sendKeys(webdriver.Key.TAB).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'TAB CAN NOT BE PRESSED IN THIS ELEMENT' }) });
                else if (object.input == "up")
                    driver.actions().mouseMove(driver.findElement(By.linkText(object.id))).sendKeys(webdriver.Key.UP).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'UP ARROW CAN NOT BE PRESSED IN THIS ELEMENT' }) });
                else if (object.input == "down")
                    driver.actions().mouseMove(driver.findElement(By.linkText(object.id))).sendKeys(webdriver.Key.DOWN).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'DOWN ARROW CAN NOT BE PRESSED IN THIS ELEMENT' }) });
                else if (object.input == "left")
                    driver.actions().mouseMove(driver.findElement(By.linkText(object.id))).sendKeys(webdriver.Key.LEFT).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'LEFT ARROW CAN NOT BE PRESSED IN THIS ELEMENT' }) });
                else if (object.input == "right")
                    driver.actions().mouseMove(driver.findElement(By.linkText(object.id))).sendKeys(webdriver.Key.RIGHT).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'RIGHT ARROW CAN NOT BE PRESSED IN THIS ELEMENT' }) });
            } else if (object.identifier === "className") {
                if (object.input == "backspace")
                    driver.actions().mouseMove(driver.findElement(By.className(object.id))).sendKeys(webdriver.Key.BACK_SPACE).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'BACKSPACE CAN NOT BE PRESSED IN THIS ELEMENT' }) });
                else if (object.input == "enter")
                    driver.actions().mouseMove(driver.findElement(By.className(object.id))).sendKeys(webdriver.Key.ENTER).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ENTER CAN NOT BE PRESSED IN THIS ELEMENT' }) });
                else if (object.input == "escape")
                    driver.actions().mouseMove(driver.findElement(By.className(object.id))).sendKeys(webdriver.Key.ESCAPE).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ESCAPE CAN NOT BE PRESSED IN THIS ELEMENT' }) });
                else if (object.input == "tab")
                    driver.actions().mouseMove(driver.findElement(By.className(object.id))).sendKeys(webdriver.Key.TAB).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'TAB CAN NOT BE PRESSED IN THIS ELEMENT' }) });
                else if (object.input == "up")
                    driver.actions().mouseMove(driver.findElement(By.className(object.id))).sendKeys(webdriver.Key.UP).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'UP ARROW CAN NOT BE PRESSED IN THIS ELEMENT' }) });
                else if (object.input == "down")
                    driver.actions().mouseMove(driver.findElement(By.className(object.id))).sendKeys(webdriver.Key.DOWN).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'DOWN ARROW CAN NOT BE PRESSED IN THIS ELEMENT' }) });
                else if (object.input == "left")
                    driver.actions().mouseMove(driver.findElement(By.className(object.id))).sendKeys(webdriver.Key.LEFT).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'LEFT ARROW CAN NOT BE PRESSED IN THIS ELEMENT' }) });
                else if (object.input == "right")
                    driver.actions().mouseMove(driver.findElement(By.className(object.id))).sendKeys(webdriver.Key.RIGHT).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'RIGHT ARROW CAN NOT BE PRESSED IN THIS ELEMENT' }) });
            } else if (object.identifier === "xpath") {
                if (object.input == "backspace")
                    driver.actions().mouseMove(driver.findElement(By.xpath(object.id))).sendKeys(webdriver.Key.BACK_SPACE).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'BACKSPACE CAN NOT BE PRESSED IN THIS ELEMENT' }) });
                else if (object.input == "enter")
                    driver.actions().mouseMove(driver.findElement(By.xpath(object.id))).sendKeys(webdriver.Key.ENTER).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ENTER CAN NOT BE PRESSED IN THIS ELEMENT' }) });
                else if (object.input == "escape")
                    driver.actions().mouseMove(driver.findElement(By.xpath(object.id))).sendKeys(webdriver.Key.ESCAPE).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ESCAPE CAN NOT BE PRESSED IN THIS ELEMENT' }) });
                else if (object.input == "tab")
                    driver.actions().mouseMove(driver.findElement(By.xpath(object.id))).sendKeys(webdriver.Key.TAB).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'TAB CAN NOT BE PRESSED IN THIS ELEMENT' }) });
                else if (object.input == "up")
                    driver.actions().mouseMove(driver.findElement(By.xpath(object.id))).sendKeys(webdriver.Key.UP).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'UP ARROW CAN NOT BE PRESSED IN THIS ELEMENT' }) });
                else if (object.input == "down")
                    driver.actions().mouseMove(driver.findElement(By.xpath(object.id))).sendKeys(webdriver.Key.DOWN).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'DOWN ARROW CAN NOT BE PRESSED IN THIS ELEMENT' }) });
                else if (object.input == "left")
                    driver.actions().mouseMove(driver.findElement(By.xpath(object.id))).sendKeys(webdriver.Key.LEFT).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'LEFT ARROW CAN NOT BE PRESSED IN THIS ELEMENT' }) });
                else if (object.input == "right")
                    driver.actions().mouseMove(driver.findElement(By.xpath(object.id))).sendKeys(webdriver.Key.RIGHT).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'RIGHT ARROW CAN NOT BE PRESSED IN THIS ELEMENT' }) });
            } else if (object.identifier === "css") {
                if (object.input == "backspace")
                    driver.actions().mouseMove(driver.findElement(By.css(object.id))).sendKeys(webdriver.Key.BACK_SPACE).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'BACKSPACE CAN NOT BE PRESSED IN THIS ELEMENT' }) });
                else if (object.input == "enter")
                    driver.actions().mouseMove(driver.findElement(By.css(object.id))).sendKeys(webdriver.Key.ENTER).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ENTER CAN NOT BE PRESSED IN THIS ELEMENT' }) });
                else if (object.input == "escape")
                    driver.actions().mouseMove(driver.findElement(By.css(object.id))).sendKeys(webdriver.Key.ESCAPE).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ESCAPE CAN NOT BE PRESSED IN THIS ELEMENT' }) });
                else if (object.input == "tab")
                    driver.actions().mouseMove(driver.findElement(By.css(object.id))).sendKeys(webdriver.Key.TAB).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'TAB CAN NOT BE PRESSED IN THIS ELEMENT' }) });
                else if (object.input == "up")
                    driver.actions().mouseMove(driver.findElement(By.css(object.id))).sendKeys(webdriver.Key.UP).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'UP ARROW CAN NOT BE PRESSED IN THIS ELEMENT' }) });
                else if (object.input == "down")
                    driver.actions().mouseMove(driver.findElement(By.css(object.id))).sendKeys(webdriver.Key.DOWN).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'DOWN ARROW CAN NOT BE PRESSED IN THIS ELEMENT' }) });
                else if (object.input == "left")
                    driver.actions().mouseMove(driver.findElement(By.css(object.id))).sendKeys(webdriver.Key.LEFT).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'LEFT ARROW CAN NOT BE PRESSED IN THIS ELEMENT' }) });
                else if (object.input == "right")
                    driver.actions().mouseMove(driver.findElement(By.css(object.id))).sendKeys(webdriver.Key.RIGHT).perform()
                    .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                    .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'RIGHT ARROW CAN NOT BE PRESSED IN THIS ELEMENT' }) });
            }
        } else if (object.type == "visible") {
            if (object.identifier === "id")
                driver.findElement(By.id(object.id)).isDisplayed()
                .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT IS NOT VISIBLE' }) });
            else if (object.identifier === "name")
                driver.findElement(By.name(object.id)).isDisplayed()
                .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT IS NOT VISIBLE' }) });
            else if (object.identifier === "linkText")
                driver.findElement(By.linkText(object.id)).isDisplayed()
                .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT IS NOT VISIBLE' }) });
            else if (object.identifier === "className")
                driver.findElement(By.className(object.id)).isDisplayed()
                .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT IS NOT VISIBLE' }) });
            else if (object.identifier === "xpath")
                driver.findElement(By.xpath(object.id)).isDisplayed()
                .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT IS NOT VISIBLE' }) });
            else if (object.identifier === "css")
                driver.findElement(By.css(object.id)).isDisplayed()
                .then(() => { deferred.resolve({ 'result': 'OK', 'error': '' }) })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT IS NOT VISIBLE' }) });
        } else if (object.type == "not-visible") {
            if (object.identifier === "id")
                driver.findElement(By.id(object.id)).isDisplayed()
                .then(() => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT IS VISIBLE' }) })
                .catch((e) => { deferred.resolve({ 'result': 'OK', 'error': '' }) });
            else if (object.identifier === "name")
                driver.findElement(By.name(object.id)).isDisplayed()
                .then(() => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT IS VISIBLE' }) })
                .catch((e) => { deferred.resolve({ 'result': 'OK', 'error': '' }) });
            else if (object.identifier === "linkText")
                driver.findElement(By.linkText(object.id)).isDisplayed()
                .then(() => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT IS VISIBLE' }) })
                .catch((e) => { deferred.resolve({ 'result': 'OK', 'error': '' }) });
            else if (object.identifier === "className")
                driver.findElement(By.className(object.id)).isDisplayed()
                .then(() => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT IS VISIBLE' }) })
                .catch((e) => { deferred.resolve({ 'result': 'OK', 'error': '' }) });
            else if (object.identifier === "xpath")
                driver.findElement(By.xpath(object.id)).isDisplayed()
                .then(() => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT IS VISIBLE' }) })
                .catch((e) => { deferred.resolve({ 'result': 'OK', 'error': '' }) });
            else if (object.identifier === "css")
                driver.findElement(By.css(object.id)).isDisplayed()
                .then(() => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT IS VISIBLE' }) })
                .catch((e) => { deferred.resolve({ 'result': 'OK', 'error': '' }) });
        } else if (object.type == "text-equal") {
            if (object.identifier === "id")
                driver.findElement(By.id(object.id)).getText()
                .then((text) => {
                    if (_.isEqual(text, object.input))
                        deferred.resolve({ 'result': 'OK', 'error': '' });
                    else
                        deferred.resolve({ 'result': 'FAIL', 'error': 'TEXT DIFFERS' });
                })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT DOES NOT CONTAINS ANY TEXT' }) });
            else if (object.identifier === "name")
                driver.findElement(By.name(object.id)).getText()
                .then((text) => {
                    if (_.isEqual(text, object.input))
                        deferred.resolve({ 'result': 'OK', 'error': '' });
                    else
                        deferred.resolve({ 'result': 'FAIL', 'error': 'TEXT DIFFERS' });
                })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT DOES NOT CONTAINS ANY TEXT' }) });
            else if (object.identifier === "linkText")
                driver.findElement(By.linkText(object.id)).getText()
                .then((text) => {
                    if (_.isEqual(text, object.input))
                        deferred.resolve({ 'result': 'OK', 'error': '' });
                    else
                        deferred.resolve({ 'result': 'FAIL', 'error': 'TEXT DIFFERS' });
                })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT DOES NOT CONTAINS ANY TEXT' }) });
            else if (object.identifier === "className")
                driver.findElement(By.className(object.id)).getText()
                .then((text) => {
                    if (_.isEqual(text, object.input))
                        deferred.resolve({ 'result': 'OK', 'error': '' });
                    else
                        deferred.resolve({ 'result': 'FAIL', 'error': 'TEXT DIFFERS' });
                })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT DOES NOT CONTAINS ANY TEXT' }) });
            else if (object.identifier === "xpath")
                driver.findElement(By.xpath(object.id)).getText()
                .then((text) => {
                    if (_.isEqual(text, object.input))
                        deferred.resolve({ 'result': 'OK', 'error': '' });
                    else
                        deferred.resolve({ 'result': 'FAIL', 'error': 'TEXT DIFFERS' });
                })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT DOES NOT CONTAINS ANY TEXT' }) });
            else if (object.identifier === "css")
                driver.findElement(By.css(object.id)).getText()
                .then((text) => {
                    if (_.isEqual(text, object.input))
                        deferred.resolve({ 'result': 'OK', 'error': '' });
                    else
                        deferred.resolve({ 'result': 'FAIL', 'error': 'TEXT DIFFERS' });
                })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT DOES NOT CONTAINS ANY TEXT' }) });
        } else if (object.type == "text-not-equal") {
            if (object.identifier === "id")
                driver.findElement(By.id(object.id)).getText()
                .then((text) => {
                    if (_.isEqual(text, object.input))
                        deferred.resolve({ 'result': 'FAIL', 'error': 'TEXT DOES NOT DIFFER' });
                    else
                        deferred.resolve({ 'result': 'OK', 'error': '' });
                })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT DOES NOT CONTAINS ANY TEXT' }) });
            else if (object.identifier === "name")
                driver.findElement(By.name(object.id)).getText()
                .then((text) => {
                    if (_.isEqual(text, object.input))
                        deferred.resolve({ 'result': 'FAIL', 'error': 'TEXT DOES NOT DIFFER' });
                    else
                        deferred.resolve({ 'result': 'OK', 'error': '' });
                })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT DOES NOT CONTAINS ANY TEXT' }) });
            else if (object.identifier === "linkText")
                driver.findElement(By.linkText(object.id)).getText()
                .then((text) => {
                    if (_.isEqual(text, object.input))
                        deferred.resolve({ 'result': 'FAIL', 'error': 'TEXT DOES NOT DIFFER' });
                    else
                        deferred.resolve({ 'result': 'OK', 'error': '' });
                })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT DOES NOT CONTAINS ANY TEXT' }) });
            else if (object.identifier === "className")
                driver.findElement(By.className(object.id)).getText()
                .then((text) => {
                    if (_.isEqual(text, object.input))
                        deferred.resolve({ 'result': 'FAIL', 'error': 'TEXT DOES NOT DIFFER' });
                    else
                        deferred.resolve({ 'result': 'OK', 'error': '' });
                })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT DOES NOT CONTAINS ANY TEXT' }) });
            else if (object.identifier === "xpath")
                driver.findElement(By.xpath(object.id)).getText()
                .then((text) => {
                    if (_.isEqual(text, object.input))
                        deferred.resolve({ 'result': 'FAIL', 'error': 'TEXT DOES NOT DIFFER' });
                    else
                        deferred.resolve({ 'result': 'OK', 'error': '' });
                })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT DOES NOT CONTAINS ANY TEXT' }) });
            else if (object.identifier === "css")
                driver.findElement(By.css(object.id)).getText()
                .then((text) => {
                    if (_.isEqual(text, object.input))
                        deferred.resolve({ 'result': 'FAIL', 'error': 'TEXT DOES NOT DIFFER' });
                    else
                        deferred.resolve({ 'result': 'OK', 'error': '' });
                })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT DOES NOT CONTAINS ANY TEXT' }) });
        } else if (object.type == "text-contain") {
            if (object.identifier === "id")
                driver.findElement(By.id(object.id)).getText()
                .then((text) => {
                    if (_.contains(text, object.input))
                        deferred.resolve({ 'result': 'OK', 'error': '' });
                    else
                        deferred.resolve({ 'result': 'FAIL', 'error': 'TEXT IS NOT CONTAINED' });
                })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT DOES NOT CONTAINS ANY TEXT' }) });
            else if (object.identifier === "name")
                driver.findElement(By.name(object.id)).getText()
                .then((text) => {
                    if (_.contains(text, object.input))
                        deferred.resolve({ 'result': 'OK', 'error': '' });
                    else
                        deferred.resolve({ 'result': 'FAIL', 'error': 'TEXT IS NOT CONTAINED' });
                })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT DOES NOT CONTAINS ANY TEXT' }) });
            else if (object.identifier === "linkText")
                driver.findElement(By.linkText(object.id)).getText()
                .then((text) => {
                    if (_.contains(text, object.input))
                        deferred.resolve({ 'result': 'OK', 'error': '' });
                    else
                        deferred.resolve({ 'result': 'FAIL', 'error': 'TEXT IS NOT CONTAINED' });
                })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT DOES NOT CONTAINS ANY TEXT' }) });
            else if (object.identifier === "className")
                driver.findElement(By.className(object.id)).getText()
                .then((text) => {
                    if (_.contains(text, object.input))
                        deferred.resolve({ 'result': 'OK', 'error': '' });
                    else
                        deferred.resolve({ 'result': 'FAIL', 'error': 'TEXT IS NOT CONTAINED' });
                })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT DOES NOT CONTAINS ANY TEXT' }) });
            else if (object.identifier === "xpath")
                driver.findElement(By.xpath(object.id)).getText()
                .then((text) => {
                    if (_.contains(text, object.input))
                        deferred.resolve({ 'result': 'OK', 'error': '' });
                    else
                        deferred.resolve({ 'result': 'FAIL', 'error': 'TEXT IS NOT CONTAINED' });
                })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT DOES NOT CONTAINS ANY TEXT' }) });
            else if (object.identifier === "css")
                driver.findElement(By.css(object.id)).getText()
                .then((text) => {
                    if (_.contains(text, object.input))
                        deferred.resolve({ 'result': 'OK', 'error': '' });
                    else
                        deferred.resolve({ 'result': 'FAIL', 'error': 'TEXT IS NOT CONTAINED' });
                })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT DOES NOT CONTAINS ANY TEXT' }) });
        } else if (object.type == "text-not-contain") {
            if (object.identifier === "id")
                driver.findElement(By.id(object.id)).getText()
                .then((text) => {
                    if (_.contains(text, object.input))
                        deferred.resolve({ 'result': 'FAIL', 'error': 'TEXT CONTAINED' });
                    else
                        deferred.resolve({ 'result': 'OK', 'error': '' });
                })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT DOES NOT CONTAINS ANY TEXT' }) });
            else if (object.identifier === "name")
                driver.findElement(By.name(object.id)).getText()
                .then((text) => {
                    if (_.contains(text, object.input))
                        deferred.resolve({ 'result': 'FAIL', 'error': 'TEXT CONTAINED' });
                    else
                        deferred.resolve({ 'result': 'OK', 'error': '' });
                })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT DOES NOT CONTAINS ANY TEXT' }) });
            else if (object.identifier === "linkText")
                driver.findElement(By.linkText(object.id)).getText()
                .then((text) => {
                    if (_.contains(text, object.input))
                        deferred.resolve({ 'result': 'FAIL', 'error': 'TEXT CONTAINED' });
                    else
                        deferred.resolve({ 'result': 'OK', 'error': '' });
                })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT DOES NOT CONTAINS ANY TEXT' }) });
            else if (object.identifier === "className")
                driver.findElement(By.className(object.id)).getText()
                .then((text) => {
                    if (_.contains(text, object.input))
                        deferred.resolve({ 'result': 'FAIL', 'error': 'TEXT CONTAINED' });
                    else
                        deferred.resolve({ 'result': 'OK', 'error': '' });
                })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT DOES NOT CONTAINS ANY TEXT' }) });
            else if (object.identifier === "xpath")
                driver.findElement(By.xpath(object.id)).getText()
                .then((text) => {
                    if (_.contains(text, object.input))
                        deferred.resolve({ 'result': 'FAIL', 'error': 'TEXT CONTAINED' });
                    else
                        deferred.resolve({ 'result': 'OK', 'error': '' });
                })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT DOES NOT CONTAINS ANY TEXT' }) });
            else if (object.identifier === "css")
                driver.findElement(By.css(object.id)).getText()
                .then((text) => {
                    if (_.contains(text, object.input))
                        deferred.resolve({ 'result': 'FAIL', 'error': 'TEXT CONTAINED' });
                    else
                        deferred.resolve({ 'result': 'OK', 'error': '' });
                })
                .catch((e) => { deferred.resolve({ 'result': 'FAIL', 'error': 'ELEMENT DOES NOT CONTAINS ANY TEXT' }) });
        }
    }

    return deferred.promise;
}

function postTests(_id, info) {
    var deferred = Q.defer();

    db.users.findById(_id, function(err, user) {
        if (err) deferred.reject(err.name + ': ' + err.message);

        if (user) {
            var tests = _.pick(user, 'tests').tests;
            var flag = 0;

            if (tests.length != 0) {
                for (var i = 0; i < tests.length; i++) {
                    if (tests[i].suiteName == info.suite_name && tests[i].testName == info.test_name) {
                        deferred.reject('Test "' + tests[i].testName + '" is already in used');
                        flag = 1;
                        break;
                    }

                    if (i == (tests.length - 1) && flag == 0)
                        post();
                }
            } else {
                post();
            }

            function post() {
                if (!(_.contains(user.suites.map(function(suite) { return suite.name; }), info.suite_name))) {
                    var set = {
                        "tests": {
                            "suiteName": info.suite_name,
                            "testName": info.test_name,
                            "status": "NOT TESTED",
                            "tested": {
                                "date": "",
                                "time": ""
                            },
                            "testObject": info.test_obj,
                            "history": [],
                            "preconditions": [],
                            "postconditions": [],
                            "runs": 1
                        },
                        "suites": {
                            "name": info.suite_name,
                            "testsNumber": 1,
                            "history": [],
                            "schedule": "none"
                        }
                    };

                    db.users.update({ _id: mongo.helper.toObjectID(_id) }, { $push: set }, function(err, doc) {
                        if (err) deferred.reject(err.name + ': ' + err.message);

                        deferred.resolve();
                    });
                } else {
                    var suites = _.pick(user, 'suites').suites;
                    var set = {
                        "tests": {
                            "suiteName": info.suite_name,
                            "testName": info.test_name,
                            "status": "NOT TESTED",
                            "tested": {
                                "date": "",
                                "time": ""
                            },
                            "testObject": info.test_obj,
                            "history": [],
                            "preconditions": [],
                            "postconditions": [],
                            "runs": 1
                        }
                    };

                    for (var i = 0; i < suites.length; i++) {
                        if (suites[i].name == info.suite_name) {
                            suites[i].testsNumber += 1;
                            break;
                        }
                    }

                    db.users.update({ _id: mongo.helper.toObjectID(_id) }, { $push: set, $set: { "suites": suites } }, function(err, doc) {
                        if (err) deferred.reject(err.name + ': ' + err.message);

                        deferred.resolve();
                    });
                }
            }
        } else {
            deferred.resolve();
        }
    });

    return deferred.promise;
}

function duplicate(_id, suite_name, test_name) {
    var deferred = Q.defer();

    db.users.findById(_id, function(err, user) {
        if (err) deferred.reject(err.name + ': ' + err.message);

        if (user) {
            var tests = _.pick(user, 'tests').tests;
            var testName;
            var suiteName;
            var testObject;

            for (var i = 0; i < tests.length; i++) {
                if (tests[i].suiteName == suite_name && tests[i].testName == test_name) {
                    var j = 1;
                    suiteName = tests[i].suiteName;
                    testObject = tests[i].testObject;

                    testObject.map(function(obj) {
                        obj.status = 'PENDING';
                        obj.description = '';
                        obj.error = '';
                    });

                    do {
                        testName = tests[i].testName + '-' + j;
                        j++;
                    } while (_.contains(tests.map(function(test) { return test.testName; }), testName))
                }
            }

            var info = {
                'suite_name': suiteName,
                'test_name': testName,
                'test_obj': testObject
            };

            deferred.resolve(postTests(_id, info));
        } else {
            deferred.resolve();
        }
    });

    return deferred.promise;
}

function createUser(userParam) {
    var deferred = Q.defer();

    db.users.findOne({ email: userParam.email }, function(err, user) {
        if (err) deferred.reject(err.name + ': ' + err.message);

        if (user) {
            deferred.reject('Email "' + userParam.email + '" is already used');
        } else {
            createUser();
        }
    });

    function createUser() {
        var user = _.omit(userParam, 'password');

        user.hash = bcrypt.hashSync(userParam.password, 10);

        db.users.insert(user, function(err, doc) {
            if (err) deferred.reject(err.name + ': ' + err.message);

            deferred.resolve();
        });
    }

    return deferred.promise;
}

function createSuite(_id, suite_name) {
    var deferred = Q.defer();

    db.users.findById(_id, function(err, user) {
        if (err) deferred.reject(err.name + ': ' + err.message);

        if (user) {
            var suites = _.pick(user, 'suites').suites;
            var flag = 0;

            for (var i = 0; i < suites.length; i++) {
                if (suites[i].name == suite_name) {
                    deferred.reject('Suite ' + suites[i].name + ' is already used.');
                    flag == 1;
                    break;
                }
                if (i == (suites.length - 1) && flag == 0)
                    createNewSuite();
            }

            if (suites.length == 0) {
                createNewSuite();
            }

        } else {
            deferred.resolve();
        }
    });

    function createNewSuite() {
        db.users.update({ _id: mongo.helper.toObjectID(_id) }, { $push: { "suites": { "name": suite_name, "testsNumber": 0, "history": [], "schedule": "none" } } }, function(err, doc) {
            if (err) deferred.reject(err.name + ': ' + err.message);

            deferred.resolve();
        });
    }

    return deferred.promise;
}

function createTest(_id, info) {
    var deferred = Q.defer();

    db.users.findById(_id, function(err, user) {
        if (err) deferred.reject(err.name + ': ' + err.message);

        if (user) {
            var tests = _.pick(user, 'tests').tests;
            var flag = 0;

            for (var i = 0; i < tests.length; i++) {
                if (tests[i].testName == info.test_name && tests[i].suiteName == info.suite_name) {
                    deferred.reject('Test ' + tests[i].testName + ' is already used.');
                    flag == 1;
                    break;
                }
                if (i == (tests.length - 1) && flag == 0)
                    createNewTest(user);
            }

            if (tests.length == 0) {
                createNewTest(user);
            }

        } else {
            deferred.resolve();
        }
    });

    function createNewTest(user) {
        var suites = _.pick(user, 'suites').suites;
        var set = {
            "tests": {
                "suiteName": info.suite_name,
                "testName": info.test_name,
                "status": "NOT TESTED",
                "tested": {
                    "date": "",
                    "time": ""
                },
                "testObject": [{
                    "type": "get",
                    "URL": info.startUrl,
                    "error": "",
                    "status": "PENDING"
                }],
                "history": [],
                "preconditions": [],
                "postconditions": [],
                "runs": 1
            }
        };

        for (var i = 0; i < suites.length; i++) {
            if (suites[i].name == info.suite_name) {
                suites[i].testsNumber += 1;
                break;
            }
        }

        db.users.update({ _id: mongo.helper.toObjectID(_id) }, { $push: set, $set: { "suites": suites } }, function(err, doc) {
            if (err) deferred.reject(err.name + ': ' + err.message);

            deferred.resolve();
        });
    }

    return deferred.promise;
}

function updateUser(_id, userParam) {
    var deferred = Q.defer();

    db.users.findById(_id, function(err, user) {
        if (err) deferred.reject(err.name + ': ' + err.message);

        if (user.email !== userParam.email) {
            db.users.findOne({ email: userParam.email }, function(err, user) {
                if (err) deferred.reject(err.name + ': ' + err.message);

                if (user) {
                    deferred.reject('Email "' + userParam.email + '" is already used');
                } else {
                    updateUser();
                }
            });
        } else {
            updateUser();
        }
    });

    function updateUser() {
        var set = {
            firstName: userParam.firstName,
            lastName: userParam.lastName,
            email: userParam.email,
        };

        db.users.update({ _id: mongo.helper.toObjectID(_id) }, { $set: set }, function(err, doc) {
            if (err) deferred.reject(err.name + ': ' + err.message);

            deferred.resolve();
        });
    }

    return deferred.promise;
}

function updateUserPassword(_id, userParam) {
    var deferred = Q.defer();

    db.users.findById(_id, function(err, user) {
        if (err) deferred.reject(err.name + ': ' + err.message);

        if (user && bcrypt.compareSync(userParam.oldPassword, user.hash)) {
            var newHash = bcrypt.hashSync(userParam.newPassword, 10);

            db.users.update({ _id: mongo.helper.toObjectID(_id) }, { $set: { "hash": newHash } }, function(err, doc) {
                if (err) deferred.reject(err.name + ': ' + err.message);

                deferred.resolve();
            });

        } else {
            deferred.reject('Current password is incorrect.');
        }
    });

    return deferred.promise;
}

function updateStepsID(_id, suite_name, test_name, info) {
    var deferred = Q.defer();

    db.users.findById(_id, function(err, user) {
        if (err) deferred.reject(err.name + ': ' + err.message);

        if (user) {
            var tests = _.pick(user, 'tests').tests;
            var oldID;
            var url;

            for (var i = 0; i < tests.length; i++) {
                if (tests[i].suiteName == suite_name && tests[i].testName == test_name) {
                    oldID = tests[i].testObject[info.index].id;
                    url = tests[i].testObject[info.index].url;
                }
            }

            for (var i = 0; i < tests.length; i++) {
                for (var j = 0; j < tests[i].testObject.length; j++) {
                    if (tests[i].testObject[j].id == oldID && tests[i].testObject[j].url == url) {
                        tests[i].testObject[j].id = info.newID;
                    }
                }
            }

            db.users.update({ _id: mongo.helper.toObjectID(_id) }, { $set: { "tests": tests } }, function(err, doc) {
                if (err) deferred.reject(err.name + ': ' + err.message);

                deferred.resolve();
            });

        } else {
            deferred.resolve();
        }
    });

    return deferred.promise;
}

function updateTest(_id, suite_name, test_name, info) {
    var deferred = Q.defer();

    db.users.findById(_id, function(err, user) {
        if (err) deferred.reject(err.name + ': ' + err.message);

        if (user) {
            var tests = _.pick(user, 'tests').tests;

            for (var i = 0; i < tests.length; i++) {
                if (tests[i].testName == test_name && tests[i].suiteName == suite_name) {
                    if (JSON.stringify(tests[i].testObject) != JSON.stringify(info.testObject)) {
                        tests[i].testObject = info.testObject;

                        for (var j = 0; j < tests[i].testObject.length; j++) {
                            tests[i].testObject[j].status = "PENDING";
                        }
                    }

                    if (tests[i].preconditions != info.preconditions) {
                        tests[i].preconditions = info.preconditions;

                        for (var j = 0; j < tests[i].preconditions.length; j++) {
                            for (var k = 0; k < tests.length; k++) {
                                if (tests[i].preconditions[j].testName == tests[k].testName && tests[i].preconditions[j].suiteName == tests[k].suiteName) {
                                    tests[i].preconditions[j].len = tests[k].testObject.length;
                                    break;
                                }
                            }
                        }
                    }

                    if (tests[i].postconditions != info.postconditions) {
                        tests[i].postconditions = info.postconditions;

                        for (var j = 0; j < tests[i].postconditions.length; j++) {
                            for (var k = 0; k < tests.length; k++) {
                                if (tests[i].postconditions[j].testName == tests[k].testName && tests[i].postconditions[j].suiteName == tests[k].suiteName) {
                                    tests[i].postconditions[j].len = tests[k].testObject.length;
                                    break;
                                }
                            }
                        }
                    }

                    break;
                }
            }

            db.users.update({ _id: mongo.helper.toObjectID(_id) }, { $set: { "tests": tests } }, function() {
                if (err) deferred.reject(err.name + ': ' + err.message);

                deferred.resolve();
            });

        } else {
            deferred.resolve();
        }
    });

    return deferred.promise;
}

function updateTestResult(_id, suite_name, test_name, res) {
    var deferred = Q.defer();

    db.users.findById(_id, function(err, user) {
        if (err) deferred.reject(err.name + ': ' + err.message);

        if (user) {
            var tests = _.pick(user, 'tests').tests;
            var d = new Date();
            var preconditionsLength = 0;
            var preconditionStatus = true;
            var tdt = new Date(d.valueOf());
            var dayn = (d.getDay() + 6) % 7;
            tdt.setDate(tdt.getDate() - dayn + 3);
            var firstThursday = tdt.valueOf();
            tdt.setMonth(0, 1);
            if (tdt.getDay() !== 4) tdt.setMonth(0, 1 + ((4 - tdt.getDay()) + 7) % 7);
            var week = 1 + Math.ceil((firstThursday - tdt) / 604800000);

            for (var i = 0; i < tests.length; i++) {
                if (tests[i].testName == test_name && tests[i].suiteName == suite_name) {
                    var pos;

                    tests[i].status = "PASSED";
                    tests[i].tested.date = d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();

                    if (d.getMinutes() < 10) {
                        tests[i].tested.time = d.getHours() + ':0' + d.getMinutes();
                    } else {
                        tests[i].tested.time = d.getHours() + ':' + d.getMinutes();
                    }

                    try {
                        tests[i].testObject = JSON.parse(tests[i].testObject);
                    } catch (e) {
                        tests[i].testObject = tests[i].testObject;
                    }

                    var object = tests[i].testObject;

                    if (tests[i].preconditions.length != 0) {
                        for (var j = 0; j < tests[i].preconditions.length; j++) {
                            tests[i].preconditions[j].status = 'PASSED';
                            preconditionsLength += tests[i].preconditions[j].len;

                            for (var k = 0; k < tests[i].preconditions[j].len; k++) {
                                if (j == 0) {
                                    if (res[k].result == 'FAIL') {
                                        tests[i].preconditions[j].status = 'FAILED';
                                        tests[i].status = 'FAILED';
                                        preconditionStatus = false;
                                        break;
                                    }
                                } else {
                                    if (res[k + tests[i].preconditions[j - 1].len].result == 'FAIL') {
                                        tests[i].preconditions[j].status = 'FAILED';
                                        tests[i].status = 'FAILED';
                                        preconditionStatus = false;
                                        break;
                                    }
                                }
                            }
                        }
                    }

                    for (var j = preconditionsLength; j < tests[i].testObject.length + preconditionsLength; j++) {
                        if (res[j].result == "FAIL") {
                            tests[i].status = "FAILED";
                            tests[i].testObject[j - preconditionsLength].status = res[j].result;
                            tests[i].testObject[j - preconditionsLength].error = res[j].error;
                            object[j - preconditionsLength].status = res[j].result;
                            object[j - preconditionsLength].error = res[j].error;

                            if (tests[i].testObject[j - preconditionsLength].inputType == 'regex' || tests[i].testObject[j - preconditionsLength].inputType == 'int_range' || tests[i].testObject[j - preconditionsLength].inputType == 'num_range') {
                                object[j - preconditionsLength].input = res[j].input;
                            }

                            pos = j - preconditionsLength;
                            break;
                        }

                        tests[i].testObject[j - preconditionsLength].status = res[j].result;
                        tests[i].testObject[j - preconditionsLength].error = res[j].error;
                        object[j - preconditionsLength].status = res[j].result;
                        object[j - preconditionsLength].error = res[j].error;

                        if (tests[i].testObject[j - preconditionsLength].inputType == 'regex' || tests[i].testObject[j - preconditionsLength].inputType == 'int_range' || tests[i].testObject[j - preconditionsLength].inputType == 'num_range') {
                            object[j - preconditionsLength].input = res[j].input;
                        }
                    }

                    if (tests[i].postconditions.length != 0 && preconditionStatus && tests[i].status != 'FAILED') {
                        var postconditionsLength = tests[i].testObject.length + preconditionsLength;

                        for (var j = 0; j < tests[i].postconditions.length; j++) {
                            tests[i].postconditions[j].status = 'PASSED';

                            for (var k = 0; k < tests[i].postconditions[j].len; k++) {
                                if (j == 0) {
                                    if (res[k + postconditionsLength].result == 'FAIL') {
                                        tests[i].postconditions[j].status = 'FAILED';
                                        tests[i].status = 'FAILED';
                                        break;
                                    }
                                } else {
                                    if (res[k + postconditionsLength + tests[i].postconditions[j - 1].len]) {
                                        tests[i].postconditions[j].status = 'FAILED';
                                        tests[i].status = 'FAILED';
                                        break;
                                    }
                                }
                            }
                        }
                    } else {
                        for (var j = 0; j < tests[i].postconditions.length; j++) {
                            tests[i].postconditions[j].status = 'PENDING';
                        }
                    }

                    if (pos !== undefined && preconditionStatus) {
                        for (var k = pos + 1; k < tests[i].testObject.length; k++) {
                            tests[i].testObject[k].status = "PENDING";
                            tests[i].testObject[k].error = "";
                            object[k].status = "PENDING";
                            object[k].error = "";

                            if (tests[i].testObject[k].inputType == 'regex' || tests[i].testObject[k].inputType == 'int_range' || tests[i].testObject[k].inputType == 'num_range') {
                                object[k].input = res[j].input;
                            }
                        }
                    } else if (!preconditionStatus) {
                        for (var k = 0; k < tests[i].testObject.length; k++) {
                            tests[i].testObject[k].status = "PENDING";
                            tests[i].testObject[k].error = "";
                            object[k].status = "PENDING";
                            object[k].error = "";

                            if (tests[i].testObject[k].inputType == 'regex' || tests[i].testObject[k].inputType == 'int_range' || tests[i].testObject[k].inputType == 'num_range') {
                                object[k].input = res[j].input;
                            }
                        }
                    }

                    var set = {
                        "id": randomID(20, "aA0"),
                        "date": tests[i].tested.date,
                        "time": tests[i].tested.time,
                        "week": week,
                        "status": tests[i].status,
                        "test": object,
                        "preconditions": tests[i].preconditions,
                        "postconditions": tests[i].postconditions
                    };

                    tests[i].history.unshift(set);

                    break;
                }
            }

            db.users.update({ _id: mongo.helper.toObjectID(_id) }, { $set: { "tests": tests } }, function() {
                if (err) deferred.reject(err.name + ': ' + err.message);

                deferred.resolve({ id: _id, suiteName: suite_name });
            });

        } else {
            deferred.resolve();
        }
    });

    return deferred.promise;
}

function updateTestSettings(_id, suite_name, test_name, info) {
    var deferred = Q.defer();

    db.users.findById(_id, function(err, user) {
        if (err) deferred.reject(err.name + ': ' + err.message);

        if (user) {
            var tests = _.pick(user, 'tests').tests;
            var suites = _.pick(user, 'suites').suites;
            var flag = 0;

            if (test_name != info.testName || suite_name != info.suiteName) {
                for (var i = 0; i < tests.length; i++) {
                    if (tests[i].suiteName == info.suiteName && tests[i].testName == info.testName) {
                        deferred.reject('Test "' + tests[i].testName + '" is already used in suite "' + tests[i].suiteName + '".');
                        flag = 1;
                        break;
                    }

                    if (i == (tests.length - 1) && flag == 0)
                        update();
                }
            } else {
                update();
            }

            function update() {
                for (var i = 0; i < tests.length; i++) {
                    if (tests[i].testName == test_name && tests[i].suiteName == suite_name) {
                        tests[i].testName = info.testName;
                        tests[i].suiteName = info.suiteName;
                        tests[i].runs = info.runs;
                        break;
                    }
                }

                if (!(_.contains(user.suites.map(function(suite) { return suite.name; }), info.suiteName))) {
                    suites.push({ "name": info.suiteName, "testsNumber": 1, "history": [], "schedule": "none" });

                    for (var i = 0; i < suites.length; i++) {
                        if (suites[i].name == suite_name) {
                            suites[i].testsNumber -= 1;
                        }
                    }

                    db.users.update({ _id: mongo.helper.toObjectID(_id) }, { $set: { "tests": tests, "suites": suites } }, function() {
                        if (err) deferred.reject(err.name + ': ' + err.message);

                        deferred.resolve();
                    });
                } else {
                    if (suite_name != info.suiteName) {
                        for (var i = 0; i < suites.length; i++) {
                            if (suites[i].name == suite_name) {
                                suites[i].testsNumber -= 1;
                            }
                            if (suites[i].name == info.suiteName) {
                                suites[i].testsNumber += 1;
                            }
                        }
                    }

                    db.users.update({ _id: mongo.helper.toObjectID(_id) }, { $set: { "tests": tests, "suites": suites } }, function() {
                        if (err) deferred.reject(err.name + ': ' + err.message);

                        deferred.resolve();
                    });
                }
            }

        } else {
            deferred.resolve();
        }
    });

    return deferred.promise;
}

function updateSuiteSettings(_id, suite_name, info) {
    var deferred = Q.defer();

    db.users.findById(_id, function(err, user) {
        if (err) deferred.reject(err.name + ': ' + err.message);

        if (user) {
            var suites = _.pick(user, 'suites').suites;
            var tests = _.pick(user, 'tests').tests;
            var flag = 0;

            if (suite_name != info.suiteName) {
                for (var i = 0; i < suites.length; i++) {
                    if (suites[i].name == info.suiteName) {
                        deferred.reject('Suite "' + suites[i].name + '" is already used.');
                        flag = 1;
                        break;
                    }

                    if (i == (suites.length - 1) && flag == 0)
                        update();
                }
            } else {
                update();
            }

            function update() {
                for (var i = 0; i < suites.length; i++) {
                    if (suites[i].name == suite_name) {
                        suites[i].name = info.suiteName;

                        if (suites[i].schedule != info.schedule) {
                            suites[i].schedule = info.schedule;
                        }

                        break;
                    }
                }

                for (var i = 0; i < tests.length; i++) {
                    if (tests[i].suiteName == suite_name) {
                        tests[i].suiteName = info.suiteName
                    }
                }

                db.users.update({ _id: mongo.helper.toObjectID(_id) }, { $set: { "tests": tests, "suites": suites } }, function() {
                    if (err) deferred.reject(err.name + ': ' + err.message);

                    deferred.resolve();
                });
            }

        } else {
            deferred.resolve();
        }
    });

    return deferred.promise;
}

function updateSuiteHistory(_id, suite_name) {
    var deferred = Q.defer();

    db.users.findById(_id, function(err, user) {
        if (err) deferred.reject(err.name + ': ' + err.message);

        if (user) {
            var suites = _.pick(user, 'suites').suites;
            var tests = _.pick(user, 'tests').tests;
            var d = new Date();
            var selectedTests = [];
            var passed = 0;
            var failed = 0;
            var time;
            var tdt = new Date(d.valueOf());
            var dayn = (d.getDay() + 6) % 7;
            tdt.setDate(tdt.getDate() - dayn + 3);
            var firstThursday = tdt.valueOf();
            tdt.setMonth(0, 1);
            if (tdt.getDay() !== 4) tdt.setMonth(0, 1 + ((4 - tdt.getDay()) + 7) % 7);
            var week = 1 + Math.ceil((firstThursday - tdt) / 604800000);

            if (d.getMinutes() < 10) {
                time = d.getHours() + ':0' + d.getMinutes();
            } else {
                time = d.getHours() + ':' + d.getMinutes();
            }

            for (var i = 0; i < tests.length; i++) {
                if (tests[i].suiteName == suite_name) {
                    selectedTests.push(tests[i]);

                    if (tests[i].status == "FAILED")
                        failed++;
                    else
                        passed++;
                }
            }

            for (var i = 0; i < suites.length; i++) {
                if (suites[i].name == suite_name) {
                    var set = {
                        "id": randomID(20, "aA0"),
                        "date": d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear(),
                        "time": time,
                        "week": week,
                        "status": {
                            "passed": passed,
                            "failed": failed
                        },
                        "tests": selectedTests
                    };

                    suites[i].history.unshift(set);

                    break;
                }
            }

            db.users.update({ _id: mongo.helper.toObjectID(_id) }, { $set: { "suites": suites } }, function() {
                if (err) deferred.reject(err.name + ': ' + err.message);

                deferred.resolve(_id);
            });

        } else {
            deferred.resolve();
        }
    });

    return deferred.promise;
}

function deleteTest(_id, suite_name, test_name) {
    var deferred = Q.defer();

    db.users.findById(_id, function(err, user) {
        if (err) deferred.reject(err.name + ': ' + err.message);

        if (user) {
            var suites = _.pick(user, 'suites').suites;
            var tests = _.pick(user, 'tests').tests;

            for (var i = 0; i < tests.length; i++) {
                if (tests[i].testName == test_name && tests[i].suiteName == suite_name) {
                    tests.splice(i, 1);
                    break;
                }
            }

            for (var i = 0; i < suites.length; i++) {
                if (suites[i].name == suite_name) {
                    suites[i].testsNumber -= 1;
                    break;
                }
            }

            db.users.update({ _id: mongo.helper.toObjectID(_id) }, { $set: { "tests": tests, "suites": suites } }, function() {
                if (err) deferred.reject(err.name + ': ' + err.message);

                deferred.resolve();
            });

        } else {
            deferred.resolve();
        }
    });

    return deferred.promise;
}

function deleteSuite(_id, suite_name) {
    var deferred = Q.defer();

    db.users.findById(_id, function(err, user) {
        if (err) deferred.reject(err.name + ': ' + err.message);

        if (user) {
            var suites = _.pick(user, 'suites').suites;
            var tests = _.pick(user, 'tests').tests;
            var testsLength = tests.length;
            var cnt = 0;

            for (var i = 0; i < testsLength; i++) {
                if (tests[i - cnt].suiteName == suite_name) {
                    tests.splice(i - cnt, 1);
                    cnt++;
                }
            }

            for (var i = 0; i < suites.length; i++) {
                if (suites[i].name == suite_name) {
                    suites.splice(i, 1);
                    break;
                }
            }

            db.users.update({ _id: mongo.helper.toObjectID(_id) }, { $set: { "tests": tests, "suites": suites } }, function() {
                if (err) deferred.reject(err.name + ': ' + err.message);

                deferred.resolve();
            });

        } else {
            deferred.resolve();
        }
    });

    return deferred.promise;
}

function deleteSuiteHistory(_id, suite_name, history_id) {
    var deferred = Q.defer();

    db.users.findById(_id, function(err, user) {
        if (err) deferred.reject(err.name + ': ' + err.message);

        if (user) {
            var suites = _.pick(user, 'suites').suites;
            var tests = _.pick(user, 'tests').tests;

            for (var i = 0; i < suites.length; i++) {
                if (suites[i].name == suite_name) {
                    for (j = 0; j < suites[i].history.length; j++) {
                        if (suites[i].history[j].id == history_id) {
                            for (k = 0; k < suites[i].history[j].tests.length; k++) {
                                for (l = 0; l < tests.length; l++) {
                                    if (tests[l].suiteName == suite_name) {
                                        for (m = 0; m < tests[l].history.length; m++) {
                                            if (suites[i].history[j].tests[k].history[0].id == tests[l].history[m].id) {
                                                tests[l].history.splice(m, 1);
                                            }
                                        }
                                    }
                                }
                            }

                            suites[i].history.splice(j, 1);
                            break;
                        }
                    }
                }
            }

            db.users.update({ _id: mongo.helper.toObjectID(_id) }, { $set: { "suites": suites, "tests": tests } }, function() {
                if (err) deferred.reject(err.name + ': ' + err.message);

                deferred.resolve();
            });

        } else {
            deferred.resolve();
        }
    });

    return deferred.promise;
}

function deleteSuiteTestHistory(_id, suite_name, history_id, test_name) {
    var deferred = Q.defer();

    db.users.findById(_id, function(err, user) {
        if (err) deferred.reject(err.name + ': ' + err.message);

        if (user) {
            var suites = _.pick(user, 'suites').suites;
            var tests = _.pick(user, 'tests').tests;

            for (var i = 0; i < suites.length; i++) {
                if (suites[i].name == suite_name) {
                    for (j = 0; j < suites[i].history.length; j++) {
                        if (suites[i].history[j].id == history_id) {
                            for (var k = 0; k < suites[i].history[j].tests.length; k++) {
                                if (suites[i].history[j].tests[k].testName == test_name) {
                                    if (suites[i].history[j].tests[k].status == "FAILED") {
                                        suites[i].history[j].status.failed -= 1;
                                    } else {
                                        suites[i].history[j].status.passed -= 1;
                                    }

                                    for (l = 0; l < tests.length; l++) {
                                        if (tests[l].suiteName == suite_name && tests[l].testName == test_name) {
                                            for (m = 0; m < tests[l].history.length; m++) {
                                                if (suites[i].history[j].tests[k].history[0].id == tests[l].history[m].id) {
                                                    tests[l].history.splice(m, 1);
                                                }
                                            }
                                        }
                                    }

                                    suites[i].history[j].tests.splice(k, 1);
                                    break;
                                }
                            }
                        }
                    }
                }
            }

            db.users.update({ _id: mongo.helper.toObjectID(_id) }, { $set: { "suites": suites, "tests": tests } }, function() {
                if (err) deferred.reject(err.name + ': ' + err.message);

                deferred.resolve();
            });

        } else {
            deferred.resolve();
        }
    });

    return deferred.promise;
}

function deleteTestHistory(_id, suite_name, test_name, history_id) {
    var deferred = Q.defer();

    db.users.findById(_id, function(err, user) {
        if (err) deferred.reject(err.name + ': ' + err.message);

        if (user) {
            var tests = _.pick(user, 'tests').tests;

            for (var i = 0; i < tests.length; i++) {
                if (tests[i].testName == test_name && tests[i].suiteName == suite_name) {
                    for (var j = 0; j < tests[i].history.length; j++) {
                        if (tests[i].history[j].id == history_id) {
                            tests[i].history.splice(j, 1);
                            break;
                        }
                    }
                }
            }

            db.users.update({ _id: mongo.helper.toObjectID(_id) }, { $set: { "tests": tests } }, function() {
                if (err) deferred.reject(err.name + ': ' + err.message);

                deferred.resolve();
            });

        } else {
            deferred.resolve();
        }
    });

    return deferred.promise;
}

function deleteUser(_id) {
    var deferred = Q.defer();

    db.users.remove({ _id: mongo.helper.toObjectID(_id) },
        function(err) {
            if (err) deferred.reject(err.name + ': ' + err.message);

            deferred.resolve();
        });

    return deferred.promise;
}