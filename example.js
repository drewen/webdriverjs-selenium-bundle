// This example shows how you can run a webdriverio client without starting a selenium server
// separately.

var wdjsSeleniumBundle = require("./index");

wdjsSeleniumBundle.setup({autostop: true, port: 4444, browserName: 'chrome'}, function(client) {
	client.init()
    .url("https://github.com/")
    .getTitle(function(err, title) {
        console.log();
        console.log("GITHUB TITLE: %s", title);
        console.log();
    })
    .end();
});
