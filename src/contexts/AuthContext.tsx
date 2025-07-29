import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  userRole: 'admin' | 'client' | 'designer' | 'developer' | 'legalteam' | 'superadmin' | 'manager' | null;
  department: string | null;
  isManager: boolean;
  isSuperadmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  userRole: null,
  department: null,
  isManager: false,
  isSuperadmin: false,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'admin' | 'client' | 'designer' | 'developer' | 'legalteam' | 'superadmin' | 'manager' | null>(null);
  const [department, setDepartment] = useState<string | null>(null);
  const [isManager, setIsManager] = useState(false);
  const [isSuperadmin, setIsSuperadmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);

      if (user) {
        try {
          const docSnap = await getDoc(doc(db, 'users', user.uid));
          if (docSnap.exists()) {
            const userData = docSnap.data();
            const role = userData.role as 'admin' | 'client' | 'designer' | 'developer' | 'legalteam' | 'superadmin' | 'manager';
            
            // Department validation for specific roles
            if (['designer', 'developer', 'legalteam'].includes(role)) {
              if (!userData.department) {
                console.error('Department assignment is missing for user with role:', role);
                setUserRole(null);
                setDepartment(null);
                setIsManager(false);
                setIsSuperadmin(false);
                return;
              }
            }
            
            setUserRole(role);
            setDepartment(userData.department || null);
            setIsManager(userData.isManager || false);
            setIsSuperadmin(userData.isSuperadmin || false);
          } else {
            setUserRole(null);
            setDepartment(null);
            setIsManager(false);
            setIsSuperadmin(false);
          }
        } catch (err) {
          console.error('Error fetching user data:', err);
          setUserRole(null);
          setDepartment(null);
          setIsManager(false);
          setIsSuperadmin(false);
        }
      } else {
        setUserRole(null);
        setDepartment(null);
        setIsManager(false);
        setIsSuperadmin(false);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, userRole, department, isManager, isSuperadmin }}>
      {children}
    </AuthContext.Provider>
  );
};
