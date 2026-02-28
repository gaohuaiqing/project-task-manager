import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Lock, 
  AlertCircle,
  Users,
  Briefcase,
  Code,
  ShieldCheck,
  Settings,
  IdCard,
  ArrowLeft,
  Eye,
  EyeOff
} from 'lucide-react';
import { ROLE_CONFIG } from '@/types/auth';

type LoginMode = 'user' | 'admin';

export function LoginPage() {
  const { login, adminLogin } = useAuth();
  const [loginMode, setLoginMode] = useState<LoginMode>('user');
  
  // 登录表单状态
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // 密码可见性状态
  const [showPassword, setShowPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // 消息状态
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[LoginPage] 开始登录流程, username:', username);
    setError('');
    setIsLoading(true);

    try {
      console.log('[LoginPage] 调用 login 函数...');
      const success = await login(username, password);
      console.log('[LoginPage] login 返回结果:', success);
      if (!success) {
        setError('工号或密码错误');
      }
    } catch (err) {
      console.error('[LoginPage] 登录异常:', err);
      setError('登录失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await adminLogin(username, password);
      if (!success) {
        setError('管理员账号或密码错误');
      }
    } catch {
      setError('登录失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo和标题 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-4">
            {loginMode === 'admin' ? (
              <ShieldCheck className="w-8 h-8 text-white" />
            ) : (
              <Shield className="w-8 h-8 text-white" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            技术团队管理智能平台
          </h1>

        </div>

        {/* 登录卡片 */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl text-white text-center">
              {loginMode === 'admin' 
                ? '管理员登录' 
                : '用户登录'}
            </CardTitle>
            <CardDescription className="text-slate-400 text-center">
              {loginMode === 'admin'
                ? '请输入管理员账号和密码'
                : '输入您的工号和密码'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="bg-red-900/50 border-red-700">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {loginMode === 'admin' ? (
              // 管理员登录表单
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="adminUsername" className="text-slate-300">
                    <ShieldCheck className="w-4 h-4 inline mr-1" />
                    管理员账号
                  </Label>
                  <Input
                    id="adminUsername"
                    type="text"
                    placeholder="请输入管理员账号"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminPassword" className="text-slate-300">
                    <Lock className="w-4 h-4 inline mr-1" />
                    密码
                  </Label>
                  <div className="relative">
                    <Input
                      id="adminPassword"
                      type={showAdminPassword ? 'text' : 'password'}
                      placeholder="请输入密码"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 pr-10"
                      required
                      aria-label="管理员密码"
                      aria-describedby="adminPasswordToggle"
                    />
                    <button
                      type="button"
                      id="adminPasswordToggle"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded p-1 transition-colors"
                      aria-label={showAdminPassword ? '隐藏密码' : '显示密码'}
                      aria-pressed={showAdminPassword}
                    >
                      {showAdminPassword ? (
                        <EyeOff className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Eye className="w-4 h-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? '登录中...' : '管理员登录'}
                </Button>

                <div className="pt-2 border-t border-slate-700">
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-slate-400 hover:text-white"
                    onClick={() => {
                      setLoginMode('user');
                      resetForm();
                    }}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    返回用户登录
                  </Button>
                </div>

                <Alert className="bg-blue-900/20 border-blue-700/50">
                  <Settings className="h-4 w-4 text-blue-400" />
                  <AlertDescription className="text-blue-200 text-sm">
                    管理员登录后可以管理所有用户的权限和账户信息
                  </AlertDescription>
                </Alert>
              </form>
            ) : (
              // 普通用户登录表单
              <>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-slate-300">
                      <IdCard className="w-4 h-4 inline mr-1" />
                      工号
                    </Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="请输入工号"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-slate-300">
                      <Lock className="w-4 h-4 inline mr-1" />
                      密码
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="请输入密码"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 pr-10"
                        required
                        aria-label="密码"
                        aria-describedby="passwordToggle"
                      />
                      <button
                        type="button"
                        id="passwordToggle"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded p-1 transition-colors"
                        aria-label={showPassword ? '隐藏密码' : '显示密码'}
                        aria-pressed={showPassword}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" aria-hidden="true" />
                        ) : (
                          <Eye className="w-4 h-4" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                    disabled={isLoading}
                  >
                    {isLoading ? '登录中...' : '登录'}
                  </Button>
                </form>

                {/* 管理员登录按钮 */}
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-amber-600/50 text-amber-400 hover:text-amber-300 hover:bg-amber-900/30"
                    onClick={() => {
                      setLoginMode('admin');
                      resetForm();
                    }}
                  >
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    管理员登录
                  </Button>
                </div>

              </>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
