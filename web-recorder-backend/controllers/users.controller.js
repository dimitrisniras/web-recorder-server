var express = require('express');
var router = express.Router();
var userService = require('services/user.service');

router.post('/authenticate', authenticate);
router.post('/register', register);
router.post('/:_id/tests', postTests);
router.post('/:_id/:suite/:test/duplicate', duplicate);
router.post('/:_id/suites', createSuite);
router.post('/:_id/test', createTest);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:id', resetPassword);
router.get('/current', getCurrentUser);
router.get('/:_id/stats', getUserStats);
router.get('/:_id/suites', getSuitesById);
router.get('/:_id/suiteNames', getSuiteNames);
router.get('/:_id/suites/:suite', getSuite);
router.get('/:_id/suites/:suite/tests', getTestsBySuite);
router.get('/:_id/suites/:suite/names', getTestNamesBySuite);
router.get('/:_id/suites/:suite/stats', getSuiteStats);
router.get('/:_id/suites/:suite/tests/:test', getTest);
router.get('/:_id/suites/:suite/tests/:test/result', getTestResult);
router.get('/:_id/suites/:suite/tests/:test/stats', getTestStats);
router.get('/:_id/suites/:suite/history', getSuiteHistory);
router.get('/:_id/suites/:suite/history/:history_id', getSuiteTestsHistory);
router.get('/:_id/suites/:suite/history/:history_id/:test', getSuiteTestHistory);
router.get('/:_id/suites/:suite/tests/:test/history/:history_id', getTestHistory);
router.put('/:_id', updateUser);
router.put('/:_id/password', updateUserPassword);
router.put('/:_id/suites/:suite/tests/:test/updateid', updateStepsID);
router.put('/:_id/suites/:suite/tests/:test/edit', updateTest);
router.put('/:_id/suites/:suite/tests/:test/update-result', updateTestResult);
router.put('/:_id/suites/:suite/tests/:test/settings', updateTestSettings);
router.put('/:_id/suites/:suite/settings', updateSuiteSettings);
router.put('/:_id/suites/:suite/history', updateSuiteHistory);
router.put('/:_id/suites/:suite/tests/:test', deleteTest);
router.put('/:_id/suites/:suite', deleteSuite);
router.put('/:_id/suites/:suite/history/:history_id', deleteSuiteHistory);
router.put('/:_id/suites/:suite/history/:history_id/:test', deleteSuiteTestHistory);
router.put('/:_id/suites/:suite/tests/:test/history/:history_id', deleteTestHistory);
router.delete('/:_id', deleteUser);

module.exports = router;

function authenticate(req, res) {
    userService.authenticate(req.body.email, req.body.password)
        .then(function(user) {
            if (user) {
                res.send(user);
            } else {
                res.status(401).send('Email or password is incorrect');
            }
        })
        .catch(function(err) {
            res.status(400).send(err);
        });
}

function register(req, res) {
    userService.createUser(req.body)
        .then(function() {
            res.sendStatus(200);
        })
        .catch(function(err) {
            res.status(400).send(err);
        });
}

function forgotPassword(req, res) {
    userService.forgotPassword(req.body.email)
        .then(function() {
            res.sendStatus(200);
        })
        .catch(function(err) {
            res.status(400).send(err);
        });
}

function resetPassword(req, res) {
    userService.resetPassword(req.params.id, req.body.password)
        .then(function() {
            res.sendStatus(200);
        })
        .catch(function(err) {
            res.status(400).send(err);
        });
}

function postTests(req, res) {
    userService.postTests(req.params._id, req.body)
        .then(function() {
            res.sendStatus(200);
        })
        .catch(function(err) {
            res.status(400).send(err);
        });
}

function duplicate(req, res) {
    userService.duplicate(req.params._id, req.params.suite, req.params.test)
        .then(function() {
            res.sendStatus(200);
        })
        .catch(function(err) {
            res.status(400).send(err);
        });
}

function createSuite(req, res) {
    userService.createSuite(req.params._id, req.body.suiteName)
        .then(function() {
            res.sendStatus(200);
        })
        .catch(function(err) {
            res.status(400).send(err);
        });
}

function createTest(req, res) {
    userService.createTest(req.params._id, req.body)
        .then(function() {
            res.sendStatus(200);
        })
        .catch(function(err) {
            res.status(400).send(err);
        });
}

function getCurrentUser(req, res) {
    userService.getUserById(req.user.sub)
        .then(function(user) {
            if (user) {
                res.send(user);
            } else {
                res.sendStatus(404);
            }
        })
        .catch(function(err) {
            res.status(400).send(err);
        });
}

function getUserStats(req, res) {
    userService.getUserStats(req.params._id)
        .then(function(stats) {
            res.send(stats);
        })
        .catch(function(err) {
            res.status(400).send(err);
        });
}

function getSuitesById(req, res) {
    userService.getSuitesById(req.params._id)
        .then(function(suites) {
            res.send(suites);
        })
        .catch(function(err) {
            res.status(400).send(err);
        });
}

function getSuiteNames(req, res) {
    userService.getSuiteNames(req.params._id)
        .then(function(suiteNames) {
            res.send(suiteNames);
        })
        .catch(function(err) {
            res.status(400).send(err);
        });
}

function getSuite(req, res) {
    userService.getSuite(req.params._id, req.params.suite)
        .then(function(suite) {
            res.send(suite);
        })
        .catch(function(err) {
            res.status(400).send(err);
        });
}

function getTestsBySuite(req, res) {
    userService.getTestsBySuite(req.params._id, req.params.suite)
        .then(function(tests) {
            res.send(tests);
        })
        .catch(function(err) {
            res.status(400).send(err);
        });
}

