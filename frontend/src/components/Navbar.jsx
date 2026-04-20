import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { SignedIn, SignedOut, SignInButton, UserButton, SignOutButton } from '../components/AuthComponents'
import { useAuth } from '../contexts/AuthContext'

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { user, isAdmin, isOfficer } = useAuth();
    const admin = isAdmin();
    const officer = isOfficer();

    return (
        <nav className="bg-white z-40 px-2 py-4 text-gray-900 shadow-xs">
            <div className="container mx-auto flex justify-between items-center">
                <Link to={user ? '/dashboard' : '/'} className='cursor-pointer w-2/6 sm:w-1/12 h-10'><img className=' object-contain w-full h-full' src="/light_mode_logo.png" alt="Logo" /></Link>
                <button
                    className="flex md:hidden cursor-pointer items-center px-2"
                    onClick={() => setIsOpen(!isOpen)}
                    aria-label="Toggle navigation"
                >
                    <svg
                        className="w-6 h-6 transition-transform duration-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        style={{
                            transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                            transition: 'transform 0.3s',
                        }}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
                        />
                    </svg>
                </button>
                <div className={`flex-col bg-white md:flex-row ${isOpen ? 'flex' : 'hidden'} md:flex gap-4 items-center md:static absolute top-16 left-0 w-full md:bg-transparent md:w-auto z-10`}>
                    {
                        !admin && !officer && (
                            <>
                                <Link to={user ? '/dashboard' : '/'} className="px-1 py-2 md:py-0 hover:opacity-60" onClick={() => setIsOpen(false)}>{user ? 'Dashboard' : 'Home'}</Link>
                                <Link to="/community" className="px-1 py-2 md:py-0 hover:opacity-60" onClick={() => setIsOpen(false)}>Community Feed</Link>
                                <Link to="/report" className="px-1 py-2 md:py-0 hover:opacity-60" onClick={() => setIsOpen(false)}>Report Issue</Link>
                            </>
                        )
                    }
                    {officer && (
                        <>
                            <Link to="/dashboard" className="px-1 py-2 md:py-0 hover:opacity-60" onClick={() => setIsOpen(false)}>Home</Link>
                            <Link to="/officer/tasks" className="px-1 py-2 md:py-0 hover:opacity-60" onClick={() => setIsOpen(false)}>My Tasks</Link>
                            <Link to="/community" className="px-1 py-2 md:py-0 hover:opacity-60" onClick={() => setIsOpen(false)}>Community Feed</Link>
                        </>
                    )}
                    {admin && (
                        <>
                            <Link to="/admin/dashboard" className="px-1 py-2 md:py-0 hover:opacity-60" onClick={() => setIsOpen(false)}>Dashboard</Link>
                            <Link to="/admin/issues" className="px-1 py-2 md:py-0 hover:opacity-60" onClick={() => setIsOpen(false)}>Manage Issues</Link>
                            <Link to="/community" className="px-1 py-2 md:py-0 hover:opacity-60" onClick={() => setIsOpen(false)}>Community Feed</Link>
                        </>
                    )}
                    {/* User section */}
                    <div className="hidden md:flex items-center px-1 py-2 md:py-0">
                        <SignedIn>
                            <SignOutButton />
                        </SignedIn>
                        <SignedOut>
                            <SignInButton mode='modal' />
                        </SignedOut>
                    </div>
                    {/* User section for mobile */}
                    <div className={`md:hidden ${isOpen ? 'block' : 'hidden'} px-1 py-2 pb-3 md:py-0`}>
                        <SignedIn>
                            <SignOutButton />
                        </SignedIn>
                        <SignedOut>
                            <SignInButton mode='modal' />
                        </SignedOut>
                    </div>
                </div>
            </div>
        </nav>
    )
}

export default Navbar
