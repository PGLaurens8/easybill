'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Mail, Shield, Bell, Palette, Lock } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Mock settings state
  const [notifications, setNotifications] = useState({
    emailSummary: true,
    pushProjectUpdates: false,
  });
  const [darkMode, setDarkMode] = useState(false); // Example theme setting

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    // Placeholder for actual update logic (e.g., calling Firebase updateProfile)
    try {
      // await updateProfile(user, { displayName }); // Example
      toast({
        title: "Profile Updated",
        description: "Your display name has been updated.",
      });
    } catch (error) {
      toast({
        title: "Error Updating Profile",
        description: "Could not update your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const getInitials = (name?: string | null) => {
    if (!name) return 'QE';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (authLoading) {
    return <div className="text-center p-10">Loading settings...</div>;
  }

  if (!user) {
    return <div className="text-center p-10">Please log in to view settings.</div>;
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-headline">Account Settings</h1>
        <p className="text-muted-foreground">Manage your profile, preferences, and security settings.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><User className="mr-2 h-5 w-5 text-primary" /> Profile Information</CardTitle>
          <CardDescription>Update your personal details.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-6">
            <div className="flex items-center space-x-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user.photoURL || undefined} alt={displayName || 'User'} />
                <AvatarFallback className="text-2xl">{getInitials(displayName || email)}</AvatarFallback>
              </Avatar>
              <Button variant="outline" size="sm" type="button">Change Photo</Button> {/* Placeholder */}
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="displayName">Display Name</Label>
                <Input 
                  id="displayName" 
                  value={displayName} 
                  onChange={(e) => setDisplayName(e.target.value)} 
                  placeholder="Your Name"
                />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email} 
                  disabled 
                  className="bg-muted/50"
                />
                 <p className="text-xs text-muted-foreground mt-1">Email cannot be changed here.</p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Profile Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><Lock className="mr-2 h-5 w-5 text-primary" /> Security</CardTitle>
          <CardDescription>Manage your account security settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div>
              <Button variant="outline">Change Password</Button> {/* Placeholder */}
               <p className="text-xs text-muted-foreground mt-1">Regularly update your password to keep your account secure.</p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Two-Factor Authentication (2FA)</h4>
              <p className="text-sm text-muted-foreground mb-2">Enhance your account security by enabling 2FA.</p>
              <Button variant="outline" disabled>Enable 2FA (Coming Soon)</Button>
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><Bell className="mr-2 h-5 w-5 text-primary" /> Notifications</CardTitle>
          <CardDescription>Control how you receive notifications from QuantEasy.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-md">
            <div>
              <Label htmlFor="emailSummary" className="font-medium">Email Summaries</Label>
              <p className="text-sm text-muted-foreground">Receive daily/weekly summaries of project activity.</p>
            </div>
            <Switch 
              id="emailSummary" 
              checked={notifications.emailSummary} 
              onCheckedChange={(checked) => setNotifications(prev => ({...prev, emailSummary: checked}))} 
            />
          </div>
          <div className="flex items-center justify-between p-3 border rounded-md">
            <div>
              <Label htmlFor="projectUpdates" className="font-medium">Project Updates Push Notifications</Label>
              <p className="text-sm text-muted-foreground">Get real-time updates for important project events.</p>
            </div>
             <Switch 
              id="projectUpdates" 
              checked={notifications.pushProjectUpdates} 
              onCheckedChange={(checked) => setNotifications(prev => ({...prev, pushProjectUpdates: checked}))} 
            />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><Palette className="mr-2 h-5 w-5 text-primary" /> Theme Preferences</CardTitle>
          <CardDescription>Customize the look and feel of the application.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="flex items-center justify-between p-3 border rounded-md">
            <div>
              <Label htmlFor="darkMode" className="font-medium">Dark Mode</Label>
              <p className="text-sm text-muted-foreground">Toggle between light and dark themes.</p>
            </div>
             <Switch 
              id="darkMode" 
              checked={darkMode} 
              onCheckedChange={(checked) => {
                setDarkMode(checked);
                // Placeholder for theme toggle logic (e.g., using next-themes or manually adding/removing 'dark' class from html)
                document.documentElement.classList.toggle('dark', checked);
              }}
            />
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
