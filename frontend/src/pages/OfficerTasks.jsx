import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import Loader from '../components/extras/Loader';
import { MapPin, CheckCircle, Navigation, Camera, X, Clock } from 'lucide-react';
import uploadImage from '../utils/uploadImage';

const OfficerTasks = () => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [resolvingTask, setResolvingTask] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [proofFile, setProofFile] = useState(null);
    const [proofPreview, setProofPreview] = useState(null);
    
    const { officer, getToken, isSignedIn } = useAuth();
    const BASE_API_URL = import.meta.env.VITE_BACKEND_URL;

    useEffect(() => {
        if (officer) {
            fetchTasks();
        }
    }, [officer]);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const token = await getToken();
            const response = await axios.get(`${BASE_API_URL}/api/officer/${officer._id}/issues`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTasks(response.data);
        } catch (error) {
            console.error('Error fetching tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProofFile(file);
            setProofPreview(URL.createObjectURL(file));
        }
    };

    const handleResolve = async () => {
        if (!proofFile) {
            alert('Please provide a photo as proof of resolution');
            return;
        }

        try {
            setUploading(true);
            const token = await getToken();
            
            // 1. Upload proof image
            const imageData = await uploadImage(proofFile, token);
            
            // 2. Resolve issue in DB
            await axios.patch(`${BASE_API_URL}/api/issues/${resolvingTask._id}/resolve`, {
                resolutionImageUrl: imageData.url,
                officerId: officer._id
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // 3. Update UI
            setTasks(prev => prev.map(t => 
                t._id === resolvingTask._id ? { ...t, status: 'resolved', resolutionImageUrl: imageData.url } : t
            ));
            setResolvingTask(null);
            setProofFile(null);
            setProofPreview(null);
            alert('Issue marked as resolved successfully!');
        } catch (error) {
            console.error('Error resolving task:', error);
            alert('Failed to resolve issue. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const openNavigation = (lat, lng) => {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    };

    if (!isSignedIn || !officer) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] text-center p-4">
                <div className="bg-zinc-100 p-6 rounded-full mb-4">
                    <CheckCircle className="w-12 h-12 text-zinc-400" />
                </div>
                <h2 className="text-2xl font-bold text-zinc-800 mb-2">Access Denied</h2>
                <p className="text-zinc-600 max-w-md">Only registered officers can access this dashboard. Please sign in with your officer account.</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900 mb-2">My Field Tasks</h1>
                    <p className="text-zinc-600">Assigned issues for officer: <span className="font-semibold text-zinc-800">{officer.fullName}</span></p>
                </div>
                <div className="bg-orange-50 text-orange-700 px-4 py-2 rounded-lg border border-orange-100 font-medium">
                    {tasks.filter(t => t.status !== 'resolved').length} Pending
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader />
                </div>
            ) : (
                <div className="grid gap-6">
                    {tasks.length === 0 ? (
                        <div className="bg-white border-2 border-dashed border-zinc-200 rounded-xl p-12 text-center">
                            <Clock className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-zinc-600">No tasks assigned yet</h3>
                            <p className="text-zinc-400">Great job! You are all caught up.</p>
                        </div>
                    ) : (
                        tasks.map(task => (
                            <div key={task._id} className={`bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden transition-all hover:shadow-md ${task.status === 'resolved' ? 'opacity-75' : ''}`}>
                                <div className="p-5">
                                    <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                                    task.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                    {task.status}
                                                </span>
                                                <span className="text-xs text-zinc-400">ID: {task._id}</span>
                                            </div>
                                            <h3 className="text-xl font-bold text-zinc-900">{task.title}</h3>
                                            <p className="text-sm font-medium text-orange-600 mt-1">{task.category}</p>
                                        </div>
                                        <div className="flex-shrink-0">
                                            {task.imageUrl && (
                                                <img src={task.imageUrl} alt="Issue" className="w-24 h-24 object-cover rounded-lg border border-zinc-200" />
                                            )}
                                        </div>
                                    </div>

                                    <p className="text-zinc-600 text-sm mb-5 leading-relaxed">{task.userMessage || "No description provided."}</p>

                                    <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-zinc-100">
                                        <div className="flex items-center gap-1.5 text-sm text-zinc-500">
                                            <MapPin className="w-4 h-4 text-amber-500" />
                                            {task.city}, {task.state}
                                        </div>
                                        
                                        <button 
                                            onClick={() => openNavigation(task.coordinates.latitude, task.coordinates.longitude)}
                                            className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition"
                                        >
                                            <Navigation className="w-4 h-4" />
                                            Navigate
                                        </button>

                                        {task.status !== 'resolved' && (
                                            <button 
                                                onClick={() => setResolvingTask(task)}
                                                className="ml-auto flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-green-700 transition"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                                Resolve
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {task.resolutionImageUrl && (
                                    <div className="bg-green-50 p-4 border-t border-green-100 flex items-center gap-4">
                                        <img src={task.resolutionImageUrl} alt="Resolution" className="w-16 h-16 object-cover rounded border border-green-200" />
                                        <div>
                                            <p className="text-xs font-bold text-green-700 uppercase">Resolution Proof</p>
                                            <p className="text-sm text-green-600">Marked as resolved on {new Date(task.updatedAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Resolve Modal */}
            {resolvingTask && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={() => setResolvingTask(null)}>
                    <div className="bg-white w-full max-w-lg rounded-xl p-6 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Resolve Issue</h2>
                        
                        <div className="space-y-4">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Take Photo (Proof of Resolution)
                                </label>
                                <div className="flex flex-col gap-4">
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        capture="environment" 
                                        id="proof-upload" 
                                        className="hidden" 
                                        onChange={handleFileChange}
                                    />
                                    <label 
                                        htmlFor="proof-upload" 
                                        className="cursor-pointer bg-gray-100 px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-200 transition w-fit text-sm font-medium"
                                    >
                                        Take Photo
                                    </label>
                                    
                                    {proofPreview && (
                                        <div className="relative">
                                            <img src={proofPreview} alt="Preview" className="max-h-48 rounded-md border border-gray-200" />
                                            <button 
                                                onClick={() => { setProofFile(null); setProofPreview(null); }}
                                                className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full text-xs"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={handleResolve}
                                    disabled={uploading || !proofFile}
                                    className="flex-1 bg-yellowOrange text-white py-2 rounded-full font-bold hover:opacity-90 disabled:opacity-50 transition"
                                >
                                    {uploading ? 'Resolving...' : 'Submit Resolution'}
                                </button>
                                <button
                                    onClick={() => setResolvingTask(null)}
                                    className="px-6 py-2 border border-gray-300 rounded-full font-medium hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OfficerTasks;
