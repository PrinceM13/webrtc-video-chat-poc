"use client";

import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";

const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10,
};

export default function Home() {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const callInputRef = useRef<HTMLInputElement>(null);

  const [callId, setCallId] = useState<string>("");
  const [webcamActive, setWebcamActive] = useState(false);

  useEffect(() => {
    // Initialize peer connection with STUN servers
    pcRef.current = new RTCPeerConnection(servers);

    return () => {
      // Cleanup on unmount
      if (pcRef.current) {
        pcRef.current.close();
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleWebcamClick = async () => {
    try {
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert(
          "Camera access requires HTTPS. Please use https://192.168.1.103:3001 on mobile devices."
        );
        return;
      }

      localStreamRef.current = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      remoteStreamRef.current = new MediaStream();

      // Push tracks from local stream to peer connection
      localStreamRef.current.getTracks().forEach((track) => {
        pcRef.current?.addTrack(track, localStreamRef.current!);
      });

      // Pull tracks from remote stream, add to video stream
      pcRef.current!.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          remoteStreamRef.current?.addTrack(track);
        });
      };

      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = localStreamRef.current;
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }

      setWebcamActive(true);
    } catch (error) {
      console.error("Error accessing webcam:", error);
      alert("Error accessing webcam. Please check permissions.");
    }
  };

  const handleCallClick = async () => {
    if (!pcRef.current) return;

    // Create a new call document in Firestore
    const callDoc = doc(collection(db, "calls"));
    const offerCandidates = collection(callDoc, "offerCandidates");
    const answerCandidates = collection(callDoc, "answerCandidates");

    setCallId(callDoc.id);

    // Get candidates for caller and save to Firestore
    pcRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(offerCandidates, event.candidate.toJSON());
      }
    };

    // Create offer
    const offerDescription = await pcRef.current.createOffer();
    await pcRef.current.setLocalDescription(offerDescription);

    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    };

    await setDoc(callDoc, { offer });

    // Listen for remote answer
    onSnapshot(callDoc, (snapshot) => {
      const data = snapshot.data();
      if (!pcRef.current?.currentRemoteDescription && data?.answer) {
        const answerDescription = new RTCSessionDescription(data.answer);
        pcRef.current?.setRemoteDescription(answerDescription);
      }
    });

    // Listen for remote ICE candidates
    onSnapshot(answerCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const candidate = new RTCIceCandidate(change.doc.data());
          pcRef.current?.addIceCandidate(candidate);
        }
      });
    });

    alert(`Call created! Share this ID: ${callDoc.id}`);
  };

  const handleAnswerClick = async () => {
    if (!pcRef.current) return;

    const callId = callInputRef.current?.value;
    if (!callId) {
      alert("Please enter a call ID");
      return;
    }

    const callDoc = doc(db, "calls", callId);
    const answerCandidates = collection(callDoc, "answerCandidates");
    const offerCandidates = collection(callDoc, "offerCandidates");

    // Get candidates for answerer and save to Firestore
    pcRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(answerCandidates, event.candidate.toJSON());
      }
    };

    const callData = (await getDoc(callDoc)).data();

    if (!callData?.offer) {
      alert("Call not found");
      return;
    }

    const offerDescription = callData.offer;
    await pcRef.current.setRemoteDescription(
      new RTCSessionDescription(offerDescription)
    );

    const answerDescription = await pcRef.current.createAnswer();
    await pcRef.current.setLocalDescription(answerDescription);

    const answer = {
      type: answerDescription.type,
      sdp: answerDescription.sdp,
    };

    await updateDoc(callDoc, { answer });

    // Listen for remote ICE candidates
    onSnapshot(offerCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const candidate = new RTCIceCandidate(change.doc.data());
          pcRef.current?.addIceCandidate(candidate);
        }
      });
    });

    alert("Call answered!");
  };

  const handleHangupClick = () => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = new RTCPeerConnection(servers);
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (webcamVideoRef.current) {
      webcamVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    setWebcamActive(false);
    setCallId("");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-8 dark:bg-black">
      <main className="flex w-full max-w-4xl flex-col items-center gap-6 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-black dark:text-white">
          WebRTC Video Chat
        </h1>

        <div className="flex w-full gap-4">
          <div className="flex-1">
            <h2 className="mb-2 text-xl text-black dark:text-white">
              Local Stream
            </h2>
            <video
              ref={webcamVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full rounded-lg bg-gray-200 dark:bg-gray-800"
            />
          </div>
          <div className="flex-1">
            <h2 className="mb-2 text-xl text-black dark:text-white">
              Remote Stream
            </h2>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full rounded-lg bg-gray-200 dark:bg-gray-800"
            />
          </div>
        </div>

        <div className="flex w-full flex-col gap-3">
          <button
            onClick={handleWebcamClick}
            disabled={webcamActive}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {webcamActive ? "Webcam Active" : "Start Webcam"}
          </button>

          {callId && (
            <div className="rounded-lg bg-gray-100 p-3 dark:bg-gray-800">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Call ID (share this):
              </p>
              <p className="font-mono text-sm break-all text-black dark:text-white">
                {callId}
              </p>
            </div>
          )}

          <input
            ref={callInputRef}
            placeholder="Enter call ID to join"
            className="rounded-lg border px-4 py-2 dark:bg-gray-800 dark:text-white"
          />

          <button
            onClick={handleCallClick}
            disabled={!webcamActive}
            className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
          >
            Create Call
          </button>

          <button
            onClick={handleAnswerClick}
            disabled={!webcamActive}
            className="rounded-lg bg-yellow-600 px-4 py-2 text-white hover:bg-yellow-700 disabled:opacity-50"
          >
            Answer Call
          </button>

          <button
            onClick={handleHangupClick}
            className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          >
            Hang Up
          </button>
        </div>
      </main>
    </div>
  );
}
