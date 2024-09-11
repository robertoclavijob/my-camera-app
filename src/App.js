import React, { useState, useRef } from 'react';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [videoURL, setVideoURL] = useState('');
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  // This function checks codec support before starting the recording
  const getSupportedMimeType = () => {
    const possibleTypes = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/mp4;codecs=h264',
      'video/webm;codecs=h264'
    ];

    for (let i = 0; i < possibleTypes.length; i++) {
      if (MediaRecorder.isTypeSupported(possibleTypes[i])) {
        console.log(`Using codec: ${possibleTypes[i]}`);
        return possibleTypes[i];
      }
    }
    return ''; // Returns empty if no compatible codecs are found
  };

  // Starts recording video without audio
  const startRecording = async () => {
    try {
      // Only get video, disabling audio
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : {}; // Use default if no compatible codec is found

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setVideoURL(url);
        chunksRef.current = []; // Clear the buffer
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing media devices:', err);
      alert('Error accessing media devices: ' + err.message);
    }
  };

  // Stops the recording
  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    streamRef.current.getTracks().forEach(track => track.stop());
    setIsRecording(false);
  };

  return (
    <div>
      <h1>Record Video</h1>
      <div>
        {isRecording ? (
          <button onClick={stopRecording}>Stop Recording</button>
        ) : (
          <button onClick={startRecording}>Start Recording</button>
        )}
      </div>
      {videoURL && (
        <div>
          <h2>Recorded Video:</h2>
          <video src={videoURL} controls width="500" />
        </div>
      )}
    </div>
  );
}

export default App;
