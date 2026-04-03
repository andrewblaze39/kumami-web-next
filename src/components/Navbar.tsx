'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    addNotification,
  } = useNotifications();
  
  const [userData, setUserData] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
  const [educationDropdownOpen, setEducationDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!currentUser || !currentUser.email) return "KW";
    const parts = currentUser.email.split("@");
    if (parts.length === 0) return "KW";
    return parts[0].substring(0, 2).toUpperCase();
  };

  // Function to handle logout
  async function handleLogout() {
    try {
      await logout();
      addNotification("Successfully logged out!");
      // In Next.js, we'll use router.push instead of navigate
      window.location.href = "/";
    } catch (error) {
      console.error("Failed to log out:", error);
    }
  }

  // Toggle dropdown functions
  const toggleCompanyDropdown = () => {
    setCompanyDropdownOpen(!companyDropdownOpen);
    setEducationDropdownOpen(false);
    setProfileDropdownOpen(false);
    setNotificationDropdownOpen(false);
  };

  const toggleEducationDropdown = () => {
    setEducationDropdownOpen(!educationDropdownOpen);
    setCompanyDropdownOpen(false);
    setProfileDropdownOpen(false);
    setNotificationDropdownOpen(false);
  };

  const toggleProfileDropdown = () => {
    setProfileDropdownOpen(!profileDropdownOpen);
    setCompanyDropdownOpen(false);
    setEducationDropdownOpen(false);
    setNotificationDropdownOpen(false);
  };

  const toggleNotificationDropdown = () => {
    setNotificationDropdownOpen(!notificationDropdownOpen);
    setCompanyDropdownOpen(false);
    setEducationDropdownOpen(false);
    setProfileDropdownOpen(false);
  };

  return (
    <nav className="w-full bg-black py-4 px-6 flex items-center justify-between fixed top-0 left-0 right-0 z-[2000]">
      {/* Logo & Menu */}
      <div className="flex items-center gap-10">
        <Link href="/" className="no-underline">
          <img src="/logo-kumami-final.png" alt="Kumami Logo" className="h-10" />
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex gap-8 text-white font-normal text-base">
          <div className="relative group"
            onMouseEnter={() => setCompanyDropdownOpen(true)}
            onMouseLeave={() => setCompanyDropdownOpen(false)}
          >
            <button
              className="text-white cursor-pointer hover:!text-[#aafafc] active:!text-[#aafafc] transition focus:outline-none bg-transparent border-none py-2 px-1 font-normal text-base inline-flex items-center gap-1"
              onClick={toggleCompanyDropdown}
            >
              Company
              <svg 
                className={`w-4 h-4 transition-transform duration-200 ${companyDropdownOpen ? 'rotate-180' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {companyDropdownOpen && (
              <div className="absolute left-0 top-full w-48 rounded-md shadow-lg bg-[#102425] ring-1 ring-black ring-opacity-5 z-[9999] pt-2">
                <div className="py-1">
                  <Link
                    href="/about"
                    className="block px-4 py-2 text-sm text-white hover:bg-[#0a1a1b] hover:text-[#aafafc] active:text-[#aafafc] no-underline w-full"
                    onClick={() => setCompanyDropdownOpen(false)}
                  >
                    About Us
                  </Link>
                  <Link
                    href="/all-partners"
                    className="block px-4 py-2 text-sm text-white hover:bg-[#0a1a1b] hover:text-[#aafafc] active:text-[#aafafc] no-underline w-full"
                    onClick={() => setCompanyDropdownOpen(false)}
                  >
                    Partners
                  </Link>
                </div>
              </div>
            )}
          </div>
          <Link
            href="/news"
            className="text-white hover:!text-[#aafafc] active:!text-[#aafafc] transition no-underline py-2 px-1 inline-block"
          >
            News Portal
          </Link>
          <div className="relative group"
            onMouseEnter={() => setEducationDropdownOpen(true)}
            onMouseLeave={() => setEducationDropdownOpen(false)}
          >
            <button
              className="text-white cursor-pointer hover:!text-[#aafafc] active:!text-[#aafafc] transition focus:outline-none bg-transparent border-none py-2 px-1 font-normal text-base inline-flex items-center gap-1"
              onClick={toggleEducationDropdown}
            >
              Education
              <svg 
                className={`w-4 h-4 transition-transform duration-200 ${educationDropdownOpen ? 'rotate-180' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {educationDropdownOpen && (
              <div className="absolute left-0 top-full w-48 rounded-md shadow-lg bg-[#102425] ring-1 ring-black ring-opacity-5 z-[9999] pt-2">
                <div className="py-1">
                  <Link
                    href="/education"
                    className="block px-4 py-2 text-sm text-white hover:bg-[#0a1a1b] hover:text-[#aafafc] active:text-[#aafafc] no-underline w-full"
                    onClick={() => setEducationDropdownOpen(false)}
                  >
                    Courses
                  </Link>
                  <Link
                    href="/research"
                    className="block px-4 py-2 text-sm text-white hover:bg-[#0a1a1b] hover:text-[#aafafc] active:text-[#aafafc] no-underline w-full"
                    onClick={() => setEducationDropdownOpen(false)}
                  >
                    Research
                  </Link>
                  <Link
                    href="/glossary"
                    className="block px-4 py-2 text-sm text-white hover:bg-[#0a1a1b] hover:text-[#aafafc] active:text-[#aafafc] no-underline w-full"
                    onClick={() => setEducationDropdownOpen(false)}
                  >
                    Glossary
                  </Link>
                </div>
              </div>
            )}
          </div>
          <Link
            href="/ai-labs"
            className="text-white hover:!text-[#aafafc] active:!text-[#aafafc] transition no-underline py-2 px-1 inline-block"
          >
            AI Labs
          </Link>
          <Link
            href="/games"
            className="text-white hover:!text-[#aafafc] active:!text-[#aafafc] transition no-underline py-2 px-1 inline-block"
          >
            Games
          </Link>
        </div>
      </div>

      {/* Mobile menu button */}
      <div className="md:hidden">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden bg-[#aafafc] rounded-full p-2 focus:outline-none"
        >
          {mobileMenuOpen ? (
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="black"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="black"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Right Side - Auth Status */}
      <div className="hidden md:block">
        {currentUser ? (
          <div className="flex items-center gap-6">
            {/* Notification bell */}
            <div className="relative">
              <button
                onClick={toggleNotificationDropdown}
                className="text-[#48C6EF] text-xl cursor-pointer hover:text-[#96EDD6] transition focus:outline-none bg-transparent border-none p-1 relative"
              >
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                  <path
                    d="M12 22c1.1 0 2-.9 2-2h-4a2 2 0 002 2zm6-6V11c0-3.07-1.63-5.64-5-6.32V4a1 1 0 10-2 0v.68C7.63 5.36 6 7.92 6 11v5l-1.29 1.29A1 1 0 006 19h12a1 1 0 00.71-1.71L18 16z"
                    fill="currentColor"
                  />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
              {/* Notification Dropdown */}
              {notificationDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 rounded-md shadow-lg bg-[#102425] ring-1 ring-black ring-opacity-5 z-[9999]">
                  <div className="py-2">
                    <div className="px-4 py-2 border-b border-gray-600 flex items-center justify-between">
                      <h3 className="text-white font-semibold text-sm">
                        Notifications
                      </h3>
                      {notifications.length > 0 && (
                        <button
                          onClick={() => {
                            markAllAsRead().catch((error) => {
                              console.error("Error marking all as read:", error);
                            });
                          }}
                          className="text-[#48C6EF] text-xs hover:text-[#96EDD6] transition"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <p className="text-gray-400 text-sm">
                            No notifications
                          </p>
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            onClick={() => markAsRead(notification.id)}
                            className={`px-4 py-3 hover:bg-[#0a1a1b] cursor-pointer border-b border-gray-700 last:border-b-0 ${
                              !notification.read ? "bg-[#0a1a1b]/30" : ""
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                                  !notification.read
                                    ? "bg-[#48C6EF]"
                                    : "bg-gray-400"
                                }`}
                              ></div>
                              <div className="flex-1">
                                {notification.title && (
                                  <p className="text-white text-sm font-medium mb-1">
                                    {notification.title}
                                  </p>
                                )}
                                <p className="text-white text-sm">
                                  {notification.message}
                                </p>
                                <p className="text-gray-400 text-xs mt-1">
                                  {notification.timestamp instanceof Date
                                    ? notification.timestamp.toLocaleString()
                                    : notification.timestamp
                                        ?.toDate()
                                        .toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Subscription button */}
            <Link
              href="/subscribe"
              className="bg-[#aafafc] text-[#102425] font-bold rounded-full px-6 py-2 text-base shadow hover:bg-[#96EDD6] transition no-underline"
            >
              Get Kumami Pro
            </Link>

            {/* Avatar with Dropdown */}
            <div className="relative flex flex-col items-center">
              <button
                onClick={toggleProfileDropdown}
                className="bg-white text-[#102425] font-bold rounded-full w-10 h-10 flex items-center justify-center text-lg shadow focus:outline-none hover:bg-gray-100 transition"
              >
                {getUserInitials()}
              </button>
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-gray-500 text-white text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                Free
              </div>
              {profileDropdownOpen && (
                <div className="absolute right-0 top-full mt-3 w-48 rounded-md shadow-lg bg-[#102425] ring-1 ring-black ring-opacity-5 z-[9999]">
                  <div className="py-1">
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-sm text-white hover:bg-[#0a1a1b] hover:text-[#aafafc] active:text-[#aafafc] no-underline w-full"
                      onClick={() => setProfileDropdownOpen(false)}
                    >
                      Profile
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setProfileDropdownOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-[#0a1a1b] hover:text-[#aafafc] active:text-[#aafafc] bg-transparent border-none cursor-pointer"
                    >
                      Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-white hover:!text-[#aafafc] active:!text-[#aafafc] transition no-underline py-2 px-1 inline-block"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="text-white hover:!text-[#aafafc] active:!text-[#aafafc] transition no-underline py-2 px-1 inline-block"
            >
              Sign Up
            </Link>
            <Link
              href="/subscribe"
              className="bg-[#aafafc] text-[#102425] font-bold rounded-full px-6 py-2 text-base shadow hover:bg-[#96EDD6] hover:text-[#102425] active:bg-[#7BDBDC] transition no-underline inline-block"
            >
              Get Kumami Pro
            </Link>
          </div>
        )}
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-[#132728] z-50 shadow-lg border-t border-gray-700">
          <div className="p-6">
            <div className="flex flex-col gap-6 text-white text-xl">
              <div className="relative">
                <button
                  onClick={toggleCompanyDropdown}
                  className="flex items-center w-full text-left cursor-pointer hover:text-[#aafafc] active:text-[#aafafc] transition bg-transparent border-none py-1 px-1 text-white text-xl font-normal focus:outline-none"
                >
                  Company
                </button>
                {companyDropdownOpen && (
                  <div className="mt-2 pl-4 border-l border-[#aafafc]">
                    <Link
                      href="/about"
                      className="block py-2 text-white hover:text-[#aafafc] no-underline"
                      onClick={() => {
                        setCompanyDropdownOpen(false);
                        setMobileMenuOpen(false);
                      }}
                    >
                      About Us
                    </Link>
                    <Link
                      href="/all-partners"
                      className="block py-2 text-white hover:text-[#aafafc] no-underline"
                      onClick={() => {
                        setCompanyDropdownOpen(false);
                        setMobileMenuOpen(false);
                      }}
                    >
                      Partners
                    </Link>
                  </div>
                )}
              </div>
              <Link
                href="/news"
                className="text-white hover:text-[#aafafc] active:text-[#aafafc] transition no-underline py-1 px-1 inline-block w-full"
                onClick={() => setMobileMenuOpen(false)}
              >
                News Portal
              </Link>
              <div className="relative">
                <button
                  onClick={toggleEducationDropdown}
                  className="flex items-center w-full text-left cursor-pointer hover:text-[#aafafc] active:text-[#aafafc] transition bg-transparent border-none py-1 px-1 text-white text-xl font-normal focus:outline-none"
                >
                  Education
                  <svg 
                    className={`w-4 h-4 ml-2 transition-transform duration-200 ${educationDropdownOpen ? 'rotate-180' : ''}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {educationDropdownOpen && (
                  <div className="mt-2 pl-4 border-l border-[#aafafc]">
                    <Link
                      href="/education"
                      className="block py-2 text-white hover:text-[#aafafc] no-underline"
                      onClick={() => {
                        setEducationDropdownOpen(false);
                        setMobileMenuOpen(false);
                      }}
                    >
                      Courses
                    </Link>
                    <Link
                      href="/research"
                      className="block py-2 text-white hover:text-[#aafafc] no-underline"
                      onClick={() => {
                        setEducationDropdownOpen(false);
                        setMobileMenuOpen(false);
                      }}
                    >
                      Research
                    </Link>
                    <Link
                      href="/glossary"
                      className="block py-2 text-white hover:text-[#aafafc] no-underline"
                      onClick={() => {
                        setEducationDropdownOpen(false);
                        setMobileMenuOpen(false);
                      }}
                    >
                      Glossary
                    </Link>
                  </div>
                )}
              </div>
              <Link
                href="/ai-labs"
                className="text-white hover:text-[#aafafc] active:text-[#aafafc] transition no-underline py-1 px-1 inline-block w-full"
                onClick={() => setMobileMenuOpen(false)}
              >
                AI Labs
              </Link>
              <Link
                href="/games"
                className="text-white hover:text-[#aafafc] active:text-[#aafafc] transition no-underline py-1 px-1 inline-block w-full"
                onClick={() => setMobileMenuOpen(false)}
              >
                Games
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
