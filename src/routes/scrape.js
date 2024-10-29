var express = require('express');
var router = express.Router();
const monitorJobs = require('../scrape/scrape')
/* GET users listing. */
router.get('/', async function(req, res, next) {
  const jobs = await monitorJobs()
  res.send(`Jobs: ${jobs?.newJobs}`);
  // res.status(200).json(jobs)
});

module.exports = router;