function getSuiteStats(req, res) {
    userService.getSuiteStats(req.params._id, req.params.suite)
        .then(function(stats) {
            res.send(stats);
        })
        .catch(function(err) {
            res.status(400).send(err);
        });
}

function getTestNamesBySuite(req, res) {
    userService.getTestNamesBySuite(req.params._id, req.params.suite)
        .then(function(names) {
            res.send(names);
        })
        .catch(function(err) {
            res.status(400).send(err);
        });
}

function getTest(req, res) {
    userService.getTest(req.params._id, req.params.suite, req.params.test)
        .then(function(test) {
            res.send(test);
        })
        .catch(function(err) {
            res.status(400).send(err);
        });
}

function getTestResult(req, res) {
    userService.getTestResult(req.params._id, req.params.suite, req.params.test)
        .then(function(result) {
            res.send(result);
        })
        .catch(function(err) {
            res.status(400).send(err);
        });
}

function getTestStats(req, res) {
    userService.getTestStats(req.params._id, req.params.suite, req.params.test)
        .then(function(stats) {
            res.send(stats);
        })
        .catch(function(err) {
            res.status(400).send(err);
        });
}

function getSuiteHistory(req, res) {
    userService.getSuiteHistory(req.params._id, req.params.suite)
        .then(function(history) {
            res.send(history);
        })
        .catch(function(err) {
            res.status(400).send(err);
        });
}

function getSuiteTestsHistory(req, res) {
    userService.getSuiteTestsHistory(req.params._id, req.params.suite, req.params.history_id)
        .then(function(history) {
            res.send(history);
        })
        .catch(function(err) {
            res.status(400).send(err);
        });
}

function getSuiteTestHistory(req, res) {
    userService.getSuiteTestHistory(req.params._id, req.params.suite, req.params.history_id, req.params.test)
        .then(function(test) {
            res.send(test);
        })
        .catch(function(err) {
            res.status(400).send(err);
        });
}

function getTestHistory(req, res) {
    userService.getTestHistory(req.params._id, req.params.suite, req.params.test, req.params.history_id)
        .then(function(test) {
            res.send(test);
        })
        .catch(function(err) {
            res.status(400).send(err);
        });
}

function updateUser(req, res) {
    userService.updateUser(req.params._id, req.body)
        .then(function() {
            res.sendStatus(200);
        })
        .catch(function(err) {
            res.status(400).send(err);
        });
}

function updateUserPassword(req, res) {
    userService.updateUserPassword(req.params._id, req.body)
        .then(function() {
            res.sendStatus(200);
        })
        .catch(function(err) {
            res.status(400).send(err);
        });
}

function updateStepsID(req, res) {
    userService.updateStepsID(req.params._id, req.params.suite, req.params.test, req.body)
        .then(function() {
            res.sendStatus(200);
        })
        .catch(function(err) {
            res.status(400).send(err);
        });
}

function updateTest(req, res) {
    userService.updateTest(req.params._id, req.params.suite, req.params.test, req.body)
        .then(function() {
            res.sendStatus(200);
        })
        .catch(function(err) {
            res.status(400).send(err);
        });
}

function updateTestResult(req, res) {
    userService.updateTestResult(req.params._id, req.params.suite, req.params.test, req.body)
        .then(function() {
            res.sendStatus(200);
        })
        .catch(function(err) {
            res.status(400).send(err);
        });
}

function updateTestSettings(req, res) {
    userService.updateTestSettings(req.params._id, req.params.suite, req.params.test, req.body)
        .then(function() {
            res.sendStatus(200);
        })
        .catch(function(err) {
            res.status(400).send(err);
        });
}

function updateSuiteSettings(req, res) {
    userService.updateSuiteSettings(req.params._id, req.params.suite, req.body)
        .then(function() {
            res.sendStatus(200);
        })
        .catch(function(err) {
            res.status(400).send(err);
        });
}

function updateSuiteHistory(req, res) {
    userService.updateSuiteHistory(req.params._id, req.params.suite)
        .then(function() {
            res.sendStatus(200);
        })
        .catch(function(err) {
            res.status(400).send(err);
        });
}

function deleteTest(req, res) {
    userService.deleteTest(req.params._id, req.params.suite, req.params.test)
        .then(function() {
            res.sendStatus(200);
        })
        .catch(function(err) {
            res.status(400).send(err);
        });
}

function deleteSuite(req, res) {
    userService.deleteSuite(req.params._id, req.params.suite)
        .then(function() {
            res.sendStatus(200);
        })
        .catch(function(err) {
            res.status(400).send(err);
        });
}

function deleteSuiteHistory(req, res) {
    userService.deleteSuiteHistory(req.params._id, req.params.suite, req.params.history_id)
        .then(function() {
            res.sendStatus(200);
        })
        .catch(function(err) {
            res.status(400).send(err);
        });
}

function deleteSuiteTestHistory(req, res) {
    userService.deleteSuiteTestHistory(req.params._id, req.params.suite, req.params.history_id, req.params.test)
        .then(function() {
            res.sendStatus(200);
        })
        .catch(function(err) {
            res.status(400).send(err);
        });
}

function deleteTestHistory(req, res) {
    userService.deleteTestHistory(req.params._id, req.params.suite, req.params.test, req.params.history_id)
        .then(function() {
            res.sendStatus(200);
        })
        .catch(function(err) {
            res.status(400).send(err);
        });
}

function deleteUser(req, res) {
    userService.deleteUser(req.params._id)
        .then(function() {
            res.sendStatus(200);
        })
        .catch(function(err) {
            res.status(400).send(err);
        });
}