'use client';

import { Camera, LoaderCircle, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { faceAuthService, ApiError } from '@/services/api';
import Modal from '@/components/modal';

type Props = { email?: string; password?: string; purpose: 'login' | 'enroll'; onComplete: (descriptor: number[]) => void; onClose: () => void };
let modelsLoaded: Promise<void> | null = null;

async function loadModels() {
  if (!modelsLoaded) {
    modelsLoaded = import('@vladmandic/face-api').then(async (faceapi) => {
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      await faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models');
      await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
    });
  }
  await modelsLoaded;
}

export default function FaceCapture({ email, password, purpose, onComplete, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState('Preparing camera…');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        await loadModels();
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
        if (!active) { stream.getTracks().forEach((track) => track.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
        setStatus('Center your face, then capture.');
      } catch (reason) {
        setError(reason instanceof DOMException && reason.name === 'NotAllowedError' ? 'Camera permission was denied. Allow camera access and retry.' : 'Unable to start the camera. Check that no other app is using it.');
      }
    })();
    return () => { active = false; streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; };
  }, []);

  const capture = async () => {
    if (!videoRef.current || busy) return;
    setBusy(true); setError(''); setStatus('Checking your face…');
    try {
      const faceapi = await import('@vladmandic/face-api');
      const result = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.6 })).withFaceLandmarks(true).withFaceDescriptor();
      if (!result) throw new Error('No face detected. Move into good light and try again.');
      if (email && purpose === 'login') {
        const challenge = await faceAuthService.challenge(email);
        await faceAuthService.verify({ challengeId: challenge.challengeId, nonce: challenge.nonce, descriptor: Array.from(result.descriptor) });
      } else if (purpose === 'enroll' && password) {
        await faceAuthService.enroll({ password, descriptor: Array.from(result.descriptor) });
      } else {
        if (purpose === 'login' || purpose === 'enroll') onComplete(Array.from(result.descriptor));
      }
      onComplete(Array.from(result.descriptor));
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : reason instanceof Error ? reason.message : 'Face capture failed. Try again.');
      setStatus('Ready to try again.');
    } finally { setBusy(false); }
  };

  return <Modal onClose={onClose} className="face-capture-modal" labelledBy="face-capture-title">
      <button className="icon-button" type="button" onClick={onClose} aria-label="Close face camera"><X size={18} /></button>
      <p className="eyebrow">Face Recognition</p><h2 id="face-capture-title">{purpose === 'login' ? 'Continue with face' : 'Set up face login'}</h2>
      <div className="face-video-frame">{error ? <div className="face-capture-error" role="alert">{error}</div> : <video ref={videoRef} muted playsInline aria-label="Face camera preview" />}</div>
      <p className="field-help" aria-live="polite">{status}</p>
      <div className="profile-actions"><button className="button button-secondary" type="button" onClick={onClose}>Cancel</button><button className="button button-primary" type="button" onClick={() => { void capture(); }} disabled={busy || Boolean(error && !streamRef.current)}>{busy ? <><LoaderCircle size={16} className="spin" /> Checking…</> : <><Camera size={16} /> Capture</>}</button></div>
  </Modal>;
}
