'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Users, User, AlertCircle, CheckCircle } from 'lucide-react';

interface RoleSelectorProps {
  currentUser: any;
  onRoleUpdate?: () => void;
}

const ROLES = {
  admin: {
    name: 'Administrator',
    description: 'Full system access, can manage all organizations and users',
    icon: Shield,
    color: 'destructive'
  },
  manager: {
    name: 'Manager',
    description: 'Can manage team members and organization settings',
    icon: Users,
    color: 'default'
  },
  user: {
    name: 'User',
    description: 'Standard user with access to assigned organizations',
    icon: User,
    color: 'secondary'
  }
};

export function RoleSelector({ currentUser, onRoleUpdate }: RoleSelectorProps) {
  const [selectedRole, setSelectedRole] = useState(currentUser?.role || 'user');
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleRoleUpdate = async () => {
    if (!currentUser?.id || selectedRole === currentUser.role) return;

    setIsUpdating(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('users')
        .update({ role: selectedRole })
        .eq('id', currentUser.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Role updated successfully!' });
      onRoleUpdate?.();
    } catch (error: any) {
      console.error('Role update error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to update role' });
    } finally {
      setIsUpdating(false);
    }
  };

  const currentRole = ROLES[currentUser?.role as keyof typeof ROLES] || ROLES.user;
  const selectedRoleInfo = ROLES[selectedRole as keyof typeof ROLES];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Role Management
        </CardTitle>
        <CardDescription>
          Manage user roles and permissions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && (
          <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
            {message.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertDescription>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {/* Current Role Display */}
        <div className="p-4 border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Current Role</span>
            <Badge variant={currentRole.color as any}>
              {currentRole.name}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {currentRole.description}
          </p>
        </div>

        {/* Role Selector */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Change Role</label>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger>
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ROLES).map(([key, role]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <role.icon className="w-4 h-4" />
                    {role.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedRole !== currentUser?.role && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-start gap-3">
                <selectedRoleInfo.icon className="w-5 h-5 mt-0.5 text-muted-foreground" />
                <div>
                  <h4 className="font-medium text-sm">{selectedRoleInfo.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedRoleInfo.description}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Update Button */}
        <Button
          onClick={handleRoleUpdate}
          disabled={isUpdating || selectedRole === currentUser?.role}
          className="w-full"
        >
          {isUpdating ? 'Updating...' : 'Update Role'}
        </Button>

        {/* Role Information */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium text-sm mb-3">Role Permissions</h4>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <Shield className="w-3 h-3 text-red-500" />
              <span><strong>Admin:</strong> Full system access, manage all organizations</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-3 h-3 text-blue-500" />
              <span><strong>Manager:</strong> Manage team members and organization settings</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-3 h-3 text-gray-500" />
              <span><strong>User:</strong> Standard access to assigned organizations</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
