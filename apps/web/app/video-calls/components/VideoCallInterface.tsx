'use client';

import React, { useEffect, useRef, useState } from 'react';
import { logger } from '@mintenance/shared';
import { supabase } from '@/lib/supabase';
import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Settings } from 'lucide-react';
import { DBVideoCall } from './VideoCallScheduler';

interface VideoCallInterfaceProps {
    call: DBVideoCall;
    currentUserId: string;
    onEndCall: () => void;
}

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

export function VideoCallInterface({ call, currentUserId, onEndCall }: VideoCallInterfaceProps) {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'failed'>('connecting');

    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const initializeCall = async () => {
            try {
                // 1. Get User Media
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                setLocalStream(stream);
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }

                // 2. Create Peer Connection
                peerConnection.current = new RTCPeerConnection(ICE_SERVERS);

                // Add tracks
                stream.getTracks().forEach((track) => {
                    peerConnection.current?.addTrack(track, stream);
                });

                // Handle remote stream
                peerConnection.current.ontrack = (event) => {
                    setRemoteStream(event.streams[0]);
                    if (remoteVideoRef.current) {
                        remoteVideoRef.current.srcObject = event.streams[0];
                    }
                };

                // Handle ICE candidates
                peerConnection.current.onicecandidate = (event) => {
                    if (event.candidate) {
                        channel.send({
                            type: 'broadcast',
                            event: 'ice-candidate',
                            payload: { candidate: event.candidate },
                        });
                    }
                };

                peerConnection.current.onconnectionstatechange = () => {
                    setConnectionStatus(peerConnection.current?.connectionState as any);
                };

                // 3. Setup Signaling via Supabase Realtime
                const channel = supabase.channel(`video-call:${call.id}`);

                channel
                    .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
                        if (peerConnection.current && payload.candidate) {
                            await peerConnection.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
                        }
                    })
                    .on('broadcast', { event: 'offer' }, async ({ payload }) => {
                        if (!peerConnection.current) return;

                        if (payload.senderId === currentUserId) return; // Ignore own offer

                        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(payload.offer));
                        const answer = await peerConnection.current.createAnswer();
                        await peerConnection.current.setLocalDescription(answer);

                        channel.send({
                            type: 'broadcast',
                            event: 'answer',
                            payload: { answer, senderId: currentUserId },
                        });
                    })
                    .on('broadcast', { event: 'answer' }, async ({ payload }) => {
                        if (!peerConnection.current) return;
                        if (payload.senderId === currentUserId) return;

                        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(payload.answer));
                    })
                    .subscribe(async (status) => {
                        if (status === 'SUBSCRIBED') {
                            // If we are the initiator, send offer
                            if (call.initiator_id === currentUserId) {
                                const offer = await peerConnection.current?.createOffer();
                                await peerConnection.current?.setLocalDescription(offer);

                                setTimeout(() => {
                                    channel.send({
                                        type: 'broadcast',
                                        event: 'offer',
                                        payload: { offer, senderId: currentUserId },
                                    });
                                }, 1000);
                            }
                        }
                    });

                return () => {
                    channel.unsubscribe();
                };

            } catch (error) {
                logger.error('Error initializing call:', error);
                setConnectionStatus('failed');
            }
        };

        initializeCall();

        return () => {
            localStream?.getTracks().forEach(track => track.stop());
            peerConnection.current?.close();
        };
    }, [call.id, currentUserId, call.initiator_id]);

    const toggleMute = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        if (localStream) {
            localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
            setIsVideoOff(!isVideoOff);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#000',
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column'
        }}>
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transform: 'scaleX(-1)'
                    }}
                />

                {connectionStatus !== 'connected' && (
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        color: 'white',
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        padding: '20px',
                        borderRadius: '10px',
                        textAlign: 'center'
                    }}>
                        <h3>{connectionStatus === 'connecting' ? 'Connecting...' : 'Connection Failed'}</h3>
                        <p>Waiting for peer...</p>
                    </div>
                )}

                <div style={{
                    position: 'absolute',
                    bottom: '100px',
                    right: '20px',
                    width: '150px',
                    height: '200px',
                    backgroundColor: '#333',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                    border: '2px solid white'
                }}>
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transform: 'scaleX(-1)'
                        }}
                    />
                </div>
            </div>

            <div style={{
                height: '80px',
                backgroundColor: '#1a1a1a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '20px',
                paddingBottom: '20px'
            }}>
                <Button
                    variant="secondary"
                    onClick={toggleMute}
                    style={{
                        borderRadius: '50%',
                        width: '50px',
                        height: '50px',
                        padding: 0,
                        backgroundColor: isMuted ? theme.colors.error : '#333',
                        color: 'white'
                    }}
                >
                    {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                </Button>

                <Button
                    variant="secondary"
                    onClick={toggleVideo}
                    style={{
                        borderRadius: '50%',
                        width: '50px',
                        height: '50px',
                        padding: 0,
                        backgroundColor: isVideoOff ? theme.colors.error : '#333',
                        color: 'white'
                    }}
                >
                    {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
                </Button>

                <Button
                    variant="primary"
                    onClick={onEndCall}
                    style={{
                        borderRadius: '50%',
                        width: '60px',
                        height: '60px',
                        padding: 0,
                        backgroundColor: theme.colors.error,
                        color: 'white'
                    }}
                >
                    <PhoneOff size={32} />
                </Button>

                <Button
                    variant="secondary"
                    style={{
                        borderRadius: '50%',
                        width: '50px',
                        height: '50px',
                        padding: 0,
                        backgroundColor: '#333',
                        color: 'white'
                    }}
                >
                    <Settings size={24} />
                </Button>
            </div>
        </div>
    );
}
