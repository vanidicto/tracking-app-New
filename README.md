# 🛡️ IoT-Integrated Safety Application with Smart Bracelet

An **IoT-based personal safety system** that combines a **smart bracelet** and a **React web application** to provide fast emergency reporting, real-time location tracking, geofencing, and family monitoring.

This project is developed as part of a **Bachelor of Science in Information Technology** thesis at the **Technological University of the Philippines (TUP)**.

---
//test mary


## 📌 Project Overview

Many safety applications fail during emergencies because users cannot unlock their phones or rely on constant internet access. This project solves that problem by using a **smart bracelet with a physical SOS button** paired with a **cloud-based safety application**.

The system supports:
- **Offline emergency alerts via SMS**
- **Online real-time tracking using maps**
- **Family-based monitoring and geofencing**

Emergency alerts continue to send until the user confirms they are safe.

---

## 🎯 Objectives

- Provide a quick and discreet emergency alert system
- Enable real-time GPS location tracking
- Allow private family-based monitoring
- Support geofencing and safe-zone alerts
- Store incident logs securely in the cloud
- Improve personal safety using IoT and cloud technologies

---

## 🚀 Key Features

### 🔘 Smart Bracelet
- One-press **SOS emergency button**
- GPS-based location tracking
- Pulse monitoring
- Motion / tamper detection
- Offline **SMS emergency alerts**
- Automatic alert resend every **5 minutes**
- OLED display for device status

### 📱 Safety Web Application
- Built using **React.js**
- Live location tracking using **Leaflet**
- Safe-zone creation using **Leaflet Draw**
- Room-based family monitoring
- Incident logging and history
- “Mark Safe” function to stop alerts
- Bracelet status monitoring (on/off)

---

## 🧠 System Architecture

### 1. Smart Bracelet
- Collects GPS, pulse, motion, and SOS input
- Sends alerts via:
  - **SMS** (offline)
  - **Internet** (online)

### 2. Cloud Firestore
- Stores user profiles
- Saves location updates
- Records emergency incidents
- Manages room-based access control

### 3. React Web Application
- Displays live tracking using Leaflet
- Allows drawing and managing geofences
- Shows emergency alerts and logs
- Communicates directly with Firebase (no backend server)

---

## 🛠️ Technology Stack

### Frontend
- **React.js**
- **Leaflet**
- **Leaflet Draw**

### Cloud Services
- **Firebase Authentication**
- **Cloud Firestore**

### Hardware
- Raspberry Pi Zero W
- Neo-6M GPS Module
- SIM800L GSM Module
- MAX30100 Pulse Sensor
- MPU6050 Accelerometer/Gyroscope
- 1.5” Transparent OLED Display
- Li-Po Battery (3.7V)

### Programming Languages
- JavaScript (React)
- Python (Smart Bracelet / IoT)

---

## 🗺️ Mapping & Geofencing

- **Leaflet** is used for real-time map visualization
- **Leaflet Draw** allows users to:
  - Create safe zones
  - Edit or delete geofences
- Alerts trigger automatically when entering or exiting defined areas

---

## 🔐 Security & Privacy

- Firebase Authentication for user access
- Room-based monitoring (private groups only)
- Location data visible only to authorized users
- Cloud Firestore security rules enforced
- No public location sharing

---

## 🧪 Testing & Evaluation

The system is evaluated using **ISO/IEC 25010** standards:
- Functional Suitability
- Performance Efficiency
- Reliability
- Security & Privacy
- Field Testing
- User Acceptance Testing (UAT)

---

## ⚠️ Limitations

- Prototype-level implementation only
- SMS delivery depends on cellular signal strength
- No integration with police or emergency hotlines
- Biometric monitoring limited to pulse rate
- Web-based application only
- Testing conducted within Manila

---

## 👨‍💻 Researchers

- John Cyrus A. Avila  
- Mark Louie O. Balaba  
- Mary Grace Maca  
- Emanuel R. Miranda  
- Eliza Jane C. Reyes  

Bachelor of Science in Information Technology  
Technological University of the Philippines – Manila

---

## 📄 License

This project is developed for **academic and research purposes only**.
