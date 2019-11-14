require("dotenv").config();
//config and routes
global.config = require("./config");
require("./config/globals")();

let router = require("./routes");

//express
const express = require("express");
let app = express();

//required modules
const fileUpload = require("express-fileupload");
const bodyParser = require("body-parser");
const cors = require("cors");
var fs = require("fs");
var path = require("path");
var expressValidator = require('express-validator');

//To enable cors
app.use(cors());
app.use(expressValidator())


//health check
app.get("/ping", (req, res) => {
  res.send("pong!");
});

app.use(fileUpload());
app.use(bodyParser.json({ limit: '50MB' }));
app.use(bodyParser.urlencoded({ limit: '50MB', extended: false }));
app.use(express.static("public"));

fs.existsSync("logs") || fs.mkdirSync("logs");

const serviceBaseUrl = process.env.APPLICATION_BASE_URL || "/assessment/";

const observationSubmissionsHtmlPath = process.env.OBSERVATION_SUBMISSIONS_HTML_PATH ? process.env.OBSERVATION_SUBMISSIONS_HTML_PATH : "observationSubmissions"
app.use(express.static(observationSubmissionsHtmlPath));
app.get(serviceBaseUrl + observationSubmissionsHtmlPath + "/*", (req, res) => {
  let urlArray = req.path.split("/")
  urlArray.splice(0, 3)
  res.sendFile(path.join(__dirname, "/public/" + observationSubmissionsHtmlPath + "/" + urlArray.join("/")));
});

//API documentation (apidoc)
if (process.env.NODE_ENV == "development" || process.env.NODE_ENV == "local") {
  app.use(express.static("apidoc"));
  if (process.env.NODE_ENV == "local") {
    app.get("/apidoc", (req, res) => {
      res.sendFile(path.join(__dirname, "/public/apidoc/index.html"));
    });
  } else {
    app.get(serviceBaseUrl + "apidoc/*", (req, res) => {
      let urlArray = req.path.split("/")
      urlArray.splice(0, 3)
      res.sendFile(path.join(__dirname, "/public/apidoc/" + urlArray.join("/")));
    });
  }
}


app.get(serviceBaseUrl + "web2/*", function (req, res) {
  res.sendFile(path.join(__dirname, "/public" + serviceBaseUrl + "web2/index.html"));
});

var bunyan = require("bunyan");
global.loggerObj = bunyan.createLogger({
  name: "foo",
  streams: [
    {
      type: "rotating-file",
      path: path.join(__dirname + "/logs/" + process.pid + "-all.log"),
      period: "1d", // daily rotation
      count: 3 // keep 3 back copies
    }
  ]
});
global.loggerExceptionObj = bunyan.createLogger({
  name: "exceptionLogs",
  streams: [
    {
      type: "rotating-file",
      path: path.join(__dirname + "/logs/" + process.pid + "-exception.log"),
      period: "1d", // daily rotation
      count: 3 // keep 3 back copies
    }
  ]
});

// i18next implementation
var i18next = require("i18next");
var i18NextMiddleware = require("i18next-express-middleware");
let nodeFsBackend = require('i18next-node-fs-backend');

i18next.use(nodeFsBackend).init({
  fallbackLng: global.locales[0],
  lowerCaseLng: true,
  preload: global.locales,
  backend: {
    loadPath: __dirname + '/locales/{{lng}}.json',
  },
  saveMissing: true
});


app.use(
  i18NextMiddleware.handle(i18next, {
    removeLngFromUrl: false
  })
);

// End of i18Next

app.all("*", (req, res, next) => {
  if (ENABLE_BUNYAN_LOGGING === "ON") {
    loggerObj.info({
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body
    });
  }

  if (ENABLE_CONSOLE_LOGGING === "ON") {
    console.log("-------Request log starts here------------------");
    console.log(
      "%s %s on %s from ",
      req.method,
      req.url,
      new Date(),
      req.headers["user-agent"]
    );
    console.log("Request Headers: ", req.headers);
    console.log("Request Body: ", req.body);
    console.log("Request Files: ", req.files);
    console.log("-------Request log ends here------------------");
  }
  next();
});

// Scheduler starts here

const schedule = require("node-schedule");

// Pending Assessments

schedule.scheduleJob(process.env.SCHEDULE_FOR_PENDING_ASSESSMENT, () => {

  console.log("<---- Pending Assessment cron started  ---->", new Date());

  let samikshaService = require(ROOT_PATH + "/generics/helpers/samiksha");
  let notificationHelpers = require(ROOT_PATH + "/module/notifications/helper");

  return new Promise(async (resolve, reject) => {
    let pendingAssessments = await samikshaService.pendingAssessments()

    if (pendingAssessments.result.length > 0) {
      await notificationHelpers.pendingAssessments(pendingAssessments.result)
    }

    console.log("<---  Pending Assessment cron ended  ---->", new Date());
    resolve()

  })

});

