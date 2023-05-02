let remoteRTCMessage;
let iceCandidatesFromCaller = [];
let peerConnection;
let remoteStream;
let localStream;
let otherUser;
let callInProgress = false;

let localVideo = document.querySelector("#local_stream");
let videoDiv = document.querySelector("#local_video");

let remoteVideo = document.querySelector('#remote_stream');
let remoteDiv = document.querySelector("#remote_video");

const roomName = JSON.parse(document.getElementById('room-name').textContent);
const userName = JSON.parse(document.getElementById('username').textContent);

const chatSocket = new WebSocket(
    'ws://'
    + window.location.host
    + '/ws/chat/'
    + roomName
    + '/'
);

let pcConfig = {
    iceServers:[
        {
            urls:['stun:stun1.1.google.com:19302', 'stun:stun2.1.google.com:19302']
        }
    ]
};

let sdpConstraints = {
    offerToReceiveAudio: true,
    offerToReceiveVideo: true
};

function call() {
    let userToCall = roomName;
    otherUser = userToCall;

    beReady()
        .then(bool => {
            processCall(userToCall)
        })
};

function answer() {
    //do the event firing

    beReady()
        .then(bool => {
            processAccept();
        })

    // document.getElementById("answer").style.display = "none";
};

function beReady() {
    localStream = new MediaStream();
    videoDiv.style.visibility = 'visible';
    const constraints = {
        'video': true,
        'audio': true
    };
    return navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            localStream = stream;
            localVideo.srcObject = localStream;

            return createConnectionAndAddStream()
        })
        .catch(function (e) {
            alert('getUserMedia() error: ' + e.name);
        });
};

document.querySelector("#video_call_button").addEventListener("click", beReady);

function createConnectionAndAddStream() {
    createPeerConnection();
    peerConnection.addStream(localStream);
    return true;
};

function processCall(room_name) {
    // localStream.getTracks().forEach((track)=>{
    //     peerConnection.addStream
    // })
    peerConnection.createOffer((sessionDescription) => {
        console.log("session Description: ",sessionDescription);
        peerConnection.setLocalDescription(sessionDescription);
        sendCall({
            // 'GroupName': room_name,
            'message': sessionDescription
        })
    }, (error) => {
        console.log("Error:", error.name);
    });
};

function processAccept() {
    console.log("answerRTC: ",remoteRTCMessage);
    peerConnection.setRemoteDescription(remoteRTCMessage);
    peerConnection.createAnswer((sessionDescription) => {
        peerConnection.setLocalDescription(sessionDescription);

        if (iceCandidatesFromCaller.length > 0) {
            //I am having issues with call not being processed in real world (internet, not local)
            //so I will push iceCandidates I received after the call arrived, push it and, once we accept
            //add it as ice candidate
            //if the offer rtc message contains all thes ICE candidates we can ingore this.
            for (let i = 0; i < iceCandidatesFromCaller.length; i++) {
                //
                let candidate = iceCandidatesFromCaller[i];
                console.log("ICE candidate Added From queue");
                try {
                    peerConnection.addIceCandidate(candidate).then(done => {
                        console.log(done);
                    }).catch(error => {
                        console.log(error);
                    })
                } catch (error) {
                    console.log(error);
                }
            }
            iceCandidatesFromCaller = [];
            console.log("ICE candidate queue cleared");
        } else {
            console.log("NO Ice candidate in queue");
        }
        console.log("sessionDescription: ",sessionDescription);
        answerCall({
            'caller': otherUser,
            'message': sessionDescription
        })

    }, (error) => {
        console.log("Error", error.message);
    })
};

let createPeerConnection = async()=> {
    try {
        peerConnection = new RTCPeerConnection(pcConfig);
        peerConnection.onicecandidate = handleIceCandidate;
        peerConnection.onaddstream = handleRemoteStreamAdded;
        peerConnection.onremovestream = handleRemoteStreamRemoved;
        console.log('Created RTCPeerConnnection');
        remoteStream=new MediaStream();

        return;
    } catch (e) {
        console.log('Failed to create PeerConnection, exception: ' + e.message);
        alert('Cannot create RTCPeerConnection object.');
        return;
    }
};

const onICECandidate = (data) => {
    console.log("GOT ICE candidate");
    let message = data.message
    let candidate;
    if(data.sender==userName){
        return;
    }
    if (message.candidate) {
        console.log(message);
        candidate = new RTCIceCandidate({
          'candidate':message.candidate.candidate,
          'sdpMid': message.candidate.sdpMid,
          'sdpMLineIndex': message.candidate.sdpMLineIndex
        });
        console.log("Candidate Created:",candidate);

    } else {
        console.error("Invalid message format:", message);
    }

    if (peerConnection) {
        peerConnection.addIceCandidate(candidate);
        console.log("ICE candidate Added");
    } else {
        console.log("ICE candidate Pushed");
        iceCandidatesFromCaller.push(candidate);
    }

};

