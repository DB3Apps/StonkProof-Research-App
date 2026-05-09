import React from 'react';
import { Loader2, Star } from 'lucide-react';
import { Button } from "../ui/button";
import { HandDrawnDoodle } from '../Doodles';

interface ResearchNotesProps {
  note: string;
  setNote: (note: string) => void;
  saveNote: () => void;
  isSavingNote: boolean;
}

export const ResearchNotes = React.memo(({ note, setNote, saveNote, isSavingNote }: ResearchNotesProps) => {
  return (
    <div className="paper-card p-8 bg-white border-2 border-slate-900 relative mt-4">
      <div className="absolute top-0 right-0 bg-slate-900 text-white text-[10px] font-bold px-3 py-1 uppercase tracking-widest shadow-[-2px_2px_0px_0px_rgba(255,255,255,0.2)]">RESEARCH NOTES</div>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HandDrawnDoodle type="star" size={28} className="pencil-doodle" />
            <h3 className="font-heading text-lg font-bold uppercase tracking-widest">Personal Thesis</h3>
          </div>
          <div className="flex items-center gap-3 italic text-[10px] font-bold text-slate-400 font-heading tracking-widest">
            {isSavingNote ? (
              <div className="flex items-center gap-1 text-trapper-blue">
                <Loader2 size={10} className="animate-spin" />
                SAVING...
              </div>
            ) : note ? (
              <div className="text-emerald-500">SYNCED</div>
            ) : null}
          </div>
        </div>
        <div className="relative group">
          <textarea 
            className="w-full h-40 bg-paper/50 border-2 border-dashed border-slate-300 p-6 font-hand text-lg focus:outline-none focus:border-slate-900 transition-colors resize-none break-words relative z-10"
            placeholder="Write your research findings here... (e.g. 'Strong support at $140, looking for breakout')"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="absolute -bottom-2 -right-2 w-full h-full border-2 border-slate-900/5 -z-0 pointer-events-none group-focus-within:border-slate-900/10 transition-colors" />
        </div>
      </div>
    </div>
  );
});
