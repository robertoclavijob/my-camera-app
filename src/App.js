import React, { useState, useRef, useEffect } from 'react';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [videoURL, setVideoURL] = useState('');
  const [audioCodec, setAudioCodec] = useState('');
  const [videoCodec, setVideoCodec] = useState('');
  const [browser, setBrowser] = useState('');
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  // This function checks for supported codec types before starting the recording
  const getSupportedMimeType = () => {
    const possibleTypes = [
      'video/webm;codecs=vp8,opus', // Video codec VP8 with Opus audio codec
      'video/webm;codecs=vp9,opus', // Video codec VP9 with Opus audio codec
      'video/mp4;codecs=h264,aac',   // H.264 video codec with AAC audio codec
      'video/mp4;codecs="avc1.42E01E, mp4a.40.2"'
    ];

    for (let i = 0; i < possibleTypes.length; i++) {
      if (MediaRecorder.isTypeSupported(possibleTypes[i])) {
        const [video, audio] = possibleTypes[i].split(';codecs=');
        const codecs = audio.split(',');
        setVideoCodec(video.split('/')[1]); // Extract video codec (webm)
        setAudioCodec(codecs[0]); // Extract audio codec (opus)
        console.log(`Using codec: ${possibleTypes[i]}`);
        return possibleTypes[i];
      }
    }
    return ''; // Returns empty if no compatible codecs are found
  };

  // Function to get the browser name
  const getBrowserName = () => {
    const userAgent = navigator.userAgent;
    let browserName = 'Unknown';

    if (userAgent.indexOf('Chrome') > -1) {
      browserName = 'Chrome';
    } else if (userAgent.indexOf('Firefox') > -1) {
      browserName = 'Firefox';
    } else if (userAgent.indexOf('Safari') > -1) {
      browserName = 'Safari';
    } else if (userAgent.indexOf('Edge') > -1) {
      browserName = 'Edge';
    }

    setBrowser(browserName);
  };

  useEffect(() => {
    getBrowserName(); // Get browser name when component mounts
  }, []);

  // Starts recording video and audio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : {};

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
        chunksRef.current = []; // Clears the buffer
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
      <h1>Record Video and Audio</h1>
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
          <div>
            <p><strong>Video Codec:</strong> {videoCodec === 'vp8' ? 'VP8' : videoCodec === 'vp9' ? 'VP9' : videoCodec}</p>
            <p><strong>Audio Codec:</strong> {audioCodec === 'opus' ? 'Opus' : audioCodec}</p>
            <p><strong>Browser:</strong> {browser}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
