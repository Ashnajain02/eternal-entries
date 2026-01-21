
import React, { useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import { IntegrationsSettings } from '@/components/settings/IntegrationsSettings';
import { AccountSettings } from '@/components/settings/AccountSettings';
import { TemperatureSettings } from '@/components/settings/TemperatureSettings';
import { BlurSettings } from '@/components/settings/BlurSettings';
import { useSearchParams } from 'react-router-dom';

const Settings = () => {
  const { authState } = useAuth();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = React.useState('integrations');

  // Set active tab based on URL param if available
  useEffect(() => {
    if (tabParam && ['integrations', 'account', 'display'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  if (!authState.user) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto text-center py-16">
          <h1 className="text-3xl font-bold mb-4">Settings</h1>
          <p className="mb-6">Please sign in to access your settings.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-4xl py-8">
        <h1 className="text-3xl font-bold mb-6">Settings</h1>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="display">Display</TabsTrigger>
          </TabsList>
          
          <TabsContent value="integrations">
            <IntegrationsSettings />
          </TabsContent>
          
          <TabsContent value="account">
            <AccountSettings user={authState.user} />
          </TabsContent>
          
          <TabsContent value="display">
            <div className="space-y-6">
              <TemperatureSettings />
              <BlurSettings />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Settings;
