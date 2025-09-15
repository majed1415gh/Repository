import React, { useState, useCallback } from 'react';
import { X, UploadCloud, FileText, Trash2, Loader2 } from 'lucide-react';

const UploadModal = ({ isOpen, onClose, onUpload, isUploading, isUpdateMode = false }) => {
    const [files, setFiles] = useState([]);
    const [isDragging, setIsDragging] = useState(false);

    const handleFileChange = (event) => {
        const newFiles = Array.from(event.target.files);
        if (isUpdateMode) {
            setFiles(newFiles.slice(0, 1)); // السماح بملف واحد فقط في وضع التحديث
        } else {
            setFiles(prev => [...prev, ...newFiles]);
        }
    };

    const handleDrop = useCallback((event) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
        const newFiles = Array.from(event.dataTransfer.files);
        if (newFiles && newFiles.length > 0) {
            if (isUpdateMode) {
                setFiles(newFiles.slice(0, 1));
            } else {
                setFiles(prev => [...prev, ...newFiles]);
            }
        }
    }, [isUpdateMode]);

    const handleDragOver = useCallback((event) => { event.preventDefault(); event.stopPropagation(); }, []);
    const handleDragEnter = useCallback((event) => { event.preventDefault(); event.stopPropagation(); setIsDragging(true); }, []);
    const handleDragLeave = useCallback((event) => { event.preventDefault(); event.stopPropagation(); setIsDragging(false); }, []);

    const removeFile = (fileName) => {
        setFiles(files.filter(file => file.name !== fileName));
    };

    const handleUploadClick = () => {
        if(files.length > 0) {
            onUpload(files);
            setFiles([]);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-lg font-bold text-slate-800">{isUpdateMode ? 'تحديث الملف' : 'تحميل المرفقات'}</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100"><X className="h-5 w-5 text-slate-600" /></button>
                </div>
                <div className="p-6 flex-1 overflow-y-auto">
                    <div 
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors ${isDragging ? 'border-teal-500 bg-teal-50' : 'border-slate-300 bg-slate-50'}`}
                    >
                        <UploadCloud className="mx-auto h-12 w-12 text-slate-400" />
                        <p className="mt-4 text-slate-600">{isUpdateMode ? 'اسحب وأفلت الملف الجديد هنا، أو' : 'اسحب وأفلت الملفات هنا، أو'}</p>
                        <label htmlFor="file-upload" className="mt-2 inline-block cursor-pointer text-teal-600 font-semibold hover:underline">
                            تصفح الملفات
                        </label>
                        <input id="file-upload" name="file-upload" type="file" multiple={!isUpdateMode} className="sr-only" onChange={handleFileChange} accept=".pdf" />
                        <p className="text-xs text-slate-400 mt-2">PDF فقط</p>
                    </div>

                    {files.length > 0 && (
                        <div className="mt-6">
                            <h4 className="font-semibold text-slate-700 mb-2">الملفات المحددة:</h4>
                            <ul className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                {files.map((file, index) => (
                                    <li key={index} className="flex items-center justify-between p-2 bg-slate-100 rounded-md">
                                        <div className="flex items-center gap-2 text-sm">
                                            <FileText className="h-5 w-5 text-slate-500" />
                                            <span className="font-medium text-slate-800">{file.name}</span>
                                        </div>
                                        <button onClick={() => removeFile(file.name)} className="p-1 text-red-500 hover:bg-red-100 rounded-full">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
                <div className="p-4 bg-slate-50 border-t flex justify-end gap-3">
                    <button onClick={onClose} className="py-2 px-5 bg-slate-200 text-slate-800 rounded-lg font-medium hover:bg-slate-300">إلغاء</button>
                    <button 
                        onClick={handleUploadClick} 
                        disabled={files.length === 0 || isUploading} 
                        className="py-2 px-5 w-32 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700 disabled:bg-teal-300 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {isUploading ? <Loader2 className="animate-spin h-5 w-5" /> : (isUpdateMode ? 'تحديث' : `تحميل ${files.length > 0 ? `(${files.length})` : ''}`)}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UploadModal;