// src/pages/CompetitionDetail.jsx

import React, { useState, useEffect } from 'react';
import { ArrowRight, LayoutGrid, ListOrdered, Paperclip, Briefcase, FileSignature, DollarSign, Edit, Trash2, Link as LinkIcon, FileText, Plus, X, PlusCircle, RefreshCw, DownloadCloud, Loader2 } from 'lucide-react'; // --- تعديل: إضافة أيقونة Loader2 ---
import UploadModal from '../components/UploadModal';

const CompetitionDetail = ({ competition, onBack, t }) => {
    const [activeTab, setActiveTab] = useState('المعلومات الأساسية');
    const [isQuantitiesModalOpen, setIsQuantitiesModalOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [tableRows, setTableRows] = useState([]);
    const [attachments, setAttachments] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isLoadingAttachments, setIsLoadingAttachments] = useState(true);
    const [isScraping, setIsScraping] = useState(false); // --- إضافة: حالة لتتبع عملية السحب ---

    // دالة جديدة لجلب المرفقات من الخادم
    const fetchAttachments = async () => {
        if (!competition?.id) return;
        setIsLoadingAttachments(true);
        try {
            const response = await fetch(`http://localhost:3001/api/competitions/${competition.id}/attachments`);
            const data = await response.json();
            if (response.ok) {
                setAttachments(data);
            } else {
                throw new Error(data.message || 'فشل في جلب المرفقات');
            }
        } catch (error) {
            console.error(error);
            alert(`خطأ: ${error.message}`);
        } finally {
            setIsLoadingAttachments(false);
        }
    };

    // جلب المرفقات عند تحميل الصفحة
    useEffect(() => {
        fetchAttachments();
    }, [competition.id]);

    // --- إضافة: دالة جديدة لبدء عملية سحب جدول الكميات ---
    const handleScrapeQuantities = async () => {
        alert("ستبدأ عملية السحب الآن. يرجى متابعة شاشة التيرمنال (الخادم) لإدخال اسم المستخدم وكلمة المرور ورمز التحقق عند الطلب.");
        setIsScraping(true);
        try {
            const response = await fetch(`http://localhost:3001/api/competitions/${competition.id}/scrape-quantities`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ competitionUrl: competition.competitionUrl })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'حدث خطأ غير متوقع أثناء عملية السحب.');
            }

            console.log("Data received from scraper:", result.data);
            alert("نجحت عملية سحب البيانات! (البيانات معروضة في الكونسول حاليًا)");
            // لاحقًا: سنستخدم result.data لملء النافذة المنبثقة للجدول
            // setTableRows(result.data);
            // setIsQuantitiesModalOpen(true);

        } catch (error) {
            console.error("Scraping failed:", error);
            alert(`فشلت عملية السحب: ${error.message}`);
        } finally {
            setIsScraping(false);
        }
    };


    const addTableRow = () => {
        const newId = tableRows.length > 0 ? Math.max(...tableRows.map(r => r.id)) + 1 : 1;
        setTableRows([...tableRows, { id: newId }]);
    };

    const removeTableRow = (id) => {
        setTableRows(tableRows.filter(row => row.id !== id));
    };

    const openQuantitiesModal = () => {
        setTableRows([{id: 1}]);
        setIsQuantitiesModalOpen(true);
    }
    const closeQuantitiesModal = () => setIsQuantitiesModalOpen(false);

    const openUploadModal = () => setIsUploadModalOpen(true);
    const closeUploadModal = () => setIsUploadModalOpen(false);
    
    const handleFileUpload = async (uploadedFiles) => {
        setIsUploading(true);
        let uploadSuccess = true;

        for (const file of uploadedFiles) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('file_type', 'attachment');
            formData.append('original_name', file.name);

            try {
                const response = await fetch(`http://localhost:3001/api/competitions/${competition.id}/attachments`, {
                    method: 'POST',
                    body: formData,
                });

                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.message || `فشل رفع الملف: ${file.name}`);
                }
            } catch (error) {
                console.error(error);
                alert(`خطأ فادح: ${error.message}`);
                uploadSuccess = false;
                break; 
            }
        }

        setIsUploading(false);
        closeUploadModal();

        if (uploadSuccess) {
            fetchAttachments();
        }
    };

    const handleDeleteAttachment = async (attachmentId, attachmentName) => {
        if (window.confirm(`هل أنت متأكد من أنك تريد حذف الملف: "${attachmentName}"؟`)) {
            try {
                const response = await fetch(`http://localhost:3001/api/attachments/${attachmentId}`, {
                    method: 'DELETE',
                });
                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.message || 'فشل حذف الملف');
                }
                alert('تم حذف الملف بنجاح!');
                fetchAttachments();
            } catch (error) {
                console.error(error);
                alert(`خطأ: ${error.message}`);
            }
        }
    };

    const currencyFormat = (value) => {
        if (value == null) return 'غير محدد';
        return value.toLocaleString('ar-SA', { style: 'currency', currency: 'SAR' });
    };

    const calculateTimeLeft = (deadline) => {
        if (!deadline) return 'غير محدد';
        const deadlineDate = new Date(deadline.replace(' ', 'T'));
        const now = new Date();
        const difference = deadlineDate - now;
        if (difference <= 0) return <span className="text-red-600 font-bold">انتهى الوقت</span>;
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        return `${days} يوم و ${hours} ساعة و ${minutes} دقيقة`;
    };

    const TabButton = ({ label, icon: Icon }) => (
        <button onClick={() => setActiveTab(label)} className={`tab-box ${activeTab === label ? 'active' : ''}`}>
            <Icon className={`h-7 w-7 mb-2 transition-colors ${activeTab === label ? 'text-white' : 'text-slate-500'}`} />
            <span className="text-xs font-semibold">{label}</span>
        </button>
    );

    const DetailItem = ({ label, value }) => (
        <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-50">
            <div className="flex-1">
                <p className="text-sm text-slate-500">{label}</p>
                <p className="font-semibold text-slate-800 break-words">{value || 'غير محدد'}</p>
            </div>
        </div>
    );

    // --- تعديل: إضافة onScrapeClick و isScraping كـ props ---
    const AttachmentsList = ({ files, uploadButtonText, onAddClick, onScrapeClick, isScraping, isQuantities = false, icon: IconComponent = FileText }) => {
        if (isLoadingAttachments && !isQuantities) {
            return <div className="p-10 text-center text-slate-500">جاري تحميل المرفقات...</div>
        }
        
        if (!files || files.length === 0) {
            return (
                <div className="p-10 flex flex-col items-center">
                    {isQuantities ? <ListOrdered className="mx-auto text-slate-300 mb-4" size={48} /> : <FileSignature className="mx-auto text-slate-300 mb-4" size={48} />}
                    <h3 className="text-xl font-bold text-slate-700 mb-2">لا توجد {isQuantities ? 'جداول' : 'ملفات'} حاليًا</h3>
                    <p className="text-slate-500 mb-6">قم بإضافة أول {isQuantities ? 'جدول' : 'ملف'} للمنافسة يدويًا أو سحبه من المنصة.</p>
                    <div className="flex items-center gap-4">
                        <button onClick={onAddClick} className="flex items-center justify-center gap-2 py-3 px-6 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700">
                            <Plus size={20} /> {uploadButtonText}
                        </button>
                        {/* --- تعديل: إضافة زر السحب وربطه بالدالة وحالة التحميل --- */}
                        {isQuantities && (
                            <button onClick={onScrapeClick} disabled={isScraping} className="flex items-center justify-center gap-2 py-3 px-6 bg-white text-teal-600 border-2 border-teal-600 font-bold rounded-lg hover:bg-teal-50 disabled:bg-slate-200 disabled:cursor-not-allowed">
                                {isScraping ? <><Loader2 className="animate-spin h-5 w-5" /> <span>جاري السحب...</span></> : <><DownloadCloud size={20} /> <span>سحب من المنصة</span></>}
                            </button>
                        )}
                    </div>
                </div>
            );
        }

        return (
            <div>
                <div className="p-6">
                    <table className="w-full text-right">
                        <thead className="border-b border-slate-200">
                            <tr>
                                <th className="p-3 text-xs font-medium text-slate-400 uppercase tracking-wider">#</th>
                                <th className="p-3 text-xs font-medium text-slate-400 uppercase tracking-wider">اسم {isQuantities ? 'الجدول' : 'الملف'}</th>
                                <th className="p-3 text-xs font-medium text-slate-400 uppercase tracking-wider">تاريخ الإضافة</th>
                                <th className="p-3 text-xs font-medium text-slate-400 uppercase tracking-wider">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {files.map((file, index) => (
                                <tr key={file.id} className="hover:bg-slate-50">
                                    <td className="p-4 text-sm font-medium text-slate-500">{index + 1}</td>
                                    <td className="p-4 text-sm font-semibold text-slate-800">
                                        <div className="flex items-center gap-3">
                                            <IconComponent className={`h-5 w-5 ${isQuantities ? 'text-teal-600' : 'text-red-500'} flex-shrink-0`} />
                                            <span>{file.file_name}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-slate-600">{new Date(file.created_at).toLocaleDateString('ar-SA')}</td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => alert('سيتم تفعيل التحديث قريبًا')} className="p-2 text-slate-400 hover:text-slate-700" title="تحديث"><RefreshCw className="h-4 w-4" /></button>
                                            <button onClick={() => handleDeleteAttachment(file.id, file.file_name)} className="p-2 text-slate-400 hover:text-red-600" title="حذف"><Trash2 className="h-4 w-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 bg-slate-50/70 flex justify-center">
                    <button onClick={onAddClick} className="h-10 w-10 bg-teal-600 text-white rounded-full flex items-center justify-center hover:bg-teal-700 transition-transform hover:scale-110 shadow" title={uploadButtonText}>
                        <Plus className="h-6 w-6" />
                    </button>
                </div>
            </div>
        );
    };


    const renderTabContent = () => {
        switch (activeTab) {
            case 'المعلومات الأساسية':
                return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 p-6">
                    <DetailItem label="الرقم المرجعي" value={competition.referenceNumber} />
                    <DetailItem label="حالة المنافسة للمنشأة" value={t(`status_${competition.status}`)} />
                    <DetailItem label="حالة المنافسة في اعتماد" value={competition.etimadStatus} />
                    <DetailItem label="نوع المنافسة" value={competition.competitionType} />
                    <DetailItem label="الجهة الحكومية" value={competition.governmentEntity} />
                    <DetailItem label="مدة العقد" value={competition.contractDuration} />
                    <DetailItem label="قيمة كراسة الشروط" value={currencyFormat(competition.brochureCost)} />
                    <DetailItem label="آخر موعد للتقديم" value={calculateTimeLeft(competition.deadline)} />
                    <DetailItem label="طريقة تقديم العروض" value={competition.submissionMethod} />
                </div>;
            case 'جدول الكميات':
                // --- تعديل: تمرير دالة السحب وحالة التحميل هنا ---
                return <AttachmentsList files={[]} uploadButtonText="تحميل جدول الكميات" onAddClick={openQuantitiesModal} onScrapeClick={handleScrapeQuantities} isScraping={isScraping} isQuantities={true} icon={ListOrdered} />;
            case 'المرفقات':
                 return <AttachmentsList files={attachments} uploadButtonText="تحميل المرفقات" onAddClick={openUploadModal} icon={FileText} />;
            case 'العرض الفني والمالي':
                return <div className="p-10 flex flex-col items-center justify-center">
                    <Briefcase size={48} className="text-slate-300 mb-4" />
                    <h3 className="text-xl font-bold text-slate-700 mb-2">إنشاء عرض فني ومالي</h3>
                    <p className="text-slate-500 mb-6">قم بإنشاء وتجهيز العرض الفني والمالي الموحد لهذه المنافسة.</p>
                    <button className="flex items-center justify-center gap-2 py-3 px-6 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700">
                        <Plus size={20} /> إنشاء العرض
                    </button>
                </div>;
            default:
                return <div className="p-6">محتوى قيد الإنشاء...</div>;
        }
    };
    
    const tabs = [
        { label: 'المعلومات الأساسية', icon: LayoutGrid },
        { label: 'جدول الكميات', icon: ListOrdered },
        { label: 'المرفقات', icon: Paperclip }
    ];
    if (competition.submissionMethod === 'ملف واحد للعرض الفني والمالي معا') {
        tabs.push({ label: 'العرض الفني والمالي', icon: Briefcase });
    } else {
        tabs.push({ label: 'العرض الفني', icon: FileSignature });
        tabs.push({ label: 'العرض المالي', icon: DollarSign });
    }

    return (
        <>
            <style>{`.tab-box{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:1rem;border-radius:.75rem;cursor:pointer;transition:all .2s ease-in-out;background-color:#f1f5f9;color:#475569}.tab-box:hover{background-color:#e2e8f0}.tab-box.active{background-color:#0d9488;color:#fff;font-weight:700}.form-input{width:100%;padding:.25rem .5rem;font-size:.875rem;border:1px solid #cbd5e1;border-radius:.375rem;box-shadow:0 1px 2px 0 rgba(0,0,0,.05);outline:none;transition:all .2s ease-in-out}.form-input:focus{--tw-ring-color:#14b8a6;--tw-border-color:#14b8a6;box-shadow:0 0 0 3px rgba(20,184,166,.2);border-color:var(--tw-border-color)}.quantities-table-grid{display:grid;grid-template-columns:40px 1fr 1.5fr 1fr 1fr 2fr 2fr 1.5fr 1fr 40px;gap:.75rem;align-items:center}`}</style>
            <div className="space-y-6 animate-fade-in">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-200">
                            <ArrowRight className="h-5 w-5 text-slate-600" />
                        </button>
                        <h2 className="text-2xl font-bold text-slate-800">{competition.name}</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="px-3 py-1.5 text-sm font-semibold text-teal-800 bg-teal-100 rounded-full">
                            {t(`status_${competition.status}`)}
                        </span>
                        <div className="flex items-center gap-1">
                            <button className="p-2 text-slate-500 rounded-md hover:bg-slate-200 hover:text-slate-800" title="حذف"><Trash2 className="h-5 w-5" /></button>
                            <button className="p-2 text-slate-500 rounded-md hover:bg-slate-200 hover:text-slate-800" title="تعديل"><Edit className="h-5 w-5" /></button>
                            <a href={competition.competitionUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-500 rounded-md hover:bg-slate-200 hover:text-slate-800" title="رابط المنافسة"><LinkIcon className="h-5 w-5" /></a>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 bg-[#fcfcfc]">
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                            {tabs.map(tab => <TabButton key={tab.label} {...tab} />)}
                        </div>
                    </div>
                    <div className="min-h-[250px]">
                        {renderTabContent()}
                    </div>
                </div>
            </div>

            {isQuantitiesModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h3 className="text-lg font-bold text-slate-800">إضافة جدول كميات جديد</h3>
                            <button onClick={closeQuantitiesModal} className="p-2 rounded-full hover:bg-slate-100"><X className="h-5 w-5 text-slate-600" /></button>
                        </div>
                        <div className="p-6 flex-1 overflow-y-auto">
                            <div className="mb-6">
                                <label className="text-sm font-medium text-slate-700">اسم الجدول</label>
                                <input type="text" placeholder="مثال: جدول كميات الأعمال الكهربائية" className="form-input mt-1" />
                            </div>
                            <div className="quantities-table-grid text-xs font-semibold text-slate-500 mb-2 px-2 sticky top-0 bg-white py-2 border-b">
                                <div>#</div><div>الفئة</div><div>البند</div><div>وحدة القياس</div><div>الكمية</div><div>وصف البند</div><div>المواصفات</div><div>منتج من القائمة</div><div>الرمز الإنشائي</div><div></div>
                            </div>
                            <div className="space-y-2">
                                {tableRows.map(row => (
                                    <div key={row.id} className="quantities-table-grid">
                                        <input className="form-input bg-slate-100 text-center" value={row.id} readOnly />
                                        <input className="form-input" placeholder="الفئة" />
                                        <input className="form-input" placeholder="البند" />
                                        <input className="form-input" placeholder="وحدة القياس" />
                                        <input className="form-input" placeholder="الكمية" type="number" />
                                        <input className="form-input" placeholder="وصف البند" />
                                        <input className="form-input" placeholder="المواصفات" />
                                        <select className="form-input"><option value="" disabled selected>اختر</option><option>نعم</option><option>لا</option></select>
                                        <input className="form-input" placeholder="الرمز" />
                                        <button onClick={() => removeTableRow(row.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-md flex items-center justify-center"><Trash2 className="h-4 w-4" /></button>
                                    </div>
                                ))}
                            </div>
                            <button onClick={addTableRow} className="mt-4 flex items-center gap-2 text-sm font-semibold text-teal-600 hover:text-teal-800">
                                <PlusCircle className="h-5 w-5" /> إضافة صف جديد
                            </button>
                        </div>
                        <div className="p-4 bg-slate-50 border-t flex justify-end gap-3">
                            <button onClick={closeQuantitiesModal} className="py-2 px-5 bg-slate-200 text-slate-800 rounded-lg font-medium hover:bg-slate-300">إلغاء</button>
                            <button onClick={closeQuantitiesModal} className="py-2 px-5 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700">حفظ الجدول</button>
                        </div>
                    </div>
                </div>
            )}
            
            <UploadModal 
                   isOpen={isUploadModalOpen}
                   onClose={closeUploadModal}
                 onUpload={handleFileUpload}
                    isUploading={isUploading} 
            />
        </>
    );
};

export default CompetitionDetail;