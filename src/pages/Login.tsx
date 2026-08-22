
import { useAuth } from '@/auth/authcontext';
import { Button } from '@/components/ui/button';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getEnvVar, isKeycloakCallback, getIdentityProvider } from '@/auth/authUtils';
import logger from '@/lib/logger';

const log = logger.child('Login');

const Login = () => {
    const { login, user, loading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || '/';
    const [isProcessingCallback, setIsProcessingCallback] = useState(false);
    const identityProvider = getIdentityProvider();

    // Check if this is a Keycloak callback on mount
    useEffect(() => {
        const isCallback = isKeycloakCallback();
        log.info('Login component - Is Keycloak callback:', isCallback);
        log.info('Login component - Current URL:', window.location.href);
        
        if (isCallback) {
            log.info('Processing Keycloak callback...');
            setIsProcessingCallback(true);
            // Let AuthContext handle the callback processing
            // Don't redirect or do anything else here
        }
    }, []);

    // Auto-redirect after successful authentication
    useEffect(() => {
        if (!loading && user) {
            log.info('User authenticated, redirecting to:', from);
            navigate(from, { replace: true });
        }
    }, [user, loading, navigate, from]);

    // Don't show login form if using stub provider
    if (identityProvider === 'stub') {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <h2 className="text-xl font-semibold">Development Mode</h2>
                    <p className="text-gray-600">Using stub authentication</p>
                </div>
            </div>
        );
    }

    // Show processing state during callback handling
    if (isProcessingCallback || loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-600">
                        {isProcessingCallback ? 'Processing authentication...' : 'Loading...'}
                    </p>
                </div>
            </div>
        );
    }

    const handleLogin = async () => {
        log.info('Starting login process...');
        await login();
    };

    const handleGoogleLogin = async () => {
        log.info('Google login clicked (not implemented yet)');
        // TODO: Implement Google authentication
    };

    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-6 shadow-lg">
                <div className="text-center">
                    <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
                        Sign in to your account
                    </h2>
                </div>
                <div className="mt-8 space-y-4">
                    <Button
                        onClick={handleLogin}
                        className="w-full"
                    >
                        Sign in with email or username
                    </Button>
                    <Button
                        onClick={handleGoogleLogin}
                        variant="outline"
                        className="w-full"
                    >
                        Sign in with Google
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default Login;
