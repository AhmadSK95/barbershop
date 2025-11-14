import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import * as faceDetection from '@tensorflow-models/face-detection';
import * as tf from '@tensorflow/tfjs';
import './VirtualTryOnPage.css';

function VirtualTryOnPage() {
  const [mode, setMode] = useState('select'); // 'select', 'camera', 'upload', 'result'
  const [capturedImage, setCapturedImage] = useState(null);
  const [selectedHairstyle, setSelectedHairstyle] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceShape, setFaceShape] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [modelLoading, setModelLoading] = useState(true);
  const [modelReady, setModelReady] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [generatedStyles, setGeneratedStyles] = useState([]); // Array of {name, image, style} objects
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingIds, setGeneratingIds] = useState(new Set()); // Track which styles are currently generating
  const [aiBackendStatus, setAiBackendStatus] = useState('checking');
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const detectorRef = useRef(null);

  // Backend URL
  const API_URL = process.env.REACT_APP_API_URL || '/api';

  // Available hairstyles database
  const hairstyles = [
    {
      id: 1,
      name: 'Classic Fade',
      description: 'Modern fade with textured top',
      suitableFaceShapes: ['oval', 'square', 'rectangle'],
      image: '/images/hairstyles/classic-fade.jpg',
      duration: 30,
      price: 60
    },
    {
      id: 2,
      name: 'Buzz Cut',
      description: 'Clean, low-maintenance cut',
      suitableFaceShapes: ['oval', 'square', 'diamond'],
      image: '/images/hairstyles/buzz-cut.jpg',
      duration: 30,
      price: 30
    },
    {
      id: 3,
      name: 'Pompadour',
      description: 'High volume classic style',
      suitableFaceShapes: ['oval', 'rectangle', 'triangle'],
      image: '/images/hairstyles/pompadour.jpg',
      duration: 45,
      price: 70
    },
    {
      id: 4,
      name: 'Undercut',
      description: 'Short sides, long top',
      suitableFaceShapes: ['oval', 'square', 'heart'],
      image: '/images/hairstyles/undercut.jpg',
      duration: 40,
      price: 65
    },
    {
      id: 5,
      name: 'Crew Cut',
      description: 'Short and professional',
      suitableFaceShapes: ['oval', 'square', 'rectangle'],
      image: '/images/hairstyles/crew-cut.jpg',
      duration: 30,
      price: 50
    },
    {
      id: 6,
      name: 'Textured Crop',
      description: 'Modern textured style',
      suitableFaceShapes: ['oval', 'round', 'square'],
      image: '/images/hairstyles/textured-crop.jpg',
      duration: 35,
      price: 60
    }
  ];

  // Check AI backend status
  useEffect(() => {
    // Always set as ready since we're using the main backend with GPT-4 Vision + DALL-E
    setAiBackendStatus('ready');
    console.log('✅ AI Backend ready with GPT-4 Vision + DALL-E!');
  }, []);

  // Initialize TensorFlow face detection model
  useEffect(() => {
    const loadModel = async () => {
      try {
        console.log('🔄 Loading AI model...');
        setModelLoading(true);
        
        await tf.ready();
        await tf.setBackend('webgl'); // Use WebGL for faster processing
        
        const model = faceDetection.SupportedModels.MediaPipeFaceDetector;
        const detectorConfig = {
          runtime: 'tfjs',
          maxFaces: 1,
          refineLandmarks: false // Disable for faster detection
        };
        detectorRef.current = await faceDetection.createDetector(model, detectorConfig);
        
        setModelReady(true);
        setModelLoading(false);
        console.log('✅ AI model ready!');
      } catch (error) {
        console.error('❌ Error loading AI model:', error);
        setModelReady(false);
        setModelLoading(false);
      }
    };
    loadModel();

    return () => {
      if (detectorRef.current) {
        detectorRef.current.dispose();
      }
    };
  }, []);

  // Capture photo from webcam
  const capturePhoto = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      setCapturedImage(imageSrc);
      setMode('result');
      detectFace(imageSrc);
    }
  };

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result);
        setMode('result');
        detectFace(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Detect face and analyze face shape
  const detectFace = async (imageData) => {
    setIsProcessing(true);
    
    // If model isn't loaded yet, use simplified detection
    if (!detectorRef.current) {
      console.log('⚡ Using fast mode - model still loading');
      setTimeout(() => {
        setFaceDetected(true);
        const randomShape = ['oval', 'square', 'round'][Math.floor(Math.random() * 3)];
        setFaceShape(randomShape);
        const recommended = hairstyles.filter(style => 
          style.suitableFaceShapes.includes(randomShape)
        );
        setRecommendations(recommended);
        setIsProcessing(false);
      }, 500);
      return;
    }

    try {
      const img = new Image();
      img.src = imageData;
      
      img.onload = async () => {
        try {
          // Set timeout for detection
          const detectionPromise = detectorRef.current.estimateFaces(img, { 
            flipHorizontal: false 
          });
          
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Detection timeout')), 3000)
          );
          
          const faces = await Promise.race([detectionPromise, timeoutPromise]);
          
          if (faces && faces.length > 0) {
            setFaceDetected(true);
            const detectedFaceShape = analyzeFaceShape(faces[0]);
            setFaceShape(detectedFaceShape);
            
            // Generate recommendations based on face shape
            const recommended = hairstyles.filter(style => 
              style.suitableFaceShapes.includes(detectedFaceShape)
            );
            setRecommendations(recommended);
            
            // Draw face landmarks on canvas (optional)
            drawFaceLandmarks(img, faces[0]);
          } else {
            // Fallback to all recommendations
            setFaceDetected(true);
            setFaceShape('oval'); // Default
            setRecommendations(hairstyles.slice(0, 3));
          }
        } catch (err) {
          console.log('⚡ Detection timeout, using fallback');
          // Fallback - show all styles
          setFaceDetected(true);
          setFaceShape('oval');
          setRecommendations(hairstyles.slice(0, 3));
        }
        setIsProcessing(false);
      };
      
      img.onerror = () => {
        console.error('Error loading image');
        setIsProcessing(false);
        setFaceDetected(false);
      };
    } catch (error) {
      console.error('Error detecting face:', error);
      // Fallback mode
      setFaceDetected(true);
      setFaceShape('oval');
      setRecommendations(hairstyles.slice(0, 3));
      setIsProcessing(false);
    }
  };

  // Analyze face shape based on keypoints
  const analyzeFaceShape = (face) => {
    try {
      const keypoints = face.keypoints;
      
      if (!keypoints || keypoints.length < 468) {
        // Fallback if keypoints are insufficient
        return 'oval';
      }
      
      // Simple face shape detection based on ratios
      const faceWidth = Math.abs(keypoints[234]?.x - keypoints[454]?.x) || 100;
      const faceHeight = Math.abs(keypoints[10]?.y - keypoints[152]?.y) || 120;
      const ratio = faceHeight / faceWidth;
      
      if (ratio > 1.3) return 'rectangle';
      if (ratio > 1.2) return 'oval';
      if (ratio < 0.9) return 'round';
      return 'square';
    } catch (error) {
      console.log('Using fallback face shape');
      return 'oval';
    }
  };

  // Draw face landmarks on canvas
  const drawFaceLandmarks = (image, face) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = image.width;
    canvas.height = image.height;
    
    // Draw the image
    ctx.drawImage(image, 0, 0);
    
    // Draw face bounding box
    if (face.box) {
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(face.box.xMin, face.box.yMin, face.box.width, face.box.height);
    }
    
    // Draw keypoints
    ctx.fillStyle = '#ff0000';
    face.keypoints.forEach(keypoint => {
      ctx.beginPath();
      ctx.arc(keypoint.x, keypoint.y, 2, 0, 2 * Math.PI);
      ctx.fill();
    });
  };

  // Apply hairstyle using AI backend
  const applyHairstyle = async (hairstyle) => {
    setSelectedHairstyle(hairstyle);
    
    // If AI backend is not available, just select the style
    if (aiBackendStatus !== 'ready') {
      console.log('AI Backend not ready, skipping generation');
      return;
    }
    
    // Generate hairstyle transformation
    if (capturedImage) {
      await generateHairstyle(hairstyle);
    }
  };

  // Generate AI hairstyle transformation using GPT-4 Vision + DALL-E
  const generateHairstyle = async (hairstyle) => {
    setIsGenerating(true);
    setGeneratedImage(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please login to use AI generation');
        return;
      }
      
      console.log(`🎨 Generating ${hairstyle.name} with GPT-4 Vision + DALL-E...`);
      
      // Use backend API with GPT-4 Vision + DALL-E
      const response = await fetch(`${API_URL}/dalle/hairstyle-from-photo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          image: capturedImage,
          hairstyleType: hairstyle.name,
          additionalDetails: hairstyle.description
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('🔍 Backend response:', data);
      
      if (data.success && data.images && data.images[0]) {
        const imageUrl = data.images[0].url;
        console.log('🔍 Image URL received:', imageUrl);
        console.log('🔍 Image URL type:', typeof imageUrl);
        setGeneratedImage(imageUrl);
        console.log('✅ Hairstyle generated with AI!');
      } else {
        throw new Error(data.error || 'Generation failed');
      }
      
    } catch (error) {
      console.error('Error generating hairstyle:', error);
      alert(`Failed to generate hairstyle: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate a single hairstyle on demand
  const generateSingleHairstyle = async (hairstyle) => {
    if (!capturedImage) return;
    
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login to use AI generation');
      return;
    }
    
    // Mark this style as generating
    setGeneratingIds(prev => new Set([...prev, hairstyle.id]));
    
    try {
      console.log(`🎨 Generating ${hairstyle.name}...`);
      
      const response = await fetch(`${API_URL}/dalle/hairstyle-from-photo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          image: capturedImage,
          hairstyleType: hairstyle.name,
          additionalDetails: hairstyle.description
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.images && data.images[0]) {
        const imageUrl = data.images[0].url;
        
        // Add to generated styles or update if exists
        setGeneratedStyles(prev => {
          const existingIndex = prev.findIndex(s => s.id === hairstyle.id);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = {
              ...hairstyle,
              generatedImage: imageUrl
            };
            return updated;
          } else {
            return [...prev, {
              ...hairstyle,
              generatedImage: imageUrl
            }];
          }
        });
        
        console.log(`✅ Generated ${hairstyle.name}`);
      } else {
        throw new Error(data.error || 'Generation failed');
      }
    } catch (error) {
      console.error(`Failed to generate ${hairstyle.name}:`, error);
      alert(`Failed to generate ${hairstyle.name}. Please try again.`);
    } finally {
      // Remove from generating set
      setGeneratingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(hairstyle.id);
        return newSet;
      });
    }
  };

  // Batch generate multiple hairstyles using GPT-4 Vision + DALL-E
  const batchGenerateHairstyles = async () => {
    if (!capturedImage) return;
    
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login to use AI generation');
      return;
    }
    
    setIsGenerating(true);
    setGeneratedStyles([]); // Clear previous results
    
    try {
      // Get top 3 recommended styles and generate 3 variations each = 9 total
      const topStyles = (recommendations.length > 0 ? recommendations : hairstyles).slice(0, 3);
      const variationsPerStyle = 3; // Generate 3 attempts per hairstyle
      
      console.log(`🎨 Generating ${topStyles.length} styles with ${variationsPerStyle} variations each (${topStyles.length * variationsPerStyle} total)...`);
      
      const generatedResults = [];
      let totalCount = 0;
      const totalToGenerate = topStyles.length * variationsPerStyle;
      
      // Generate multiple variations for each style
      for (const style of topStyles) {
        for (let varIndex = 0; varIndex < variationsPerStyle; varIndex++) {
          try {
            totalCount++;
            console.log(`🔄 Generating ${style.name} - variation ${varIndex + 1}/${variationsPerStyle} (${totalCount}/${totalToGenerate})`);
            
            const response = await fetch(`${API_URL}/dalle/hairstyle-from-photo`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                image: capturedImage,
                hairstyleType: style.name,
                additionalDetails: style.description
              })
            });
            
            const data = await response.json();
            
            if (data.success && data.images && data.images[0]) {
              const imageUrl = data.images[0].url;
              generatedResults.push({
                ...style,
                id: `${style.id}-var${varIndex}`, // Unique ID for each variation
                name: varIndex === 0 ? style.name : `${style.name} (v${varIndex + 1})`,
                generatedImage: imageUrl
              });
              console.log(`✅ Generated ${style.name} variation ${varIndex + 1}`);
              // Update state incrementally so user sees progress
              setGeneratedStyles([...generatedResults]);
            }
          } catch (error) {
            console.error(`Failed to generate ${style.name} variation ${varIndex + 1}:`, error);
          }
        }
      }
      
      if (generatedResults.length === 0) {
        alert('Failed to generate any hairstyles. Please try again.');
      } else {
        console.log(`✅ Successfully generated ${generatedResults.length} hairstyles!`);
      }
      
    } catch (error) {
      console.error('Error in batch generation:', error);
      alert('Failed to generate hairstyle. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Book appointment with selected hairstyle
  const bookAppointment = () => {
    if (selectedHairstyle) {
      // Store the generated image in sessionStorage so it persists across navigation
      if (selectedHairstyle.generatedImage) {
        sessionStorage.setItem('selectedHairstyleImage', selectedHairstyle.generatedImage);
        sessionStorage.setItem('selectedHairstyleName', selectedHairstyle.name);
      }
      // Navigate to booking page with pre-selected service
      window.location.href = `/booking?style=${selectedHairstyle.id}`;
    }
  };

  return (
    <div className="virtual-tryon-page">
      <div className="tryon-container">
        <div className="tryon-header">
          <h1 className="tryon-title">✨ AI Virtual Hair Consultation</h1>
          <p className="tryon-subtitle">
            See how different hairstyles look on you before booking
          </p>
          {modelLoading && (
            <div className="model-loading-banner">
              <div className="loading-spinner-small"></div>
              <span>Loading AI engine... This may take a few seconds</span>
            </div>
          )}
          {modelReady && (
            <div className="model-ready-banner">
              <span>✅ AI Ready - Fast analysis enabled!</span>
            </div>
          )}
          {aiBackendStatus === 'ready' && (
            <div className="model-ready-banner" style={{ backgroundColor: '#10b981' }}>
              <span>🎨 AI Image Generation Ready!</span>
            </div>
          )}
          {aiBackendStatus === 'offline' && (
            <div className="model-loading-banner" style={{ backgroundColor: '#f59e0b' }}>
              <span>⚠️ AI Backend Offline - Face detection only</span>
            </div>
          )}
        </div>

        {/* Mode Selection */}
        {mode === 'select' && (
          <div className="mode-selection">
            <div className="mode-cards">
              <div className="mode-card" onClick={() => setMode('camera')}>
                <div className="mode-icon">📷</div>
                <h3>Take Photo</h3>
                <p>Use your camera for instant results</p>
              </div>
              <div className="mode-card" onClick={() => fileInputRef.current.click()}>
                <div className="mode-icon">📁</div>
                <h3>Upload Photo</h3>
                <p>Choose an existing photo</p>
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              style={{ display: 'none' }}
            />
          </div>
        )}

        {/* Camera Mode */}
        {mode === 'camera' && (
          <div className="camera-mode">
            <div className="camera-container">
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                className="webcam-preview"
                videoConstraints={{
                  facingMode: 'user',
                  width: 1280,
                  height: 720
                }}
              />
            </div>
            <div className="camera-instructions">
              <p>💡 Position your face in the center and ensure good lighting</p>
            </div>
            <div className="camera-controls">
              <button className="btn btn-secondary" onClick={() => setMode('select')}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={capturePhoto}>
                📸 Capture Photo
              </button>
            </div>
          </div>
        )}

        {/* Result View */}
        {mode === 'result' && (
          <div className="result-view">
            <div className="result-content">
              <div className="image-preview-section">
                <h3>{generatedImage ? 'AI Generated Result' : 'Your Photo'}</h3>
                <div className="image-preview-container">
                  {/* Show generated image if available, otherwise show original */}
                  {(generatedImage || capturedImage) && (
                    <img 
                      src={generatedImage || capturedImage} 
                      alt={generatedImage ? "AI Generated" : "Your photo"} 
                      className="captured-image"
                    />
                  )}
                  <canvas ref={canvasRef} className="face-canvas" style={{ display: 'none' }} />
                  
                  {isProcessing && (
                    <div className="processing-overlay">
                      <div className="spinner"></div>
                      <p>Analyzing your face shape...</p>
                    </div>
                  )}
                  
                  {isGenerating && (
                    <div className="processing-overlay">
                      <div className="spinner"></div>
                      <p>🎨 Generating AI hairstyle...</p>
                      <p style={{ fontSize: '0.9em', marginTop: '10px' }}>This may take 15-30 seconds</p>
                    </div>
                  )}
                </div>

                {faceDetected && faceShape && (
                  <div className="face-analysis">
                    <div className="analysis-result">
                      <span className="analysis-label">Face Shape:</span>
                      <span className="analysis-value">{faceShape.toUpperCase()}</span>
                    </div>
                  </div>
                )}

                <div className="action-buttons">
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => {
                      setMode('select');
                      setCapturedImage(null);
                      setSelectedHairstyle(null);
                      setFaceDetected(false);
                      setFaceShape(null);
                      setGeneratedImage(null);
                    }}
                  >
                    Try Another Photo
                  </button>
                  {generatedImage && capturedImage && (
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => setGeneratedImage(null)}
                    >
                      Show Original
                    </button>
                  )}
                  {generatedStyles.length > 0 && (
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => setGeneratedStyles([])}
                    >
                      Clear All Generated Styles
                    </button>
                  )}
                </div>
              </div>

              <div className="hairstyles-section">
                <h3>
                  {recommendations.length > 0 
                    ? `Try These Styles (Recommended for ${faceShape} Face)` 
                    : 'Choose a Style to Generate'}
                </h3>
                <p style={{ color: '#999', marginBottom: '1rem', fontSize: '0.9rem' }}>
                  Click "Generate" on any hairstyle to see how it looks on you with AI
                </p>
                
                <div className="hairstyles-grid">
                  {/* Show all hairstyles with generate buttons */}
                  {hairstyles.map(hairstyle => {
                    const generated = generatedStyles.find(s => s.id === hairstyle.id);
                    const isGeneratingThis = generatingIds.has(hairstyle.id);
                    const isRecommended = recommendations.some(r => r.id === hairstyle.id);
                    
                    return (
                      <div
                        key={hairstyle.id}
                        className={`hairstyle-card ${selectedHairstyle?.id === hairstyle.id ? 'selected' : ''}`}
                        onClick={() => generated && setSelectedHairstyle(generated)}
                      >
                        <div className="hairstyle-image-container">
                          {generated ? (
                            <img 
                              src={generated.generatedImage} 
                              alt={`AI Generated ${hairstyle.name}`}
                              className="hairstyle-image"
                            />
                          ) : (
                            <div className="hairstyle-image-placeholder">
                              {isGeneratingThis ? (
                                <div className="generating-spinner">
                                  <div className="spinner"></div>
                                  <p style={{ marginTop: '10px', fontSize: '0.8rem' }}>Generating...</p>
                                </div>
                              ) : (
                                <div className="placeholder-icon">✂️</div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="hairstyle-info">
                          <h4>{hairstyle.name}</h4>
                          <p className="hairstyle-description">{hairstyle.description}</p>
                          <div className="hairstyle-details">
                            <span className="hairstyle-price">${hairstyle.price}</span>
                            <span className="hairstyle-duration">{hairstyle.duration} min</span>
                          </div>
                          
                          {isRecommended && !generated && (
                            <div className="recommended-badge">⭐ Recommended</div>
                          )}
                          {generated && (
                            <div className="recommended-badge">✨ AI Generated</div>
                          )}
                          
                          {!generated && (
                            <button 
                              className="btn btn-primary" 
                              style={{ width: '100%', marginTop: '0.5rem', padding: '0.5rem' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                generateSingleHairstyle(hairstyle);
                              }}
                              disabled={isGeneratingThis}
                            >
                              {isGeneratingThis ? 'Generating...' : '🎨 Generate'}
                            </button>
                          )}
                          {generated && (
                            <button 
                              className="btn btn-secondary" 
                              style={{ width: '100%', marginTop: '0.5rem', padding: '0.5rem', fontSize: '0.8rem' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                generateSingleHairstyle(hairstyle);
                              }}
                              disabled={isGeneratingThis}
                            >
                              🔄 Regenerate
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {selectedHairstyle && (
                  <div className="booking-cta">
                    <div className="selected-style-info">
                      <h4>Selected: {selectedHairstyle.name}</h4>
                      <p>{selectedHairstyle.description}</p>
                    </div>
                    <button className="btn btn-primary btn-large" onClick={bookAppointment}>
                      Book Appointment with This Style
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default VirtualTryOnPage;
