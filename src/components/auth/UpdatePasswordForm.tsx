
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const updatePasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type UpdatePasswordValues = z.infer<typeof updatePasswordSchema>;

interface UpdatePasswordFormProps {
  onBackToSignIn: () => void;
}

export const UpdatePasswordForm: React.FC<UpdatePasswordFormProps> = ({ onBackToSignIn }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const { updatePassword } = useAuth();

  const form = useForm<UpdatePasswordValues>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const handleUpdatePassword = async (values: UpdatePasswordValues) => {
    setIsLoading(true);
    try {
      await updatePassword(values.password);
      setUpdateSuccess(true);
      form.reset();
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        onBackToSignIn();
      }, 3000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
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
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleUpdatePassword)} className="space-y-4">
          <FormField
            control={form.control}
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
            control={form.control}
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
            onClick={onBackToSignIn}
            disabled={isLoading}
          >
            Back to Sign In
          </Button>
        </form>
      </Form>
    </>
  );
};
