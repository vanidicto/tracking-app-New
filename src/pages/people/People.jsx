
import './People.css';
import { Link } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { useBraceletUsers } from '../../context/BraceletDataProvider';
import { getAuth } from "firebase/auth";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, deleteField } from "firebase/firestore";
import { db } from "../../config/firebaseConfig";
import { Plus, X, Trash2, User, CreditCard, Pencil } from "lucide-react";
import Skeleton from '../../components/skeleton/Skeleton';

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
 * Uses the `useBraceletUsers` context for shared real-time data.
 */
function People() {
  const { braceletUsers, loading, error } = useBraceletUsers();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Bracelet Information
  const [newBraceletName, setNewBraceletName] = useState('');
  const [newBraceletSerial, setNewBraceletSerial] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Edit Nickname state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [editNickname, setEditNickname] = useState('');

  /**
   * Memoized filtered and sorted user list.
   * Only recalculates when braceletUsers or searchQuery actually change.
   */
  const filteredUsers = useMemo(() => {
    const filtered = braceletUsers.filter((user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return filtered.sort((a, b) => {
      if (a.sos && !b.sos) return -1;
      if (!a.sos && b.sos) return 1;
      if (a.online && !b.online) return -1;
      if (!a.online && b.online) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [braceletUsers, searchQuery]);

  const handleDeleteBracelet = async (e, braceletId) => {
    e.preventDefault();
    e.stopPropagation();

    if (!window.confirm("Are you sure you want to unlink this bracelet from your account?")) return;

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      // Only remove from the guardian's linkedBraceletsID and clear the nickname
      const appUserRef = doc(db, 'appUsers', user.uid);
      await updateDoc(appUserRef, {
        linkedBraceletsID: arrayRemove(braceletId),
        [`braceletNicknames.${braceletId}`]: deleteField()
      });

      alert("Bracelet unlinked successfully.");
      window.location.reload();
    } catch (err) {
      console.error("Error unlinking bracelet:", err);
      alert("Failed to unlink bracelet.");
    }
  };

  /**
   * Handles linking an existing registered bracelet to this guardian's account.
   * Uses getDoc with the Serial Number as the Document ID.
   */
  const handleAddBracelet = async (e) => {
    e.preventDefault();
    if (!newBraceletSerial.trim()) return;

    setIsSubmitting(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        alert("You must be logged in to link a bracelet.");
        setIsSubmitting(false);
        return;
      }

      const serial = newBraceletSerial.trim();

      // 1. Direct document lookup — Serial Number IS the Document ID
      const braceletRef = doc(db, 'braceletUsers', serial);
      const braceletSnap = await getDoc(braceletRef);

      if (!braceletSnap.exists()) {
        alert("Bracelet not found or not registered. Please ensure the serial number is correct, or ask the wearer to register it first.");
        setIsSubmitting(false);
        return;
      }

      // 1b. Validation: Prevent linking your own created bracelet
      if (braceletSnap.data().ownerAppUserId === user.uid) {
        alert("You cannot add your own registered bracelet here. It is already configured to your account in 'My Bracelet'.");
        setIsSubmitting(false);
        return;
      }

      // 1c. Validation: Prevent linking a bracelet that is already linked
      const isAlreadyLinked = braceletUsers.some(u => u.id === serial);
      if (isAlreadyLinked) {
        alert("This bracelet is already linked to your account.");
        setIsSubmitting(false);
        return;
      }

      // 2. Link the Serial Number to the guardian's account and optionally set a local nickname
      const appUserRef = doc(db, 'appUsers', user.uid);
      const updates = {
        linkedBraceletsID: arrayUnion(serial)
      };
      
      if (newBraceletName.trim()) {
        updates[`braceletNicknames.${serial}`] = newBraceletName.trim();
      }

      await updateDoc(appUserRef, updates);

      alert("Bracelet linked successfully!");
      setNewBraceletName('');
      setNewBraceletSerial('');
      setIsModalOpen(false);

      window.location.reload();

    } catch (err) {
      console.error("Error linking bracelet:", err);
      alert("Failed to link bracelet. See console for details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Opens the Edit Nickname modal for a specific person.
   */
  const handleOpenEditModal = (e, person) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingPerson(person);
    setEditNickname(person.name);
    setIsEditModalOpen(true);
  };

  /**
   * Handles updating the nickname in Firestore.
   * If nickname is empty, it removes the override (resets to default).
   */
  const handleUpdateNickname = async (e) => {
    e.preventDefault();
    if (!editingPerson) return;

    setIsSubmitting(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const appUserRef = doc(db, 'appUsers', user.uid);
      const nicknameValue = editNickname.trim();
      
      await updateDoc(appUserRef, {
        [`braceletNicknames.${editingPerson.id}`]: nicknameValue || deleteField()
      });

      alert("Nickname updated successfully.");
      setIsEditModalOpen(false);
      window.location.reload();
    } catch (err) {
      console.error("Error updating nickname:", err);
      alert("Failed to update nickname.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (error) return <div className="error">{error}</div>;

  return (
    <main className="people-page-container">
      <div className="people-header-section">
        <div className="search-wrapper">
          <input
            type="text"
            placeholder="Search Name"
            className="people-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="search-icon-wrapper">
            <SearchIcon />
          </div>
        </div>

        <button className="add-people-btn" onClick={() => setIsModalOpen(true)}>
          <Plus size={24} />
        </button>
      </div>

      {/* Add Bracelet Modal */}
      {isModalOpen && (
        <div className="add-bracelet-backdrop">
          <div className="add-bracelet-modal-content" style={{ maxWidth: '500px' }}>
            <div className="add-bracelet-modal-header">
              <h2 className="modal-title">Link a Bracelet</h2>
            </div>

            <form onSubmit={handleAddBracelet} className="add-bracelet-form">
              <div className="add-bracelet-body">

                {/* Single Column: Bracelet Linking Information */}
                <div className="add-bracelet-column" style={{ width: '100%', borderRight: 'none', paddingRight: 0 }}>
                  <div className="form-section-header">
                    <span className="section-slash">|</span> TRACKER DETAILS
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
                        placeholder="PM-YYYYMMDD-XXX"
                      />
                    </div>
                    <p className="form-hint">Enter the serial number of a registered bracelet to link it.</p>
                  </div>

                  <div className="form-group-custom">
                    <label className="form-label-custom">Nickname (Optional) </label>
                    <div className="input-with-icon">
                      <div className="input-icon-wrapper">
                        <User size={18} strokeWidth={1.5} color="#9ca3af" />
                      </div>
                      <input
                        type="text"
                        className="form-input-custom"
                        value={newBraceletName}
                        onChange={(e) => setNewBraceletName(e.target.value)}
                    
                        placeholder="e.g. Grandma's Bracelet"
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
                  {isSubmitting ? 'Linking...' : 'Link Bracelet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Nickname Modal */}
      {isEditModalOpen && (
        <div className="add-bracelet-backdrop">
          <div className="add-bracelet-modal-content" style={{ maxWidth: '500px' }}>
            <div className="add-bracelet-modal-header">
              <h2 className="modal-title">Edit Nickname</h2>
            </div>

            <form onSubmit={handleUpdateNickname} className="add-bracelet-form">
              <div className="add-bracelet-body">
                <div className="add-bracelet-column" style={{ width: '100%', borderRight: 'none', paddingRight: 0 }}>
                  <div className="form-section-header">
                    <span className="section-slash">|</span> UPDATE NICKNAME
                  </div>

                  <div className="form-group-custom">
                    <label className="form-label-custom">New Nickname</label>
                    <div className="input-with-icon">
                      <div className="input-icon-wrapper">
                        <User size={18} strokeWidth={1.5} color="#9ca3af" />
                      </div>
                      <input
                        type="text"
                        className="form-input-custom"
                        value={editNickname}
                        onChange={(e) => setEditNickname(e.target.value)}
                        placeholder="e.g. Grandma's Bracelet"
                      />
                    </div>
                    <p className="form-hint">Leave blank to reset to the default bracelet name.</p>
                  </div>
                </div>
              </div>

              <div className="add-bracelet-footer">
                <button type="button" className="btn-cancel" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </button>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    type="button" 
                    className="btn-cancel" 
                    style={{ background: 'var(--pm-surface)' }}
                    onClick={() => setEditNickname('')}
                  >
                    Reset
                  </button>
                  <button type="submit" className="btn-next" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="people-list">
        {loading ? (Array.from({ length: 4 }).map((_, i) => (
            <div key={`skeleton-${i}`} className="person-row-item" style={{ border: 'none', background: 'transparent'  }}>
              <div className="person-link">
                <div className="person-main-info">
                  <div className="avatar-wrapper" >
                    <Skeleton type="avatar" width="48px" height="48px" />
                  </div>
                  <div className="name-status-info" >
                    <Skeleton type="text" width="120px" height="16px" />
                    <div className="person-row-meta">
                      <Skeleton type="text" width="80px" height="12px" />
                      <Skeleton type="text" width="25px" height="12px" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="delete-person-btn">
                <Skeleton type="text" width="16px" height="20px" />
              </div>
            </div>
          ))
        ) : (
          
          filteredUsers.map((person) => (
            <div key={person.id} className="person-row-item">
              <Link to={`/app/userProfile/${person.id}`} state={{ personData: person }} className="person-link">
                <div className="person-main-info">
                  <div className="avatar-wrapper">
                    <img src={person.avatar} alt={person.name} className="person-avatar-img" />
                    <div className={`status-dot ${person.online ? 'online' : 'offline'}`} />
                  </div>
                  <div className="name-status-info">
                    <p className="person-row-name">{person.name}</p>
                    <div className="person-row-meta">
                      <p className="person-row-status">
                        Bracelet: <span className={person.online && person.braceletOn ? 'status-on' : 'status-off'}>
                          {person.online && person.braceletOn ? 'ON' : 'OFF'}
                        </span>
                      </p>
                      <span className="meta-dot">•</span>
                      <p className="battery-percentage" style={person.online ? { color: '#34A853' } : { color: "var(--pm-text-muted)" }}>
                        {person.battery}%
                      </p>
                    </div>
                  </div>
                </div>
              </Link>

              <div className="person-actions">
                <button
                  className="edit-person-btn"
                  onClick={(e) => handleOpenEditModal(e, person)}
                  aria-label="Edit"
                >
                  <Pencil size={20} />
                </button>

                <button
                  className="delete-person-btn"
                  onClick={(e) => handleDeleteBracelet(e, person.id)}
                  aria-label="Delete"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}

export default People;
