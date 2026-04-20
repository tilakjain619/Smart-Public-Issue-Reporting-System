const { requireAuth } = require('../middleware/auth');
const express = require('express');
const router = express.Router();

const { 
  createIssue, 
  getIssues, 
  updateIssueStatus, 
  deleteIssue, 
  getAllIssues, 
  searchIssues,
  getUsersIssues,
  voteIssue,
  assignOfficerToIssue,
  getOfficerIssues,
  resolveIssueByOfficer
} = require('../controllers/IssueControl');

router.get('/issues', getIssues);
router.get('/issues/all', getAllIssues);
router.get('/issues/search', searchIssues);
router.get('/user/:userId/issues', requireAuth(), getUsersIssues);
router.get('/officer/:officerId/issues', requireAuth(), getOfficerIssues);

router.post('/issues', requireAuth(), createIssue);
router.patch('/issues/:id/status', requireAuth(), updateIssueStatus);
router.patch('/issues/:id/assign', requireAuth(), assignOfficerToIssue);
router.patch('/issues/:id/resolve', requireAuth(), resolveIssueByOfficer);
router.delete('/issues/:id', requireAuth(), deleteIssue);
router.post('/issues/:id/vote', requireAuth(), voteIssue);

module.exports = router;