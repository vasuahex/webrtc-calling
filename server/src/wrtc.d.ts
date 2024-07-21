declare module 'wrtc' {
    export class RTCPeerConnection {
        constructor(configuration: RTCConfiguration);
        createOffer(options?: RTCOfferOptions): Promise<RTCSessionDescriptionInit>;
        createAnswer(options?: RTCAnswerOptions): Promise<RTCSessionDescriptionInit>;
        setLocalDescription(description: RTCSessionDescriptionInit): Promise<void>;
        setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void>;
        onicecandidate: ((event: RTCPeerConnectionIceEvent) => void) | null;
        // Add other required methods and properties...
    }
}
