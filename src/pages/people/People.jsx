
import './People.css';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useBraceletUsers } from '../../hooks/useUsers';
import { getAuth } from "firebase/auth";
import { collection, addDoc, doc, updateDoc, arrayUnion, serverTimestamp, deleteDoc, arrayRemove, query, where, getDocs } from "firebase/firestore";
import { db } from "../../config/firebaseConfig";
import { Plus, X, Trash2, User, CreditCard } from "lucide-react";
import LoadingSpinner from '../../components/LoadingSpinner';

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

  // Bracelet Information
  const [newBraceletName, setNewBraceletName] = useState('');
  const [newBraceletSerial, setNewBraceletSerial] = useState('');

  // Emergency Contact
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

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
        serialNumber: newBraceletSerial,
        emergencyContacts: [{
          name: emergencyName,
          contactNo: emergencyContact
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
      setNewBraceletSerial('');
      setEmergencyName('');
      setEmergencyContact('');
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

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="error">{error}</div>;

  return (
    <main className="app-main page-frame">
      <div className="search-container" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input type="text" placeholder="Search Name" className="search-input" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%' }} />
          <div className="search-icon">
            <SearchIcon />
          </div>
        </div>

        {/* Add Bracelet Button */}
        <button onClick={() => setIsModalOpen(true)} style={{ backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <Plus size={24} />
        </button>
      </div>

      {/* Add Bracelet Modal */}
      {isModalOpen && (
        <div className="add-bracelet-backdrop">
          <div className="add-bracelet-modal-content">
            <div className="add-bracelet-modal-header">
              <h2 className="modal-title">Add New Bracelet</h2>
            </div>

            <form onSubmit={handleAddBracelet} className="add-bracelet-form">
              <div className="add-bracelet-body">

                {/* Left Column: Bracelet Information */}
                <div className="add-bracelet-column">
                  <div className="form-section-header">
                    <span className="section-slash">|</span> BRACELET INFORMATION
                  </div>

                  <div className="form-group-custom">
                    <label className="form-label-custom">Name of Bracelet <span className="req-asterisk">*</span></label>
                    <div className="input-with-icon">
                      <div className="input-icon-wrapper">
                        <User size={18} strokeWidth={1.5} color="#9ca3af" />
                      </div>
                      <input
                        type="text"
                        className="form-input-custom"
                        value={newBraceletName}
                        onChange={(e) => setNewBraceletName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group-custom">
                    <label className="form-label-custom">Bracelet Serial Number <span className="req-asterisk">*</span></label>
                    <div className="input-with-icon">
                      <div className="input-icon-wrapper">
                        <CreditCard size={18} strokeWidth={1.5} color="#9ca3af" />
                      </div>
                      <input
                        type="text"
                        className="form-input-custom"
                        value={newBraceletSerial}
                        onChange={(e) => setNewBraceletSerial(e.target.value)}
                        required
                      />
                    </div>
                    <p className="form-hint">You can find the serial number on the back of the bracelet</p>
                  </div>
                </div>

                {/* Right Column: Emergency Contact */}
                <div className="add-bracelet-column">
                  <div className="form-section-header">
                    <span className="section-slash">|</span> EMERGENCY CONTACT
                  </div>

                  <div className="form-group-custom">
                    <label className="form-label-custom">Name <span className="req-asterisk">*</span></label>
                    <div className="input-with-icon">
                      <div className="input-icon-wrapper">
                        <User size={18} strokeWidth={1.5} color="#9ca3af" />
                      </div>
                      <input
                        type="text"
                        className="form-input-custom"
                        value={emergencyName}
                        onChange={(e) => setEmergencyName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group-custom">
                    <label className="form-label-custom">Contact Number <span className="req-asterisk">*</span></label>
                    <div className="input-with-icon">
                      <div className="input-icon-wrapper">
                        <CreditCard size={18} strokeWidth={1.5} color="#9ca3af" />
                      </div>
                      <input
                        type="tel"
                        className="form-input-custom"
                        value={emergencyContact}
                        onChange={(e) => setEmergencyContact(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

              </div>

              <div className="add-bracelet-footer">
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-next" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Next'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ul className="people-list">
        {filteredUsers.map((person) => (
          <Link key={person.id} to={`/app/userProfile/${person.id}`} state={{ personData: person }}>
            <li
              className={`person-item ${person.sos ? 'sos' : ''}`}
            >
              <div className={`status-indicator ${person.online ? 'online' : 'offline'}`} />
              <img src={person.avatar} alt={person.name} className="avatar" />
              <div className="person-details">
                <p className="person-name">{person.name}</p>

              </div>
              <div className="person-status">
                <p className="percentage" style={person.online ? { color: '#34A853' } : { color: "#000000" }}>{person.battery}%</p>
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
