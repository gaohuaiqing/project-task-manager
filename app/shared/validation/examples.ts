/**
 * Zod验证使用示例
 *
 * 展示如何在前后端使用zod进行运行时类型验证
 */

import {
  validateProject,
  safeValidateProject,
  validateWbsTask,
  validateUser,
  validateEntityId,
  validatePaginationParams,
  createValidationMiddleware,
  createFormValidator,
  ValidationError,
  toEntityId,
  toDbDate,
  dateToDbDate,
} from './index.js';

/**
 * ========================================
 * 后端使用示例
 * ========================================
 */

/**
 * 示例1：在路由中使用验证中间件
 */
export function setupValidatedRoutes(app: any) {
  // 创建项目验证中间件
  const validateProjectBody = createValidationMiddleware(
    // 可以使用从schemas.ts导入的schema
    require('./schemas.js').ProjectSchema,
    'body'
  );

  // POST /api/projects - 创建项目
  app.post('/api/projects', validateProjectBody, async (req: any, res: any) => {
    // req.body 已经被验证和转换
    const project = req.body;

    // project 的类型是 Project，类型安全
    console.log('创建项目:', project.code, project.name);

    // 调用服务层创建项目
    // const created = await projectService.create(project);

    res.json({
      success: true,
      data: project,
    });
  });

  // PUT /api/projects/:id - 更新项目
  app.put('/api/projects/:id', validateProjectBody, async (req: any, res: any) => {
    const { id } = req.params;
    const project = req.body;

    // 验证ID
    const projectId = validateEntityId(id);

    // 调用服务层更新项目
    // const updated = await projectService.update(projectId, project);

    res.json({
      success: true,
      data: { ...project, id: projectId },
    });
  });

  // GET /api/projects - 查询项目（带分页）
  app.get('/api/projects', async (req: any, res: any) => {
    // 验证分页参数
    const pagination = validatePaginationParams(req.query);

    // 调用服务层查询
    // const result = await projectService.findPaginated(pagination);

    res.json({
      success: true,
      data: [],
      pagination,
    });
  });
}

/**
 * 示例2：在服务层使用验证
 */
export class ProjectServiceWithValidation {
  async createProject(rawData: unknown) {
    // 验证输入数据
    const project = validateProject(rawData);

    // 检查业务规则
    if (project.status === 'completed' && project.progress < 100) {
      throw new Error('已完成的项目进度必须为100%');
    }

    // 调用Repository创建
    // const created = await this.projectRepo.create(project);
    // return created;

    return project;
  }

  async safeCreateProject(rawData: unknown) {
    // 安全验证
    const result = safeValidateProject(rawData);

    if (!result.success) {
      // 返回验证错误
      return {
        success: false,
        errors: result.error.errors,
      };
    }

    // 创建项目
    const project = result.data;
    // const created = await this.projectRepo.create(project);

    return {
      success: true,
      data: project,
    };
  }

  async updateProject(id: unknown, rawData: unknown) {
    // 验证ID和数据
    const projectId = validateEntityId(id);
    const updates = validateProject(rawData);

    // 调用Repository更新
    // const updated = await this.projectRepo.update(projectId, updates);

    return {
      ...updates,
      id: projectId,
    };
  }
}

/**
 * 示例3：批量验证
 */
export async function batchImportProjects(rawData: unknown[]) {
  // 批量验证
  const results = rawData.map((data, index) => {
    const result = safeValidateProject(data);
    return {
      index,
      success: result.success,
      data: result.success ? result.data : undefined,
      errors: result.success ? undefined : result.error.errors,
    };
  });

  // 分离成功和失败的结果
  const validProjects = results.filter(r => r.success).map(r => r.data);
  const invalidResults = results.filter(r => !r.success);

  console.log(`成功导入 ${validProjects.length} 个项目`);
  console.log(`失败 ${invalidResults.length} 个项目`);

  if (invalidResults.length > 0) {
    // 返回详细的错误信息
    invalidResults.forEach(r => {
      console.error(`第 ${r.index} 行验证失败:`, r.errors);
    });
  }

  return {
    success: validProjects,
    failed: invalidResults,
  };
}

/**
 * 示例4：数据转换
 */
