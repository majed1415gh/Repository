import React from 'react';
import { Check } from 'lucide-react';

const SuccessModal = ({ isOpen, onClose, message = 'تم حفظ المنافسة بنجاح' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50">
      <div className="bg-slate-50 rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl">
        {/* أيقونة النجاح */}
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="w-8 h-8 text-green-600" strokeWidth={3} />
        </div>
        
        {/* عنوان النجاح */}
        <h2 className="text-xl font-bold text-gray-800 mb-2">إنجاز</h2>
        
        {/* رسالة النجاح */}
        <p className="text-gray-600 mb-6">{message}</p>
        
        {/* زر الإغلاق */}
        <button
          onClick={onClose}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
        >
          تمام
        </button>
      </div>
    </div>
  );
};

export default SuccessModal;