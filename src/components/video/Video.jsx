import React, { useEffect, useRef, useState } from "react";
import { db } from "../../lib/firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  deleteDoc,
  where,
} from "firebase/firestore";
import "./video.css";
import { useChatStore } from "../../lib/chatStore";
import { useUserStore } from "../../lib/userStore";
import { useParams } from 'react-router-dom';
import { useNavigate } from "react-router-dom";

const servers = {
  iceServers: [
    {
      urls: [
        "stun:stun1.l.google.com:19302",
        "stun:global.stun.twilio.com:3478",
      ],
    },
  ],
};

const Video = () => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(new RTCPeerConnection(servers));
  const localStream = useRef(null);
  const remoteStream = useRef(new MediaStream());
  const [callId, setCallId] = useState("");
  const [callComing, setcallComing] = useState(false);
  const [callStarted, setCallStarted] = useState(false);
  const { callerId, receiverId } = useParams();

  const { user } = useChatStore();
  const { currentUser } = useUserStore();

  const navigate = useNavigate();

  useEffect(() => {
    const initWebRTC = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        localStream.current = stream;
        localVideoRef.current.srcObject = stream;

        stream.getTracks().forEach((track) => {
          peerConnection.current.addTrack(track, stream);
        });
      } catch (error) {
        console.error("Error accessing media devices.", error);
      }
    };

    initWebRTC();

    peerConnection.current.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.current.addTrack(track);
      });
      remoteVideoRef.current.srcObject = remoteStream.current;
    };
  }, [callerId]);

  const createOffer = async () => {
    setCallStarted(true);
    const callDocRef = doc(collection(db, "calls"));
    const offerCandidates = collection(callDocRef, "offerCandidates");
    const answerCandidates = collection(callDocRef, "answerCandidates");

    setCallId(callDocRef.id);

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        setDoc(doc(offerCandidates), event.candidate.toJSON());
      }
    };

    const offerDescription = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offerDescription);

    const offer = { sdp: offerDescription.sdp, type: offerDescription.type };
    await setDoc(callDocRef, { offer, callerId, receiverId });

    onSnapshot(callDocRef, (snapshot) => {
      const data = snapshot.data();
      if (data?.answer && !peerConnection.current.currentRemoteDescription) {
        const answerDescription = new RTCSessionDescription(data.answer);
        peerConnection.current.setRemoteDescription(answerDescription);
      }
    });

    onSnapshot(answerCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const candidate = new RTCIceCandidate(change.doc.data());
          peerConnection.current.addIceCandidate(candidate);
        }
      });
    });
  };

  const answerCall = async (callId) => {
    const callDocRef = doc(db, "calls", callId);
    const offerCandidates = collection(callDocRef, "offerCandidates");
    const answerCandidates = collection(callDocRef, "answerCandidates");

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        setDoc(doc(answerCandidates), event.candidate.toJSON());
      }
    };

    const callData = (await getDoc(callDocRef)).data();
    const offerDescription = callData.offer;
    await peerConnection.current.setRemoteDescription(
      new RTCSessionDescription(offerDescription)
    );

    const answerDescription = await peerConnection.current.createAnswer();
    await peerConnection.current.setLocalDescription(answerDescription);

    const answer = { type: answerDescription.type, sdp: answerDescription.sdp };
    await setDoc(callDocRef, { answer }, { merge: true });

    onSnapshot(offerCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const candidate = new RTCIceCandidate(change.doc.data());
          peerConnection.current.addIceCandidate(candidate);
        }
      });
    });
  };

  const endCall = async () => {
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
      localStream.current = null;
    }

    // Close the peer connection
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    if (remoteStream.current) {
      remoteStream.current.getTracks().forEach((track) => track.stop());
      remoteStream.current = null; // Reset remoteStream for reuse if needed
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    if (localVideoRef.current) {
      localStream.current = null;
      localVideoRef.current.srcObject = null;
    }
    if (callId) {
      // Check if callId is defined
      const callDocRef = doc(db, "calls", callId);
      await deleteDoc(callDocRef); // Delete the main call document
      console.log("Call ended and removed from Firestore.");
      navigate('/home');
    } else {
      console.log(remoteVideoRef, localVideoRef);
      navigate('/home');
    }
  };

  const checkForIncomingOffer = async () => {
    try {
      const q = query(
        collection(db, "calls"),
        where("receiverId", "==", currentUser.id)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const callDoc = querySnapshot.docs[0];
        setCallId(callDoc.id); // set the call ID
        const callData = callDoc.data();

        if (callData.offer) {
          console.log("Incoming offer found, ready to answer");
          setcallComing(true);
        } else {
          console.log("No offer found yet.");
        }
      } else {
        console.log("No incoming call for this user.");
      }
    } catch (error) {
      console.error("Error checking for incoming offer:", error);
    }
  };

  // Triggering the correct logic based on current user role
  useEffect(() => {
    console.log(currentUser.id, callerId, receiverId);

    if (currentUser.id === callerId) {
      checkForIncomingOffer();
    } else if (currentUser.id === receiverId) {
      createOffer();
    }
  }, [currentUser.id, callerId, receiverId]);

  return (
    <div className="video">
      {callComing === true ? (
        <>
          <h1>Incoming Call</h1>
          <video ref={localVideoRef} autoPlay playsInline></video>
          <video ref={remoteVideoRef} autoPlay playsInline></video>
          <button onClick={() => answerCall(callId)}>Answer Call</button>
          <button onClick={endCall}> Stop Call </button>
        </>
      ) : (
        <>
          <h2 className="heading">
            WebRTC Video Call: <br />
            Caller: {currentUser.username} 
            Receiver: {user.username}
          </h2>
          <video ref={localVideoRef} autoPlay playsInline></video>
          <video ref={remoteVideoRef} autoPlay playsInline></video>
          <button onClick={createOffer} disabled={callStarted}>Start Call</button>
          {/* <input
          value={callId}
          onChange={(e) => setCallId(e.target.value)}
          placeholder="Enter Call ID to Answer"
        /> */}
          <button onClick={endCall}> Stop Call </button>
        </>
      )}
    </div>
  );
};

export default Video;
