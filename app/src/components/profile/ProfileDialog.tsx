import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User,
  IdCard,
  Shield,
  Lock,
  Check,
  AlertCircle,
  Save
} from 'lucide-react';
import { ROLE_CONFIG } from '@/types/auth';
import { cn } from '@/lib/utils';

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
  const { user, changePassword } = useAuth();

  // 修改密码状态
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 消息状态
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 获取角色颜色
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'text-amber-400';
      case 'tech_manager':
        return 'text-blue-400';
      case 'dept_manager':
        return 'text-purple-400';
      case 'engineer':
        return 'text-green-400';
      default:
        return 'text-slate-400';
    }
  };

  const getRoleBgColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-amber-500/20 border-amber-500/30';
      case 'tech_manager':
        return 'bg-blue-500/20 border-blue-500/30';
      case 'dept_manager':
        return 'bg-purple-500/20 border-purple-500/30';
      case 'engineer':
        return 'bg-green-500/20 border-green-500/30';
      default:
        return 'bg-slate-500/20 border-slate-500/30';
    }
  };

  // 处理修改密码
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // 验证
    if (newPassword.length < 6) {
      setError('新密码至少需要6个字符');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致');
      return;
    }

    setIsLoading(true);

    try {
      const result = await changePassword(oldPassword, newPassword);
      if (result) {
        setSuccess('密码修改成功');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('原密码错误');
      }
    } catch {
      setError('密码修改失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <User className="w-5 h-5" />
            个人资料
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-muted">
            <TabsTrigger
              value="info"
              className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground text-foreground"
            >
              基本信息
            </TabsTrigger>
            <TabsTrigger
              value="password"
              className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground text-foreground"
            >
              修改密码
            </TabsTrigger>
          </TabsList>

          {/* 基本信息标签页 */}
          <TabsContent value="info" className="space-y-4 mt-4">
            {/* 头像和基本信息 */}
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-24 w-24 ring-4 ring-border">
                <AvatarImage
                  src={`https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20avatar%20portrait%20of%20a%20tech%20person%2C%20minimalist%2C%20flat%20design%2C%20blue%20background&image_size=square`}
                  className="bg-muted"
                />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-primary-foreground text-2xl">
                  {user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>

              <div className="text-center">
                <h3 className="text-xl font-semibold text-foreground">{user.name}</h3>
                <Badge
                  variant="secondary"
                  className={cn("mt-2 border", getRoleBgColor(user.role), getRoleColor(user.role))}
                >
                  <Shield className="w-3 h-3 mr-1" />
                  {ROLE_CONFIG[user.role].label}
                </Badge>
              </div>
            </div>

            {/* 详细信息 */}
            <div className="space-y-3 p-4 rounded-lg bg-secondary/30 border border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">姓名</p>
                  <p className="text-sm text-foreground font-medium">{user.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <IdCard className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">工号</p>
                  <p className="text-sm text-foreground font-mono">{user.username}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">角色</p>
                  <p className="text-sm text-foreground">{ROLE_CONFIG[user.role].label}</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              如需修改个人信息，请联系管理员
            </p>
          </TabsContent>

          {/* 修改密码标签页 */}
          <TabsContent value="password" className="space-y-4 mt-4">
            {error && (
              <Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="bg-green-500/10 border-green-500/20">
                <Check className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-foreground">{success}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground flex items-center gap-1">
                  <Lock className="w-4 h-4" />
                  原密码
                </Label>
                <Input
                  type="password"
                  placeholder="请输入原密码"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="bg-background border-input text-foreground"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-foreground flex items-center gap-1">
                  <Lock className="w-4 h-4" />
                  新密码
                </Label>
                <Input
                  type="password"
                  placeholder="请输入新密码（至少6位）"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-background border-input text-foreground"
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-foreground flex items-center gap-1">
                  <Lock className="w-4 h-4" />
                  确认新密码
                </Label>
                <Input
                  type="password"
                  placeholder="请再次输入新密码"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-background border-input text-foreground"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={isLoading || !oldPassword || !newPassword || !confirmPassword}
              >
                <Save className="w-4 h-4 mr-2" />
                {isLoading ? '修改中...' : '修改密码'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
