import React from 'react';

// حالياً هذا المكون بسيط، لكنه جاهز للتوسع في المستقبل
const CompanyProfile = ({ t }) => {
    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-bold">{t('companyProfile')}</h2>
            <div className="bg-white p-8 rounded-xl border border-slate-200">
                <p className="text-slate-600">سيتم بناء محتوى صفحة ملف الشركة هنا.</p>
            </div>
        </div>
    );
};

export default CompanyProfile;