import React, { useState, useRef, useEffect } from 'react';

export default function GolfCoachApp() {
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [installPrompt, setInstallPrompt] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    
    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    
    if (result.outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
      setError(null);
      setAnalysis(null);
    } else {
      setError('Please select a valid video file');
    }
  };

  const analyzeSwing = async () => {
    if (!videoFile) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const base64Video = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(videoFile);
      });

      const mediaType = videoFile.type;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'video',
                  source: {
                    type: 'base64',
                    media_type: mediaType,
                    data: base64Video,
                  },
                },
                {
                  type: 'text',
                  text: 'You are a professional golf coach analyzing a golf swing video. Please provide:\n\n1. Swing Analysis: Detailed breakdown of the swing mechanics (setup, backswing, downswing, follow-through, tempo, weight transfer)\n2. Key Issues: 2-3 specific problems you observe\n3. Recommended Drills: 3 practical drills to address these issues, with clear step-by-step instructions for each\n\nFormat your response as JSON with this structure:\n{\n  "analysis": "detailed analysis text",\n  "issues": ["issue 1", "issue 2", "issue 3"],\n  "drills": [\n    {\n      "name": "drill name",\n      "purpose": "what it fixes",\n      "steps": ["step 1", "step 2", "step 3"],\n      "frequency": "how often to practice"\n    }\n  ]\n}\n\nOnly return the JSON, no other text.',
                },
              ],
            },
          ],
        }),
      });

      const data = await response.json();
      
      if (data.content && data.content[0]) {
        const analysisText = data.content[0].text;
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsedAnalysis = JSON.parse(jsonMatch[0]);
          setAnalysis(parsedAnalysis);
        } else {
          throw new Error('Could not parse analysis');
        }
      }
    } catch (err) {
      setError('Failed to analyze swing: ' + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-green-800 mb-2">
            ⛳ AI Golf Coach
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Upload your swing video for professional analysis
          </p>
          
          {installPrompt && (
            <button
              onClick={handleInstallClick}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              📱 Install App
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8 mb-6">
          <div className="flex flex-col items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {!videoPreview ? (
              <div
                onClick={() => fileInputRef.current.click()}
                className="w-full border-2 border-dashed border-green-300 rounded-lg p-8 sm:p-12 text-center cursor-pointer hover:border-green-500 transition-colors active:bg-green-50"
              >
                <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-base sm:text-lg font-medium text-gray-700 mb-2">
                  Upload or Record Golf Swing
                </p>
                <p className="text-xs sm:text-sm text-gray-500">
                  Tap to select or record video
                </p>
              </div>
            ) : (
              <div className="w-full">
                <video
                  src={videoPreview}
                  controls
                  playsInline
                  className="w-full rounded-lg shadow-md mb-4"
                />
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => fileInputRef.current.click()}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 active:bg-gray-400 transition-colors text-sm sm:text-base"
                  >
                    Choose Different Video
                  </button>
                  <button
                    onClick={analyzeSwing}
                    disabled={isAnalyzing}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    {isAnalyzing ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Analyze Swing
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {analysis && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-bold text-green-800 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Swing Analysis
              </h2>
              <p className="text-sm sm:text-base text-gray-700 leading-relaxed">{analysis.analysis}</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-bold text-orange-600 mb-4">
                Areas for Improvement
              </h2>
              <ul className="space-y-2">
                {analysis.issues.map((issue, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-bold">
                      {idx + 1}
                    </span>
                    <span className="text-sm sm:text-base text-gray-700">{issue}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-bold text-blue-600 mb-4">
                Recommended Drills
              </h2>
              <div className="space-y-6">
                {analysis.drills.map((drill, idx) => (
                  <div key={idx} className="border border-blue-200 rounded-lg p-4 sm:p-5 bg-blue-50">
                    <h3 className="text-lg sm:text-xl font-bold text-blue-800 mb-2">
                      {drill.name}
                    </h3>
                    <p className="text-sm sm:text-base text-blue-700 mb-3 italic">{drill.purpose}</p>
                    <div className="mb-3">
                      <h4 className="font-semibold text-gray-800 mb-2 text-sm sm:text-base">Steps:</h4>
                      <ol className="space-y-2">
                        {drill.steps.map((step, stepIdx) => (
                          <li key={stepIdx} className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                              {stepIdx + 1}
                            </span>
                            <span className="text-sm sm:text-base text-gray-700">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600">
                      <strong>Practice:</strong> {drill.frequency}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}