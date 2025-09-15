import React from 'react';
import { Building } from 'lucide-react';

const Login = ({ onLogin, t }) => (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 space-y-6">
            <div className="text-center">
                <Building className="mx-auto h-12 w-12 text-teal-600" />
                <h2 className="mt-4 text-3xl font-bold text-gray-900">{t('loginTitle')}</h2>
                <p className="mt-2 text-sm text-gray-600">{t('loginSubtitle')}</p>
            </div>
            <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); onLogin(); }}>
                <div>
                    <label htmlFor="email">{t('emailLabel')}</label>
                    <div className="mt-1"><input id="email" type="email" required defaultValue="contact@innovate.sa" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500" /></div>
                </div>
                <div>
                    <label htmlFor="password">{t('passwordLabel')}</label>
                    <div className="mt-1"><input id="password" type="password" required defaultValue="************" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500" /></div>
                </div>
                <div><button type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors">{t('loginButton')}</button></div>
            </form>
        </div>
    </div>
);

export default Login;