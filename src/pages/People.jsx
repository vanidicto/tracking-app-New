
import './People.css';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useBraceletUsers } from '../hooks/useUsers';
import { getAuth } from "firebase/auth";
import { collection, addDoc, doc, updateDoc, arrayUnion, serverTimestamp, deleteDoc, arrayRemove, query, where, getDocs } from "firebase/firestore";
import { db } from "../config/firebaseConfig";
import { Plus, X, Trash2 } from "lucide-react";
import LoadingSpinner from '../components/LoadingSpinner';

/**
 * Simple Search Icon component used in the search input field.
 * Renders an SVG icon.
 */
const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9e9e9e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

/**
 * People Page Component
 * 
 * Displays a list of tracked bracelet users (people).
 * Allows the App User to:
 * 1. View the status (online/offline, battery, SOS) of linked bracelets.
 * 2. Search/Filter the list of people.
 * 3. Add new bracelets to their account via a modal form.
 * 
 * Uses the `useBraceletUsers` hook to fetch real-time data from Firestore.
 */
function People() {
  const { braceletUsers, loading, error } = useBraceletUsers();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBraceletName, setNewBraceletName] = useState('');
  const [newBraceletEmail, setNewBraceletEmail] = useState('');
  const [newContactNo, setNewContactNo] = useState('');
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [emergencyNameInput, setEmergencyNameInput] = useState('');
  const [emergencyContactInput, setEmergencyContactInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Filters and sorts the list of users based on the search query and status.
   * 
   * Sorting priority:
   * 1. SOS Active (High priority)
   * 2. Online status
   * 3. Alphabetical by name
   * 
   * @param {Array} users - The list of bracelet users.
   * @param {string} query - The search string.
   * @returns {Array} - The sorted and filtered list.
   */
  const sortAndFilterUsers = (users, query) => {
    const filtered = users.filter((user) =>
      user.name.toLowerCase().includes(query.toLowerCase())
    );

    return filtered.sort((a, b) => {
      if (a.sos && !b.sos) return -1;
      if (!a.sos && b.sos) return 1;
      if (a.online && !b.online) return -1;
      if (!a.online && b.online) return 1;
      return a.name.localeCompare(b.name);
    });
  };

  const filteredUsers = sortAndFilterUsers(braceletUsers, searchQuery);

  const handleDeleteBracelet = async (e, braceletId) => {
    e.preventDefault();
    e.stopPropagation();

    if (!window.confirm("Are you sure you want to delete this person? This action cannot be undone.")) return;

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      // 1. Remove from appUsers linkedBraceletsID
      const appUserRef = doc(db, 'appUsers', user.uid);
      await updateDoc(appUserRef, {
        linkedBraceletsID: arrayRemove(braceletId)
      });

      // 2. Delete from braceletUsers collection
      await deleteDoc(doc(db, 'braceletUsers', braceletId));

      // 3. Delete from deviceStatus (cleanup)
      const q = query(collection(db, 'deviceStatus'), where('userId', '==', braceletId));
      const snapshot = await getDocs(q);
      snapshot.forEach(async (docSnap) => {
        await deleteDoc(docSnap.ref);
      });

      alert("Person deleted successfully.");
      window.location.reload();
    } catch (err) {
      console.error("Error deleting person:", err);
      alert("Failed to delete person.");
    }
  };

  /**
   * Handles the submission of the "Add Bracelet" form.
   * 
   * Performs the following steps:
   * 1. Validates the current user is authenticated.
   * 2. Creates a new document in the `braceletUsers` collection.
   * 3. Creates a corresponding initial document in the `deviceStatus` collection.
   * 4. Updates the current `appUser` document to link the new bracelet ID.
   * 
   * @param {Event} e - The form submission event.
   */
  const handleAddBracelet = async (e) => {
    e.preventDefault();
    if (!newBraceletName.trim()) return;

    setIsSubmitting(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        
        alert("You must be logged in to add a bracelet.");
        setIsSubmitting(false);
        return;
      }

      /**
       * 1. Create the braceletUser document.
       * This stores the static profile information of the bracelet wearer.
       */
      const newBraceletUser = {
        name: newBraceletName,
        ownerAppUserId: user.uid,
        email: newBraceletEmail || null,
        "contactNo#": newContactNo || null,
        emergencyContacts: [{
          name: emergencyNameInput,
          contactNo: emergencyContactInput
        }],
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newBraceletName}`,
      };

      const docRef = await addDoc(collection(db, 'braceletUsers'), newBraceletUser);

      /**
       * 2. Create initial deviceStatus document for this bracelet user.
       * This collection tracks dynamic data like battery, location, and SOS status.
       */
      const deviceData = {
        battery: 100,
        isBraceletOn: true,
        lastSeen: serverTimestamp(),
        location: [0, 0],
        pulseRate: null,
        sos: { active: false, timestamp: null },
        userId: docRef.id,
      };

      try {
        await addDoc(collection(db, 'deviceStatus'), deviceData);
      } catch (devErr) {
        console.error('Failed to create deviceStatus for new bracelet:', devErr);
      }

      /**
       * 3. Link to the appUser.
       * Updates the logged-in user's document to include the new bracelet's ID.
       */
      const appUserRef = doc(db, 'appUsers', user.uid);
      await updateDoc(appUserRef, {
        linkedBraceletsID: arrayUnion(docRef.id)
      });

      alert("Bracelet added successfully!");
      setNewBraceletName('');
      setNewBraceletEmail('');
      setNewContactNo('');
      setEmergencyContacts([]);
      setEmergencyNameInput('');
      setEmergencyContactInput('');
      setIsModalOpen(false);
      
      // Reload to fetch the new list (since useBraceletUsers uses getDocs once)
      window.location.reload();

    } catch (err) {
      console.error("Error adding bracelet:", err);
      alert("Failed to add bracelet. See console for details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="loading"><LoadingSpinner/></div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <main className="app-main page-frame">
      <div className="search-container" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input type="text" placeholder="Search Name" className="search-input" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%' }}/>
          <div className="search-icon">
            <SearchIcon />
          </div>
        </div>
        
        {/* Add Bracelet Button */}
        <button onClick={() => setIsModalOpen(true)}style={{backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '50%', width: '40px',  height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',cursor: 'pointer'}}>
          <Plus size={24} />
        </button>
      </div>

      {/* Add Bracelet Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ background: 'white', padding: '20px', borderRadius: '12px', width: '90%', maxWidth: '350px', position: 'relative' }}>
            <button onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            <h2 style={{ marginTop: 0, marginBottom: '15px' }}>Add New Bracelet</h2>
            <form onSubmit={handleAddBracelet}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Name</label>
                <input type="text" value={newBraceletName} onChange={(e) => setNewBraceletName(e.target.value)} placeholder="e.g. Sister" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }} required />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Email</label>
                <input type="email" value={newBraceletEmail} onChange={(e) => setNewBraceletEmail(e.target.value)} placeholder="contact@example.com" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }} />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Contact Number</label>
                <input type="tel" value={newContactNo} onChange={(e) => setNewContactNo(e.target.value)} placeholder="e.g. 09666045678" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }} />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>Emergency Contacts</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input value={emergencyNameInput} onChange={(e) => setEmergencyNameInput(e.target.value)} placeholder="Name" style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />
                  <input value={emergencyContactInput} onChange={(e) => setEmergencyContactInput(e.target.value)} placeholder="Contact No." style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />
                  <button type="button" onClick={() => {
                    const name = emergencyNameInput.trim();
                    const contact = emergencyContactInput.trim();
                    if (!name || !contact) return;
                    setEmergencyContacts((s) => [...s, { name, contactNo: contact }]);
                    setEmergencyNameInput('');
                    setEmergencyContactInput('');
                  }} style={{ padding: '8px 10px', borderRadius: '6px', background: '#000', color: '#fff', border: 'none', cursor: 'pointer' }}>Add</button>
                </div>
                {emergencyContacts.length > 0 && (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {emergencyContacts.map((ec, idx) => (
                      <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                        <div style={{ fontSize: '14px' }}>{ec.name} — {ec.contactNo}</div>
                        <button type="button" onClick={() => setEmergencyContacts((s) => s.filter((_, i) => i !== idx))} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <button type="submit" disabled={isSubmitting} style={{ width: '100%', padding: '12px', background: '#000', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}>
                {isSubmitting ? 'Adding...' : 'Add Bracelet'}
              </button>
            </form>
          </div>
        </div>
      )}

      <ul className="people-list">
        {filteredUsers.map((person) => (
          <Link key={person.id} to={`/userProfile/${person.id}`} state={{ personData: person }}>
            <li
              className={`person-item ${person.sos ? 'sos' : ''}`}
            >
              <div className={`status-indicator ${person.online ? 'online' : 'offline'}`} />
              <img src={person.avatar} alt={person.name} className="avatar" />
              <div className="person-details">
                <p className="person-name">{person.name}</p>
                
              </div>
              <div className="person-status">
                <p className="percentage" style={person.online?{color:'#34A853'}:{color: "#000000"}}>{person.battery}%</p>
                <div className="safety-status-wrapper">
                  <p className="bracelet-status">
                    Bracelet: {person.online && person.braceletOn ? 'ON' : 'OFF'}
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => handleDeleteBracelet(e, person.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  marginLeft: '10px',
                  color: '#ef4444',
                  padding: '5px'
                }}
                aria-label="Delete"
              >
                <Trash2 size={20} />
              </button>
            </li>
          </Link>
        ))}
      </ul>
    </main>
  );
}

export default People;