export function convertAndValidateData(input: any) {
  // 转换并验证ID
  const userId = toEntityId(input.userId);
  const projectId = toEntityId(input.projectId);

  // 转换并验证日期
  const startDate = toDbDate(input.startDate);
  const endDate = toDbDate(input.endDate);

  // 将Date对象转换为DbDate
  const today = dateToDbDate(new Date());

  return {
    userId,
    projectId,
    startDate,
    endDate,
    createdAt: today,
  };
}

/**
 * ========================================
 * 前端使用示例
 * ========================================
 */

/**
 * 示例1：在React Hook中使用验证
 */
export function useProjectForm() {
  // 创建表单验证器
  const projectValidator = createFormValidator(
    // 使用从shared/validation导入的schema
    require('./schemas.js').ProjectSchema.partial()
  );

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  const validateField = <K extends keyof ProjectFormData>(field: K, value: ProjectFormData[K]) => {
    const result = projectValidator.validateField(field, value);

    if (!result.success) {
      setErrors(prev => ({
        ...prev,
        [field]: result.error.message,
      }));
      return false;
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
      return true;
    }
  };

  const handleSubmit = (data: ProjectFormData) => {
    // 验证整个表单
    const result = projectValidator.validate(data);

    if (!result.success) {
      // 设置所有错误
      const newErrors: Record<string, string> = {};
      result.errors.forEach(err => {
        const field = err.path[0] as string;
        newErrors[field] = err.message;
      });
      setErrors(newErrors);
      return false;
    }

    // 提交数据
    console.log('提交数据:', result.data);
    return true;
  };

  return {
    errors,
    setTouched,
    validateField,
    handleSubmit,
  };
}

/**
 * 示例2：API响应验证
 */
export async function fetchProject(id: number): Promise<Project> {
  const response = await fetch(`/api/projects/${id}`);

  if (!response.ok) {
    throw new Error('获取项目失败');
  }

  const data = await response.json();

  // 验证API响应
  if (data.success) {
    // 验证项目数据
    return validateProject(data.data);
  } else {
    // 验证错误响应
    validateApiErrorResponse(data);
    throw new Error(data.error.message);
  }
}

/**
 * 示例3：表单数据提交前验证
 */
export function submitProjectForm(formData: unknown) {
  // 验证表单数据
  const result = safeValidateProject(formData);

  if (!result.success) {
    // 处理验证错误
    console.error('表单验证失败:', result.error.errors);

    // 提取错误信息
    const errorMessages = result.error.errors.map(err => ({
      field: err.path[0],
      message: err.message,
    }));

    return {
      success: false,
      errors: errorMessages,
    };
  }

  // 提交数据
  const project = result.data;

  return fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project),
  });
}

/**
 * 示例4：实时字段验证
 */
export function useFieldValidation() {
  const validateProjectCode = (value: string): boolean | string => {
    try {
      // 验证项目代码格式
      const schema = require('./schemas.js').ProjectSchema.shape.code;
      schema.parse(value);
      return true;
    } catch (error) {
      if (error instanceof Error) {
        return error.message;
      }
      return '验证失败';
    }
  };

  const validateProjectName = (value: string): boolean | string => {
    if (!value || value.trim().length === 0) {
      return '项目名称不能为空';
    }
    if (value.length > 100) {
      return '项目名称不能超过100个字符';
    }
    return true;
  };

  const validateProjectProgress = (value: number): boolean | string => {
    if (value < 0 || value > 100) {
      return '进度必须在0-100之间';
    }
    return true;
  };

  return {
    validateProjectCode,
    validateProjectName,
    validateProjectProgress,
  };
}

/**
 * ========================================
 * 通用工具函数
 * ========================================
 */

/**
 * 类型守卫：检查是否为ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * 处理验证错误
 */
export function handleValidationError(error: unknown) {
  if (isValidationError(error)) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.getFirstError(),
        details: error.getFormattedErrors(),
      },
    };
  }

  return {
    success: false,
    error: {
      code: 'UNKNOWN_ERROR',
      message: error instanceof Error ? error.message : '未知错误',
    },
  };
}

/**
 * 创建标准化的API响应
 */
export function createApiResponse<T>(data: T, meta?: any) {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

/**
 * 创建标准化的错误响应
 */
export function createApiErrorResponse(code: string, message: string, details?: any) {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
}
