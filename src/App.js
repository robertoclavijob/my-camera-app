import React, { useState, useRef } from 'react';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [videoURL, setVideoURL] = useState('');
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const audioRef = useRef(null); // Referencia para el audio

  const startRecording = async () => {
    try {
      // Captura el audio del sistema (tab)
      const systemAudioStream = await navigator.mediaDevices.getDisplayMedia({
        audio: true,
      });

      // Captura el video de la cámara y el audio del micrófono
      const userMediaStream = await navigator.mediaDevices.getUserMedia({
        video: true, // Video de la cámara del usuario
        audio: true, // Audio del micrófono
      });

      // Crear un AudioContext para mezclar ambos streams
      const audioContext = new AudioContext();
      const systemAudioSource = audioContext.createMediaStreamSource(systemAudioStream);
      const userAudioSource = audioContext.createMediaStreamSource(userMediaStream);

      // Crear un destino para combinar las pistas de audio
      const destination = audioContext.createMediaStreamDestination();

      // Conectar ambos audios al destino
      systemAudioSource.connect(destination);
      userAudioSource.connect(destination);

      // Combinar las pistas (video de la cámara + audio mezclado del micrófono y sistema)
      const combinedStream = new MediaStream([
        ...userMediaStream.getVideoTracks(), // Añadir pista de video de la cámara
        ...destination.stream.getAudioTracks(), // Añadir la pista de audio combinada
      ]);

      streamRef.current = combinedStream;

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: 'video/webm',
        audioBitsPerSecond: 128000,
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
        setVideoURL(url);
        chunksRef.current = [];
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error al acceder a los dispositivos multimedia:', error);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    streamRef.current.getTracks().forEach(track => track.stop());
    setIsRecording(false);
  };

  return (
    <div>
      <h1>Grabar pantalla con audio del sistema y micrófono</h1>
      {isRecording ? (
        <button onClick={stopRecording}>Detener grabación</button>
      ) : (
        <button onClick={startRecording}>Iniciar grabación</button>
      )}

      {videoURL && (
        <div>
          <h2>Video grabado:</h2>
          <video src={videoURL} controls width="500" />
        </div>
      )}

      <h2>Audio de ejemplo:</h2>
      <audio ref={audioRef} controls>
        <source src="https://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Kangaroo_MusiQue_-_The_Neverwritten_Role_Playing_Game.mp3" type="audio/mpeg" />
        Tu navegador no soporta la reproducción de audio.
      </audio>
    </div>
  );
}

export default App;
