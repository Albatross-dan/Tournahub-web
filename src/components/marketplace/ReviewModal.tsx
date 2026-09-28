import React, { useState } from 'react';
import { X, Star, Send, Award } from 'lucide-react';
import toast from 'react-hot-toast';
import { marketplaceService } from '../../services/marketplaceService';
import { cn } from '../../lib/utils';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  buyerId: string;
  onSuccess: () => void;
  sellerUsername?: string;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  orderId,
  buyerId,
  onSuccess,
  sellerUsername = 'Seller',
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      toast.error('Please select a star rating between 1 and 5.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await marketplaceService.submitReview(buyerId, orderId, rating, comment.trim());
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Thank you! Your feedback has been posted.');
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-surface border border-border-main rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 to-surface border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
              <Award className="w-6 h-6 stroke-[2.5px]" />
            </div>
            <div>
              <h3 className="text-base font-black text-white uppercase italic tracking-wider">
                Rate & Review Seller
              </h3>
              <p className="text-xs text-text-muted font-bold">
                Feedback for {sellerUsername}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Star Rating Selector */}
          <div className="text-center space-y-3 py-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-300 block">
              Overall Transaction Rating
            </label>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = star <= (hoverRating || rating);
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1.5 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                  >
                    <Star
                      className={cn(
                        "w-8 h-8 transition-colors duration-150",
                        isFilled
                          ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]"
                          : "text-slate-700 hover:text-slate-500"
                      )}
                    />
                  </button>
                );
              })}
            </div>
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 block">
              {rating === 5 ? '5 Stars - Excellent Transaction' :
               rating === 4 ? '4 Stars - Great Service' :
               rating === 3 ? '3 Stars - Average / Satisfactory' :
               rating === 2 ? '2 Stars - Below Average' :
               '1 Star - Poor Experience'}
            </span>
          </div>

          {/* Comment textarea */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Public Comment (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Describe your experience with this seller: speed of delivery, accuracy of account details, etc."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full bg-background border border-border-main focus:border-amber-400 rounded-xl p-3 text-xs text-slate-200 outline-none transition-all resize-none"
            />
          </div>

          {/* Submit button */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs uppercase italic tracking-wider rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase italic tracking-wider rounded-xl transition-all shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4 stroke-[2.5px]" />
              <span>{submitting ? 'Submitting...' : 'Post Review'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