function handleIceCandidate(event) {
    // console.log('icecandidate event: ', event);
    if (event.candidate) {
        console.log("Local ICE candidate");
        // console.log(event.candidate.candidate);
        console.log("candidate from handler",event.candidate.sdpMid);
        sendICEcandidate({
            'user': otherUser,
            'message': {
                // 'label': event.candidate.sdpMLineIndex,
                // 'id': event.candidate.sdpMid,
                'candidate': event.candidate
            }
        })
        
    } else {
        console.log('End of candidates.');
    }
};

function sendICEcandidate(data) {
    //send only if we have caller, else no need to
    console.log("Send ICE candidate");
    console.log("ICE Data: ",data.message);
    // socket.emit("ICEcandidate", data)
    chatSocket.send(JSON.stringify({
        'type': 'ICE_Candidate',
        'sender': userName,
        'message': data.message
    }));

};

function handleRemoteStreamAdded(event) {
    remoteStream = event.stream;
    remoteVideo.srcObject = remoteStream;
    console.log('Remote stream added.');
};

function handleRemoteStreamRemoved(event) {
    console.log('Remote stream removed. Event: ', event);
    remoteVideo.srcObject = null;
    localVideo.srcObject = null;
};

chatSocket.onmessage = function (e) {
    var data = JSON.parse(e.data);
    let response_type = data.type
    if (response_type == 'msg') {

        let sent_by;
        let display_msg;
        let tmp;
        if (data.sender == userName) {
            sent_by = 'self';
            tmp = "me"
        }
        else {
            sent_by = 'other';
            tmp = data.sender
        }
        console.log(data)
        display_msg = '<div class="' + sent_by + '">' + tmp + ': ' + data.message + '</div>';
        console.log(display_msg);
        document.querySelector('#chat-log').innerHTML += display_msg;
    }

    if (response_type == 'call_received') {
        console.log(data);
        onNewCall(data);
    }

    if (response_type == 'call_answered') {
        onCallAnswered(data);
    }

    if (response_type == 'ICE_Candidate') {
        onICECandidate(data);
    }
};

const onNewCall = (data) => {
    otherUser = data.sender;
    remoteRTCMessage = data.message;

    document.getElementById("video_call_button").style.display = "none";
    document.getElementById("Voice_Call_button").style.display = "none";
    document.getElementById("Answer_Call_button").style.display = "block";
};

const onCallAnswered = (data) => {
    //when other accept our call
    remoteRTCMessage = data.message
    console.log("remoteDescription:",remoteRTCMessage);
    peerConnection.setRemoteDescription(remoteRTCMessage);

    document.getElementById("calling").style.display = "none";

    console.log("Call Started. They Answered");

    callProgress()
};


function sendCall(data) {
    //to send a call
    console.log("Send Call");

    // socket.emit("call", data);
    chatSocket.send(JSON.stringify({
        'type': 'call',
        'sender': userName,
        // 'room_group':data.GroupName,
        'message': data.message
    }));
    document.getElementById("video_call_button").style.display = "none";
    document.getElementById("Voice_Call_button").style.display = "none";
    document.getElementById("calling").style.display = "block";
};

function answerCall(data) {
    //to answer a call
    chatSocket.send(JSON.stringify({
        'type': 'answer_call',
        'sender': data.caller,
        'message': data.message
    }));
    callProgress();
};


chatSocket.addEventListener('open', (e) => {
    console.log('Opened Connection!!!');
    sendSignal('new-peer', {});
});

chatSocket.onclose = function (e) {
    console.error('Chat socket closed unexpectedly', e);
};

document.querySelector('#chat-message-input').focus();
document.querySelector('#chat-message-input').addEventListener('keyup', function (e) {
    if (e.keyCode === 13) {  // enter, return
        document.querySelector('#chat-message-submit').click();
    }
});

document.querySelector('#chat-message-submit').addEventListener('click', function (e) {
    const messageInputDom = document.querySelector('#chat-message-input');
    const message = messageInputDom.value;
    chatSocket.send(JSON.stringify({
        'type': 'msg',
        'sender': userName,
        'message': message
    }));
    messageInputDom.value = '';
});

function sendSignal(type, message) {
    var jsonMsg = JSON.stringify({
        'sender': userName,
        'type': type,
        'message': message,
    });
    chatSocket.send(jsonMsg)
};

function callProgress() {

    document.getElementById("remote_video").style.visibility = "visible";
    document.getElementById("remote_stream").style.visibility="visible";
    // document.getElementById("inCall").style.display = "block";
    callInProgress = true;
};

function stop() {
    localStream.getTracks().forEach(track => track.stop());
    callInProgress = false;
    peerConnection.close();
    peerConnection = null;
    document.getElementById("video_call_button").style.display = "block";
    document.getElementById("Voice_Call_button").style.display = "block";
    document.getElementById("answer").style.display = "none";
    document.getElementById("inCall").style.display = "none";
    document.getElementById("calling").style.display = "none";
    document.getElementById("endVideoButton").style.display = "none"
    otherUser = null;
};