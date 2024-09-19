import axios from 'axios';
import React, { useState, useRef, useEffect } from 'react';
import { RetellWebClient } from 'retell-client-js-sdk';
import { INTERVIEW_ID, NEXT_PUBLIC_RETELL_AGENT_ID, NEXT_PUBLIC_RETELL_API_URL } from './helpers/retell';

const retellWebClient = new RetellWebClient();

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaURL, setMediaURL] = useState(''); // URL del video
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const retellStreamDestination = useRef(null);
  const microphoneStreamRef = useRef(null);
  const videoStreamRef = useRef(null); // Stream de video del micrófono

  useEffect(() => {
    // Inicializamos el AudioContext
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();

    retellWebClient.on('audio', (audio) => {
      const audioBuffer = audioContextRef.current.createBuffer(
        1,
        audio.length,
        audioContextRef.current.sampleRate
      );

      audioBuffer.copyToChannel(audio, 0);

      const sourceNode = audioContextRef.current.createBufferSource();
      sourceNode.buffer = audioBuffer;

      if (!retellStreamDestination.current) {
        retellStreamDestination.current = audioContextRef.current.createMediaStreamDestination();
      }

      sourceNode.connect(retellStreamDestination.current);
      sourceNode.start();
    });

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const waitForRetellStream = async () => {
    return new Promise((resolve) => {
      const checkStream = setInterval(() => {
        if (retellStreamDestination.current) {
          clearInterval(checkStream);
          resolve(retellStreamDestination.current);
        }
      }, 100);
    });
  };

  async function registerCall(agentId, interviewId) {
    try {
      const response = await axios.post(
        `${NEXT_PUBLIC_RETELL_API_URL}/register-call-on-your-server`,
        {
          agentId: agentId,
          interviewId: interviewId,
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error al registrar la llamada:', error);
    }
  }

  const startRecording = async () => {
    try {
      const resp = await registerCall(NEXT_PUBLIC_RETELL_AGENT_ID, INTERVIEW_ID);
      const registerCallResponse = resp;

      if (registerCallResponse && registerCallResponse.access_token) {
        await retellWebClient.startCall({
          accessToken: registerCallResponse.access_token,
          emitRawAudioSamples: true,
        });

        console.log("Call started with Retell");
      } else {
        throw new Error('Access token no disponible');
      }

      const microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      microphoneStreamRef.current = microphoneStream;

      const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoStreamRef.current = videoStream;

      while (!retellStreamDestination.current) {
        await new Promise(r => setTimeout(r, 100));
      }
      const retellStream = retellStreamDestination.current.stream;

      const audioContext = audioContextRef.current;
      const microphoneSource = audioContext.createMediaStreamSource(microphoneStream);
      const retellSource = audioContext.createMediaStreamSource(retellStream);

      const mixedStreamDestination = audioContext.createMediaStreamDestination();
      microphoneSource.connect(mixedStreamDestination);
      retellSource.connect(mixedStreamDestination);

      const combinedStream = new MediaStream([
        ...mixedStreamDestination.stream.getAudioTracks(),
        ...videoStream.getVideoTracks()
      ]);

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: 'video/webm'
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setMediaURL(url);
        chunksRef.current = [];
        retellWebClient.stopCall();
      };

      mediaRecorder.start();
      setIsRecording(true);

    } catch (error) {
      console.error('Error al iniciar la grabación:', error);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    retellWebClient.stopCall();
    setIsRecording(false);
  };

  return (
    <div>
      <h1>Grabar audio y video</h1>
      {isRecording ? (
        <button onClick={stopRecording}>Detener grabación</button>
      ) : (
        <button onClick={startRecording}>Iniciar grabación</button>
      )}

      {mediaURL && (
        <div>
          <h2>Medios grabados:</h2>
          <video src={mediaURL} controls width={500}/>
        </div>
      )}
    </div>
  );
}

export default App;
