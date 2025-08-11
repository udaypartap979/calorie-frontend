"use client";
import { useState, useRef } from "react";
import { UserAuth } from "./context/AuthContext";
import Link from "next/link";

export default function Home() {
    // --- State Management ---
    const { user, googleSignIn, logOut } = UserAuth();
    // Photo & Camera State
    const [isCamera, setIsCamera] = useState(false);
    const [capturedImage, setCapturedImage] = useState(null);
    const [uploadedImage, setUploadedImage] = useState(null);
    const [facingMode, setFacingMode] = useState("user");
    // Audio State
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const mediaRecorderRef = useRef(null);
    // App Logic State
    const [isLoading, setIsLoading] = useState(false);
    const [isLogging, setIsLogging] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [error, setError] = useState(null);
    // Refs
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);

    // --- Helper & Reset Functions ---
    const dataURLtoBlob = (dataurl) => {
        if (!dataurl) return null;
        const arr = dataurl.split(',');
        if (arr.length < 2) return null;
        const mimeMatch = arr[0].match(/:(.*?);/);
        if (!mimeMatch || mimeMatch.length < 2) return null;
        const mime = mimeMatch[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while(n--){ u8arr[n] = bstr.charCodeAt(n); }
        return new Blob([u8arr], {type:mime});
    };

    const resetState = () => {
        setCapturedImage(null);
        setUploadedImage(null);
        setAnalysisResult(null);
        setError(null);
        setIsLoading(false);
        setAudioBlob(null);
        setAudioUrl(null);
        setIsRecording(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

  const handleAnalyzeImage = async () => {
    const imageToAnalyze = capturedImage || uploadedImage;
    if (!imageToAnalyze) {
      alert("No image is available to analyze.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    const imageBlob = dataURLtoBlob(imageToAnalyze);
    if (!imageBlob) {
        setError("Could not process the image file.");
        setIsLoading(false);
        return;
    }

    const formData = new FormData();
    formData.append('foodImage', imageBlob, 'food.jpg');

    try {
      const response = await fetch('https://calorie-counter-three-gamma.vercel.app/identify-food', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred.' }));
        throw new Error(`API Error: ${response.status} - ${errorData.message || 'Failed to fetch'}`);
      }

      const data = await response.json();
      setAnalysisResult(data);

    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    try {
      await googleSignIn();
    } catch (error) {
      console.log(error);
    }
  };

  const handleSignOut = async () => {
    try {
      await logOut();
    } catch (error) {
      console.log(error);
    }
  };

  // Modified startCamera to accept a facing mode
  const startCamera = async (mode) => {
    try {
      resetImages();
      // Stop any existing stream before starting a new one
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
      setIsCamera(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: mode,
        },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
        };
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      alert("Unable to access camera. Please check permissions and try again.");
      setIsCamera(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setIsCamera(false);
    }
  };

  // Function to switch between front and rear cameras
  const handleSwitchCamera = () => {
    const newFacingMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newFacingMode);
    startCamera(newFacingMode);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      // Flip the image horizontally if it's from the front camera
      if (facingMode === 'user') {
        ctx.scale(-1, 1);
        ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      } else {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      const imageDataUrl = canvas.toDataURL("image/jpeg", 0.8);
      setCapturedImage(imageDataUrl);
      setUploadedImage(null);
      stopCamera();
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target.result);
        setCapturedImage(null);
        setAudioBlob(null);
        setAudioUrl(null);
      };
      reader.readAsDataURL(file);
    } else {
      alert("Please select a valid image file.");
    }
  };

  const resetImages = () => {
    setCapturedImage(null);
    setUploadedImage(null);
    setAnalysisResult(null);
    setError(null);
    setIsLoading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // --- UPDATED: The handleLogMeal function is completely changed ---
  const handleLogMeal = async () => {
    // Determine which image source to use
    const imageToLog = capturedImage || uploadedImage;

    if (!analysisResult || !user || !imageToLog) {
        alert("No analysis result, image, or user to log.");
        return;
    }
    setIsLogging(true);

    // Convert the data URL (string) to a Blob (file-like object)
    const imageBlob = dataURLtoBlob(imageToLog);
    if (!imageBlob) {
        alert("Could not process the image file.");
        setIsLogging(false);
        return;
    }

    // Use FormData to send both the image and the JSON data
    const formData = new FormData();
    formData.append('foodImage', imageBlob, 'meal.jpg');
    formData.append('userId', user.uid);
    formData.append('userEmail', user.email); // <-- ADD THIS LINE
    formData.append('analysisResult', JSON.stringify(analysisResult));

    try {
        // Note: When sending FormData, you DO NOT set the 'Content-Type' header.
        // The browser sets it automatically with the correct boundary.
        const response = await fetch('https://calorie-counter-three-gamma.vercel.app/log-meal', {
            method: 'POST',
            body: formData, // Send the FormData object
        });

        if (!response.ok) {
            throw new Error('Failed to log meal.');
        }

        alert('Meal logged successfully!');
        setAnalysisResult(null);
        setCapturedImage(null);
    } catch (err) {
        alert(`Error: ${err.message}`);
    } finally {
        setIsLogging(false);
        // resetAudio(); // Reset audio after logging
    }
};

// Recording audio
// --- Audio Handlers (NEW) ---
const handleStartRecording = async () => {
  resetState(); // Clear any photo state when starting audio
  try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const audioChunks = [];
      mediaRecorderRef.current.ondataavailable = e => audioChunks.push(e.data);
      mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(audioChunks, { type: 'audio/webm' });
          setAudioBlob(blob);
          setAudioUrl(URL.createObjectURL(blob));
          setIsRecording(false);
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
  } catch (err) { console.error("Error starting recording:", err); alert("Could not access microphone."); }
};

const handleStopRecording = () => {
  if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
};

const handleLogAudio = async () => {
  if (!audioBlob || !user) return;
  setIsLogging(true);
  const formData = new FormData();
  formData.append('foodAudio', audioBlob, 'voice-note.webm');
  formData.append('userId', user.uid);
  formData.append('userEmail', user.email);
  try {
      const response = await fetch('https://calorie-counter-three-gamma.vercel.app/log-audio', { method: 'POST', body: formData });
      if (!response.ok) throw new Error("Audio log failed");
      const data = await response.json();
      alert(data.message);
      resetState();
  } catch (err) { alert(`Error: ${err.message}`); } finally { setIsLogging(false); }
};


return (
  <main className="flex min-h-screen flex-col items-center p-6 bg-gray-50">
      <div className="w-full max-w-4xl"> {/* Adjusted max-width for a cleaner vertical look */}
          <header className="flex justify-between items-center mb-8 w-full">
              <h1 className="text-4xl font-bold text-gray-800">Calories Counter</h1>
              {!user ? (
                  <button onClick={handleSignIn} className="px-6 py-3 bg-blue-500 text-white rounded-lg">Sign In</button>
              ) : (
                  <div className="flex items-center gap-4">
                      <Link href="/dashboard" className="text-blue-600 hover:underline font-medium">Dashboard</Link>
                      <p className="text-gray-700">Hi, {user.displayName}!</p>
                      <button onClick={handleSignOut} className="px-4 py-2 border rounded-lg">Sign Out</button>
                  </div>
              )}
          </header>
          
          {user && (
              // --- UPDATED: This div now stacks its children vertically ---
              <div className="flex flex-col items-center gap-8">
                  
                  {/* --- PHOTO LOGGING SECTION --- */}
                  <div className="w-full space-y-6 p-6 border rounded-lg bg-white shadow-sm">
                      <h2 className="text-2xl font-bold text-center text-gray-700">Log with Photo</h2>
                      <div className="flex flex-wrap gap-4 justify-center">
                          {!isCamera && <button onClick={() => startCamera(facingMode)} className="px-6 py-3 bg-green-500 text-white rounded-lg flex items-center gap-2">📷 Open Camera</button>}
                          <label className="px-6 py-3 bg-purple-500 text-white rounded-lg cursor-pointer flex items-center gap-2">
                              📁 Upload Photo
                              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden"/>
                          </label>
                          {(capturedImage || uploadedImage) && <button onClick={resetState} className="px-6 py-3 bg-red-500 text-white rounded-lg">🗑️ Clear</button>}
                      </div>
                      
                      {isCamera && (
                        /* Your existing camera view JSX */
                        <div className="text-center space-y-4 bg-black p-4 rounded-lg">
                <div className="relative bg-gray-900 rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: "100%",
                      maxWidth: "500px",
                      height: "auto",
                      display: "block",
                      transform: facingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)',
                    }}
                    className="mx-auto"
                  />
                  <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-sm">
                    ● LIVE
                  </div>
                </div>
                <div className="flex gap-4 justify-center flex-wrap">
                  <button
                    onClick={capturePhoto}
                    className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold"
                  >
                    📸 Capture Photo
                  </button>
                  <button
                    onClick={handleSwitchCamera}
                    className="p-3 bg-gray-700 text-white rounded-full hover:bg-gray-600 transition-colors"
                    title="Switch Camera"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 4l16 16m0-16L4 20" />
                    </svg>
                  </button>
                  <button
                    onClick={stopCamera}
                    className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    ✕ Close Camera
                  </button>
                </div>
              </div>
                        )}
                      <canvas ref={canvasRef} className="hidden" />

                      {(capturedImage || uploadedImage) && (
                          <div className="text-center space-y-3">
                              <img src={capturedImage || uploadedImage} alt="Selected to analyze" className="w-full max-w-sm mx-auto rounded-lg" />
                              {!analysisResult && <button onClick={handleAnalyzeImage} disabled={isLoading} className="px-6 py-2 bg-blue-500 text-white rounded-lg">{isLoading ? 'Analyzing...' : '🔍 Analyze Photo'}</button>}
                          </div>
                      )}
                      {isLoading && <p className="text-center animate-pulse">Analyzing...</p>}
                      {error && <p className="text-center text-red-500">Error: {error}</p>}
                      
                      {analysisResult && (
                          <div>
                              <h3 className="text-xl font-semibold text-center mb-2">Analysis Result</h3>
                              <table className="min-w-full divide-y divide-gray-200">
                                  <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left">Food</th><th className="px-4 py-2 text-left">Calories</th></tr></thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                      {analysisResult.identifiedFoods.map((food, index) => (<tr key={index}><td className="px-4 py-2 capitalize">{food.name}</td><td className="px-4 py-2">{food.calories} kcal</td></tr>))}
                                  </tbody>
                              </table>
                              <div className="mt-4 text-center p-2 bg-green-100 rounded-lg">
                                  <p className="font-bold text-green-700">Total: {analysisResult.totalEstimatedCalories} kcal</p>
                              </div>
                              <div className="text-center mt-4">
                                  <button onClick={handleLogMeal} disabled={isLogging} className="px-8 py-3 bg-teal-500 text-white rounded-lg">{isLogging ? 'Logging...' : '✔ Log This Meal'}</button>
                              </div>
                          </div>
                      )}
                  </div>

                  {/* --- AUDIO LOGGING SECTION --- */}
                  <div className="w-full space-y-6 p-6 border rounded-lg bg-white shadow-sm">
                      <h2 className="text-2xl font-bold text-center text-gray-700">Log with Voice Note</h2>
                      <div className="flex items-center gap-4 justify-center">
                          {!isRecording ? (
                              <button onClick={handleStartRecording} className="px-6 py-3 bg-red-500 text-white rounded-lg">🎤 Start Recording</button>
                          ) : (
                              <button onClick={handleStopRecording} className="px-6 py-3 bg-red-700 text-white rounded-lg animate-pulse">■ Stop Recording</button>
                          )}
                      </div>
                      {audioUrl && (
                          <div className="text-center mt-4 space-y-3">
                              <p className="font-medium">Your Voice Note:</p>
                              <audio src={audioUrl} controls className="w-full" />
                          </div>
                      )}
                      {audioBlob && (
                          <div className="text-center mt-4">
                              <button onClick={handleLogAudio} disabled={isLogging} className="px-8 py-3 bg-indigo-500 text-white rounded-lg">
                                  {isLogging ? 'Logging...' : '✔ Log Voice Note'}
                              </button>
                          </div>
                      )}
                  </div>
              </div>
          )}
      </div>
  </main>
);
}
