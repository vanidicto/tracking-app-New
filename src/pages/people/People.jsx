
import './People.css';
import { Link, useNavigate } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import { useBraceletUsers } from '../../context/BraceletDataProvider';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../context/ToastContext';
import { getAuth } from "firebase/auth";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, deleteField, collection, addDoc, serverTimestamp, query, where, onSnapshot, deleteDoc } from "firebase/firestore";
import { db } from "../../config/firebaseConfig";
import { Plus, X, Trash2, User, CreditCard, Pencil, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
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
  const navigate = useNavigate();
  const { braceletUsers, loading, error } = useBraceletUsers();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [deleteModalInfo, setDeleteModalInfo] = useState({ open: false, braceletId: null });
  const [pendingRequests, setPendingRequests] = useState([]);
  const [approvedPopupInfo, setApprovedPopupInfo] = useState({ open: false, data: null });
  const [cancelModalInfo, setCancelModalInfo] = useState({ open: false, requestId: null, braceletId: null });

  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const q = query(
          collection(db, 'notifications'),
          where('requesterId', '==', user.uid),
          where('type', '==', 'connection_request')
        );
        const unsub = onSnapshot(q, (snapshot) => {
          const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          setPendingRequests(items);
        });

        // NEW LISTENER FOR APPROVALS
        const qApproved = query(
          collection(db, 'notifications'),
          where('appUserId', '==', user.uid),
          where('type', '==', 'connection_approved_popup')
        );
        const unsubApproved = onSnapshot(qApproved, (snapshot) => {
          const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          if (items.length > 0) {
             const newest = items[0]; 
             setApprovedPopupInfo({ open: true, data: newest });
             // Force TanStack to reload appUsers and braceletUsers for instant UI refresh
             queryClient.invalidateQueries(['braceletUsers', user.uid]);
          }
        });

        return () => { unsub(); unsubApproved(); };
      } else {
        setPendingRequests([]);
      }
    });
    return () => unsubscribeAuth();
  }, [queryClient]);

  const handleDismissApprovalModal = async () => {
     if (approvedPopupInfo.data) {
        try {
           await updateDoc(doc(db, 'notifications', approvedPopupInfo.data.id), { read: true });
        } catch (e) {
           console.error("Failed to dismiss modal:", e);
        }
     }
     setApprovedPopupInfo({ open: false, data: null });
  };

  const handleOpenAddBraceletModal = () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        alert("You must be logged in to link a bracelet.");
        return;
      }
      setIsModalOpen(true);
    } catch (e) {
      console.error(e);
      setIsModalOpen(true);
    }
  };

  // Bracelet Information
  const [newBraceletName, setNewBraceletName] = useState('');
  const [newBraceletSerial, setNewBraceletSerial] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Edit Nickname state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [editNickname, setEditNickname] = useState('');
  const [isConfirmNicknameOpen, setIsConfirmNicknameOpen] = useState(false);

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

  const handleOpenDeleteModal = (e, braceletId) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteModalInfo({ open: true, braceletId });
  };

  const confirmDeleteBracelet = async () => {
    const braceletId = deleteModalInfo.braceletId;
    if (!braceletId) return;

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

      // Immediate UI refresh without reload
      queryClient.setQueryData(['braceletUsers', user.uid], (old) => {
        if (!old) return old;
        return {
          ...old,
          users: old.users.filter(u => u.id !== braceletId),
          appUserData: {
            ...old.appUserData,
            linkedBraceletsID: old.appUserData?.linkedBraceletsID?.filter(id => id !== braceletId)
          }
        };
      });

      setDeleteModalInfo({ open: false, braceletId: null });
      if (addToast) {
        addToast('Connection successfully unlinked', 'success');
      }
    } catch (err) {
      console.error("Error unlinking bracelet:", err);
      alert("Failed to unlink connection.");
      setDeleteModalInfo({ open: false, braceletId: null });
    }
  };

  const handleOpenCancelModal = (e, req) => {
    e.preventDefault();
    e.stopPropagation();
    setCancelModalInfo({ open: true, requestId: req.id, braceletId: req.braceletId });
  };

  const confirmCancelRequest = async () => {
    if (!navigator.onLine) {
      alert("No internet connection. Please try again when you're online.");
      return;
    }

    try {
      await deleteDoc(doc(db, 'notifications', cancelModalInfo.requestId));
      setCancelModalInfo({ open: false, requestId: null, braceletId: null });
      if (addToast) {
        addToast('Connection request cancelled', 'success');
      }
    } catch (err) {
      console.error("Error cancelling request:", err);
      alert("Failed to cancel request. Please try again.");
    }
  };

  /**
   * Handles linking an existing registered bracelet to this guardian's account.
   * Uses getDoc with the Serial Number as the Document ID.
   */
  const handleAddBracelet = async (e) => {
    e.preventDefault();
    if (!newBraceletSerial.trim()) return;

    const serialNum = newBraceletSerial.trim();
    const pending = pendingRequests.find(r => r.braceletId === serialNum);

    if (pending) {
       setCancelModalInfo({ open: true, requestId: pending.id, braceletId: pending.braceletId });
       setIsModalOpen(false);
       return;
    }

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

      // 2. Send Connection Request to the Owner
      const ownerId = braceletSnap.data().ownerAppUserId;
      if (!ownerId) {
        alert("This bracelet does not have an owner yet.");
        setIsSubmitting(false);
        return;
      }

      await addDoc(collection(db, 'notifications'), {
        appUserId: ownerId, // send to the owner
        type: 'connection_request',
        title: 'Connection Request',
        message: `${user.displayName || 'A user'} wants to link with your bracelet.`,
        requesterId: user.uid,
        requesterName: user.displayName || 'Unknown',
        requesterPhone: user.phoneNumber || '',
        braceletId: serial,
        nickname: newBraceletName.trim(),
        read: false,
        time: serverTimestamp()
      });

      setNewBraceletName('');
      setNewBraceletSerial('');
      setIsModalOpen(false);
      setIsSuccessModalOpen(true);

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
   * Intercepts the Save Changes click to open a confirmation modal first.
   */
  const handleUpdateNickname = (e) => {
    e.preventDefault();
    if (!editingPerson) return;
    setIsConfirmNicknameOpen(true);
  };

  /**
   * Performs the actual Firestore nickname update after user confirms.
   * If nickname is empty, it removes the override (resets to default).
   */
  const confirmUpdateNickname = async () => {
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

      if (addToast) {
        addToast('Nickname updated successfully', 'success');
      }
      setIsConfirmNicknameOpen(false);
      setIsEditModalOpen(false);
      window.location.reload();
    } catch (err) {
      console.error("Error updating nickname:", err);
      if (addToast) {
        addToast('Failed to update nickname', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (error) return <div className="error">{error}</div>;

  return (
    <main className="people-page-container">
      {braceletUsers.length > 0 && (
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

          <button className="add-people-btn" onClick={handleOpenAddBraceletModal}>
            <Plus size={24} />
          </button>
        </div>
      )}

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
                        placeholder="PM-YYYY-XXX"
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
                <button 
                  type="submit" 
                  className="btn-next" 
                  disabled={isSubmitting}
                  style={pendingRequests.some(r => r.braceletId === newBraceletSerial.trim()) ? { background: 'var(--pm-surface)', color: 'var(--pm-text)', border: '1px solid #ccc' } : {}}
                >
                  {isSubmitting 
                    ? 'Processing...' 
                    : pendingRequests.some(r => r.braceletId === newBraceletSerial.trim()) 
                      ? 'Cancel Pending Request' 
                      : 'Link Bracelet'}
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

      {/* Confirm Nickname Change Modal */}
      {isConfirmNicknameOpen && (
        <div className="add-bracelet-backdrop">
          <div className="add-bracelet-modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '32px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <Pencil size={48} color="var(--pm-primary)" strokeWidth={1.5} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px', color: 'var(--pm-text)' }}>
              Confirm Nickname Change?
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--pm-text-muted)', marginBottom: '24px', lineHeight: '1.5' }}>
              Are you sure you want to {editNickname.trim() ? `change the nickname to "${editNickname.trim()}"` : 'reset the nickname to default'}?
            </p>
            <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
              <button 
                className="btn-next" 
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={confirmUpdateNickname}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Yes, Save Changes'}
              </button>
              <button 
                className="btn-cancel" 
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => setIsConfirmNicknameOpen(false)}
              >
                No, Go Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Requests Visual Tag */}
      <div className="pending-requests-section" style={{marginBottom: '16px' }}>
        {pendingRequests.length > 0 && (
          <>
            <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--pm-text-muted)', marginBottom: '8px', letterSpacing: '0.05em', fontWeight: 'bold' }}>
              Pending Connections
            </h3>
            {pendingRequests.map(req => (
              <div key={req.id} style={{ display: 'flex', alignItems: 'center', background: '#fff3cd', padding: '10px 16px', borderRadius: '12px', marginBottom: '8px', border: '1px solid #ffeeba' }}>
                <div style={{ marginRight: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffeeba', borderRadius: '50%', width: '40px', height: '40px' }}>
                   <Clock size={20} color="#856404" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, color: '#856404', fontSize: '15px', fontWeight: '600', marginBottom: '2px' }}>
                     Waiting for approval
                  </p>
                  <p style={{ margin: 0, color: '#856404', fontSize: '13px', opacity: 0.85 }}>
                     Request sent for Tracker ID: {req.braceletId}
                  </p>
                </div>
                <button 
                  onClick={(e) => handleOpenCancelModal(e, req)}
                  style={{ background: 'white', color: '#856404', border: '1px solid #ffeeba', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            ))}
          </>
        )}
      </div>

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
        ) : braceletUsers.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'var(--pm-text-muted)', textAlign: 'center' }}>
             <User size={56} strokeWidth={1.2} style={{ opacity: 0.5, marginBottom: '16px' }} />
             <p style={{ margin: 0, fontSize: '16px' }}>You haven't added anyone yet</p>
             <button 
                onClick={handleOpenAddBraceletModal}
                style={{ marginTop: '24px', background: 'var(--pm-primary)', color: 'white', border: 'none', borderRadius: '40px', padding: '14px 28px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 14px rgba(164,38,44,0.3)', transition: 'transform 0.2s' }}
             >
                Add People
             </button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'var(--pm-text-muted)', textAlign: 'center' }}>
             <div style={{ opacity: 0.5, marginBottom: '16px', transform: 'scale(1.5)' }}><SearchIcon /></div>
             <p style={{ margin: 0, fontSize: '15px' }}>No people found matching "{searchQuery}"</p>
          </div>
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
                  onClick={(e) => handleOpenDeleteModal(e, person.id)}
                  aria-label="Delete"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Success Modal */}
      {isSuccessModalOpen && (
        <div className="add-bracelet-backdrop">
          <div className="add-bracelet-modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '32px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <CheckCircle2 size={48} color="var(--pm-primary)" strokeWidth={1.5} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px', color: 'var(--pm-text)' }}>
              Request Sent Successfully
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--pm-text-muted)', marginBottom: '24px', lineHeight: '1.5' }}>
              Your connection request is now pending the owner's approval.
            </p>
            <button 
              className="btn-next" 
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => setIsSuccessModalOpen(false)}
            >
              Okay
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalInfo.open && (
        <div className="add-bracelet-backdrop">
          <div className="add-bracelet-modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '32px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <Trash2 size={48} color="#A4262C" strokeWidth={1.5} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px', color: 'var(--pm-text)' }}>
              Unlink Bracelet?
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--pm-text-muted)', marginBottom: '24px', lineHeight: '1.5' }}>
              Are you sure you want to unlink this connection? You will no longer be able to track this device unless you send a new request.
            </p>
            <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
              <button 
                className="btn-next" 
                style={{ width: '100%', justifyContent: 'center', background: '#A4262C' }}
                onClick={confirmDeleteBracelet}
              >
                Unlink
              </button>
              <button 
                className="btn-cancel" 
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => setDeleteModalInfo({ open: false, braceletId: null })}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Approval Success Modal */}
      {approvedPopupInfo.open && approvedPopupInfo.data && (
        <div className="add-bracelet-backdrop">
          <div className="add-bracelet-modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '32px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <CheckCircle2 size={48} color="var(--pm-primary)" strokeWidth={1.5} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px', color: 'var(--pm-text)' }}>
              Request Approved!
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--pm-text-muted)', marginBottom: '24px', lineHeight: '1.5' }}>
              You are now connected to {approvedPopupInfo.data.ownerName}'s bracelet.
            </p>
            <button 
              className="btn-next" 
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={handleDismissApprovalModal}
            >
              Great!
            </button>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelModalInfo.open && (
        <div className="add-bracelet-backdrop">
          <div className="add-bracelet-modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '32px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
               <Clock size={48} color="#856404" strokeWidth={1.5} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px', color: 'var(--pm-text)' }}>
              Cancel Request?
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--pm-text-muted)', marginBottom: '24px', lineHeight: '1.5' }}>
              Are you sure you want to cancel this connection request for tracker {cancelModalInfo.braceletId}?
            </p>
            <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
               <button 
                 className="btn-next" 
                 style={{ width: '100%', justifyContent: 'center', background: '#856404', color: 'white' }}
                 onClick={confirmCancelRequest}
               >
                 Yes, Cancel Request
               </button>
               <button 
                 className="btn-cancel" 
                 style={{ width: '100%', justifyContent: 'center' }}
                 onClick={() => setCancelModalInfo({ open: false, requestId: null, braceletId: null })}
               >
                 No, Keep Pending
               </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default People;
