import React from "react";
import PageLoader from "../components/PageLoader";

const CallPage = () => {
  return (
    <div className="h-[93vh] flex items-center justify-center bg-base-200">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">Secure Call Environment</h2>
        <p className="opacity-70">This module is being modernized to use WebRTC.</p>
        <PageLoader />
      </div>
    </div>
  );
};
export default CallPage;
