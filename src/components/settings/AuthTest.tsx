
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const AuthTest: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testAuth = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    
    try {
      // First, get the current session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData.session) {
        setError('No active session available');
        return;
      }
      
      const accessToken = sessionData.session.access_token;
      
      // Log details about the token
      console.log('Access token available:', !!accessToken);
      console.log('Access token length:', accessToken.length);
      console.log('First 20 chars of token:', accessToken.substring(0, 20) + '...');

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
        {result && (
          <div className="p-3 bg-muted rounded-md mb-4">
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
