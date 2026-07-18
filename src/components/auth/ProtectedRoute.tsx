import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/authcontext';
import { getIdentityProvider } from '@/auth/authUtils';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { user, loading } = useAuth();
    const location = useLocation();
    const identityProvider = getIdentityProvider();

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-600">Initializing authentication...</p>
                </div>
            </div>
        );
    }

    // Allow access if using stub provider or user is authenticated
    const hasAccess = user && (identityProvider === 'stub' || user.sub || user.preferred_username);

    if (!hasAccess) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};
