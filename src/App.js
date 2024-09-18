import React, { useState, useRef } from 'react';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [videoURL, setVideoURL] = useState('');
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const [audioFileURL, setAudioFileURL] = useState('');
  const audioRef = useRef(null); // Referencia para el audio

  const startRecording = async () => {
    try {
      // Captura el video de la cámara y el audio del micrófono
      const userMediaStream = await navigator.mediaDevices.getUserMedia({
        video: true, // Video de la cámara del usuario
        audio: true, // Audio del micrófono
      });

      // Crear un AudioContext para mezclar los streams de audio
      const audioContext = new AudioContext();

      // Captura el audio del micrófono
      const userAudioSource = audioContext.createMediaStreamSource(userMediaStream);

      // Captura el audio generado por la aplicación (del elemento <audio> de tu app)
      const appAudioSource = audioContext.createMediaElementSource(audioRef.current);

      // Crear un destino para combinar las pistas de audio
      const destination = audioContext.createMediaStreamDestination();

      // Conectar ambos audios al destino (el audio del micrófono y el de la app)
      userAudioSource.connect(destination);
      appAudioSource.connect(destination);

      // Combinar las pistas: video de la cámara y audio mezclado (micrófono + audio app)
      const combinedStream = new MediaStream([
        ...userMediaStream.getVideoTracks(), // Video de la cámara
        ...destination.stream.getAudioTracks(), // Pistas de audio combinadas
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

  // Manejar la selección de archivo de audio
  const handleAudioFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const audioURL = URL.createObjectURL(file);
      setAudioFileURL(audioURL); // Establece la URL del archivo seleccionado
    }
  };

  return (
    <div>
      {audioFileURL && <><h1>Grabar pantalla con audio del sistema y micrófono</h1>
        {isRecording ? (
          <button onClick={stopRecording}>Detener grabación</button>
        ) : (
          <button onClick={startRecording}>Iniciar grabación</button>
        )}
      </>}

      {videoURL && (
        <div>
          <h2>Video grabado:</h2>
          <video src={videoURL} controls width="500" />
        </div>
      )}

      <h2>Selecciona un archivo de audio para reproducir:</h2>
      <input type="file" accept="audio/*" onChange={handleAudioFileChange} /> {/* Input para seleccionar archivo */}

      {audioFileURL && (
        <div>
          <h2>Audio seleccionado:</h2>
          <audio ref={audioRef} controls>
            <source src={audioFileURL} type="audio/mpeg" />
            Tu navegador no soporta la reproducción de audio.
          </audio>
        </div>
      )}
    </div>
  );
}

export default App;
