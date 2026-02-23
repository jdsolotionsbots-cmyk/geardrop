import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, ActivityIndicator, Alert, TextInput, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import SignatureScreen from 'react-native-signature-canvas';
import { db } from './firebaseConfig';
import { collection, addDoc, setDoc, doc, updateDoc, serverTimestamp, query, onSnapshot, orderBy } from 'firebase/firestore';

export default function App() {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isSignModalVisible, setSignModalVisible] = useState(false);
  const [signatureCompleted, setSignatureCompleted] = useState(false);
  
  // NEW STATE: Job Radar & Chat
  const [incomingJob, setIncomingJob] = useState(null);
  const [isChatVisible, setChatVisible] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");

  // 1. THE LIVE HEARTBEAT (GPS Tracking)
  useEffect(() => {
    let locationSubscription = null;

    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10, 
        },
        (newLocation) => {
          setLocation(newLocation.coords);
          const driverRef = doc(db, "drivers", "Audi_A5_SLine_01");
          setDoc(driverRef, {
            status: "ON_DUTY",
            lat: newLocation.coords.latitude,
            lng: newLocation.coords.longitude,
            lastUpdated: serverTimestamp()
          }, { merge: true }).catch(err => console.log("Heartbeat error: ", err));
        }
      );
    })();

    return () => {
      if (locationSubscription) locationSubscription.remove();
    };
  }, []);

  // 2. THE JOB RADAR
  useEffect(() => {
    const q = query(collection(db, "jobs"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let activeJob = null;
      
      // First, check if I have a job I already claimed
      for (let docSnap of snapshot.docs) {
        const data = docSnap.data();
        if (data.status === 'claimed' && data.driverId === "Audi_A5_SLine_01") {
          activeJob = { id: docSnap.id, ...data };
          break;
        }
      }
      
      // If not, look for a brand new job searching for a driver
      if (!activeJob) {
        for (let docSnap of snapshot.docs) {
          const data = docSnap.data();
          if (data.status === 'searching') {
            activeJob = { id: docSnap.id, ...data };
            break;
          }
        }
      }
      
      setIncomingJob(activeJob);
      // Reset signature state if it's a new job
      if (activeJob && activeJob.status === 'searching') setSignatureCompleted(false);
    });

    return () => unsubscribe();
  }, []);

  // 3. LIVE CHAT LISTENER
  useEffect(() => {
    if (!incomingJob || !isChatVisible) return;

    const messagesRef = collection(db, "jobs", incomingJob.id, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(liveMessages);
    });

    return () => unsubscribe();
  }, [incomingJob, isChatVisible]);

  // 4. ACTIONS
  const acceptDelivery = async () => {
    try {
      const jobRef = doc(db, "jobs", incomingJob.id);
      await updateDoc(jobRef, {
        status: "claimed",
        driverName: "Juan (Audi A5)",
        driverId: "Audi_A5_SLine_01"
      });
      Alert.alert("Job Accepted!", "Drive to the pickup location.");
    } catch (error) {
      console.error("Error accepting job: ", error);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return; 
    try {
      const messagesRef = collection(db, "jobs", incomingJob.id, "messages");
      await addDoc(messagesRef, {
        text: inputText,
        sender: "driver",
        timestamp: serverTimestamp()
      });
      setInputText(""); 
    } catch (error) {
      console.error("Chat error: ", error);
    }
  };

  const handleSignature = async (signature) => {
    try {
      setSignModalVisible(false);
      
      // Mark the actual Job as completed
      if (incomingJob) {
        const jobRef = doc(db, "jobs", incomingJob.id);
        await updateDoc(jobRef, {
          status: "completed",
          completionTime: serverTimestamp()
        });
      }

      // Save the Proof of Delivery
      await addDoc(collection(db, "deliveries"), {
        status: "COMPLETED",
        jobId: incomingJob ? incomingJob.id : 'standalone',
        driverId: "Audi_A5_SLine_01",
        dropoffLocation: location,
        signatureData: signature, 
        timestamp: serverTimestamp()
      });

      setSignatureCompleted(true);
      Alert.alert("Success!", "Proof of Delivery synced to dispatch.");

    } catch (error) {
      console.error("Error saving to cloud: ", error);
      Alert.alert("Network Error", "Could not sync delivery to the cloud.");
    }
  };

  return (
    <View style={styles.container}>
      {/* MAP SECTION */}
      {location ? (
        <MapView 
          style={styles.map} 
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          showsUserLocation={true}
        >
          <Marker 
            coordinate={{ latitude: location.latitude, longitude: location.longitude }}
            title="Your Car"
            description="Active BOLT Driver"
            pinColor="#FF6600"
          />
        </MapView>
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6600" />
          <Text style={{ color: '#888', marginTop: 10 }}>Locating Driver GPS...</Text>
        </View>
      )}

      {/* BOTTOM DISPATCH PANEL */}
      <View style={styles.bottomPanel}>
        {signatureCompleted ? (
          <View style={styles.successBtn}>
            <Text style={styles.btnText}>✅ Delivery Logged in Cloud</Text>
          </View>
        ) : incomingJob ? (
          <View>
            <View style={styles.jobDetails}>
              {incomingJob.status === 'searching' && <Text style={{ color: '#FF6600', fontWeight: 'bold', marginBottom: 5 }}>⚠️ NEW DELIVERY REQUEST</Text>}
              <Text style={styles.jobTitle}>Pickup: {incomingJob.pickup}</Text>
              <Text style={styles.jobSubtitle}>Drop-off: {incomingJob.dropoff}</Text>
              <Text style={{ color: '#4CAF50', fontSize: 18, fontWeight: 'bold', marginTop: 10 }}>Payout: ${incomingJob.price}</Text>
            </View>
            
            {incomingJob.status === 'searching' ? (
              <TouchableOpacity style={styles.actionBtn} onPress={acceptDelivery}>
                <Text style={styles.btnText}>Accept Delivery</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                <TouchableOpacity style={[styles.actionBtn, { flex: 1, marginRight: 5, backgroundColor: '#333' }]} onPress={() => setChatVisible(true)}>
                  <Text style={styles.btnText}>💬 Chat</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { flex: 2, marginLeft: 5 }]} onPress={() => setSignModalVisible(true)}>
                  <Text style={styles.btnText}>Drop-off & Sign</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.jobDetails}>
            <Text style={styles.jobTitle}>Searching for jobs...</Text>
            <Text style={styles.jobSubtitle}>Stay in your current zone.</Text>
          </View>
        )}
      </View>

      {/* SIGNATURE PAD MODAL */}
      <Modal visible={isSignModalVisible} animationType="slide">
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Sign for Delivery</Text>
          <TouchableOpacity onPress={() => setSignModalVisible(false)}>
            <Text style={styles.closeText}>Cancel</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, backgroundColor: '#fff', paddingBottom: 50 }}>
          <SignatureScreen
            onOK={handleSignature}
            onEmpty={() => console.log("Empty")}
            descriptionText="Sign above"
            clearText="Clear"
            confirmText="Save Signature"
            webStyle={`
              .m-signature-pad { box-shadow: none; border: none; height: 100%; display: flex; flex-direction: column; } 
              .m-signature-pad--body { flex: 1; border-bottom: 2px solid #FF6600; }
              .m-signature-pad--footer { padding: 20px 10px 20px 10px; margin: 0; }
              .m-signature-pad--footer .button { background-color: #FF6600; color: #FFF; font-weight: bold; padding: 16px; border-radius: 8px; }
            `}
          />
        </View>
      </Modal>

      {/* 🟢 DOOR-DASH STYLE CHAT MODAL 🟢 */}
      <Modal visible={isChatVisible} animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: '#050505' }}>
          
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Dispatch Support</Text>
            <TouchableOpacity onPress={() => setChatVisible(false)}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 20 }}
            renderItem={({ item }) => (
              <View style={{
                alignSelf: item.sender === "driver" ? "flex-end" : "flex-start",
                backgroundColor: item.sender === "driver" ? "#FF6600" : "#333",
                padding: 15,
                borderRadius: 20,
                marginBottom: 10,
                maxWidth: "80%"
              }}>
                <Text style={{ color: "#FFF", fontSize: 16 }}>{item.text}</Text>
              </View>
            )}
          />

          <View style={{ flexDirection: 'row', padding: 20, borderTopWidth: 1, borderColor: '#333', backgroundColor: '#111' }}>
            <TextInput
              style={{ flex: 1, backgroundColor: '#222', color: '#FFF', padding: 15, borderRadius: 25, fontSize: 16 }}
              placeholder="Message Dispatch..."
              placeholderTextColor="#888"
              value={inputText}
              onChangeText={setInputText}
            />
            <TouchableOpacity style={{ marginLeft: 15, justifyContent: 'center', backgroundColor: '#FF6600', paddingHorizontal: 20, borderRadius: 25 }} onPress={sendMessage}>
              <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Send</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  map: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bottomPanel: { position: 'absolute', bottom: 40, left: 20, right: 20, backgroundColor: '#111', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10, borderWidth: 1, borderColor: 'rgba(255,102,0,0.2)' },
  jobDetails: { marginBottom: 20 },
  jobTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  jobSubtitle: { color: '#888', fontSize: 14, marginTop: 5 },
  actionBtn: { backgroundColor: '#FF6600', padding: 18, borderRadius: 12, alignItems: 'center' },
  successBtn: { backgroundColor: '#4CAF50', padding: 18, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  modalHeader: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, backgroundColor: '#111', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  closeText: { color: '#FF4444', fontSize: 16, fontWeight: 'bold' }
});