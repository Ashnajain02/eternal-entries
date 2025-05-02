
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const AuthTest: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [requestInfo, setRequestInfo] = useState<any>(null);

  const testAuth = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setTokenInfo(null);
    setRequestInfo(null);
    
    try {
      // First, get the current session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData.session) {
        setError('No active session available');
        return;
      }
      
      const accessToken = sessionData.session.access_token;
      const userId = sessionData.session.user.id;
      
      // Log details about the token
      console.log('Access token available:', !!accessToken);
      console.log('Access token length:', accessToken.length);
      console.log('First 20 chars of token:', accessToken.substring(0, 20) + '...');
      console.log('User ID:', userId);
      
      // Display token info in the UI for diagnostics
      setTokenInfo({
        tokenLength: accessToken.length,
        tokenPrefix: accessToken.substring(0, 20) + '...',
        tokenSuffix: '...' + accessToken.substring(accessToken.length - 20),
        userId: sessionData.session.user.id,
        email: sessionData.session.user.email
      });

      // Store request information
      setRequestInfo({
        endpoint: 'auth-test',
        userId: userId,
        tokenLength: accessToken.length,
        headers: {
          Authorization: `Bearer ${accessToken.substring(0, 10)}...`
        }
      });

      // Call the auth-test function
      const { data, error } = await supabase.functions.invoke('auth-test', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (error) {
        console.error('Auth test error:', error);
        setError(`Error: ${error.message || 'Unknown error'}`);
        return;
      }

      setResult(data);
    } catch (err: any) {
      console.error('Exception in auth test:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="my-4">
      <CardHeader>
        <CardTitle className="text-md">Auth Test</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Tests if authentication token is properly passed to and validated by edge functions
        </p>
        {error && (
          <div className="p-3 bg-destructive/10 text-destructive rounded-md mb-4 text-sm">
            {error}
          </div>
        )}
        {requestInfo && (
          <div className="p-3 bg-muted rounded-md mb-4 text-xs">
            <h4 className="font-medium mb-2">Request Information:</h4>
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(requestInfo, null, 2)}
            </pre>
          </div>
        )}
        {tokenInfo && (
          <div className="p-3 bg-muted rounded-md mb-4 text-xs">
            <h4 className="font-medium mb-2">Token Information:</h4>
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(tokenInfo, null, 2)}
            </pre>
          </div>
        )}
        {result && (
          <div className="p-3 bg-muted rounded-md mb-4">
            <h4 className="font-medium mb-2">Auth Test Result:</h4>
            <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={testAuth} 
          disabled={isLoading}
          size="sm"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Testing...
            </>
          ) : (
            'Test Authentication'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AuthTest;
