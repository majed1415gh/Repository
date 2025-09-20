import React, { useState, useEffect } from 'react';
// --- بداية التعديل ---
import { MoreVertical, CalendarDays, Clock, Trash2, Edit, Link as LinkIcon, Award } from 'lucide-react';
// --- نهاية التعديل ---

// --- بداية التعديل ---
export const CompetitionCard = ({ comp, t, onEdit, onShowDetails }) => {
// --- نهاية التعديل ---
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const calculateTimeLeft = () => {
            const difference = +new Date(comp.deadline) - +new Date();
            if (difference > 0) {
                const days = Math.floor(difference / (1000 * 60 * 60 * 24));
                const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
                const minutes = Math.floor((difference / 1000 / 60) % 60);
                setTimeLeft(`${days} يوم ${hours} ساعة ${minutes} دقيقة`);
            } else {
                setTimeLeft('انتهى الوقت');
            }
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 60000); // Update every minute

        return () => clearInterval(timer);
    }, [comp.deadline]);

    // --- بداية التعديل ---
    const currencyFormat = (value) => {
        if (value === 0) return 'مجاناً';
        return value != null ? value.toLocaleString('ar-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 0 }) : 'غير محدد';
    };
// --- نهاية التعديل ---

    const StatusBadge = ({ status }) => (
        <span className="px-2.5 py-1.5 text-xs font-semibold text-teal-800 bg-teal-100 rounded-full">
            {t(`status_${status}`)}
        </span>
    );

    return (
        <div onClick={() => onShowDetails(comp)} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col transition-all duration-300 hover:shadow-md hover:-translate-y-1 cursor-pointer transform scale-95">
            {/* --- Card Header --- */}
            <div className="p-5 bg-[#fcfcfc]">
                <div className="flex justify-between items-start gap-4">
                    <h3 className="font-bold text-slate-800 leading-tight">{comp.name}</h3>
                    <MoreVertical className="h-5 w-5 text-slate-400 flex-shrink-0" />
                </div>
                <p className="text-sm text-slate-500 mt-1">{comp.governmentEntity}</p>
                <div className="mt-3 flex items-center justify-between text-sm text-slate-600 bg-white border border-slate-200 p-2 rounded-lg">
                    <div className="flex items-center gap-2">
                        <CalendarDays size={16} className="text-slate-400" />
                        <span>{new Date(comp.dateAdded).toLocaleDateString('ar-SA-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-2 font-medium">
                        <Clock size={16} className="text-slate-400" />
                        <span>{timeLeft}</span>
                    </div>
                </div>
            </div>

            {/* --- Card Details Table --- */}
            <div className="p-5 text-sm flex-1">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <div className="font-medium text-slate-500">{t('referenceNumberShort')}</div>
                    <div className="font-semibold text-slate-700">{comp.referenceNumber}</div>

                    <div className="font-medium text-slate-500">{t('competitionType')}</div>
                    <div className="text-slate-700">{comp.competitionType}</div>

                    <div className="font-medium text-slate-500">{t('contractDuration')}</div>
                    <div className="text-slate-700">{comp.contractDuration}</div>

                    <div className="font-medium text-slate-500">{t('submissionMethod')}</div>
                    <div className="text-slate-700">{comp.submissionMethod}</div>

                    <div className="font-medium text-slate-500">{t('etimadStatus')}</div>
                    <div className="text-slate-700">{comp.etimadStatus}</div>
                    
                    <div className="font-medium text-slate-500">{t('status')}</div>
                    <div><StatusBadge status={comp.status} /></div>

                    <div className="font-medium text-slate-500">{t('brochureValue')}</div>
                    <div className="font-bold text-slate-800">{currencyFormat(comp.brochureCost)}</div>
                </div>
            </div>

            {/* --- إعلان الترسية --- */}
            {(comp.awarded_supplier || comp.supplierName) && (comp.award_amount || comp.awardValue) && (
                <div className="px-5 pb-4">
                    <div className="bg-[#fcfcfc] border border-slate-200 rounded-xl p-3 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-100 rounded-full">
                                    <Award className="h-4 w-4 text-slate-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-600 mb-1">إعلان الترسية</p>
                                    <p className="text-sm font-semibold text-slate-700">{comp.awarded_supplier || comp.supplierName}</p>
                                </div>
                            </div>
                            <div className="text-left">
                                <p className="text-sm text-slate-500 mb-1">قيمة الترسية</p>
                                <p className="text-base font-bold text-slate-700">{currencyFormat(comp.award_amount || comp.awardValue)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Card Footer Actions --- */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
    <button onClick={(e) => { e.stopPropagation(); alert('سيتم تفعيل الحذف لاحقًا'); }} className="p-2 text-slate-500 rounded-md hover:bg-slate-200 hover:text-red-600 transition-colors" title={t('delete')}>
        <Trash2 size={18} />
    </button>
    <button onClick={(e) => { e.stopPropagation(); onEdit(comp); }} className="p-2 text-slate-500 rounded-md hover:bg-slate-200 hover:text-slate-800 transition-colors" title={t('edit')}>
        <Edit size={18} />
    </button>
    <a href={comp.competitionUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="p-2 text-slate-500 rounded-md hover:bg-slate-200 hover:text-slate-800 transition-colors" title="رابط المنافسة">
        <LinkIcon size={18} />
    </a>
</div>
<button onClick={(e) => { e.stopPropagation(); alert('سيتم تفعيل إنشاء العرض لاحقًا'); }} className="flex-1 bg-teal-600 text-white py-2 px-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors text-sm text-center">
    {t('createProposal')}
</button>
            </div>
        </div>
    );
};