import React, { useState, useEffect, useRef } from "react";
import useAuthUser from "../hooks/useAuthUser";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteAccount, updateProfile, uploadFileDirectly } from "../lib/api";
import { clearCryptoDatabase } from "../lib/crypto";
import { LoaderIcon, MapPinIcon, UploadCloudIcon, UserIcon, ShuffleIcon, Trash2Icon, AlertTriangleIcon } from "lucide-react";
import Select from "react-select";
import { INSTRUMENT_OPTIONS, LANGUAGE_OPTIONS } from "../constants/taxonomy";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";

const ProfileSettingsPage = () => {
  const { authUser } = useAuthUser();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    bio: "",
    location: "",
    instrumentsKnown: [],
    instrumentsToLearn: [],
    spokenLanguages: [],
    profilePic: "",
  });

  const [isUploading, setIsUploading] = useState(false);

  // Styling for react-select to match Studio Dark aesthetic
  const customSelectStyles = {
    control: (base, state) => ({
      ...base,
      backgroundColor: "oklch(var(--b1))",
      borderColor: state.isFocused ? "oklch(var(--p))" : "oklch(var(--bc) / 0.2)",
      borderRadius: "0.5rem",
      minHeight: "3rem",
      boxShadow: "none",
      "&:hover": {
        borderColor: "oklch(var(--p) / 0.5)",
      },
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: "oklch(var(--b2))",
      border: "1px solid oklch(var(--bc) / 0.1)",
      zIndex: 50,
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isFocused ? "oklch(var(--p) / 0.2)" : "transparent",
      color: "oklch(var(--bc))",
      cursor: "pointer",
      "&:active": {
        backgroundColor: "oklch(var(--p) / 0.4)",
      },
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: "oklch(var(--p) / 0.2)",
      borderRadius: "4px",
    }),
    multiValueLabel: (base) => ({
      ...base,
      color: "oklch(var(--bc))",
    }),
    multiValueRemove: (base) => ({
      ...base,
      color: "oklch(var(--bc))",
      "&:hover": {
        backgroundColor: "oklch(var(--p))",
        color: "oklch(var(--pc))",
      },
    }),
    input: (base) => ({
      ...base,
      color: "oklch(var(--bc))",
    })
  };

  // Hydrate form with authUser data
  useEffect(() => {
    if (authUser) {
      setFormData({
        fullName: authUser.fullName || "",
        bio: authUser.bio || "",
        location: authUser.location || "",
        instrumentsKnown: authUser.instrumentsKnown || [],
        instrumentsToLearn: authUser.instrumentsToLearn || [],
        spokenLanguages: authUser.spokenLanguages || [],
        profilePic: authUser.profilePic || "",
      });
    }
  }, [authUser]);

  const { mutate: update, isPending } = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      toast.success("Profile updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to update profile");
    },
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size too large (max 5MB)");
      return;
    }

    try {
      setIsUploading(true);
      const { fileUrl } = await uploadFileDirectly(file);
      setFormData((prev) => ({ ...prev, profilePic: fileUrl }));
      toast.success("Profile picture uploaded!");
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = null;
    }
  };

  const handleRandomAvatar = () => {
    const randomSeed = encodeURIComponent(formData.fullName + Date.now().toString());
    const randomAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${randomSeed}`;
    setFormData({ ...formData, profilePic: randomAvatar });
    toast.success("Random profile picture attached.");
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.fullName.trim()) {
      toast.error("Full Name is required");
      return;
    }
    update(formData);
  };

  const { mutate: deleteMyAccount, isPending: isDeleting } = useMutation({
    mutationFn: deleteAccount,
    onSuccess: async () => {
      // 1. Purge local crypto identity immediately on account deletion
      try {
        await clearCryptoDatabase();
        console.log("[E2EE] Local identity purged successfully after account deletion.");
      } catch (err) {
        console.error("[E2EE] Failed to purge local identity during account deletion:", err);
      }

      toast.success("Account deleted. We're sad to see you go.");
      queryClient.setQueryData(["authUser"], null);
      // Absolute purge: hard refresh to /login
      window.location.href = "/login";
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to delete account");
    },
  });

  if (!authUser) return null;

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-base-200/50 backdrop-blur-xl rounded-3xl p-8 border border-white/5 shadow-2xl">
        <header className="mb-10 text-center md:text-left">
          <h1 className="text-4xl font-black bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Customize Your Studio
          </h1>
          <p className="text-base-content/60 mt-2">
            Update your musical profile and show the community what you're working on.
          </p>
        </header>

        <form onSubmit={handleSave} className="space-y-8">
          {/* Avatar Section */}
          <section className="flex flex-col md:flex-row items-center gap-8 p-6 bg-base-300/30 rounded-2xl border border-white/5">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/20 shadow-xl transition-all duration-300 group-hover:border-primary/50">
                {formData.profilePic ? (
                  <img src={formData.profilePic} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-base-300 flex items-center justify-center">
                    <UserIcon size={48} className="text-base-content/20" />
                  </div>
                )}
              </div>
              <label
                className={`absolute bottom-0 right-0 p-2 bg-primary text-primary-content rounded-full cursor-pointer shadow-lg hover:scale-110 transition-transform ${isUploading ? 'animate-pulse' : ''}`}
              >
                <UploadCloudIcon size={20} />
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                  ref={fileInputRef}
                />
              </label>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-xl font-bold">Profile Picture</h3>
              <p className="text-sm text-base-content/50 mt-1 mb-4">
                Upload a high-quality photo to represent your musical identity. Max 5MB.
              </p>
              <button
                type="button"
                onClick={handleRandomAvatar}
                className="btn btn-outline btn-sm border-base-content/20 text-base-content/80 rounded-lg hover:bg-base-300"
                disabled={isUploading}
              >
                <ShuffleIcon className="size-4 mr-2" />
                Auto-Generate Random
              </button>
            </div>
          </section>

          {/* Basic Info */}
          <section className="grid md:grid-cols-2 gap-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-bold">Full Name</span>
              </label>
              <input
                type="text"
                className="input input-bordered bg-base-300/50 focus:input-primary transition-all rounded-xl"
                placeholder="How do you want to be called?"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-bold">Location</span>
              </label>
              <div className="relative">
                <MapPinIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/30" />
                <input
                  type="text"
                  className="input input-bordered w-full pl-12 bg-base-300/50 focus:input-primary transition-all rounded-xl"
                  placeholder="City, Country"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
            </div>
          </section>

          {/* Bio */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-bold">Musical Bio</span>
            </label>
            <textarea
              className="textarea textarea-bordered min-h-[120px] bg-base-300/50 focus:textarea-primary transition-all rounded-xl leading-relaxed"
              placeholder="Tell us about your musical journey, influences, and what you're currently working on..."
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            />
          </div>

          {/* Taxonomy Sections */}
          <section className="space-y-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-bold">Instruments You Play</span>
              </label>
              <Select
                isMulti
                options={INSTRUMENT_OPTIONS}
                styles={customSelectStyles}
                className="my-react-select-container"
                classNamePrefix="my-react-select"
                value={INSTRUMENT_OPTIONS.filter((opt) => formData.instrumentsKnown.includes(opt.value))}
                onChange={(selected) => setFormData({ ...formData, instrumentsKnown: selected.map((s) => s.value) })}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-bold">Instruments You Want to Learn</span>
              </label>
              <Select
                isMulti
                options={INSTRUMENT_OPTIONS}
                styles={customSelectStyles}
                className="my-react-select-container"
                classNamePrefix="my-react-select"
                value={INSTRUMENT_OPTIONS.filter((opt) => formData.instrumentsToLearn.includes(opt.value))}
                onChange={(selected) => setFormData({ ...formData, instrumentsToLearn: selected.map((s) => s.value) })}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-bold">Spoken Languages</span>
              </label>
              <Select
                isMulti
                options={LANGUAGE_OPTIONS}
                styles={customSelectStyles}
                className="my-react-select-container"
                classNamePrefix="my-react-select"
                value={LANGUAGE_OPTIONS.filter((opt) => formData.spokenLanguages.includes(opt.value))}
                onChange={(selected) => setFormData({ ...formData, spokenLanguages: selected.map((s) => s.value) })}
              />
            </div>
          </section>

          <footer className="pt-6 border-t border-white/5 flex justify-end">
            <button
              type="submit"
              className="btn btn-primary px-8 rounded-xl font-bold text-lg shadow-lg shadow-primary/20 hover:scale-105 transition-all"
              disabled={isPending || isUploading}
            >
              {isPending ? (
                <>
                  <LoaderIcon className="animate-spin mr-2" size={20} />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </footer>
        </form>

        {/* Danger Zone */}
        <section className="mt-12 pt-10 border-t border-error/20">
          <div className="bg-error/5 rounded-3xl p-8 border border-error/20">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
              <div>
                <h2 className="text-2xl font-black text-error flex items-center justify-center md:justify-start gap-2">
                  <AlertTriangleIcon className="size-6" />
                  Danger Zone
                </h2>
                <p className="text-base-content/60 mt-2 max-w-md">
                  Once you delete your account, there is no going back. All your musical scores, chats, and profile data will be permanently removed from Harmonix.
                </p>
              </div>
              <button
                onClick={() => document.getElementById('delete_account_modal').showModal()}
                className="btn btn-error btn-outline hover:btn-error px-10 rounded-xl font-bold border-2"
                type="button"
              >
                <Trash2Icon className="size-5 mr-2" />
                Delete Account
              </button>
            </div>
          </div>
        </section>

        {/* Delete Confirmation Modal */}
        <dialog id="delete_account_modal" className="modal modal-bottom sm:modal-middle backdrop-blur-sm">
          <div className="modal-box border-2 border-error bg-base-200 p-8 rounded-3xl shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-error/10 text-error rounded-full flex items-center justify-center mb-6">
                <AlertTriangleIcon size={32} />
              </div>
              <h3 className="text-2xl font-black mb-3 text-base-content">Wait! Are you sure?</h3>
              <p className="text-base-content/70 leading-relaxed mb-8">
                Deleting your account is <span className="text-error font-bold">permanent</span>.
                You will lose all your connections, messages, and saved scores instantly.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button
                  onClick={() => deleteMyAccount()}
                  disabled={isDeleting}
                  className="btn btn-error flex-1 rounded-xl font-bold h-12 shadow-lg shadow-error/20"
                >
                  {isDeleting ? (
                    <LoaderIcon className="animate-spin size-5" />
                  ) : (
                    "Yes, delete everything"
                  )}
                </button>
                <form method="dialog" className="flex-1">
                  <button className="btn btn-ghost w-full rounded-xl font-bold h-12">
                    Nevermind, take me back
                  </button>
                </form>
              </div>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button>close</button>
          </form>
        </dialog>
      </div>
    </div>
  );
};

export default ProfileSettingsPage;
