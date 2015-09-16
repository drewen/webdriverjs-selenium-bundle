var webdriverio = require("webdriverio");
var seleniumStandalone = require('selenium-standalone');
var path = require('path');
var phantomjs = require('phantomjs');
var phantomjsFile = phantomjs.path;
var driverPaths = require('selenium-standalone/lib/compute-fs-paths')({
  seleniumVersion: '2.47.1',
  drivers: {
    chrome: {
      version: '2.18',
      arch: process.arch,
      baseURL: 'http://chromedriver.storage.googleapis.com'
    },
    ie: {
      version: '2.47.0',
      arch: process.arch,
      baseURL: 'http://selenium-release.storage.googleapis.com'
    }
  }});

var selenium;

/**
 * Boots a java child process running the Selenium Standalone server
 * @param {Number} port Server port, defaulted to 4444 at higher level
 * @param {Function} callback Function to run after server is creates, callback(err, child_process)
 */

var startSelenium = function(port, callback) {

    seleniumStandalone.start({
        spawnOptions: {
            stdio: ['ignore', 'pipe', 'pipe']
        },
        seleniumArgs: [
            '-Dphantomjs.binary.path=' + phantomjsFile + '',
            '-port', port
        ]
    },
        callback
    );
};

/**
 * Helper function to kill selenium server
 */

var killSelenium = function() {
    if (selenium) {
        selenium.kill();
        selenium = null;
    } else {
        console.log("ERR> Selenium not started");
    }
};


/**
 * Gets the desiredCapabilities object for webdriver instantiation, currently only for chrome and phantomjs
 * @param {string} browserName
 * @return {Object} desired capabilities, formatted for use by webdriver.io
 */
var getDesiredCapabilities = function(browserName) {
    if (browserName === 'chrome') {
        return {
            browserName: 'chrome'
            // 'chromeOptions.binary': driverPaths.chrome.installPath
        };
    }
    if (browserName === 'phantomjs') {
        return {
            browserName: 'phantomjs',
            phantomjs: {
                binary: {
                    path: phantomjsFile
                }
            }
        };
    }
};

/**
 * Setups function to initiate selenium server and webdriver client
 * @param {Object} options, include port, autostop, browserName
 * @param {Function} callback, runs after server and client are created. Provided the Webdriver client
 */
var setup = function(opts, callback) {

    // Pull together our options, use defaults if necessary
    var port = opts.port || 4444;
    var autostop = opts.autostop || false;

    // browserName is required, throw error if not present
    if (!opts.browserName) {
        throw "browserName is a required option";
    }
    var desiredCapabilities = getDesiredCapabilities(opts.browserName);

    // Install any outstanding selenium drivers
    seleniumStandalone.install({}, function() {

        // Create the Webdriver client
        var client = webdriverio.remote({
            desiredCapabilities: desiredCapabilities,
            port: port
        });

        // Re-map init command to _init
        client.addCommand("_init", client.init);

        // Add a hook to the init command to start selenium if it is not running
        client.addCommand("init", function(cb) {
            if (!selenium) {
                startSelenium(port, function(err, server) {
                    selenium = server;
                    client._init().call(cb);
                });
            } else {
                client._init().call(cb);
            }
        });


        // If we're using auto-stop, we want to kill the server on .end()
        if (autostop) {

            // Re-map end command to _end
            client.addCommand('_end', client.end);

            // Add a hook to the end command to kill selenium if it is running
            client.addCommand("end", function(cb) {
                if (selenium) {
                    client._end().call(function(cb) {
                        killSelenium();
                        if (typeof cb == "function") {
                            cb();
                        }
                    });

                } else {
                    client._end.call(cb);
                }
            });

        }

        // Send our Webdriver client to our callback
        callback(client);

    });
};


module.exports = {
    setup: setup
};
