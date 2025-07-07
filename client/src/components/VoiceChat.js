import React, { useState, useRef, useEffect, useCallback } from "react";
import { Mic, MicOff, Volume2, Phone, PhoneOff, User, MessageSquare, Shield, X, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

const VoiceChat = ({ onClose, onAccountCreated }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [conversation, setConversation] = useState([]);
  const [isCallActive, setIsCallActive] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);

  const recognitionRef = useRef(null);
  const synthRef = useRef(null);
  const timeoutRef = useRef(null);

  // Check speech recognition capabilities
  const checkSpeechRecognitionCapabilities = useCallback(() => {
    const capabilities = {
      supported: false,
      webkitSupported: false,
      standardSupported: false,
      userAgent: navigator.userAgent,
      language: navigator.language,
      languages: navigator.languages || [],
      speechSynthesis: "speechSynthesis" in window,
      speechRecognition: "SpeechRecognition" in window,
      webkitSpeechRecognition: "webkitSpeechRecognition" in window,
    };

    capabilities.supported = capabilities.speechRecognition || capabilities.webkitSpeechRecognition;
    capabilities.webkitSupported = capabilities.webkitSpeechRecognition;
    capabilities.standardSupported = capabilities.speechRecognition;

    console.log("Speech Recognition Capabilities:", capabilities);
    return capabilities;
  }, []);

  // Check microphone permissions
  const checkMicrophonePermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setHasPermission(true);
      setErrorMessage("");
      return true;
    } catch (error) {
      console.error("Microphone permission denied:", error);
      setHasPermission(false);
      setErrorMessage("Microphone access denied. Please allow microphone access to use voice chat.");
      return false;
    }
  }, []);

  // Get supported language for speech recognition
  const getSupportedLanguage = useCallback(() => {
    // Primary English language codes to try
    const primaryLanguages = ["en-US", "en-GB", "en-AU", "en-CA", "en-NZ", "en-ZA"];

    // Additional fallback languages
    const fallbackLanguages = ["en", "en-us", "en-gb", "english"];

    // Include user's language if it's English-based
    const userLanguages = [];
    if (navigator.language) {
      const userLang = navigator.language.toLowerCase();
      if (userLang.startsWith("en")) {
        userLanguages.push(navigator.language);
        userLanguages.push(userLang);
      }
    }

    // Include system languages
    if (navigator.languages && navigator.languages.length > 0) {
      navigator.languages.forEach((lang) => {
        if (lang.toLowerCase().startsWith("en")) {
          userLanguages.push(lang);
          userLanguages.push(lang.toLowerCase());
        }
      });
    }

    // Always include default English variants as fallback
    const defaultLanguages = ["en-US", "en"];

    // Combine all languages with priority order
    const allLanguages = [...primaryLanguages, ...userLanguages, ...fallbackLanguages, ...defaultLanguages];

    // Remove duplicates while preserving order
    const uniqueLanguages = [...new Set(allLanguages)];

    console.log("Supported languages to try:", uniqueLanguages);
    console.log("User language:", navigator.language);
    console.log("Available languages:", navigator.languages);

    return uniqueLanguages;
  }, []);

  // Load and select the best voice
  const loadVoices = useCallback(() => {
    if (!synthRef.current) return;

    const availableVoices = synthRef.current.getVoices();
    console.log("Available voices:", availableVoices);
    console.log(
      "English voices found:",
      availableVoices.filter((voice) => voice.lang.startsWith("en"))
    );

    // Priority order for natural English voices
    const voicePreferences = [
      // High quality voices
      "Microsoft Zira Desktop - English (United States)",
      "Microsoft David Desktop - English (United States)",
      "Google US English",
      "Chrome OS US English",
      "Microsoft Zira - English (United States)",
      "Alex",
      "Samantha",
      "Victoria",
      "Karen",
      "Daniel",
      "Fred",
      "Moira",
      "Tessa",
      // Fallback to any English voice
      "English",
    ];

    let bestVoice = null;

    // Try to find preferred voices first
    for (const preference of voicePreferences) {
      bestVoice = availableVoices.find((voice) => voice.name.includes(preference) || (voice.name.toLowerCase().includes(preference.toLowerCase()) && voice.lang.startsWith("en")));
      if (bestVoice) {
        console.log(`Found preferred voice: ${bestVoice.name} (${bestVoice.lang})`);
        break;
      }
    }

    // If no preferred voice found, use any good English voice
    if (!bestVoice) {
      bestVoice = availableVoices.find((voice) => voice.lang.startsWith("en") && (voice.name.toLowerCase().includes("female") || voice.name.toLowerCase().includes("natural") || voice.name.toLowerCase().includes("neural")));
      if (bestVoice) {
        console.log(`Found fallback natural voice: ${bestVoice.name} (${bestVoice.lang})`);
      }
    }

    // Final fallback to any English voice
    if (!bestVoice) {
      bestVoice = availableVoices.find((voice) => voice.lang.startsWith("en"));
      if (bestVoice) {
        console.log(`Found fallback English voice: ${bestVoice.name} (${bestVoice.lang})`);
      }
    }

    if (bestVoice) {
      setSelectedVoice(bestVoice);
      console.log("Selected voice:", bestVoice.name, "Language:", bestVoice.lang);
    } else {
      console.warn(
        "No English voices found! Available voices:",
        availableVoices.map((v) => `${v.name} (${v.lang})`)
      );
    }

    setVoices(availableVoices);
  }, []);

  const startListening = useCallback(async () => {
    if (!recognitionRef.current || isListening) return;

    const hasAccess = await checkMicrophonePermission();
    if (!hasAccess) return;

    const supportedLanguages = getSupportedLanguage();
    let recognitionStarted = false;

    // Stop any existing recognition first
    try {
      recognitionRef.current.stop();
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      // Ignore errors when stopping non-running recognition
    }

    for (const lang of supportedLanguages) {
      try {
        setIsListening(true);
        setErrorMessage("");

        // Reset recognition settings for better accuracy
        recognitionRef.current.lang = lang;
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.maxAlternatives = 3;

        // Add a small delay to ensure proper initialization
        await new Promise((resolve) => setTimeout(resolve, 50));

        recognitionRef.current.start();
        console.log(`Successfully started listening with language: ${lang}`);
        recognitionStarted = true;

        // Auto-stop listening after 10 seconds
        timeoutRef.current = setTimeout(() => {
          console.log("Auto-stopping listening after timeout");
          stopListening();
        }, 10000);

        break; // Success, exit the loop
      } catch (error) {
        console.error(`Error starting recognition with language ${lang}:`, error);
        setIsListening(false);

        if (error.name === "InvalidStateError") {
          // Recognition is already running, stop it and try again
          try {
            recognitionRef.current.stop();
            await new Promise((resolve) => setTimeout(resolve, 200));
          } catch (stopError) {
            console.error("Error stopping recognition:", stopError);
          }
        } else if (error.name === "NotAllowedError") {
          setErrorMessage("Microphone access denied. Please allow microphone access in your browser settings.");
          break; // Don't try other languages for permission errors
        } else if (error.name === "NetworkError") {
          setErrorMessage("Network error. Please check your internet connection and try again.");
          break; // Don't try other languages for network errors
        }

        // Wait a bit before trying the next language
        await new Promise((resolve) => setTimeout(resolve, 100));
        continue; // Try next language
      }
    }

    if (!recognitionStarted) {
      setIsListening(false);
      if (!errorMessage) {
        // Don't set error message if we haven't tried enough languages
        const capabilities = checkSpeechRecognitionCapabilities();
        if (capabilities.supported) {
          setErrorMessage("Unable to start speech recognition. Please try clicking 'Start Voice Assistant' again. Make sure your microphone is connected and try speaking clearly.");
        } else {
          setErrorMessage("Speech recognition is not supported in this browser. Please use Chrome or Edge for voice chat functionality.");
        }
      }
    }
  }, [isListening, checkMicrophonePermission, getSupportedLanguage, errorMessage]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
        console.log("Stopped listening");
      } catch (error) {
        console.error("Error stopping recognition:", error);
      }
      setIsListening(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }
  }, [isListening]);

  const endCall = useCallback(() => {
    setIsCallActive(false);
    setIsListening(false);
    setIsSpeaking(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    onClose && onClose();
  }, [onClose]);

  const speak = useCallback(
    (text) => {
      if (!synthRef.current) return;

      // Cancel any ongoing speech
      synthRef.current.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      // Enhanced speech settings for more natural voice
      utterance.rate = 0.85; // Slightly slower for better clarity
      utterance.pitch = 1.1; // Slightly higher pitch for friendliness
      utterance.volume = 0.9; // Slightly lower volume for comfort

      // Use selected voice
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        console.log("Started speaking:", text);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        console.log("Finished speaking");

        // Auto-start listening after assistant finishes speaking
        if (isCallActive) {
          setTimeout(() => {
            startListening();
          }, 1000);
        }
      };

      utterance.onerror = (event) => {
        console.error("Speech synthesis error:", event);
        setIsSpeaking(false);
        setErrorMessage("Voice synthesis error. Please try again.");
      };

      synthRef.current.speak(utterance);

      // Add to conversation
      setConversation((prev) => [
        ...prev,
        {
          speaker: "assistant",
          text,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    },
    [selectedVoice, startListening, isCallActive]
  );

  const processAdvisorInput = useCallback(
    (userText) => {
      const text = userText.toLowerCase().trim();
      console.log("Processing advisor input:", text);

      // More natural, conversational responses
      let responseText = "";

      if (text.includes("hello") || text.includes("hi") || text.includes("hey") || text.includes("start")) {
        responseText = "Hi there! I'm Sarah, your AI assistant. I'm here to help you with client operations, account procedures, and compliance requirements. What can I help you with today?";
      } else if (text.includes("account opening") || text.includes("new account") || text.includes("open account")) {
        responseText = "Sure! For account opening, I can walk you through the KYC process, documentation requirements, and compliance checks. Are you working with a personal account, business account, or investment account?";
      } else if (text.includes("kyc") || text.includes("know your customer") || text.includes("documentation") || text.includes("documents")) {
        responseText =
          "For KYC documentation, you'll typically need a government-issued ID, proof of address from the last three months, and income verification. For business accounts, we also need company registration documents. Would you like me to go through the specific requirements for any particular account type?";
      } else if (text.includes("compliance") || text.includes("regulation") || text.includes("aml") || text.includes("anti money laundering")) {
        responseText =
          "For compliance verification, make sure you complete the AML screening, check sanctions lists, verify PEP status, and document the source of funds. The system will automatically flag any potential issues for manual review. Are you working on a specific compliance check right now?";
      } else if (text.includes("investment") || text.includes("portfolio") || text.includes("wealth") || text.includes("trading")) {
        responseText = "Investment accounts require additional steps including risk assessment, investment experience evaluation, and suitability checks. We also need to verify net worth and investment objectives. Would you like me to explain the investment onboarding process step by step?";
      } else if (text.includes("corporate") || text.includes("business") || text.includes("company") || text.includes("commercial")) {
        responseText =
          "For corporate accounts, you'll need company registration certificates, board resolutions, authorized signatory documentation, and beneficial ownership declarations. The enhanced due diligence usually takes three to five business days. What type of business account are you setting up?";
      } else if (text.includes("help") || text.includes("assist") || text.includes("support") || text.includes("guide")) {
        responseText = "I'm here to help with account procedures, compliance guidelines, documentation verification, and client communication. Just let me know what specific area you need assistance with, and I'll guide you through it.";
      } else if (text.includes("thank you") || text.includes("thanks") || text.includes("bye") || text.includes("goodbye")) {
        responseText = "You're very welcome! I'm always here when you need help with client operations. Have a great day, and don't hesitate to reach out anytime!";
        setTimeout(() => endCall(), 3000);
      } else if (text.includes("test") || text.includes("testing")) {
        responseText = "I can hear you perfectly! The voice recognition is working well. Is there anything specific about client operations you'd like to discuss?";
      } else {
        // More intelligent contextual responses
        if (text.length > 5) {
          responseText = `I heard you mention "${userText}". Could you tell me more about what you need help with? I can assist with account procedures, compliance requirements, or any other client operations questions.`;
        } else {
          responseText = "I'm here to help with client operations. What would you like to know about?";
        }
      }

      // Add natural pauses for better flow
      setTimeout(() => speak(responseText), 500);
    },
    [speak, endCall]
  );

  const handleUserInput = useCallback(
    (userText) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      console.log("User input received:", userText);

      // Add user input to conversation
      setConversation((prev) => [
        ...prev,
        {
          speaker: "advisor",
          text: userText,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);

      // Process user input
      processAdvisorInput(userText);
    },
    [processAdvisorInput]
  );

  // Initialize speech recognition and synthesis
  useEffect(() => {
    // Check capabilities first
    const capabilities = checkSpeechRecognitionCapabilities();

    // Check for browser support
    if (!capabilities.supported) {
      setErrorMessage("Voice recognition is not supported in this browser. Please use Chrome or Edge for the best experience.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();

    // Optimized settings for better English recognition
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = "en-US"; // Default, will be changed in startListening
    recognitionRef.current.maxAlternatives = 3;

    console.log("Speech Recognition initialized with default language: en-US");

    recognitionRef.current.onstart = () => {
      console.log("Speech recognition started");
      setErrorMessage("");
    };

    recognitionRef.current.onresult = (event) => {
      console.log("Speech recognition result:", event);

      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcriptPart = result[0].transcript;

        console.log(`Result ${i}: ${transcriptPart} (confidence: ${result[0].confidence})`);

        if (result.isFinal) {
          finalTranscript += transcriptPart;
        } else {
          interimTranscript += transcriptPart;
        }
      }

      setTranscript(interimTranscript);

      if (finalTranscript.trim()) {
        console.log("Final transcript:", finalTranscript);
        handleUserInput(finalTranscript);
        setTranscript("");
      }
    };

    recognitionRef.current.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);

      switch (event.error) {
        case "network":
          setErrorMessage("Network error. Please check your internet connection and try again.");
          break;
        case "not-allowed":
          setErrorMessage("Microphone access denied. Please allow microphone access in your browser settings and refresh the page.");
          break;
        case "no-speech":
          setErrorMessage("No speech detected. Please speak clearly into your microphone and try again.");
          break;
        case "aborted":
          setErrorMessage("Speech recognition was interrupted. Please try again.");
          break;
        case "audio-capture":
          setErrorMessage("Audio capture error. Please check your microphone connection and try again.");
          break;
        case "language-not-supported":
          // Don't immediately fail, log the issue and suggest solutions
          console.warn("Language not supported error - this might be a temporary issue");
          setErrorMessage("Speech recognition had trouble with the language settings. Please try again or ensure your browser language includes English.");
          break;
        case "service-not-allowed":
          setErrorMessage("Speech recognition service not available. Please try again later or check your browser settings.");
          break;
        case "bad-grammar":
          setErrorMessage("Speech recognition grammar error. Please try speaking again.");
          break;
        default:
          setErrorMessage(`Speech recognition error: ${event.error}. Please try again or check your browser compatibility.`);
      }
    };

    recognitionRef.current.onend = () => {
      console.log("Speech recognition ended");
      setIsListening(false);
    };

    // Initialize speech synthesis
    synthRef.current = window.speechSynthesis;

    // Load voices when available
    if (synthRef.current.getVoices().length > 0) {
      loadVoices();
    } else {
      synthRef.current.addEventListener("voiceschanged", loadVoices);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [loadVoices, handleUserInput, checkSpeechRecognitionCapabilities]);

  const startCall = async () => {
    const hasAccess = await checkMicrophonePermission();
    if (!hasAccess) return;

    setIsCallActive(true);
    setConversation([]);
    setErrorMessage("");

    // Start with friendly greeting
    setTimeout(() => {
      speak("Hi! I'm Sarah, your AI assistant. I'm ready to help you with client operations, account procedures, and compliance questions. What can I help you with today?");
    }, 1200);
  };

  const toggleMute = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Test function for debugging (can be called from browser console)
  const testSpeechRecognition = useCallback(() => {
    console.log("=== SPEECH RECOGNITION DEBUG TEST ===");

    const capabilities = checkSpeechRecognitionCapabilities();
    console.log("1. Capabilities:", capabilities);

    const supportedLanguages = getSupportedLanguage();
    console.log("2. Supported languages:", supportedLanguages);

    if (synthRef.current) {
      const voices = synthRef.current.getVoices();
      console.log("3. Available voices:", voices.length);
      console.log(
        "4. English voices:",
        voices.filter((v) => v.lang.startsWith("en"))
      );
    }

    console.log("5. Selected voice:", selectedVoice);
    console.log("6. Current error:", errorMessage);
    console.log("7. Permissions:", hasPermission);

    return {
      capabilities,
      supportedLanguages,
      selectedVoice,
      errorMessage,
      hasPermission,
    };
  }, [checkSpeechRecognitionCapabilities, getSupportedLanguage, selectedVoice, errorMessage, hasPermission]);

  // Make test function available globally for debugging
  useEffect(() => {
    window.testSpeechRecognition = testSpeechRecognition;

    return () => {
      delete window.testSpeechRecognition;
    };
  }, [testSpeechRecognition]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Sarah - AI Assistant</h3>
                <p className="text-red-100 text-sm">Client Operations Support</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Call Status */}
        <div className="px-6 py-4 bg-gray-50 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isCallActive ? "bg-green-500 animate-pulse" : "bg-gray-400"}`}></div>
              <span className="text-sm font-medium text-gray-700">{isCallActive ? "Assistant Active" : "Ready to Help"}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <User className="w-4 h-4" />
              <span>Advisor Support</span>
            </div>
          </div>

          {/* Voice info */}
          {selectedVoice && <div className="mt-2 text-xs text-gray-500">Voice: {selectedVoice.name.split(" ")[0]}</div>}

          {/* Error Message */}
          {errorMessage && (
            <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-red-700 text-sm flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Debug Info */}
          {(errorMessage || hasPermission === false) && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-blue-700 text-xs">
              <div className="font-semibold mb-1">Debug Info:</div>
              <div>Browser: {navigator.userAgent.includes("Chrome") ? "Chrome" : navigator.userAgent.includes("Edge") ? "Edge" : navigator.userAgent.includes("Firefox") ? "Firefox" : navigator.userAgent.includes("Safari") ? "Safari" : "Other"}</div>
              <div>Language: {navigator.language}</div>
              <div>Speech Recognition: {"webkitSpeechRecognition" in window ? "Available" : "Not Available"}</div>
              <div>Speech Synthesis: {"speechSynthesis" in window ? "Available" : "Not Available"}</div>
              <div>Selected Voice: {selectedVoice ? selectedVoice.name : "None"}</div>
              <div className="mt-1 text-blue-600">
                Try: Open browser console and run <code>testSpeechRecognition()</code> for detailed diagnostics
              </div>
            </div>
          )}
        </div>

        {/* Conversation */}
        <div className="h-80 overflow-y-auto p-4 space-y-3">
          {conversation.length === 0 && !isCallActive && (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">Start voice assistance for client operations</p>
              <div className="mt-4 space-y-2 text-sm text-gray-500">
                <div className="flex items-center justify-center space-x-2">
                  <Shield className="w-4 h-4" />
                  <span>Natural Voice AI Assistant</span>
                </div>
                <p>Account opening • Compliance • Client support</p>
              </div>
            </div>
          )}

          {conversation.map((entry, index) => (
            <motion.div key={index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${entry.speaker === "advisor" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-xs px-4 py-2 rounded-lg ${entry.speaker === "advisor" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800"}`}>
                <p className="text-sm">{entry.text}</p>
                <p className="text-xs opacity-70 mt-1">{entry.timestamp}</p>
              </div>
            </motion.div>
          ))}

          {/* Live transcript */}
          {transcript && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-end">
              <div className="max-w-xs px-4 py-2 rounded-lg bg-blue-100 text-blue-800 border border-blue-200">
                <p className="text-sm italic">"{transcript}"</p>
              </div>
            </motion.div>
          )}

          {/* Speaking indicator */}
          {isSpeaking && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="max-w-xs px-4 py-2 rounded-lg bg-green-100 text-green-800 border border-green-200">
                <p className="text-sm flex items-center space-x-2">
                  <Volume2 className="w-4 h-4 animate-pulse" />
                  <span>Sarah is speaking...</span>
                </p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Controls */}
        <div className="p-6 bg-gray-50 rounded-b-xl">
          {!isCallActive ? (
            <button onClick={startCall} disabled={hasPermission === false} className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors">
              <Phone className="w-5 h-5" />
              <span>Start Voice Assistant</span>
            </button>
          ) : (
            <div className="flex space-x-3">
              <button onClick={toggleMute} className={`flex-1 py-3 px-4 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors ${isListening ? "bg-red-600 hover:bg-red-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"}`}>
                {isListening ? <Mic className="w-5 h-5 animate-pulse" /> : <MicOff className="w-5 h-5" />}
                <span>{isListening ? "Listening..." : "Click to Talk"}</span>
              </button>

              <button onClick={endCall} className="bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center">
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>
          )}

          {hasPermission === null && <p className="text-xs text-gray-500 mt-2 text-center">Please allow microphone access when prompted</p>}
        </div>
      </motion.div>
    </div>
  );
};

export default VoiceChat;
