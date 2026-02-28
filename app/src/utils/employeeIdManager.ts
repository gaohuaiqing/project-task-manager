// 工号管理工具
// 工号作为员工登录系统的唯一账户名

// 生成随机初始密码
export const generateInitialPassword = (): string => {
  const length = 12;
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  
  let password = '';
  // 确保包含至少一个大写字母、一个小写字母、一个数字和一个特殊字符
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // 填充剩余长度
  const allChars = uppercase + lowercase + numbers + special;
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // 打乱密码字符顺序
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

// 验证工号格式（只允许字母、数字和下划线）
export const validateEmployeeId = (employeeId: string): { valid: boolean; message: string } => {
  if (!employeeId || employeeId.trim() === '') {
    return { valid: false, message: '工号不能为空' };
  }
  
  const trimmed = employeeId.trim();
  
  if (trimmed.length < 3) {
    return { valid: false, message: '工号长度至少为3个字符' };
  }
  
  if (trimmed.length > 20) {
    return { valid: false, message: '工号长度不能超过20个字符' };
  }
  
  // 只允许字母、数字和下划线
  const validPattern = /^[a-zA-Z0-9_]+$/;
  if (!validPattern.test(trimmed)) {
    return { valid: false, message: '工号只能包含字母、数字和下划线' };
  }
  
  // 必须以字母开头
  const startWithLetter = /^[a-zA-Z]/;
  if (!startWithLetter.test(trimmed)) {
    return { valid: false, message: '工号必须以字母开头' };
  }
  
  return { valid: true, message: '' };
};

// 检查工号是否已存在
export const isEmployeeIdExists = (employeeId: string): boolean => {
  const usersJson = localStorage.getItem('app_users');
  if (!usersJson) return false;
  
  const users = JSON.parse(usersJson);
  // 检查工号是否已被使用（作为username或employeeId）
  return Object.values(users).some((user: any) => 
    user.username === employeeId || user.employeeId === employeeId
  );
};

// 生成唯一工号
export const generateUniqueEmployeeId = (name: string): string => {
  // 使用姓名拼音首字母 + 随机数字
  const pinyin = name.toLowerCase().replace(/[^a-z]/g, '');
  const prefix = pinyin.slice(0, 3) || 'emp';
  
  let employeeId = '';
  let counter = 1;
  
  do {
    const randomSuffix = Math.floor(Math.random() * 900) + 100; // 100-999
    employeeId = `${prefix}_${randomSuffix}`;
    counter++;
  } while (isEmployeeIdExists(employeeId) && counter < 1000);
  
  // 如果无法生成唯一工号，使用时间戳
  if (isEmployeeIdExists(employeeId)) {
    employeeId = `${prefix}_${Date.now().toString().slice(-6)}`;
  }
  
  return employeeId;
};

// 创建新员工账户
export interface NewEmployeeAccount {
  employeeId: string;
  initialPassword: string;
  name: string;
  email: string;
  role: string;
}

export const createEmployeeAccount = (
  name: string,
  email: string,
  role: string,
  customEmployeeId?: string
): { success: boolean; message: string; account?: NewEmployeeAccount } => {
  // 验证姓名
  if (!name || name.trim() === '') {
    return { success: false, message: '姓名不能为空' };
  }
  
  // 生成或验证工号
  const employeeId = customEmployeeId?.trim() || generateUniqueEmployeeId(name);
  
  const validation = validateEmployeeId(employeeId);
  if (!validation.valid) {
    return { success: false, message: validation.message };
  }
  
  // 检查工号是否已存在
  if (isEmployeeIdExists(employeeId)) {
    return { success: false, message: '该工号已被使用' };
  }
  
  // 生成初始密码
  const initialPassword = generateInitialPassword();
  
  const account: NewEmployeeAccount = {
    employeeId,
    initialPassword,
    name: name.trim(),
    email: email?.trim() || `${employeeId}@company.com`,
    role,
  };
  
  return { success: true, message: '账户创建成功', account };
};

// 安全交付密码（模拟发送邮件或显示一次性）
export const deliverPasswordSecurely = (
  employeeId: string,
  password: string
): { method: string; content: string } => {
  // 在实际应用中，这里应该发送邮件或短信
  // 现在返回一个模拟的安全交付信息
  return {
    method: 'secure_display',
    content: `初始密码：${password}\n\n请妥善保管，首次登录后请立即修改密码。`,
  };
};

// 保存员工账户到系统
export const saveEmployeeAccount = (account: NewEmployeeAccount): { success: boolean; message: string } => {
  try {
    const usersJson = localStorage.getItem('app_users') || '{}';
    const users = JSON.parse(usersJson);
    
    // 创建新用户
    users[account.employeeId] = {
      id: account.employeeId,
      username: account.employeeId,
      name: account.name,
      email: account.email,
      role: account.role,
      employeeId: account.employeeId,
      createdAt: Date.now(),
      password: account.initialPassword, // 实际应用中应该加密存储
    };
    
    localStorage.setItem('app_users', JSON.stringify(users));
    
    return { success: true, message: '员工账户保存成功' };
  } catch (error) {
    return { success: false, message: '保存员工账户失败' };
  }
};
