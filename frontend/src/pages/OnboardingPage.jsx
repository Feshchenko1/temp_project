import { useState, useRef } from "react";
import useAuthUser from "../hooks/useAuthUser";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { completeOnboarding } from "../lib/api";
import { LoaderIcon, MapPinIcon, UploadCloudIcon, ShuffleIcon, UserIcon } from "lucide-react";
import Select from "react-select";
import axios from "axios";

// Constants for select options (Replace with real taxonomy later)
const INSTRUMENT_OPTIONS = [
  { value: "piano", label: "Piano" },
  { value: "guitar", label: "Guitar" },
  { value: "drums", label: "Drums" },
  { value: "bass", label: "Bass" },
  { value: "vocals", label: "Vocals" },
  { value: "violin", label: "Violin" },
  { value: "synthesizer", label: "Synthesizer" },
  { value: "saxophone", label: "Saxophone" },
];

const LANGUAGE_OPTIONS = [
  { value: "english", label: "English" },
  { value: "spanish", label: "Spanish" },
  { value: "french", label: "French" },
  { value: "german", label: "German" },
  { value: "japanese", label: "Japanese" },
  { value: "ukrainian", label: "Ukrainian" },
];

const OnboardingPage = () => {
  const { authUser } = useAuthUser();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const [formState, setFormState] = useState({
    fullName: authUser?.fullName || "",
    bio: authUser?.bio || "",
    instrumentsKnown: authUser?.instrumentsKnown || [],
    instrumentsToLearn: authUser?.instrumentsToLearn || [],
    spokenLanguages: authUser?.spokenLanguages || [],
    location: authUser?.location || "",
    profilePic: authUser?.profilePic || "",
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

  const { mutate: onboardingMutation, isPending } = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: () => {
      toast.success("Profile onboarded successfully");
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Error submitting profile.");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onboardingMutation(formState);
  };

  const handleRandomAvatar = () => {
    const idx = Math.floor(Math.random() * 100) + 1;
    const randomAvatar = `https://avatar.iran.liara.run/public/${idx}.png`;
    setFormState({ ...formState, profilePic: randomAvatar });
    toast.success("Random profile picture attached.");
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be under 2MB.");
      return;
    }

    setIsUploading(true);
    try {
      // 1. Ask backend for Pre-signed URL via our Axios utility
      // We assume /api/upload/presigned-url returns { presignedUrl, fileUrl }
      const backendUrl = import.meta.env.MODE === "development" ? "http://localhost:5001" : "";
      
      const res = await axios.post(`${backendUrl}/api/upload/presigned-url`, {
        filename: file.name,
        fileType: file.type
      }, { withCredentials: true });

      const { presignedUrl, fileUrl } = res.data;

      // 2. Direct PUT specifically to the AWS/Cloudflare Bucket
      await fetch(presignedUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      // 3. Keep the file URL in formState
      setFormState({ ...formState, profilePic: fileUrl });
      toast.success("Avatar successfully uploaded.");
    } catch (err) {
      console.error(err);
      toast.error("Upload failed. Ensure backend S3 tokens are valid.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = null; // reset
    }
  };

  return (
    <div className="min-h-screen bg-base-100 flex items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-4xl mx-auto bg-base-200/50 backdrop-blur-xl border border-base-content/10 shadow-2xl rounded-2xl overflow-hidden">
        <div className="p-8 sm:p-12">
          
          <div className="text-center mb-10">
            <h1 className="text-3xl font-extrabold tracking-tight text-base-content">Configure Digital Workspace</h1>
            <p className="text-base-content/60 mt-2">Initialize your studio aesthetic to connect with the community.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* AVATAR UPLOAD SECTION */}
            <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-base-100/50 border border-base-content/5 rounded-xl">
              <div className="size-32 rounded-full border-4 border-primary/20 bg-base-300 overflow-hidden shrink-0 flex items-center justify-center shadow-inner relative group">
                {formState.profilePic ? (
                   <img src={formState.profilePic} alt="Profile preview" className="w-full h-full object-cover" />
                ) : (
                   <UserIcon className="size-12 text-base-content/30" />
                )}
                {/* Overlay on hover */}
                {formState.profilePic && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <UploadCloudIcon className="size-6 text-white" />
                  </div>
                )}
              </div>
              
              <div className="flex flex-col space-y-3 w-full">
                <input 
                   type="file" 
                   accept="image/*" 
                   ref={fileInputRef} 
                   className="hidden" 
                   onChange={handleFileUpload} 
                />
                
                <div className="flex flex-wrap gap-3">
                  <button 
                    type="button" 
                    className="btn btn-primary shadow-md flex-1 md:flex-none" 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                     {isUploading ? (
                       <><span className="loading loading-spinner size-4"></span> Uploading...</>
                     ) : (
                       <><UploadCloudIcon className="size-4 mr-2" /> Upload Avatar (Max 2MB)</>
                     )}
                  </button>
                  <button 
                    type="button" 
                    onClick={handleRandomAvatar} 
                    className="btn btn-outline border-base-content/20 text-base-content/80 flex-1 md:flex-none"
                    disabled={isUploading}
                  >
                    <ShuffleIcon className="size-4 mr-2" />
                    Auto-Generate
                  </button>
                </div>
                <p className="text-xs text-base-content/50">Direct secure upload utilizing Cloud S3 Infrastructure.</p>
              </div>
            </div>

            {/* BASIC INFO */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-control w-full space-y-1.5">
                <label className="label py-0"><span className="text-sm font-medium text-base-content/80">Designation (Full Name)</span></label>
                <input
                  type="text"
                  required
                  value={formState.fullName}
                  onChange={(e) => setFormState({ ...formState, fullName: e.target.value })}
                  className="input input-bordered w-full bg-base-100"
                  placeholder="Your artist name or moniker"
                />
              </div>
              <div className="form-control w-full space-y-1.5">
                <label className="label py-0"><span className="text-sm font-medium text-base-content/80">Location (HQ)</span></label>
                <div className="relative">
                  <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-base-content/40" />
                  <input
                    type="text"
                    value={formState.location}
                    onChange={(e) => setFormState({ ...formState, location: e.target.value })}
                    className="input input-bordered w-full pl-10 bg-base-100"
                    placeholder="City, Country"
                  />
                </div>
              </div>
            </div>

            <div className="form-control w-full space-y-1.5">
              <label className="label py-0"><span className="text-sm font-medium text-base-content/80">Artist Bio</span></label>
              <textarea
                value={formState.bio}
                onChange={(e) => setFormState({ ...formState, bio: e.target.value })}
                className="textarea textarea-bordered h-24 bg-base-100"
                placeholder="Detail your musical background, active projects, or what you are looking to collaborate on..."
              />
            </div>

            {/* TAXONOMY: REACT-SELECT */}
            <div className="grid grid-cols-1 gap-6 p-6 bg-base-100/50 border border-base-content/5 rounded-xl">
              
              <div className="form-control w-full space-y-1.5">
                <label className="label py-0"><span className="text-sm font-medium text-base-content/80">Instruments (Proficient)</span></label>
                <Select
                  isMulti
                  options={INSTRUMENT_OPTIONS}
                  styles={customSelectStyles}
                  placeholder="Select instruments you play..."
                  value={INSTRUMENT_OPTIONS.filter(o => formState.instrumentsKnown.includes(o.value))}
                  onChange={(selected) => setFormState({ ...formState, instrumentsKnown: selected.map(s => s.value) })}
                />
              </div>

              <div className="form-control w-full space-y-1.5">
                <label className="label py-0"><span className="text-sm font-medium text-base-content/80">Instruments (Learning)</span></label>
                <Select
                  isMulti
                  options={INSTRUMENT_OPTIONS}
                  styles={customSelectStyles}
                  placeholder="Select instruments you want to master..."
                  value={INSTRUMENT_OPTIONS.filter(o => formState.instrumentsToLearn.includes(o.value))}
                  onChange={(selected) => setFormState({ ...formState, instrumentsToLearn: selected.map(s => s.value) })}
                />
              </div>

              <div className="form-control w-full space-y-1.5">
                <label className="label py-0"><span className="text-sm font-medium text-base-content/80">Spoken Languages</span></label>
                <Select
                  isMulti
                  options={LANGUAGE_OPTIONS}
                  styles={customSelectStyles}
                  placeholder="Select languages for communication..."
                  value={LANGUAGE_OPTIONS.filter(o => formState.spokenLanguages.includes(o.value))}
                  onChange={(selected) => setFormState({ ...formState, spokenLanguages: selected.map(s => s.value) })}
                />
                <p className="text-xs text-base-content/50 mt-1">Useful to match you with compatible collaborators over audio calls.</p>
              </div>

            </div>

            {/* SUBMIT */}
            <button 
              className="btn btn-primary w-full shadow-lg shadow-primary/20 text-lg sm:mt-10" 
              disabled={isPending || isUploading} 
              type="submit"
            >
              {!isPending ? (
                "Finalize Integration"
              ) : (
                <><LoaderIcon className="animate-spin size-5 mr-2" /> Initializing Workspace...</>
              )}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
};
export default OnboardingPage;
