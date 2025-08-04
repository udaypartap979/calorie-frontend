"use client";
import { useState, useRef } from "react";
import { UserAuth } from "./context/AuthContext";

export default function Home() {
  const { user, googleSignIn, logOut } = UserAuth();
  const [isCamera, setIsCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // State to track the current camera facing mode
  const [facingMode, setFacingMode] = useState("user"); // "user" for front, "environment" for rear

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
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {type:mime});
  }

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

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50">
      <h1 className="text-4xl font-bold mb-8 text-gray-800">Calories Counter</h1>

      {!user ? (
        <button
          onClick={handleSignIn}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Sign in with Google
        </button>
      ) : (
        <div className="w-full max-w-5xl"> 
          <div className="text-center mb-8">
            <p className="text-xl mb-4 text-gray-700">Welcome, {user.displayName}!</p>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Sign Out
            </button>
          </div>

          <div className="space-y-6">
            <div className="flex flex-wrap gap-4 justify-center">
              {!isCamera && (
                <button
                  onClick={() => startCamera(facingMode)}
                  className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                >
                  📷 Open Camera
                </button>
              )}

              <label className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors cursor-pointer flex items-center gap-2">
                📁 Upload Photo
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {(capturedImage || uploadedImage) && (
                <button
                  onClick={resetImages}
                  className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  🗑️ Clear Images
                </button>
              )}
            </div>

            {isCamera && (
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {capturedImage && (
                <div className="text-center space-y-3">
                  <h3 className="text-lg font-semibold mb-2">Captured Photo</h3>
                  <img
                    src={capturedImage}
                    alt="Captured"
                    className="w-full max-w-sm mx-auto rounded-lg border-2 border-green-300"
                  />
                  <button onClick={handleAnalyzeImage} className="px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors">
                    🔍 Use this Photo
                  </button>
                </div>
              )}

              {uploadedImage && (
                <div className="text-center space-y-3">
                  <h3 className="text-lg font-semibold mb-2">Uploaded Photo</h3>
                  <img
                    src={uploadedImage}
                    alt="Uploaded"
                    className="w-full max-w-sm mx-auto rounded-lg border-2 border-purple-300"
                  />
                   <button onClick={handleAnalyzeImage} className="px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors">
                    🔍 Use this Photo
                  </button>
                </div>
              )}
            </div>

            <div className="mt-6">
                {isLoading && (
                    <div className="text-center p-6 bg-blue-50 rounded-lg">
                        <p className="text-blue-700 animate-pulse">
                            🔍 Analyzing your food, please wait...
                        </p>
                    </div>
                )}

                {error && (
                    <div className="text-center p-6 bg-red-100 rounded-lg">
                        <p className="text-red-700 font-semibold">Error</p>
                        <p className="text-red-600">{error}</p>
                    </div>
                )}
                
                {analysisResult && (
                  <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-md">
                    <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">Analysis Result</h2>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Food Item</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Calories</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serving Size</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nutrition Details</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {analysisResult.identifiedFoods.map((food, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900 capitalize">{food.name}</div>
                                <div className="text-xs text-gray-500 capitalize">{food.source}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{food.calories} kcal</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{food.serving_size}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-500">
                                  <div><strong>Protein:</strong> {food?.nutrition?.protein}g</div>
                                  <div><strong>Fat:</strong> {food?.nutrition?.fat}g</div>
                                  <div><strong>Carbs:</strong> {food?.nutrition?.carbs}g</div>
                                  <div><strong>Fiber:</strong> {food?.nutrition?.fiber}g</div>
                                  <div><strong>Sugar:</strong> {food?.nutrition?.sugar}g</div>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-8 text-center p-4 bg-green-100 rounded-lg">
                      <p className="text-lg text-gray-600">Total Estimated Calories</p>
                      <p className="text-4xl font-bold text-green-700">{analysisResult.totalEstimatedCalories} kcal</p>
                    </div>

                    {analysisResult.note && (
                      <p className="text-center text-xs text-gray-400 mt-6">{analysisResult.note}</p>
                    )}
                  </div>
                )}
            </div>

          </div>
        </div>
      )}
    </main>
  );
}
