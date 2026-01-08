import { createContext, useContext, useEffect, useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Signup: Creates Auth user AND appUsers document
  async function signup(email, password, name) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update the Auth profile with the display name
    await updateProfile(user, {
      displayName: name
    });
    
    // Create the appUser document with the specific structure you requested
    await setDoc(doc(db, 'appUsers', user.uid), {
      name: name,
      email: email,
      linkedBraceletsID: [], // Initialize empty array for bracelets
      createdAt: serverTimestamp()
    });
    
    return userCredential;
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    return signOut(auth);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // If user is logged in but has no displayName, try to sync it from Firestore
      if (user && !user.displayName) {
        try {
          const userDocRef = doc(db, 'appUsers', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists() && userDoc.data().name) {
            await updateProfile(user, { displayName: userDoc.data().name });
          }
        } catch (error) {
          console.error("Error syncing displayName:", error);
        }
      }
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}