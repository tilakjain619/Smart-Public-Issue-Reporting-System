const Issue = require('../models/Issue');
const analyzeImage = require('../utils/analyseImage');
const getLocation = require('../utils/getLocation');
const { logAction } = require('./logControl');
const { users } = require('../lib/appwrite');
const { sendDynamicEmail } = require('../utils/emailFunctionClient');

// Create a new issue
const createIssue = async (req, res) => {
    try {
        console.log('📝 Create issue request received');
        console.log('Request body:', req.body);

        const { userId, userMessage, coordinates, imageUrl } = req.body;

        console.log("userId:", userId);

        if (!userId) {
            console.log('No user ID found in auth');
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!coordinates || !coordinates.latitude || !coordinates.longitude) {
            console.log('Invalid coordinates:', coordinates);
            return res.status(400).json({ error: 'Valid location is required' });
        }

        if (!imageUrl) {
            console.log('No image URL provided');
            return res.status(400).json({ error: 'Image is required' });
        }

        // Analyze image to get category and title via AI
        const analysis = await analyzeImage(imageUrl);
        console.log('Analysis:', analysis);
        // Get city and state from coordinates
        const { city, state } = await getLocation(coordinates.latitude, coordinates.longitude);
        console.log('💾 Creating issue in database...');

            // Fetch user email and name from Appwrite for email notifications
        let userEmail = '';
        let userName = 'Citizen';
        try {
            if (users) {
                const appwriteUser = await users.get(userId);
                console.log('Appwrite user', appwriteUser);
                userEmail = appwriteUser?.email || '';
                userName = appwriteUser?.name || 'Citizen';
            }
        } catch (error) {
            console.warn(`Could not fetch user details from Appwrite: ${error.message}`);
        }

        const newIssue = await Issue.create({
            userId,
            userEmail,
            userName,
            userMessage: userMessage || '',
            category: analysis.category || 'Unknown',
            title: analysis.title || "Unknown Issue",
            coordinates,
            city: city,
            state: state,
            imageUrl: imageUrl || ''
        });

        // Log the issue creation
        await logAction({
            userType: 'user',
            userId: userId,
            action: 'Create Issue',
            issueId: newIssue._id,
            details: `New issue "${newIssue.title}" reported in ${city}, ${state}`,
            severity: 'info',
            req
        });

        res.status(201).json(newIssue);
    } catch (error) {
        console.error('Error creating issue:', error.message);
        res.status(500).json({ error: error.message });
    }
}

