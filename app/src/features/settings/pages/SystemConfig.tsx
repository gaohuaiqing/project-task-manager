/**
 * 系统配置设置页面
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Database, Bell, FileText, Save } from 'lucide-react';

interface ConfigItem {
  key: string;
  value: string | number | boolean;
  description: string;
  updatedAt: string;
}

// 模拟配置数据
const mockConfigs: Record<string, ConfigItem[]> = {
  general: [
    { key: 'app.name', value: '任务管理系统', description: '应用名称', updatedAt: '2026-03-19' },
    { key: 'app.version', value: '3.0.0', description: '应用版本', updatedAt: '2026-03-19' },
    { key: 'task.default_priority', value: 'medium', description: '默认任务优先级', updatedAt: '2026-03-19' },
  ],
  notification: [
    { key: 'email.enabled', value: 'true', description: '启用邮件通知', updatedAt: '2026-03-19' },
    { key: 'email.smtp_host', value: 'smtp.example.com', description: 'SMTP服务器', updatedAt: '2026-03-19' },
    { key: 'email.smtp_port', value: '587', description: 'SMTP端口', updatedAt: '2026-03-19' },
  ],
  security: [
    { key: 'auth.session_timeout', value: '86400', description: '会话超时时间(秒)', updatedAt: '2026-03-19' },
    { key: 'auth.max_login_attempts', value: '5', description: '最大登录尝试次数', updatedAt: '2026-03-19' },
  ],
};

export function SystemConfigSettings() {
  const [configs, setConfigs] = useState(mockConfigs);
  const [activeTab, setActiveTab] = useState('general');

  const handleSave = () => {
    console.log('Save configs:', configs);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                系统配置
              </CardTitle>
              <CardDescription>
                管理系统运行参数和              </CardDescription>
            </div>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              保存配置
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="general">
                <Database className="h-4 w-4 mr-2" />
                常规设置
              </TabsTrigger>
              <TabsTrigger value="notification">
                <Bell className="h-4 w-4 mr-2" />
                通知设置
              </TabsTrigger>
              <TabsTrigger value="security">
                <Settings className="h-4 w-4 mr-2" />
                安全设置
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <div className="space-y-4 px-6 py-4">
                {configs.general.map((config) => (
                  <div key={config.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={config.key}>{config.description}</Label>
                      <Badge variant="outline" className="text-xs">
                        {config.key}
                      </Badge>
                    </div>
                    <Input
                      id={config.key}
                      value={String(config.value)}
                      onChange={(e) => {
                        setConfigs((prev) => ({
                          ...prev,
                          general: prev.general.map((c) =>
                            c.key === config.key
                              ? { ...c, value: e.target.value }
                              : c
                          ),
                        }));
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      最后更新: {config.updatedAt}
                    </p>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="notification">
              <div className="space-y-4 px-6 py-4">
                {configs.notification.map((config) => (
                  <div key={config.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={config.key}>{config.description}</Label>
                      <Badge variant="outline" className="text-xs">
                        {config.key}
                      </Badge>
                    </div>
                    <Input
                      id={config.key}
                      value={String(config.value)}
                      onChange={(e) => {
                        setConfigs((prev) => ({
                          ...prev,
                          notification: prev.notification.map((c) =>
                            c.key === config.key
                              ? { ...c, value: e.target.value }
                              : c
                          ),
                        }));
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      最后更新: {config.updatedAt}
                    </p>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="security">
              <div className="space-y-4 px-6 py-4">
                {configs.security.map((config) => (
                  <div key={config.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={config.key}>{config.description}</Label>
                      <Badge variant="outline" className="text-xs">
                        {config.key}
                      </Badge>
                    </div>
                    <Input
                      id={config.key}
                      type="number"
                      value={String(config.value)}
                      onChange={(e) => {
                        setConfigs((prev) => ({
                          ...prev,
                          security: prev.security.map((c) =>
                            c.key === config.key
                              ? { ...c, value: Number(e.target.value) }
                              : c
                          ),
                        }));
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      最后更新: {config.updatedAt}
                    </p>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 系统信息 */}
      <Card>
        <CardHeader>
          <CardTitle>系统信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">前端版本</p>
              <p className="font-medium">3.0.0</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">API 版本</p>
              <p className="font-medium">v1</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">数据库</p>
              <p className="font-medium">MySQL 8.0</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">缓存</p>
              <p className="font-medium">Redis 7.0</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
