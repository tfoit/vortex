import React, { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Camera, X, RotateCcw, Check } from "lucide-react";

const CameraCapture = ({ onCapture, onCancel }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [error, setError] = useState(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "environment", // Use back camera on mobile
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Unable to access camera. Please check permissions.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64
    const imageData = canvas.toDataURL("image/png");
    setCapturedImage(imageData);
    stopCamera();
  }, [stopCamera]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  const confirmCapture = useCallback(() => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  }, [capturedImage, onCapture]);

  // Start camera when component mounts
  React.useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  return (
    <div className="text-center">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-800">Capture Document</h3>
        <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-600 text-sm">{error}</p>
          <button onClick={startCamera} className="mt-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition-colors">
            Try Again
          </button>
        </div>
      )}

      <div className="relative bg-gray-100 rounded-lg overflow-hidden mb-4">
        {!capturedImage ? (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-64 object-cover" />

            {/* Camera overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-4 border-2 border-white/50 border-dashed rounded-lg" />
              <div className="absolute top-4 left-4 right-4">
                <p className="text-white text-sm bg-black/50 rounded px-2 py-1 inline-block">Position document within the frame</p>
              </div>
            </div>
          </>
        ) : (
          <img src={capturedImage} alt="Captured document" className="w-full h-64 object-cover" />
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Camera Controls */}
      <div className="flex justify-center space-x-4">
        {!capturedImage ? (
          <>
            <motion.button onClick={onCancel} className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              Cancel
            </motion.button>

            <motion.button
              onClick={capturePhoto}
              disabled={!isStreaming}
              className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Camera className="w-5 h-5" />
              <span>Capture</span>
            </motion.button>
          </>
        ) : (
          <>
            <motion.button onClick={retakePhoto} className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center space-x-2" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <RotateCcw className="w-4 h-4" />
              <span>Retake</span>
            </motion.button>

            <motion.button onClick={confirmCapture} className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Check className="w-5 h-5" />
              <span>Use Photo</span>
            </motion.button>
          </>
        )}
      </div>

      {/* Tips */}
      <div className="mt-4 text-left">
        <p className="text-sm text-gray-600 mb-2">📝 Tips for best results:</p>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>• Ensure good lighting</li>
          <li>• Keep the document flat and within the frame</li>
          <li>• Avoid shadows and reflections</li>
          <li>• Make sure text is clearly visible</li>
        </ul>
      </div>
    </div>
  );
};

export default CameraCapture;