const getAllIssues = async (req, res) => {
    try {
        const issues = await Issue.find().populate('assignedOfficer').sort({ createdAt: -1 });
        res.status(200).json(issues);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const getUsersIssues = async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const issues = await Issue.find({ userId }).populate('assignedOfficer').sort({ createdAt: -1 });
        if (!issues || issues.length === 0) {
            return res.status(404).json({ message: 'No issues found for this user' });
        }
        res.status(200).json(issues);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const getIssues = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            city,
            state,
            sortBy = "createdAt",
            order = "desc",
        } = req.query;

        // Build dynamic filter object
        const filter = {};
        if (status) filter.status = status;
        if (city) filter.city = { $regex: city, $options: "i" }; // case-insensitive
        if (state) filter.state = { $regex: state, $options: "i" };

        // Sorting logic
        const sortOrder = order === "asc" ? 1 : -1;
        const sortOptions = { [sortBy]: sortOrder };

        // Pagination
        const skip = (page - 1) * limit;

        const issues = await Issue.find(filter, { __v: 0 })
            .populate('assignedOfficer')
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit));

        // Get total count for pagination info
        const total = await Issue.countDocuments(filter);

        // structured response
        res.status(200).json({
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit),
            count: issues.length,
            issues,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const updateIssueStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const validStatuses = ['open', 'in progress', 'pending', 'closed', 'resolved'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status value' });
        }
        const issue = await Issue.findById(id);
        if (!issue) {
            return res.status(404).json({ error: 'Issue not found' });
        }

        const previousStatus = issue.status;
        issue.status = status;
        await issue.save();

        // Log the status update
        await logAction({
            userType: 'admin', // Assume admin is updating status
            userId: req.body.userId || 'system',
            action: 'Update Issue Status',
            issueId: id,
            details: `Issue status changed from "${previousStatus}" to "${status}"`,
            severity: status === 'resolved' ? 'info' : 'warning',
            req
        });
        if (status === 'resolved' && previousStatus !== 'resolved') {
            try {
                // Use email stored with issue, or fallback to request body
                let recipientEmail = req.body.email || issue.userEmail;
                let recipientName = req.body.userName || issue.userName || 'Citizen';

                if (recipientEmail) {
                    const emailResult = await sendDynamicEmail({
                        email: recipientEmail,
                        type: 'issue_resolved',
                        templateData: {
                            userName: recipientName,
                            issueTitle: issue.title,
                            issueId: issue._id?.toString(),
                            city: issue.city,
                            state: issue.state,
                            previousStatus,
                            currentStatus: status,
                            resolutionImageUrl: issue.resolutionImageUrl
                        }
                    });

                    if (emailResult && emailResult.success === false) {
                        throw new Error(typeof emailResult.error === 'string' ? emailResult.error : 'Email provider rejected request');
                    }
                } else {
                    console.warn(`Skipped issue resolved email for issue ${id}: recipient email not found`);
                }
            } catch (emailError) {
                console.error('Failed to send issue resolved email:', emailError.message);
                await logAction({
                    userType: 'admin',
                    userId: req.body.userId || 'system',
                    action: 'Issue Resolved Email Failed',
                    issueId: id,
                    details: `Failed to send resolved email notification: ${emailError.message}`,
                    severity: 'warning',
                    req
                });
            }
        }

        res.status(200).json(issue);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
const deleteIssue = async (req, res) => {
    try {
        const { id } = req.params;
        const issue = await Issue.findById(id);
        if (!issue) {
            return res.status(404).json({ error: 'Issue not found' });
        }

        // Store issue details before deletion for logging
        const issueTitle = issue.title;
        const issueCity = issue.city;

        await Issue.findByIdAndDelete(id);

        // Log the deletion
        await logAction({
            userType: 'admin',
            userId: req.body.userId || 'system',
            action: 'Delete Issue',
            issueId: id,
            details: `Issue "${issueTitle}" deleted from ${issueCity}`,
            severity: 'warning',
            req
        });

        res.status(200).json({ message: 'Issue deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const searchIssues = async (req, res) => {
    try {
        const { query } = req.query;
        const issues = await Issue.find({
            $or: [
                { title: { $regex: query, $options: 'i' } },
                { category: { $regex: query, $options: 'i' } },
                { city: { $regex: query, $options: 'i' } },
                { state: { $regex: query, $options: 'i' } }
            ]
        });
        res.status(200).json(issues);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
const voteIssue = async (req, res) => {
    try {
        const { id } = req.params;
        const issue = await Issue.findById(id);
        if (!issue) {
            return res.status(404).json({ error: 'Issue not found' });
        }
        if (!issue.voters) issue.voters = [];
        const userId = req.body.userId;
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required to vote' });
        }

        let voteAction;
        if (issue.voters.includes(userId)) {
            issue.votes = Math.max(0, issue.votes - 1);
            issue.voters = issue.voters.filter(voter => voter !== userId);
            voteAction = 'removed vote from';
        } else {
            issue.votes = (issue.votes || 0) + 1;
            issue.voters.push(userId);
            voteAction = 'voted on';
        }

        await issue.save();

        // Log the vote action
        await logAction({
            userType: 'user',
            userId: userId,
            action: 'Vote on Issue',
            issueId: id,
            details: `User ${voteAction} issue "${issue.title}" (Total votes: ${issue.votes})`,
            severity: 'info',
            req
        });

        res.status(200).json(issue);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const assignOfficerToIssue = async (req, res) => {
    try {
        const { id } = req.params;
        const { officerId } = req.body;

        const issue = await Issue.findById(id);
        if (!issue) {
            return res.status(404).json({ error: 'Issue not found' });
        }

        issue.assignedOfficer = officerId || null;
        if (officerId) {
            issue.status = 'in progress'; // Auto-update status when assigned
        }
        await issue.save();

        const updatedIssue = await Issue.findById(id).populate('assignedOfficer');

        // Log the assignment
        await logAction({
            userType: 'admin',
            userId: req.body.userId || 'system',
            action: 'Assign Officer',
            issueId: id,
            details: officerId ? `Issue assigned to officer ${officerId}` : `Issue assignment removed`,
            severity: 'info',
            req
        });

        // Send email to assigned officer
        if (officerId && updatedIssue.assignedOfficer && updatedIssue.assignedOfficer.email) {
            try {
                await sendDynamicEmail({
                    email: updatedIssue.assignedOfficer.email,
                    type: 'issue_assigned',
                    templateData: {
                        officerName: updatedIssue.assignedOfficer.fullName,
                        issueTitle: updatedIssue.title,
                        issueId: updatedIssue._id.toString(),
                        city: updatedIssue.city,
                        state: updatedIssue.state
                    }
                });
            } catch (emailError) {
                console.error('Failed to send assignment email:', emailError.message);
                // Log the email failure
                await logAction({
                    userType: 'system',
                    userId: 'system',
                    action: 'Email Notification Failed',
                    issueId: id,
                    details: `Failed to notify officer ${updatedIssue.assignedOfficer.fullName} via email: ${emailError.message}`,
                    severity: 'warning',
                    req
                });
            }
        }

        res.status(200).json(updatedIssue);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const getOfficerIssues = async (req, res) => {
    try {
        const { officerId } = req.params;
        if (!officerId) {
            return res.status(400).json({ error: 'Officer ID is required' });
        }

        const issues = await Issue.find({ assignedOfficer: officerId }).sort({ updatedAt: -1 });
        res.status(200).json(issues);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const resolveIssueByOfficer = async (req, res) => {
    try {
        const { id } = req.params;
        const { resolutionImageUrl, officerId } = req.body;

        if (!resolutionImageUrl) {
            return res.status(400).json({ error: 'Resolution image is required' });
        }

        const issue = await Issue.findById(id);
        if (!issue) {
            return res.status(404).json({ error: 'Issue not found' });
        }

        // Verify if the officer is the one assigned
        if (issue.assignedOfficer.toString() !== officerId) {
            return res.status(403).json({ error: 'You are not assigned to this issue' });
        }

        issue.status = 'resolved';
        issue.resolutionImageUrl = resolutionImageUrl;
        await issue.save();

        // Log the resolution
        await logAction({
            userType: 'officer',
            userId: officerId,
            action: 'Resolve Issue',
            issueId: id,
            details: `Issue "${issue.title}" resolved with proof image.`,
            severity: 'info',
            req
        });

        // Send resolution email to the person who reported it
        if (issue.userEmail) {
            try {
                await sendDynamicEmail({
                    email: issue.userEmail,
                    type: 'issue_resolved',
                    templateData: {
                        userName: issue.userName || 'Citizen',
                        issueTitle: issue.title,
                        issueId: issue._id.toString(),
                        city: issue.city,
                        state: issue.state,
                        resolutionImageUrl: resolutionImageUrl
                    }
                });
            } catch (emailError) {
                console.error('Failed to send resolution email to reporter:', emailError.message);
                await logAction({
                    userType: 'system',
                    userId: 'system',
                    action: 'Email Notification Failed',
                    issueId: id,
                    details: `Failed to notify reporter ${issue.userName} of resolution: ${emailError.message}`,
                    severity: 'warning',
                    req
                });
            }
        }

        res.status(200).json(issue);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = { 
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
};