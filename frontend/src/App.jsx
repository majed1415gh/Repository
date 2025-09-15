// src/App.jsx

import React, { useState, useEffect } from 'react';

// استيراد المكونات والصفحات
import Login from './pages/Login';
import Sidebar from './components/common/Sidebar';
import Header from './components/common/Header';
import Dashboard from './pages/Dashboard';
import Competitions from './pages/Competitions';
import CompanyProfile from './pages/CompanyProfile';
import AddCompetitionModal from './components/AddCompetitionModal';
import SuccessModal from './components/SuccessModal';
import CompetitionDetail from './pages/CompetitionDetail';

// استيراد البيانات والترجمات
//import { MOCK_COMPETITIONS, MOCK_USER } from './data/mockData';
import { translations } from './i18n/translations';

export default function App() {
    const [language, setLanguage] = useState('ar');
    const [currentUser, setCurrentUser] = useState(null);
    const [page, setPage] = useState('login');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // --- بداية التعديل ---
    const [editingCompetition, setEditingCompetition] = useState(null);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
// --- نهاية التعديل ---
    
    // استخدم نسخة محلية من البيانات للسماح بالتعديلات
    const [competitions, setCompetitions] = useState([]);
    const [selectedCompetition, setSelectedCompetition] = useState(null);

     useEffect(() => {
        // دالة لجلب البيانات من الخادم
        const fetchCompetitions = async () => {
            try {
                // استدعاء الواجهة الخلفية لجلب المنافسات
                const response = await fetch('http://localhost:3001/api/competitions');
                const data = await response.json();

                // تحديث حالة التطبيق بالبيانات الحقيقية التي تم جلبها
                setCompetitions(data); 

            } catch (error) {
                console.error('فشل في جلب البيانات من الخادم:', error);
            }
        };

        fetchCompetitions(); // استدعاء الدالة عند تحميل الصفحة لأول مرة

    }, []); // القوسان الفارغان [] يضمنان أن هذا الكود سيعمل مرة واحدة فقط

    const t = (key) => (translations[language] && translations[language][key]) || key;

    useEffect(() => {
        document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = language;
    }, [language]);

    const handleLogin = () => {
    // تعريف بيانات المستخدم مؤقتاً هنا
    const user = { name: "شركة الحلول المبتكرة", email: "contact@innovate.sa" };
    setCurrentUser(user);
    setPage('dashboard');
    };

    const handleLogout = () => {
        setCurrentUser(null);
        setPage('login');
    };

    const navigate = (pageName) => {
    setPage(pageName);
    setSelectedCompetition(null);
}
    
     // --- بداية التعديل ---
    const handleStartEdit = (competition) => {
        setEditingCompetition(competition);
        setIsModalOpen(true);
    };

    const handleAddNew = () => {
        setEditingCompetition(null);
        setIsModalOpen(true);
    };
// --- نهاية التعديل ---

    const handleViewDetails = (competition) => {
    setSelectedCompetition(competition);
    };



    // --- بداية التعديل ---
    const handleSaveCompetition = (competitionData) => {
        // إذا كان هناك منافسة في وضع التعديل، قم بتحديثها
        if (editingCompetition) {
            setCompetitions(competitions.map(c => 
                c.id === editingCompetition.id ? { ...c, ...competitionData, brochureCost: Number(competitionData.brochureCost) || 0 } : c
            ));
        } else { // وإلا، قم بإضافة منافسة جديدة
            const nextId = competitions.length > 0 ? Math.max(...competitions.map(c => c.id)) + 1 : 1;
            const competitionWithDefaults = {
                id: nextId,
                proposalId: null,
                dateAdded: new Date().toISOString().split('T')[0],
                ...competitionData,
                brochureCost: Number(competitionData.brochureCost) || 0,
            };
            setCompetitions([competitionWithDefaults, ...competitions]);
        }
        
        // إغلاق النافذة وإعادة تعيين حالة التعديل
        setIsModalOpen(false);
        setEditingCompetition(null);
         setIsSuccessModalOpen(true);
    };
// --- نهاية التعديل ---
    
    if (!currentUser) {
        return <Login onLogin={handleLogin} t={t} />;
    }

    const renderPage = () => {
    if (selectedCompetition) {
        return <CompetitionDetail 
                    competition={selectedCompetition} 
                    onBack={() => setSelectedCompetition(null)} 
                    t={t} 
                />;
    }

    switch (page) {
        case 'dashboard': 
            return <Dashboard t={t} navigate={navigate} onAddNewCompetition={handleAddNew} MOCK_COMPETITIONS={competitions} MOCK_USER={currentUser} />;
        case 'competitions': 
            return <Competitions t={t} onAddNewCompetition={handleAddNew} onEditCompetition={handleStartEdit} onShowDetails={handleViewDetails} MOCK_COMPETITIONS={competitions} />;
        case 'profile': 
            return <CompanyProfile t={t} />;
        default: 
            return <Dashboard t={t} navigate={navigate} onAddNewCompetition={handleAddNew} MOCK_COMPETITIONS={competitions} MOCK_USER={currentUser}/>;
    }
   };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;700&display=swap');
                body { background-color: #ffffff; }
                [dir="rtl"] * { font-family: 'IBM Plex Sans Arabic', sans-serif !important; }
                ::-webkit-scrollbar { width: 8px; }
                ::-webkit-scrollbar-track { background: #e2e8f0; }
                ::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 10px; }
                ::-webkit-scrollbar-thumb:hover { background: #64748b; }
                .animate-fade-in { animation: fadeIn 0.5s ease-in-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
            <div className="flex min-h-screen">
                <Sidebar t={t} navigate={navigate} currentPage={page} onAddNewCompetition={() => setIsModalOpen(true)} />
                <div className="flex-1 flex flex-col">
                    <Header t={t} language={language} setLanguage={setLanguage} user={currentUser} onLogout={handleLogout} />
                    <main className="flex-1 p-6 sm:p-8">
                         <div className="max-w-7xl mx-auto">
                            {renderPage()}
                        </div>
                    </main>
                </div>
                {isModalOpen && <AddCompetitionModal t={t} onClose={() => { setIsModalOpen(false); setEditingCompetition(null); }} onSave={handleSaveCompetition} competitionToEdit={editingCompetition} />}
                      {/* --- بداية التعديل 4: إضافة نافذة النجاح هنا --- */}
                <SuccessModal 
                    isOpen={isSuccessModalOpen}
                    onClose={() => setIsSuccessModalOpen(false)}
                />
                {/* --- نهاية التعديل 4 --- */}
            </div>
        </>
    );
}
                    
