import React, { useState, useEffect } from 'react';
import { X, Search, Loader2, Clock } from 'lucide-react';

// دالة لتنظيف البيانات المستلمة والتأكد من عدم وجود قيم null
const cleanDataForState = (data) => {
    const cleanedData = { ...data };
    for (const key in cleanedData) {
        if (cleanedData[key] === null) {
            cleanedData[key] = ''; // تحويل null إلى نص فارغ
        }
    }
    return cleanedData;
};

const AddCompetitionModal = ({ t, onClose, onSave, competitionToEdit }) => {
    const [showManualForm, setShowManualForm] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [referenceInput, setReferenceInput] = useState('');
    
    const initialFormData = {
        name: '', referenceNumber: '', brochureCost: '', competitionType: '',
        contractDuration: '', governmentEntity: '', deadline: '', etimadStatus: '',
        submissionMethod: '', awardValue: '', supplierName: '', status: 'for_review',
        submissionDate: '', myBid: '', competition_purpose: '', guarantee_required: '',
        awarded_supplier: '', award_amount: ''
    };

    const [formData, setFormData] = useState(initialFormData);
    const [remainingTimeDisplay, setRemainingTimeDisplay] = useState('');

    useEffect(() => {
        if (competitionToEdit) {
            const cleanCompetition = cleanDataForState(competitionToEdit);
            const submissionDateForInput = cleanCompetition.submissionDate ? new Date(cleanCompetition.submissionDate).toISOString().slice(0, 16) : '';
            setFormData({ ...initialFormData, ...cleanCompetition, submissionDate: submissionDateForInput });
            setShowManualForm(true);
        } else {
            setFormData(initialFormData);
        }
    }, [competitionToEdit]);

    useEffect(() => {
        if (formData.deadline) {
            const calculateTimeLeft = () => {
                const deadlineDate = new Date(formData.deadline.replace(' ', 'T'));
                if (isNaN(deadlineDate.getTime())) return;
                const difference = +deadlineDate - +new Date();
                
                if (difference > 0) {
                    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
                    const minutes = Math.floor((difference / 1000 / 60) % 60);
                    setRemainingTimeDisplay(`${days}ي ${hours}س ${minutes}د`);
                } else {
                    setRemainingTimeDisplay('انتهى');
                }
            };
            calculateTimeLeft();
            const interval = setInterval(calculateTimeLeft, 60000);
            return () => clearInterval(interval);
        } else {
            setRemainingTimeDisplay('');
        }
    }, [formData.deadline]);

    const showExtraFieldsStatuses = [ "proposal_submitted", "awarded", "not_awarded", "claim_submitted", "finished", "cancelled" ];

    const handleSearch = async () => {
        if (!referenceInput) return;
        setIsSearching(true);
        try {
            const response = await fetch('http://localhost:3001/api/scrape-and-save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ searchInput: referenceInput })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'حدث خطأ أثناء سحب البيانات.');
            }

            const data = await response.json();
            const cleanData = cleanDataForState(data);
            setFormData(prev => ({ ...prev, ...cleanData }));
            setShowManualForm(true);

        } catch (error) {
            console.error("فشل البحث:", error);
            alert(`فشل البحث: ${error.message}`);
        } finally {
            setIsSearching(false);
        }
    };
    
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-5 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800">{showManualForm ? t('manualEntryTitle') : t('addNewCompetitionTitle')}</h2>
                    <button onClick={onClose} className="p-2 rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"><X size={20} /></button>
                </div>
                {!showManualForm ? (
                    <div className="p-8 space-y-6 flex-1">
                        <div className="text-center">
                            <h3 className="text-lg font-semibold text-slate-700">{t('searchByReference')}</h3>
                            <div className="mt-4 relative max-w-md mx-auto">
                                <input type="text" value={referenceInput} onChange={(e) => setReferenceInput(e.target.value)} placeholder={t('enterReferenceOrLink')} className="w-full ps-4 pe-20 py-3 border border-slate-300 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                                <button onClick={handleSearch} disabled={isSearching} className="absolute end-1.5 top-1/2 -translate-y-1/2 bg-teal-600 text-white rounded-full p-2.5 hover:bg-teal-700 transition-colors flex items-center justify-center w-32 disabled:bg-teal-400">
                                    {isSearching ? <><Loader2 className="animate-spin h-5 w-5 me-2" />{t('searching')}</> : <><Search size={20} className="me-1"/>{t('search')}</>}
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center text-slate-400"><hr className="flex-1 border-t"/><span className="px-4 text-sm">{t('or')}</span><hr className="flex-1 border-t"/></div>
                        <div className="text-center"><button onClick={() => setShowManualForm(true)} className="w-full max-w-md py-3 px-6 bg-white border-2 border-teal-600 text-teal-600 font-bold rounded-full hover:bg-teal-50">{t('addManually')}</button></div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-4">
                        <div><label className="text-sm font-medium text-slate-700">{t('competitionName')}</label><input type="text" name="name" value={formData.name} onChange={handleInputChange} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500" required/></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="text-sm font-medium text-slate-700">{t('referenceNumber')}</label><input type="text" name="referenceNumber" value={formData.referenceNumber} onChange={handleInputChange} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500" /></div>
                            <div><label className="text-sm font-medium text-slate-700">{t('brochureValue')}</label><input type="number" name="brochureCost" value={formData.brochureCost} onChange={handleInputChange} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500" /></div>
                            <div><label className="text-sm font-medium text-slate-700">{t('competitionType')}</label><input type="text" name="competitionType" value={formData.competitionType} onChange={handleInputChange} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500" /></div>
                            <div><label className="text-sm font-medium text-slate-700">{t('contractDuration')}</label><input type="text" name="contractDuration" value={formData.contractDuration} onChange={handleInputChange} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500" /></div>
                        </div>
                        <div><label className="text-sm font-medium text-slate-700">{t('governmentEntity')}</label><input type="text" name="governmentEntity" value={formData.governmentEntity} onChange={handleInputChange} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500" /></div>
                        <div><label className="text-sm font-medium text-slate-700">الغرض من المنافسة</label><input type="text" name="competition_purpose" value={formData.competition_purpose} onChange={handleInputChange} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500" /></div>
                        <div><label className="text-sm font-medium text-slate-700">الضمان الابتدائي مطلوب</label><input type="text" name="guarantee_required" value={formData.guarantee_required} onChange={handleInputChange} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500" /></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            
                            {/* --- بداية التعديل --- */}
                            <div>
                                <label className="text-sm font-medium text-slate-700">آخر موعد لتقديم العروض</label>
                                <input 
                                    type="text" 
                                    name="deadline" 
                                    value={formData.deadline} 
                                    onChange={handleInputChange} 
                                    placeholder="YYYY-MM-DD HH:MM" 
                                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500" 
                                />
                                {remainingTimeDisplay && (
                                    <div className="flex items-center justify-end gap-1 text-xs text-slate-600 mt-1.5">
                                        <span className="font-bold whitespace-nowrap">{remainingTimeDisplay}</span>
                                        <Clock size={14} className="text-slate-500" />
                                    </div>
                                )}
                            </div>
                            {/* --- نهاية التعديل --- */}

                            <div><label className="text-sm font-medium text-slate-700">{t('etimadStatus')}</label><input type="text" name="etimadStatus" value={formData.etimadStatus} onChange={handleInputChange} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500" /></div>
                            <div><label className="text-sm font-medium text-slate-700">{t('submissionMethod')}</label><input type="text" name="submissionMethod" value={formData.submissionMethod} onChange={handleInputChange} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500" /></div>
                             <div>
                                <label className="text-sm font-medium text-slate-700">{t('status')}</label>
                                <select name="status" value={formData.status} onChange={handleInputChange} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 bg-white">
                                    <option value="for_review">{t('status_for_review')}</option><option value="brochure_purchased">{t('status_brochure_purchased')}</option><option value="proposal_submitted">{t('status_proposal_submitted')}</option><option value="awarded">{t('status_awarded')}</option><option value="not_awarded">{t('status_not_awarded')}</option><option value="claim_submitted">{t('status_claim_submitted')}</option><option value="finished">{t('status_finished')}</option><option value="cancelled">{t('status_cancelled')}</option><option value="not_submitted">{t('status_not_submitted')}</option>
                                </select>
                            </div>
                        </div>
                        {showExtraFieldsStatuses.includes(formData.status) && (
                            <div className="p-4 bg-slate-100 rounded-lg space-y-4 border border-slate-200 mt-4 animate-fade-in">
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label className="text-sm font-medium text-slate-700">قيمة العطاء</label><input type="number" name="myBid" value={formData.myBid} onChange={handleInputChange} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500" /></div>
                                    <div><label className="text-sm font-medium text-slate-700">تاريخ تقديم العرض</label><input type="datetime-local" name="submissionDate" value={formData.submissionDate} onChange={handleInputChange} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500" /></div>
                                </div>
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="text-sm font-medium text-slate-700">المورد المرسى عليه</label><input type="text" name="awarded_supplier" value={formData.awarded_supplier} onChange={handleInputChange} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500" /></div>
                            <div><label className="text-sm font-medium text-slate-700">مبلغ الترسية</label><input type="number" name="award_amount" value={formData.award_amount} onChange={handleInputChange} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500" /></div>
                            <div><label className="text-sm font-medium text-slate-700">{t('awardValue')} (قديم)</label><input type="text" name="awardValue" value={formData.awardValue} onChange={handleInputChange} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500" /></div>
                            <div><label className="text-sm font-medium text-slate-700">{t('winningSupplier')} (قديم)</label><input type="text" name="supplierName" value={formData.supplierName} onChange={handleInputChange} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500" /></div>
                        </div>
                        <div className="flex justify-end items-center gap-4 pt-6">
                            <button type="button" onClick={onClose} className="py-2 px-5 bg-slate-200 text-slate-800 rounded-lg font-medium hover:bg-slate-300">{t('cancel')}</button>
                            <button type="submit" className="py-2 px-5 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700">{t('saveCompetition')}</button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default AddCompetitionModal;