
import React, { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { onAuthChange, logout } from './services/firebase';
import { LandingPage } from './components/LandingPage';
import { InterviewController } from './components/InterviewController';
import { BrainCircuitIcon } from './components/icons';

const AppHeader = ({ user }: { user: User | null }) => {
    return (
        <header className="absolute top-0 left-0 right-0 p-4 z-20">
            <div className="container mx-auto flex justify-between items-center">
                <div className="flex items-center gap-2">
                     <BrainCircuitIcon className="h-8 w-8 text-cyan-400" />
                     <span className="text-xl font-bold text-white">AI Mock Interview Pro</span>
                </div>
                {user && (
                    <div className="flex items-center gap-4">
                       <img src={user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user.displayName}`} alt={user.displayName || 'User'} className="w-10 h-10 rounded-full border-2 border-cyan-500" />
                       <button onClick={logout} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold rounded-lg">
                           Logout
                       </button>
                    </div>
                )}
            </div>
        </header>
    );
}

const App = () => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthChange((user) => {
            setUser(user);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);
    
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                 <BrainCircuitIcon className="w-20 h-20 text-cyan-400 animate-pulse" />
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <div className="absolute inset-0 bg-grid-gray-700/[0.2] [mask-image:linear-gradient(to_bottom,white_5%,transparent_90%)]"></div>
            <AppHeader user={user} />
            <main className="relative z-10 flex items-center justify-center min-h-screen pt-24 pb-10 px-4">
                {user ? <InterviewController user={user} /> : <LandingPage />}
            </main>
        </div>
    );
};

export default App;
