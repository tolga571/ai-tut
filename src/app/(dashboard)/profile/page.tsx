"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);

  // For now, we'll just show the user info. 
  // In a real app, this would be a form to update Prisma data via an API route.

  return (
    <div className="max-w-4xl mx-auto px-4 pt-24 pb-12">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Profile Settings</h1>
          <p className="text-gray-400 mt-2">Manage your account and language preferences</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Account Info */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 shadow-xl">
              <h2 className="text-xl font-semibold text-white mb-6">Personal Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Full Name</label>
                  <p className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white">
                    {session?.user?.name || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Email Address</label>
                  <p className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white">
                    {session?.user?.email}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 shadow-xl">
              <h2 className="text-xl font-semibold text-white mb-6">Language Settings</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Native Language</label>
                  <div className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white flex items-center justify-between">
                    <span>Turkish</span>
                    <span className="text-xs bg-white/10 px-2 py-0.5 rounded uppercase">TR</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Target Language</label>
                  <div className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white flex items-center justify-between">
                    <span>English</span>
                    <span className="text-xs bg-white/10 px-2 py-0.5 rounded uppercase">EN</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4 italic">
                Language updates are coming soon in the next update.
              </p>
            </div>
          </div>

          {/* Sidebar / Plan */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-2xl p-6 shadow-xl text-white">
              <h3 className="text-lg font-bold mb-2">Your Plan</h3>
              <p className="text-blue-100 text-sm mb-6">You are currently on the Free Tier.</p>
              <button className="w-full py-2.5 bg-white text-blue-600 rounded-xl font-bold hover:bg-gray-100 transition-colors shadow-lg">
                Upgrade to Pro
              </button>
            </div>

            <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 shadow-xl text-center">
              <div className="w-20 h-20 bg-white/5 rounded-full mx-auto mb-4 flex items-center justify-center border border-white/10">
                <svg className="w-10 h-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <button className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors">
                Change Avatar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
