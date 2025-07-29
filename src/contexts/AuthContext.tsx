import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  userRole: 'admin' | 'client' | 'designer' | 'developer' | 'legalteam' | null;
  role: 'developer' | 'designer' | 'legalteam' | null;
  department: 'development' | 'designing' | 'legal' | null;
  isManager: boolean;
  isSuperadmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  userRole: null,
  role: null,
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
  const [userRole, setUserRole] = useState<'admin' | 'client' | 'designer' | 'developer' | 'legalteam' | null>(null);
  const [role, setRole] = useState<'developer' | 'designer' | 'legalteam' | null>(null);
  const [department, setDepartment] = useState<'development' | 'designing' | 'legal' | null>(null);
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
            const userRole = userData.role as 'developer' | 'designer' | 'legalteam';
            
            // Set new role structure
            setRole(userRole);
            setDepartment(userData.department as 'development' | 'designing' | 'legal');
            setIsManager(userData.isManager || false);
            setIsSuperadmin(userData.isSuperadmin || false);
            
            // Maintain backward compatibility for userRole
            setUserRole(userRole);
          } else {
            setUserRole(null);
            setRole(null);
            setDepartment(null);
            setIsManager(false);
            setIsSuperadmin(false);
          }
        } catch (err) {
          console.error('Error fetching user role:', err);
          setUserRole(null);
          setRole(null);
          setDepartment(null);
          setIsManager(false);
          setIsSuperadmin(false);
        }
      } else {
        setUserRole(null);
        setRole(null);
        setDepartment(null);
        setIsManager(false);
        setIsSuperadmin(false);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      userRole, 
      role, 
      department, 
      isManager, 
      isSuperadmin 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
