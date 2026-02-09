import React, { useState, useRef } from 'react';
import { Mic, Square, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ds/ui/button";
import { useNotify } from 'ra-core';
import axios from 'axios';

interface VoiceNoteButtonProps {
    onTranscription: (text: string) => void;
}

export const VoiceNoteButton = ({ onTranscription }: VoiceNoteButtonProps) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);
    const notify = useNotify();

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder.current = new MediaRecorder(stream);
            audioChunks.current = [];

            mediaRecorder.current.ondataavailable = (event) => {
                audioChunks.current.push(event.data);
            };

            mediaRecorder.current.onstop = async () => {
                const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
                await processAudio(audioBlob);
            };

            mediaRecorder.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            notify("Microphone access denied", { type: 'error' });
        }
    };

    const stopRecording = () => {
        if (mediaRecorder.current && isRecording) {
            mediaRecorder.current.stop();
            setIsRecording(false);

            // Stop all tracks to release microphone
            mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
        }
    };

    const processAudio = async (blob: Blob) => {
        setIsProcessing(true);
        try {
            const formData = new FormData();
            formData.append('audio', blob, 'voice-note.wav');

            // Call the backend STT proxy
            const response = await axios.post('/api/sdk/stt', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.success && response.data.text) {
                onTranscription(response.data.text);
                notify("Voice note transcribed!", { type: 'success' });
            } else {
                throw new Error(response.data.message || "Transcription failed");
            }
        } catch (err: any) {
            console.error("STT Error:", err);
            notify(err.message || "Failed to process voice note", { type: 'error' });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex items-center gap-2">
            {!isRecording ? (
                <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full h-8"
                    onClick={startRecording}
                    disabled={isProcessing}
                >
                    {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                        <Mic className="h-4 w-4 mr-2 text-red-500" />
                    )}
                    {isProcessing ? "Processing..." : "Voice Note"}
                </Button>
            ) : (
                <Button
                    variant="destructive"
                    size="sm"
                    className="rounded-full h-8 animate-pulse"
                    onClick={stopRecording}
                >
                    <Square className="h-3 w-3 mr-2" />
                    Stop Recording
                </Button>
            )}
        </div>
    );
};
