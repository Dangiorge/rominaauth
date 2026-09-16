// path: app/(dashboard)/account/profile/page.jsx

"use client";

import { useEffect, useState } from "react";

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [verifySending, setVerifySending] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState("");

  useEffect(() => {
    fetch("/api/account/profile")
      .then((res) => res.json())
      .then((data) => setProfile(data.profile));
  }, []);

  function flash(msg, type = "success") {
    if (type === "success") {
      setSuccess(msg);
      setError("");
    } else {
      setError(msg);
      setSuccess("");
    }
    setTimeout(() => {
      setSuccess("");
      setError("");
    }, 4000);
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    const res = await fetch("/api/account/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    const data = await res.json();
    if (!res.ok) {
      flash(data.error, "error");
      return;
    }
    flash("Profile updated.");
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    const res = await fetch("/api/account/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      flash(data.error, "error");
      return;
    }
    flash("Password changed successfully.");
    setNewPassword("");
    setCurrentPassword("");
  }

  async function handleSendVerification() {
    setVerifySending(true);
    const res = await fetch("/api/account/send-verification", {
      method: "POST",
    });
    const data = await res.json();
    setVerifySending(false);
    setVerifyMessage(
      res.ok ? "Verification email sent — check your inbox." : data.error,
    );
  }

  if (!profile) return <div>Loading...</div>;

  const field = (key, label, type = "text") => (
    <div>
      <label className="text-xs text-slate-500 block mb-1">{label}</label>
      <input
        type={type}
        value={profile[key] || ""}
        onChange={(e) => setProfile({ ...profile, [key]: e.target.value })}
        className="w-full border rounded-md px-3 py-2"
      />
    </div>
  );

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">My Profile</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-md px-4 py-3">
          {success}
        </div>
      )}

      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Email Verification</h2>
          {profile.email_verified_at ? (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
              Verified
            </span>
          ) : (
            <button
              onClick={handleSendVerification}
              disabled={verifySending}
              className="text-xs text-blue-600 hover:underline disabled:opacity-50"
            >
              {verifySending ? "Sending..." : "Send verification email"}
            </button>
          )}
        </div>
        {verifyMessage && (
          <p className="text-xs text-slate-500">{verifyMessage}</p>
        )}
      </div>

      <form
        onSubmit={handleSaveProfile}
        className="bg-white border rounded-lg p-6 space-y-4"
      >
        <h2 className="font-semibold">Personal Info</h2>
        <div className="grid grid-cols-2 gap-4">
          {field("full_name", "Full Name")}
          <div>
            <label className="text-xs text-slate-500 block mb-1">Email</label>
            <input
              value={profile.email}
              disabled
              className="w-full border rounded-md px-3 py-2 bg-slate-50 text-slate-400"
            />
          </div>
          {field("phone", "Phone")}
          {field("date_of_birth", "Date of Birth", "date")}
          {field("address", "Address")}
          {field("city", "City")}
          {field("country", "Country")}
        </div>
        <button
          type="submit"
          className="bg-slate-900 text-white px-6 py-2 rounded-md text-sm"
        >
          Save Profile
        </button>
      </form>

      <form
        onSubmit={handleChangePassword}
        className="bg-white border rounded-lg p-6 space-y-4"
      >
        <h2 className="font-semibold">Change Password</h2>
        <input
          type="password"
          placeholder="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full border rounded-md px-3 py-2"
          required
        />
        <p className="text-xs text-slate-400">
          Min 8 chars, 1 uppercase, 1 lowercase, 1 number.
        </p>
        <button
          type="submit"
          className="bg-slate-900 text-white px-6 py-2 rounded-md text-sm"
        >
          Update Password
        </button>
      </form>
    </div>
  );
}
