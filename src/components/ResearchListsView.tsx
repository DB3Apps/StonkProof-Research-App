import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ChevronRight, Plus, Trash2, Loader2, Search, X } from 'lucide-react';
import { auth, getDb, collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp, handleFirestoreError, OperationType } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';

interface ResearchList {
  id: string;
  title: string;
  description: string;
  tickers: string[];
  userId: string;
}

interface ResearchListsViewProps {
  onBack: () => void;
  onViewResearch: (ticker: string) => void;
}

export const ResearchListsView = ({ onBack, onViewResearch }: ResearchListsViewProps) => {
  const CURATED_LISTS: ResearchList[] = [
    { id: 'curated_tech', title: 'Tech Startups', description: 'Early stage high growth tech', tickers: ['PLTR', 'SNOW', 'CRWD'], userId: 'system' },
    { id: 'curated_div', title: 'Dividends', description: 'Stable income generators', tickers: ['KO', 'JNJ', 'PG'], userId: 'system' },
    { id: 'curated_green', title: 'Green Energy', description: 'Renewable and clean tech', tickers: ['NEE', 'ENPH', 'FSLR'], userId: 'system' },
  ];

  const [lists, setLists] = useState<ResearchList[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListId, setSelectedListId] = useState<string | null>(CURATED_LISTS[0].id);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [newTicker, setNewTicker] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const db = getDb();

  useEffect(() => {
    if (!auth.currentUser || !db) {
      setLoading(false);
      return;
    }

    const path = `users/${auth.currentUser.uid}/researchLists`;
    const q = query(collection(db, path));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedLists = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ResearchList[];
      
      setLists(fetchedLists);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth.currentUser, db]);

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !db || !newListTitle.trim()) return;

    setIsCreating(true);
    const path = `users/${auth.currentUser.uid}/researchLists`;
    try {
      const docRef = await addDoc(collection(db, path), {
        title: newListTitle,
        description: newListDescription,
        tickers: [],
        userId: auth.currentUser.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      setSelectedListId(docRef.id);
      setShowCreateModal(false);
      setNewListTitle('');
      setNewListDescription('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setIsCreating(false);
    }
  };

  const selectedList = CURATED_LISTS.find(l => l.id === selectedListId) || lists.find(l => l.id === selectedListId);
  const isCurated = selectedListId?.startsWith('curated_');

  const addTickerToList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedList || isCurated || !newTicker.trim() || !auth.currentUser || !db) return;

    if (selectedList.tickers.length >= 10) {
      alert("Maximum of 10 stocks allowed per research list to maintain focus.");
      return;
    }

    const ticker = newTicker.toUpperCase().trim();
    if (selectedList.tickers.includes(ticker)) {
      setNewTicker('');
      return;
    }

    const path = `users/${auth.currentUser.uid}/researchLists/${selectedListId}`;
    try {
      await updateDoc(doc(db, path), {
        tickers: [...selectedList.tickers, ticker],
        updatedAt: Timestamp.now()
      });
      setNewTicker('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const removeTickerFromList = async (ticker: string) => {
    if (!selectedList || isCurated || !auth.currentUser || !db) return;

    const path = `users/${auth.currentUser.uid}/researchLists/${selectedListId}`;
    try {
      await updateDoc(doc(db, path), {
        tickers: selectedList.tickers.filter(t => t !== ticker),
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const deleteList = async (listId: string) => {
    if (!auth.currentUser || !db) return;
    if (listId.startsWith('curated_')) return;
    // Removed window.confirm because it's blocked in the iframe
    // if (!window.confirm("Delete this research list?")) return;

    const path = `users/${auth.currentUser.uid}/researchLists/${listId}`;
    try {
      await deleteDoc(doc(db, path));
      if (selectedListId === listId) {
        setSelectedListId(CURATED_LISTS[0].id);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  if (!auth.currentUser) {
    return (
      <div className="p-8 text-center bg-white border-2 border-slate-900 shadow-[8px_8px_0_0_#0f172a] m-8">
        <h2 className="text-2xl font-bold mb-4">Research Access Denied</h2>
        <p className="mb-6">You must be signed in to create and manage personal research lists.</p>
        <Button onClick={onBack}>Return to Dashboard</Button>
      </div>
    );
  }

  const renderListItem = (list: ResearchList, type: 'curated' | 'user') => (
    <div 
      key={list.id} 
      className={`group relative flex justify-between items-center p-5 border-2 transition-all cursor-pointer ${
        selectedListId === list.id 
          ? 'bg-slate-900 text-white border-slate-900 shadow-[4px_4px_0_0_#9be34b]' 
          : 'bg-white border-slate-200 hover:border-slate-900'
      }`}
      onClick={() => setSelectedListId(list.id)}
    >
      <div className="flex-1 pr-8">
        <h3 className="font-bold text-lg">{list.title}</h3>
        <p className={`text-xs ${selectedListId === list.id ? 'text-slate-400' : 'text-slate-500'} line-clamp-1`}>
          {list.description || 'No description'}
        </p>
        <div className="mt-2 text-[10px] uppercase font-bold tracking-tighter opacity-60">
          {list.tickers.length} Assets tracked
        </div>
      </div>
      <ChevronRight size={20} className={selectedListId === list.id ? 'text-[#9be34b]' : 'opacity-20'} />
      
      {type === 'user' && selectedListId === list.id && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            deleteList(list.id);
          }}
          className="absolute top-2 right-2 p-1 text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );

  return (
    <div className="p-8 space-y-8 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Button onClick={onBack} variant="outline" className="mb-4 hover:bg-slate-100 transition-colors">
            ← Back to Results
          </Button>
          <h1 className="text-4xl font-bold font-heading">Research Collections</h1>
        </div>
        <Button 
          onClick={() => setShowCreateModal(true)}
          className="rounded-none font-bold uppercase tracking-widest bg-slate-900 text-white hover:bg-slate-800 h-14 px-8 shadow-[4px_4px_0_0_#9be34b] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
        >
          <Plus className="mr-2 h-5 w-5" /> Start New List
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-4 space-y-8">
          <div className="space-y-4">
            <h2 className="text-xl font-bold font-heading uppercase tracking-widest text-slate-400">Curated Intelligence</h2>
            <div className="space-y-3">
              {CURATED_LISTS.map(list => renderListItem(list, 'curated'))}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold font-heading uppercase tracking-widest text-[#9be34b]">My Research Labs</h2>
            {loading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="animate-spin text-slate-400" />
              </div>
            ) : lists.length === 0 ? (
              <div className="p-8 border-2 border-dashed border-slate-200 text-center text-slate-400">
                <p className="text-xs">No user collections yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lists.map(list => renderListItem(list, 'user'))}
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-8">
          <AnimatePresence mode="wait">
            {selectedList ? (
              <motion.div 
                key={selectedList.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white border-2 border-slate-900 p-8 shadow-[8px_8px_0_0_#0f172a]"
              >
                <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-slate-100">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {isCurated ? (
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-widest">System Curated</span>
                      ) : (
                        <span className="px-2 py-1 bg-[#9be34b] text-slate-900 text-[10px] font-bold uppercase tracking-widest">User Research</span>
                      )}
                    </div>
                    <h2 className="text-3xl font-bold font-heading mb-2">{selectedList.title}</h2>
                    <p className="text-slate-500 max-w-xl">{selectedList.description}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Collection ID</span>
                    <p className="font-mono text-xs text-slate-300">{selectedList.id.slice(0, 8)}...</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {!isCurated && (
                    <form onSubmit={addTickerToList} className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                        <Input 
                          placeholder="ADD TICKER TO LAB..." 
                          value={newTicker}
                          onChange={(e) => setNewTicker(e.target.value)}
                          className="pl-10 rounded-none border-2 border-slate-900 h-12 uppercase font-bold tracking-widest focus-visible:ring-0"
                        />
                      </div>
                      <Button type="submit" className="rounded-none h-12 px-6 bg-[#9be34b] text-slate-900 font-bold hover:bg-[#86c43d] border-2 border-slate-900">
                        ADD
                      </Button>
                    </form>
                  )}

                  <div className="grid grid-cols-1 gap-4">
                    {selectedList.tickers.length === 0 ? (
                      <div className="py-12 text-center border-2 border-dashed border-slate-100 text-slate-400">
                        <p>List is currently empty.</p>
                        {!isCurated && <p className="text-xs">Add tickers above to start building your research universe.</p>}
                      </div>
                    ) : (
                      selectedList.tickers.map(ticker => (
                        <div 
                          key={ticker} 
                          className="group flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-slate-50 border border-slate-200 hover:border-slate-900 transition-colors gap-3 sm:gap-0"
                        >
                          <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="w-10 h-10 shrink-0 bg-white border border-slate-900 flex items-center justify-center font-bold text-sm">
                              {ticker[0]}
                            </div>
                            <span className="font-bold text-lg truncate">{ticker}</span>
                          </div>
                          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => onViewResearch(ticker)}
                              className="text-xs font-bold hover:bg-slate-200 flex-1 sm:flex-none justify-center"
                            >
                              RESEARCH →
                            </Button>
                            {!isCurated && (
                              <button 
                                onClick={() => removeTickerFromList(ticker)}
                                className="p-2 sm:p-1 text-slate-300 hover:text-red-500 transition-colors shrink-0"
                                aria-label={`Remove ${ticker}`}
                              >
                                <X size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-200 text-slate-400">
                Select a collection to investigate
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Create List Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white border-2 border-slate-900 shadow-[12px_12px_0_0_#9be34b] w-full max-w-md p-8"
            >
              <h2 className="text-3xl font-bold font-heading mb-6">Initialize New List</h2>
              <form onSubmit={handleCreateList} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">List Title</label>
                  <Input 
                    required
                    placeholder="e.g. AI INFRASTRUCTURE 2024" 
                    value={newListTitle}
                    onChange={(e) => setNewListTitle(e.target.value)}
                    className="rounded-none border-2 border-slate-900 h-14 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Thesis / Description</label>
                  <textarea 
                    placeholder="Describe the research focus..." 
                    value={newListDescription}
                    onChange={(e) => setNewListDescription(e.target.value)}
                    className="w-full min-h-[100px] p-3 rounded-none border-2 border-slate-900 font-medium focus:outline-none focus:ring-0"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 rounded-none h-14 border-2 border-slate-900 font-bold"
                  >
                    CANCEL
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isCreating}
                    className="flex-1 rounded-none h-14 bg-slate-900 text-white font-bold hover:bg-slate-800"
                  >
                    {isCreating ? <Loader2 className="animate-spin" /> : 'CREATE LAB'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
