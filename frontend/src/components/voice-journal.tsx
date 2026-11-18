'use client';

import { Mic, Pause, Play, RotateCcw, Square, Trash2, Waves } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, transcriptionService, writingModeService } from '@/services/api';
import Select from '@/components/ui/select';

const MAX_RECORDING_SECONDS = 600;
const MIN_RECORDING_MS = 1000;
const MAX_RECORDING_BYTES = 25 * 1024 * 1024;
type RecordingState = 'idle' | 'recording' | 'paused' | 'stopping' | 'ready';
type WritingMode = 'VERBATIM' | 'LIGHT_FIX' | 'REVIEW';

type VoiceJournalProps = {
  transcript: string;
  onTranscriptChange: (value: string) => void;
  onTranscribed: (value: string) => void;
  onRecordingChange: (hasRecording: boolean) => void;
  disabled?: boolean;
};

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainder = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function recordingMimeType() {
  const candidates = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'];
  return candidates.find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
}

export default function VoiceJournal({ transcript, onTranscriptChange, onTranscribed, onRecordingChange, disabled = false }: VoiceJournalProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audio, setAudio] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [transcriptionDone, setTranscriptionDone] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<WritingMode>('LIGHT_FIX');
  const [preview, setPreview] = useState<string | null>(null);
  const [previewNote, setPreviewNote] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const audioPlayer = useRef<HTMLAudioElement>(null);
  const transcriptInput = useRef<HTMLTextAreaElement>(null);
  const transcriptionAbort = useRef<AbortController | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<BlobPart[]>([]);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedBeforeResume = useRef(0);
  const activeSegmentStartedAt = useRef<number | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    if (!audio) { setAudioUrl(null); return undefined; }
    const url = URL.createObjectURL(audio);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [audio]);

  const stopTracks = useCallback(() => {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  }, []);

  const stopTimer = useCallback(() => {
    if (interval.current) clearInterval(interval.current);
    interval.current = null;
  }, []);

  const stopRecording = useCallback(() => {
    const activeRecorder = recorder.current;
    if (!activeRecorder || (activeRecorder.state !== 'recording' && activeRecorder.state !== 'paused')) return;
    if (activeRecorder.state === 'recording' && activeSegmentStartedAt.current !== null) {
      elapsedBeforeResume.current += (Date.now() - activeSegmentStartedAt.current) / 1000;
      activeSegmentStartedAt.current = null;
    }
    setRecordingSeconds(elapsedBeforeResume.current);
    stopTimer();
    setRecordingState('stopping');
    activeRecorder.stop();
    stopTracks();
  }, [stopTimer, stopTracks]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      stopTimer();
      const activeRecorder = recorder.current;
      if (activeRecorder && (activeRecorder.state === 'recording' || activeRecorder.state === 'paused')) activeRecorder.stop();
      stopTracks();
    };
  }, [stopTimer, stopTracks]);

  const startTimer = () => {
    activeSegmentStartedAt.current = Date.now();
    interval.current = setInterval(() => {
      const seconds = elapsedBeforeResume.current + (Date.now() - (activeSegmentStartedAt.current ?? Date.now())) / 1000;
      setRecordingSeconds(seconds);
      if (seconds >= MAX_RECORDING_SECONDS) {
        setError('The 10 minute recording limit was reached. You can transcribe or discard this recording.');
        stopRecording();
      }
    }, 250);
  };

  const startRecording = async () => {
    if (recordingState === 'recording' || recordingState === 'paused' || audio) return;
    setError('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Voice recording is not supported in this browser. Try a current version of Chrome, Edge, Firefox, or Safari.');
      return;
    }
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = mediaStream;
      const mimeType = recordingMimeType();
      const mediaRecorder = mimeType ? new MediaRecorder(mediaStream, { mimeType }) : new MediaRecorder(mediaStream);
      chunks.current = [];
      elapsedBeforeResume.current = 0;
      setRecordingSeconds(0);
      elapsedBeforeResume.current = 0;
      setAudio(null);
      setTranscriptionDone(false);
      onTranscriptChange('');
      recorder.current = mediaRecorder;
      mediaRecorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) chunks.current.push(event.data);
      });
      mediaRecorder.addEventListener('stop', () => {
        const result = new Blob(chunks.current, { type: mediaRecorder.mimeType || mimeType || 'audio/webm' });
        if (!isMounted.current) return;
        if (result.size === 0) {
          setRecordingState('idle');
          setError('The recording was empty. Please try again.');
          onRecordingChange(false);
        } else {
          setAudio(result);
          setRecordingState('ready');
        }
        chunks.current = [];
        stopTracks();
      }, { once: true });
      mediaRecorder.start(250);
      setRecordingState('recording');
      onRecordingChange(true);
      startTimer();
    } catch (reason) {
      stopTracks();
      onRecordingChange(false);
      if (reason instanceof DOMException && (reason.name === 'NotAllowedError' || reason.name === 'SecurityError')) {
        setError('Microphone access was denied. Allow microphone access in your browser settings and try again.');
      } else if (reason instanceof DOMException && reason.name === 'NotFoundError') {
        setError('No microphone was found. Connect a microphone and try again.');
      } else {
        setError('Unable to start recording. Check your microphone and try again.');
      }
    }
  };

  const pauseRecording = () => {
    if (recorder.current?.state !== 'recording') return;
    if (activeSegmentStartedAt.current !== null) elapsedBeforeResume.current += (Date.now() - activeSegmentStartedAt.current) / 1000;
    activeSegmentStartedAt.current = null;
    setRecordingSeconds(elapsedBeforeResume.current);
    stopTimer();
    recorder.current.pause();
    setRecordingState('paused');
  };

  const resumeRecording = () => {
    if (recorder.current?.state !== 'paused') return;
    recorder.current.resume();
    setRecordingState('recording');
    startTimer();
  };

  const deleteRecording = () => {
    if (!window.confirm('Delete this recording and its transcription? This cannot be undone.')) return;
    stopRecording();
    setAudio(null);
    setRecordingSeconds(0);
    elapsedBeforeResume.current = 0;
    setRecordingState('idle');
    setTranscriptionDone(false);
    setPreview(null);
    setPreviewNote('');
    onTranscriptChange('');
    onRecordingChange(false);
    setError('');
  };

  const fixAudioDuration = () => {
    const player = audioPlayer.current;
    if (!player || Number.isFinite(player.duration)) return;
    const resetPosition = () => {
      player.removeEventListener('timeupdate', resetPosition);
      player.currentTime = 0;
    };
    player.addEventListener('timeupdate', resetPosition);
    try { player.currentTime = Number.MAX_SAFE_INTEGER; } catch { player.removeEventListener('timeupdate', resetPosition); }
  };

  const transcribe = async () => {
    if (!audio || transcribing) return;
    const durationMs = Math.round(recordingSeconds * 1000);
    if (durationMs < MIN_RECORDING_MS) { setError('Recording is too short.'); return; }
    if (durationMs > MAX_RECORDING_SECONDS * 1000) { setError(`Recording is too long (max ${Math.floor(MAX_RECORDING_SECONDS / 60)} minutes).`); return; }
    if (audio.size > MAX_RECORDING_BYTES) { setError('Recording is too large.'); return; }
    setTranscribing(true);
    setError('');
    const controller = new AbortController();
    transcriptionAbort.current = controller;
    try {
      const result = await transcriptionService.transcribe(audio, durationMs, controller.signal);
      const separator = transcript.trim() ? '\n\n' : '';
      const nextTranscript = `${transcript}${separator}${result.transcription}`;
      onTranscriptChange(nextTranscript);
      onTranscribed(nextTranscript);
      setTranscriptionDone(true);
      setAudio(null);
      setRecordingState('idle');
      setRecordingSeconds(0);
      onRecordingChange(false);
      setPreview(null);
      setPreviewNote('');
      window.setTimeout(() => transcriptInput.current?.focus(), 0);
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      setError(reason instanceof ApiError ? reason.message : 'Unable to transcribe this recording. Please try again.');
    } finally {
      transcriptionAbort.current = null;
      setTranscribing(false);
    }
  };

  const cancelTranscription = () => {
    transcriptionAbort.current?.abort();
    setTranscribing(false);
    setError('');
  };

  const previewWritingMode = async () => {
    if (!transcript.trim() || previewing) return;
    setPreviewing(true);
    setError('');
    try {
      const result = await writingModeService.process({ mode, content: transcript });
      setPreview(result.version.processedContent);
      setPreviewNote(result.version.processingNotes ?? '');
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Unable to preview this writing mode.');
    } finally {
      setPreviewing(false);
    }
  };

  const usePreview = () => {
    if (preview === null) return;
    onTranscriptChange(preview);
    setPreview(null);
    setPreviewNote('');
  };

  return (
    <div className="voice-journal">
      <div className="voice-recorder-panel">
        <div className={`voice-mic-visual ${recordingState === 'recording' ? 'is-recording' : ''}`} aria-hidden="true"><Mic size={25} /><span className="voice-wave"><i /><i /><i /><i /><i /></span></div>
        <div className="voice-recorder-status">
          <strong>{transcribing ? 'Transcribing...' : recordingState === 'recording' ? 'Recording' : recordingState === 'paused' ? 'Recording paused' : recordingState === 'stopping' ? 'Finishing recording...' : audio ? 'Recording ready' : 'Ready when you are'}</strong>
          <span>{transcribing ? 'Your recording is being transcribed.' : recordingState === 'recording' ? 'Speak naturally. You can pause at any time.' : audio ? 'Review the audio before transcribing.' : 'Your recording is used only to create this transcript.'}</span>
        </div>
        <time className="voice-timer" aria-label={`Recording duration ${formatDuration(recordingSeconds)}`}>{formatDuration(recordingSeconds)}</time>

        <div className="voice-controls">
          {recordingState === 'idle' && <button className="voice-control voice-control-primary" type="button" onClick={() => { void startRecording(); }} disabled={disabled}><Mic size={17} /> Start recording</button>}
          {recordingState === 'recording' && <><button className="voice-control" type="button" onClick={pauseRecording}><Pause size={17} /> Pause</button><button className="voice-control voice-control-stop" type="button" onClick={stopRecording}><Square size={16} /> Stop</button></>}
          {recordingState === 'paused' && <><button className="voice-control voice-control-primary" type="button" onClick={resumeRecording}><Play size={17} /> Resume</button><button className="voice-control voice-control-stop" type="button" onClick={stopRecording}><Square size={16} /> Stop</button></>}
          {recordingState === 'stopping' && <span className="voice-processing" role="status">Finishing recording...</span>}
          {audio && recordingState === 'ready' && <>
            <audio ref={audioPlayer} className="voice-audio-player" controls src={audioUrl ?? undefined} onLoadedMetadata={fixAudioDuration} aria-label={`Play recording, ${formatDuration(recordingSeconds)}`} />
            <span className="voice-audio-duration" aria-label="Recorded duration">{formatDuration(recordingSeconds)}</span>
            <button className="voice-control" type="button" onClick={() => { void transcribe(); }} disabled={disabled || transcribing}>{transcribing ? <><Waves size={17} className="voice-processing-icon" /> Transcribing...</> : <><Waves size={17} /> Transcribe audio</>}</button>
            {transcribing && <button className="voice-control" type="button" onClick={cancelTranscription} aria-label="Cancel transcription">Cancel</button>}
            {!transcriptionDone && <button className="voice-control voice-control-danger" type="button" onClick={deleteRecording} disabled={disabled}><Trash2 size={16} /> Delete recording</button>}
          </>}
        </div>
        <p className="voice-retention-note">Audio is sent to Groq to be transcribed, then discarded. Only the text you save becomes a diary entry.</p>
      </div>

      {transcriptionDone && <div className="voice-transcript-panel">
        <div className="voice-transcript-heading"><div><p className="eyebrow">Review before saving</p><h3>Transcription</h3></div><button className="voice-control" type="button" onClick={deleteRecording} disabled={disabled}><RotateCcw size={16} /> Record again</button></div>
        <label className="form-field"><span>Edit the transcription</span><textarea ref={transcriptInput} rows={7} value={transcript} onChange={(event) => { onTranscriptChange(event.target.value); setPreview(null); setPreviewNote(''); }} disabled={disabled} /></label>
        <div className="voice-writing-tools">
          <label className="form-field"><span>Preview a writing mode</span><Select value={mode} onChange={(event) => { setMode(event.target.value as WritingMode); setPreview(null); setPreviewNote(''); }} disabled={previewing || disabled} options={[{ value: 'VERBATIM', label: 'Verbatim' }, { value: 'LIGHT_FIX', label: 'Light Fix' }, { value: 'REVIEW', label: 'Review' }]} /></label>
          <button className="voice-control" type="button" onClick={() => { void previewWritingMode(); }} disabled={!transcript.trim() || previewing || disabled}>{previewing ? 'Preparing preview...' : 'Preview mode'}</button>
        </div>
        {preview !== null && <div className="voice-comparison"><div><span className="field-label">Suggested version - {mode.replace('_', ' ')}</span><p>{preview || 'The preview is empty.'}</p></div>{previewNote && <p className="field-help">{previewNote}</p>}<div className="voice-comparison-actions"><button className="voice-control" type="button" onClick={() => { setPreview(null); setPreviewNote(''); }}>Keep my text</button><button className="voice-control voice-control-primary" type="button" onClick={usePreview}>Use this version</button></div></div>}
      </div>}

      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}
