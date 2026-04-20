import React, { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { TrendingUp, UserCheck, Shield } from 'lucide-react';
import axios from 'axios';

const IssuePopup = ({issue, setShowIssuePopup, onUpdate}) => {
  const { isSignedIn, getToken, user, isAdmin } = useAuth();
  const BASE_API_URL = import.meta.env.VITE_BACKEND_URL;

  const [issueData, setIssueData] = useState(issue);
  const [votes, setVotes] = useState(issue.votes || 0);
  const [voted, setVoted] = useState(Boolean(issue.voters?.includes(user?.$id)));
  const [officers, setOfficers] = useState([]);
  const [selectedOfficer, setSelectedOfficer] = useState(issue.assignedOfficer?._id || '');
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    setIssueData(issue);
    setVotes(issue.votes || 0);
    setVoted(Boolean(issue.voters?.includes(user?.$id)));
    setSelectedOfficer(issue.assignedOfficer?._id || '');
    
    if (isAdmin()) {
        fetchOfficers();
    }
  }, [issue, user]);

  const fetchOfficers = async () => {
    try {
        const authToken = await getToken();
        const response = await axios.get(`${BASE_API_URL}/api/officers`, {
            headers: {
                Authorization: `Bearer ${authToken}`,
            }
        });
        setOfficers(response.data.officers || []);
    } catch (error) {
        console.error('Error fetching officers:', error);
    }
  };

  const statusClasses = (() => {
    const s = (issueData.status || '').toLowerCase()
    if (s.includes('resolv')) return 'bg-green-100 text-green-800'
    if (s.includes('progress')) return 'bg-blue-100 text-blue-800'
    return 'bg-red-100 text-red-800'
  })()

  const handleVote = async () => {
    if (!isSignedIn) return;
    try {
      const authToken = await getToken();
      const response = await axios.post(`${BASE_API_URL}/api/issues/${issue._id}/vote`, {
        userId: user.$id
      }, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        }
      });
      setVotes(response.data.votes);
      setVoted(prev => !prev);

    } catch (error) {
      console.error('Error voting:', error);
    }
  }

  const handleAssignOfficer = async (officerId) => {
    try {
        setIsAssigning(true);
        const authToken = await getToken();
        const response = await axios.patch(`${BASE_API_URL}/api/issues/${issue._id}/assign`, {
            officerId: officerId,
            userId: user.$id
        }, {
            headers: {
                Authorization: `Bearer ${authToken}`,
            }
        });
        setSelectedOfficer(officerId);
        setIssueData(response.data); // Update local state with populated issue from server
        if (onUpdate) onUpdate(response.data); // Notify parent
    } catch (error) {
        console.error('Error assigning officer:', error);
    } finally {
        setIsAssigning(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => setShowIssuePopup(false)}
      role="dialog"
      aria-modal="true"
      aria-label={`Issue ${issueData.title}`}
    >
      <div
        className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl p-5 md:p-6 transform transition-all overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-wrap sm:flex-nowrap items-start justify-between gap-3">
          <div>
            <span className="inline-block text-xs bg-amber-300 px-3 py-1 rounded-full text-zinc-700">
              {issueData.category}
            </span>
            <h2 className="mt-3 text-lg font-semibold leading-tight text-zinc-900">
              {issueData.title}
            </h2>
            <div className="mt-1 text-xs text-zinc-500">
              <span>Issue ID: {issueData._id}</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <span className={`px-3 capitalize py-1 rounded-full text-xs font-medium ${statusClasses}`}>
              {issueData.status || 'Unknown'}
            </span>
            <span className="text-xs text-zinc-500 capitalize font-medium">{issueData.city || ''}</span>
          </div>
        </div>

        {/* Assigned Officer Badge */}
        {issueData.assignedOfficer && (
            <div className="mt-4 flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-100">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">
                    Assigned to: {issueData.assignedOfficer.fullName}
                </span>
            </div>
        )}

        {/* Image / content */}
        {issueData.imageUrl ? (
          <img
            src={issueData.imageUrl}
            alt="Issue"
            className="mt-4 w-full max-h-64 object-cover rounded-md border border-zinc-200"
          />
        ) : (
          <div className="mt-4 w-full h-32 flex items-center justify-center rounded-md border border-dashed border-zinc-200 text-zinc-400 py-8">
            No image provided
          </div>
        )}

        {/* Message */}
        {issueData.userMessage ? (
          <p className="mt-4 text-sm text-zinc-700 leading-relaxed">{issueData.userMessage}</p>
        ) : (
          <p className="mt-4 text-sm text-zinc-500 italic">No description provided.</p>
        )}

        {/* Admin Assignment Section */}
        {isAdmin() && (
            <div className="mt-6 pt-4 border-t border-zinc-100">
                <div className="flex items-center gap-2 mb-3 text-zinc-700">
                    <Shield className="w-4 h-4 text-zinc-500" />
                    <h3 className="text-sm font-semibold">Admin: Assign Officer</h3>
                </div>
                <div className="flex gap-2">
                    <select
                        value={selectedOfficer}
                        onChange={(e) => handleAssignOfficer(e.target.value)}
                        disabled={isAssigning}
                        className="flex-1 text-sm bg-white border border-zinc-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none disabled:bg-zinc-50"
                    >
                        <option value="">-- Select Officer --</option>
                        {officers.map(off => (
                            <option key={off._id} value={off._id}>
                                {off.fullName} ({off.role})
                            </option>
                        ))}
                    </select>
                    {isAssigning && (
                        <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin self-center"></div>
                    )}
                </div>
            </div>
        )}

        {/* Footer actions */}
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-zinc-100 pt-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-zinc-600">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              <span className="font-medium">{votes}</span>
              <span className="text-xs text-zinc-400">votes</span>
            </div>

            {isSignedIn && !isAdmin() && (
              <button
                onClick={handleVote}
                className={`px-4 py-1.5 rounded-md text-sm font-semibold transition ${
                  voted ? 'bg-orange-600 text-white shadow-sm' : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                }`}
              >
                {voted ? 'Voted' : 'Vote'}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowIssuePopup(false)}
              className="text-sm px-5 py-1.5 rounded-md bg-zinc-900 font-semibold text-white hover:bg-zinc-800 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default IssuePopup;
