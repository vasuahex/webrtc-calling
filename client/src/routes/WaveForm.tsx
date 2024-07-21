
import React, { useState, useRef, useEffect } from 'react';
import WaveSurfer from 'wavesurfer.js';
import Button from "../reuse/Button"
import { getTooltipStyle } from '../reuse/static';
const AudioRecorder: React.FC = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const recordedWaveformRef = useRef<HTMLDivElement>(null); // Ref for WaveSurfer container
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const requestRef = useRef<number>();
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const wavesurferRef = useRef<WaveSurfer | null>(null);

    useEffect(() => {
        // Cleanup on unmount
        return () => {
            cancelAnimationFrame(requestRef.current!);
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
            if (wavesurferRef.current) {
                wavesurferRef.current.destroy();
            }
        };
    }, []);

    useEffect(() => {
        if (recordedWaveformRef.current) {
            // Initialize WaveSurfer
            wavesurferRef.current = WaveSurfer.create({
                container: recordedWaveformRef.current,
                waveColor: 'violet',
                progressColor: 'purple',
                height: 200,
                barWidth: 2,
                cursorWidth: 1,
                // responsive: true
            });
        }
    }, []);

    const drawWaveform = () => {
        if (canvasRef.current && analyserRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                const bufferLength = analyserRef.current.frequencyBinCount;
                const dataArray = new Float32Array(bufferLength);

                const draw = () => {
                    requestRef.current = requestAnimationFrame(draw);

                    analyserRef.current!.getFloatTimeDomainData(dataArray);

                    ctx.fillStyle = 'rgb(200, 200, 200)';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                    ctx.lineWidth = 2;
                    ctx.strokeStyle = 'rgb(0, 0, 0)';
                    ctx.beginPath();

                    const sliceWidth = canvas.width * 1.0 / bufferLength;
                    let x = 0;

                    for (let i = 0; i < bufferLength; i++) {
                        const v = dataArray[i] * 200.0;
                        const y = canvas.height / 2 + v;

                        if (i === 0) {
                            ctx.moveTo(x, y);
                        } else {
                            ctx.lineTo(x, y);
                        }

                        x += sliceWidth;
                    }

                    ctx.lineTo(canvas.width, canvas.height / 2);
                    ctx.stroke();
                };

                draw();
            }
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            if (!audioContextRef.current) {
                audioContextRef.current = new AudioContext();
                analyserRef.current = audioContextRef.current.createAnalyser();
            }

            const source = audioContextRef.current.createMediaStreamSource(stream);
            if (analyserRef.current) {
                source.connect(analyserRef.current);
            }

            const chunks: BlobPart[] = [];
            mediaRecorder.addEventListener('dataavailable', (event) => {
                chunks.push(event.data);
            });

            mediaRecorder.addEventListener('stop', async () => {
                const blob = new Blob(chunks, { type: 'audio/ogg; codecs=opus' });
                setAudioBlob(blob);
                const audioUrl = URL.createObjectURL(blob);
                setAudioUrl(audioUrl);
                stream.getTracks().forEach(track => track.stop());

                // Load audio data and draw recorded waveform using wavesurfer
                if (wavesurferRef.current) {
                    wavesurferRef.current.load(audioUrl);
                }
            });

            mediaRecorder.start();
            setIsRecording(true);
            drawWaveform();
        } catch (error) {
            console.error('Error starting recording:', error);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        cancelAnimationFrame(requestRef.current!);
    };

    const toggleRecording = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };
    const styles = getTooltipStyle("right");
    return (
        <div className="audio-recorder">
            <Button styles={styles} text={isRecording ? 'Stop Recording' : 'Start Recording'}
                tooltipText={isRecording ? 'Stop Recording' : 'Start Recording'} onClick={toggleRecording} />
            {/* <button onClick={toggleRecording}>
                {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button> */}
            <canvas ref={canvasRef} width="600" height="200" />
            {audioUrl && (
                <div>
                    <audio src={audioUrl} controls />
                    <a href={audioUrl} download="recording.ogg">Download Recording</a>
                </div>
            )}
            <div ref={recordedWaveformRef} style={{ marginTop: '20px', width: '600px', height: '200px' }} />
        </div>
    );
};

export default AudioRecorder;