// Pending Observations

schedule.scheduleJob(process.env.SCHEDULE_FOR_PENDING_OBSERVATION, () => {

  console.log("<----- Pending Observations cron started ---->", new Date());

  let samikshaService = require(ROOT_PATH + "/generics/helpers/samiksha");
  let notificationHelpers = require(ROOT_PATH + "/module/notifications/helper");

  return new Promise(async (resolve, reject) => {
    let pendingObservations = await samikshaService.pendingObservations()

    if (pendingObservations.result.length > 0) {
      await notificationHelpers.pendingObservations(pendingObservations.result)
    }

    console.log("<----- Pending Observations cron stopped --->", new Date());
    resolve()

  })

});


// Completed Assessment

schedule.scheduleJob(process.env.SCHEDULE_FOR_COMPLETED_ASSESSMENT, () => {

  console.log("<---- Completed Assessment cron started ---->", new Date());

  let samikshaService = require(ROOT_PATH + "/generics/helpers/samiksha");
  let notificationHelpers = require(ROOT_PATH + "/module/notifications/helper");

  return new Promise(async (resolve, reject) => {
    let completedAssessments = await samikshaService.completedAssessments()

    if (completedAssessments.result.length > 0) {

      await notificationHelpers.completedAssessment(completedAssessments.result)

    }

    console.log("<--- Completed Assessment cron stopped ---->", new Date());
    resolve()

  })

});

// Completed Observations

schedule.scheduleJob(process.env.SCHEDULE_FOR_COMPLETED_OBSERVATION, () => {

  console.log("<---- Completed Observations cron started ---->", new Date());

  let samikshaService = require(ROOT_PATH + "/generics/helpers/samiksha");
  let notificationHelpers = require(ROOT_PATH + "/module/notifications/helper");

  return new Promise(async (resolve, reject) => {
    let completedObservations = await samikshaService.completedObservations()

    if (completedObservations.result.length > 0) {

      await notificationHelpers.completedObservations(completedObservations.result)

    }

    console.log("<---- Completed Observations cron stopped --->", new Date());
    resolve()

  })

});

// Delete Read Notification

schedule.scheduleJob(process.env.SCHEDULE_FOR_READ_NOTIFICATION, () => {

  console.log("<-----  Delete Read Notification cron started ---- >", new Date());

  let notificationHelpers = require(ROOT_PATH + "/module/notifications/helper");

  return new Promise(async (resolve, reject) => {

    await notificationHelpers.deleteReadNotification()

    console.log("<-----  Delete Read Notification cron stopped ---- >", new Date());
    resolve()

  })

});

// Delete UnRead Notification

schedule.scheduleJob(process.env.SCHEDULE_FOR_UNREAD_NOTIFICATION, () => {

  console.log("<-----  Delete UnRead Notification cron started ---- >", new Date());

  let notificationHelpers = require(ROOT_PATH + "/module/notifications/helper");

  return new Promise(async (resolve, reject) => {

    await notificationHelpers.deleteUnReadNotification()

    console.log("<-----  Delete UnRead Notification cron stopped ---- >", new Date());
    resolve()

  })

});


//Delete Read Notification for unnati

schedule.scheduleJob(process.env.SCHEDULE_FOR_READ_NOTIFICATION_UNNATI, () => {

  console.log("<-----  Delete Read Notification for unnati cron started ---- >", new Date());

  let notificationHelpers = require(ROOT_PATH + "/module/notifications/helper");

  return new Promise(async (resolve, reject) => {

    await notificationHelpers.customDeleteReadNotification("unnati")
    console.log("<-----  Delete Read Notification for unnati cron stopped ---- >", new Date());
    resolve()

  })

});


// Delete UnRead Notification for unnati

schedule.scheduleJob(process.env.SCHEDULE_FOR_UNREAD_NOTIFICATION_UNNATI, () => {

  console.log("<-----  Delete UnRead Notification for Unnati cron started ---- >", new Date());

  let notificationHelpers = require(ROOT_PATH + "/module/notifications/helper");

  return new Promise(async (resolve, reject) => {

    await notificationHelpers.customdeleteUnReadNotification("unnati")

    console.log("<-----  Delete UnRead Notification for Unnati cron stopped ---- >", new Date());
    resolve()

  })

});


// Scheduler ends here




//add routing
router(app);

//listen to given port
app.listen(config.port, () => {

  console.log(
    "Environment: " +
    (process.env.NODE_ENV ? process.env.NODE_ENV : "development")
  );

  console.log("Application is running on the port:" + config.port);

});
