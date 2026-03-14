# 🛡️ IoT-Integrated Mobile Safety Application (PWA) with Smart Bracelet

An **IoT-based personal safety system** that combines a **smart bracelet** and a **mobile application (via PWA)** to provide fast emergency reporting, real-time location tracking, geofencing, and family monitoring.

This project is developed as part of a **Bachelor of Science in Information Technology** thesis at the **Technological University of the Philippines (TUP)**.

---


## 📌 Project Overview

Many safety applications fail during emergencies because users cannot or are unable to unlock their phones in time. This project solves that problem by using a **smart bracelet with a physical SOS button** that triggers immediate alerts via **internet connectivity** to a **responsive mobile application (PWA)**.

The system supports:

- **Online real-time tracking using maps**
- **Geofencing**

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

- Automatic alert resend every **5 minutes**


### 📱 Mobile Safety Application (PWA)
- Developed as a **Progressive Web App (PWA)** for instant mobile accessibility
- Built using **React.js**
- Live location tracking using **Leaflet**
- Safe-zone creation using **Leaflet Draw**
- Incident logging and history
- Bracelet status monitoring (on/off)

---

## 🧠 System Architecture

### 1. Smart Bracelet
- Collects GPS and SOS input
- Sends real-time alerts via **Internet connectivity**

### 2. Cloud Firestore
- Stores user profiles
- Saves location updates
- Records emergency incidents


### 3. Mobile Application (via PWA)
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
- Tactile Buttons
- 3.5 inch rpi lcd display
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
- **Connectivity:** System requires an active internet connection for real-time tracking and alerts.
- No integration with police or emergency hotlines
- **Mobile-first experience:** Optimized exclusively for mobile use via PWA installation
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
