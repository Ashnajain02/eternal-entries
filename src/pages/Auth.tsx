import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Layout from '@/components/Layout';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Validation schemas
const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signUpSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const resetPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const updatePasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignInValues = z.infer<typeof signInSchema>;
type SignUpValues = z.infer<typeof signUpSchema>;
type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
type UpdatePasswordValues = z.infer<typeof updatePasswordSchema>;

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('signin');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [tokenError, setTokenError] = useState(false);
  const [showUpdateTab, setShowUpdateTab] = useState(false);
  const { authState, signIn, signUp, resetPassword, updatePassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  
  // Form hooks
  const signInForm = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const signUpForm = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const resetPasswordForm = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const updatePasswordForm = useForm<UpdatePasswordValues>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (authState.user && !authState.loading) {
      navigate('/');
    }
  }, [authState.user, authState.loading, navigate]);

  // Check URL parameters and hash on component mount
  useEffect(() => {
    // First handle hash parameters from recovery links
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');
    
    if (accessToken && type === 'recovery') {
      // We have a recovery token in the URL, show the update password tab
      setActiveTab('update-password');
      setShowUpdateTab(true);
      
      // Remove the hash from the URL to avoid exposing the token
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Then check URL query parameters
    const tab = searchParams.get('tab');
    const error = searchParams.get('error');
    const errorCode = searchParams.get('error_code');
    
    if (error && (errorCode === 'otp_expired' || error === 'access_denied')) {
      setTokenError(true);
      setActiveTab('reset');
    } else if (tab === 'update-password') {
      setActiveTab('update-password');
      setShowUpdateTab(true);
    } else if (tab === 'reset-success') {
      setResetSuccess(true);
      setActiveTab('signin');
    }
  }, [searchParams]);

  const handleSignIn = async (values: SignInValues) => {
    setIsLoading(true);
    try {
      await signIn(values.email, values.password);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (values: SignUpValues) => {
    setIsLoading(true);
    try {
      await signUp(values.email, values.password, {
        first_name: values.firstName,
        last_name: values.lastName,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (values: ResetPasswordValues) => {
    setIsLoading(true);
    try {
      await resetPassword(values.email);
      setResetSuccess(true);
      resetPasswordForm.reset();
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (values: UpdatePasswordValues) => {
    setIsLoading(true);
    try {
      await updatePassword(values.password);
      setUpdateSuccess(true);
      updatePasswordForm.reset();
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        setActiveTab('signin');
      }, 3000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto flex flex-col items-center justify-center max-w-md py-8">
        <h1 className="text-3xl font-bold mb-8">Welcome to Eternal Entries</h1>
        
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-center">Account Access</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs 
              value={activeTab} 
              onValueChange={setActiveTab} 
              defaultValue="signin"
            >
              <TabsList className={`grid w-full ${showUpdateTab ? 'grid-cols-4' : 'grid-cols-3'} mb-6`}>
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
                <TabsTrigger value="reset">Reset</TabsTrigger>
                {showUpdateTab && <TabsTrigger value="update-password">Update</TabsTrigger>}
              </TabsList>
              
              {resetSuccess && (
                <Alert className="mb-4 bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">
                    Password reset email sent! Check your inbox for a link to reset your password.
                  </AlertDescription>
                </Alert>
              )}
              
              {tokenError && (
                <Alert className="mb-4 bg-amber-50 border-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-700">
                    Your password reset link has expired. Please request a new one.
                  </AlertDescription>
                </Alert>
              )}
              
              <TabsContent value="signin">
                <Form {...signInForm}>
                  <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
                    <FormField
                      control={signInForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={signInForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex flex-col gap-2">
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={isLoading}
                      >
                        {isLoading ? "Signing in..." : "Sign In"}
                      </Button>
                      
                      <Button
                        type="button"
                        variant="link"
                        className="text-sm text-blue-500 hover:text-blue-700"
                        onClick={() => setActiveTab('reset')}
                      >
                        Forgot password?
                      </Button>
                    </div>
                  </form>
                </Form>
              </TabsContent>
              
              <TabsContent value="signup">
                <Form {...signUpForm}>
                  <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={signUpForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="First Name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={signUpForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Last Name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={signUpForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={signUpForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={signUpForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Confirm Password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isLoading}
                    >
                      {isLoading ? "Signing up..." : "Sign Up"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
              
              <TabsContent value="reset">
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-yellow-700">
                    Enter your email address and we'll send you a link to reset your password.
                  </p>
                </div>
                
                <Form {...resetPasswordForm}>
                  <form onSubmit={resetPasswordForm.handleSubmit(handleResetPassword)} className="space-y-4">
                    <FormField
                      control={resetPasswordForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Your email address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isLoading}
                    >
                      {isLoading ? "Sending..." : "Send Reset Link"}
                    </Button>
                    
                    <Button
                      type="button"
                      variant="link"
                      className="w-full text-sm"
                      onClick={() => setActiveTab('signin')}
                    >
                      Back to Sign In
                    </Button>
                  </form>
                </Form>
              </TabsContent>
              
              <TabsContent value="update-password">
                {updateSuccess ? (
                  <Alert className="mb-4 bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-700">
                      Your password has been updated successfully! You will be redirected to sign in.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-700">
                      Enter your new password below.
                    </p>
                  </div>
                )}
                
                <Form {...updatePasswordForm}>
                  <form onSubmit={updatePasswordForm.handleSubmit(handleUpdatePassword)} className="space-y-4">
                    <FormField
                      control={updatePasswordForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="New password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={updatePasswordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Confirm new password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isLoading || updateSuccess}
                    >
                      {isLoading ? "Updating..." : "Update Password"}
                    </Button>
                    
                    <Button
                      type="button"
                      variant="link"
                      className="w-full text-sm"
                      onClick={() => setActiveTab('signin')}
                      disabled={isLoading}
                    >
                      Back to Sign In
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex flex-col text-sm text-center text-muted-foreground">
            <p>Your secure place to journal, track mood, weather, and music</p>
          </CardFooter>
        </Card>
      </div>
    </Layout>
  );
};

export default Auth;
