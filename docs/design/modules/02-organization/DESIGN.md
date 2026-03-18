# 模块设计：组织架构模块 (02-organization)

> **文档版本**: 1.0
> **创建时间**: 2026-03-17
> **状态**: ✅ 完成
> **模块组**: 02-organization
> **开发顺序**: 2（依赖01-auth-permission）
> **依赖**: 01-auth-permission

---

## 1. 快速参考（AI摘要）

### 1.1 模块概述

组织架构模块负责管理企业的组织结构、成员信息和能力模型。它是项目管理的组织基础，为权限控制和任务分配提供人员和组织数据支持。

### 1.2 核心功能列表

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 部门树管理 | P0 | 多层级部门结构CRUD |
| 成员管理 | P0 | 成员CRUD，关联用户账户 |
| 工号管理 | P0 | 工号格式验证和唯一性 |
| 能力模型配置 | P1 | 两级结构（模型→维度） |
| 成员能力评定 | P1 | 维度打分，加权计算 |
| 智能推荐 | P1 | 任务分配时推荐合适人员 |
| 报表能力展示 | P2 | 分维度列表展示能力 |

### 1.3 关键技术点

- **部门树存储**: 邻接表模型（parent_id）
- **能力模型**: 两级结构（模型→维度），权重和必须等于100%
- **智能推荐**: 任务类型-能力模型映射，按综合分数排序
- **数据冗余**: member_capabilities表冗余model_name便于查询

---

## 2. 数据模型

### 2.1 相关表结构

本模块涉及4个核心表：

| 表名 | 说明 | 记录来源 |
|------|------|---------|
| departments | 部门表 | FINAL L984-999 |
| capability_models | 能力模型表 | FINAL L1822-1840 |
| member_capabilities | 成员能力评定表 | FINAL L1841-1862 |
| task_type_model_mapping | 任务类型-模型映射表 | FINAL L1863-1881 |

### 2.2 departments表（部门）

| 字段名称 | 类型 | 必填 | 默认值 | 说明 |
|---------|------|------|--------|------|
| id | Integer | ✅ | AUTO | 主键（自增） |
| name | String(100) | ✅ | - | 部门名称 |
| parent_id | Integer | ❌ | NULL | 父部门ID |
| manager_id | Integer | ❌ | NULL | 部门负责人ID |
| created_at | Timestamp | ✅ | NOW() | 创建时间 |
| updated_at | Timestamp | ✅ | NOW() | 更新时间 |

**索引**:
```sql
CREATE INDEX idx_departments_parent ON departments(parent_id);
CREATE INDEX idx_departments_manager ON departments(manager_id);
```

**组织架构关系示例**:
```
部门（dept_manager）
├── 技术组1
│   ├── 技术经理（tech_manager）
│   ├── 工程师A
│   └── 工程师B
├── 技术组2
│   ├── 技术经理（tech_manager）
│   ├── 工程师C
│   └── 工程师D
```

### 2.3 capability_models表（能力模型）

| 字段名称 | 类型 | 必填 | 默认值 | 说明 |
|---------|------|------|--------|------|
| id | String(36) | ✅ | UUID | 主键 |
| name | String(50) | ✅ | - | 模型名称 |
| description | Text | ❌ | NULL | 模型描述 |
| dimensions | JSON | ✅ | - | 维度配置数组 |
| created_at | Timestamp | ✅ | NOW() | 创建时间 |
| updated_at | Timestamp | ✅ | NOW() | 更新时间 |
| created_by | Integer | ✅ | - | 创建人ID |

**dimensions字段结构**:
```json
[
  {
    "id": "dim-001",
    "name": "固件开发",
    "weight": 35
  },
  {
    "id": "dim-002",
    "name": "驱动开发",
    "weight": 30
  },
  {
    "id": "dim-003",
    "name": "系统设计",
    "weight": 20
  },
  {
    "id": "dim-004",
    "name": "问题分析",
    "weight": 15
  }
]
```

**数据约束**:
- 权重约束：同一模型下所有维度权重之和必须等于100%
- 维度数量：每个模型至少1个维度，最多10个维度

### 2.4 member_capabilities表（成员能力评定）

| 字段名称 | 类型 | 必填 | 默认值 | 说明 |
|---------|------|------|--------|------|
| id | String(36) | ✅ | UUID | 主键 |
| user_id | Integer | ✅ | - | 成员ID |
| model_id | String(36) | ✅ | - | 能力模型ID |
| model_name | String(50) | ✅ | - | 冗余字段，便于查询 |
| association_label | String(50) | ❌ | NULL | 关联说明（区分同一模型多次关联） |
| dimension_scores | JSON | ✅ | - | 各维度得分数组 |
| overall_score | Integer | ✅ | 0 | 加权平均分（0-100） |
| evaluated_at | Timestamp | ✅ | NOW() | 评定时间 |
| evaluated_by | Integer | ✅ | - | 评定人ID |
| notes | Text | ❌ | NULL | 备注 |

**dimension_scores字段结构**:
```json
[
  {
    "dimension_id": "dim-001",
    "dimension_name": "固件开发",
    "weight": 35,
    "score": 85
  },
  {
    "dimension_id": "dim-002",
    "dimension_name": "驱动开发",
    "weight": 30,
    "score": 78
  }
]
```

**索引**:
```sql
CREATE INDEX idx_member_cap_user ON member_capabilities(user_id);
CREATE INDEX idx_member_cap_model ON member_capabilities(model_id);
```

**关联特点**:
- 一个成员可以关联同一个模型多次
- 通过`association_label`区分同一模型的不同工作方向
- 例如：张三可以同时有"嵌入式开发能力-固件方向"和"嵌入式开发能力-驱动方向"

### 2.5 task_type_model_mapping表（任务类型-模型映射）

| 字段名称 | 类型 | 必填 | 默认值 | 说明 |
|---------|------|------|--------|------|
| id | Integer | ✅ | AUTO | 主键 |
| task_type | String(50) | ✅ | - | 任务类型编码 |
| model_id | String(36) | ✅ | - | 关联的能力模型ID |
| priority | Integer | ✅ | 1 | 优先级（1最高） |

**索引**:
```sql
CREATE UNIQUE INDEX idx_ttm_unique ON task_type_model_mapping(task_type, model_id);
CREATE INDEX idx_ttm_task_type ON task_type_model_mapping(task_type);
```

**默认映射配置**:
| 任务类型 | 关联模型 | 优先级 |
|----------|----------|--------|
| firmware | 嵌入式开发能力 | 1 |
| board | 嵌入式开发能力 | 1 |
| driver | 嵌入式开发能力 | 1 |
| interface | 系统设计能力 | 1 |
| system_design | 系统设计能力 | 1 |
| functional | 通用能力 | 1 |

---

## 3. 默认数据种子

### 3.1 能力模型种子

#### 1. 嵌入式开发能力

| 维度 | 权重 |
|------|------|
| 固件开发 | 35% |
| 驱动开发 | 30% |
| 系统设计 | 20% |
| 问题分析 | 15% |

#### 2. 系统设计能力

| 维度 | 权重 |
|------|------|
| 架构设计 | 40% |
| 接口设计 | 30% |
| 文档编写 | 30% |

#### 3. 通用能力

| 维度 | 权重 |
|------|------|
| 沟通协调 | 30% |
| 问题解决 | 35% |
| 执行力 | 35% |

---

## 4. API定义

### 4.1 部门管理API

**来源**: API_SPECIFICATION L183-190

| 方法 | 端点 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/departments | 获取部门树 | MEMBER_VIEW |
| GET | /api/departments/:id | 获取部门详情 | MEMBER_VIEW |
| POST | /api/departments | 创建部门 | MEMBER_CREATE |
| PUT | /api/departments/:id | 更新部门 | MEMBER_EDIT |
| DELETE | /api/departments/:id | 删除部门 | MEMBER_DELETE |

#### 4.1.1 GET /api/departments

**响应**:
```typescript
interface DepartmentTreeResponse {
  data: DepartmentNode[];
}

interface DepartmentNode {
  id: number;
  name: string;
  parent_id: number | null;
  manager_id: number | null;
  manager_name?: string;
  member_count: number;
  children: DepartmentNode[];
}
```

#### 4.1.2 POST /api/departments

**请求**:
```typescript
interface CreateDepartmentRequest {
  name: string;
  parent_id?: number;
  manager_id?: number;
}
```

### 4.2 成员管理API

**来源**: API_SPECIFICATION L192-200

| 方法 | 端点 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/members | 获取成员列表 | MEMBER_VIEW |
| GET | /api/members/:id | 获取成员详情 | MEMBER_VIEW |
| POST | /api/members | 创建成员 | MEMBER_CREATE |
| PUT | /api/members/:id | 更新成员 | MEMBER_EDIT |
| DELETE | /api/members/:id | 删除成员 | MEMBER_DELETE |

#### 4.2.1 GET /api/members

**查询参数**:
```typescript
interface MemberListQuery {
  page?: number;
  pageSize?: number;
  department_id?: number;
  role?: UserRole;
  is_active?: boolean;
  keyword?: string;
}
```

**响应**:
```typescript
interface MemberListResponse {
  data: Member[];
  pagination: PaginationInfo;
}

interface Member {
  id: number;
  username: string;
  real_name: string;
  role: UserRole;
  department_id: number;
  department_name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}
```

#### 4.2.2 POST /api/members

**请求**:
```typescript
interface CreateMemberRequest {
  username: string;      // 工号
  real_name: string;     // 姓名
  role: UserRole;        // 角色
  department_id: number; // 部门ID
  email?: string;
  phone?: string;
}
```

**响应**:
```typescript
interface CreateMemberResponse {
  data: {
    id: number;
    username: string;
    real_name: string;
    initial_password: string; // 初始密码（仅此一次返回）
  };
  message: string;
}
```

**业务逻辑**:
1. 验证工号格式（8位数字或6位字母+数字）
2. 检查工号唯一性
3. 自动生成随机密码
4. 创建用户记录（复用01模块的users表）
5. 返回初始密码供管理员复制

### 4.3 能力模型API

**来源**: API_SPECIFICATION L202-215

| 方法 | 端点 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/capability-models | 获取能力模型列表 | SYSTEM_CONFIG |
| GET | /api/capability-models/:id | 获取能力模型详情 | SYSTEM_CONFIG |
| POST | /api/capability-models | 创建能力模型 | SYSTEM_CONFIG |
| PUT | /api/capability-models/:id | 更新能力模型 | SYSTEM_CONFIG |
| DELETE | /api/capability-models/:id | 删除能力模型 | SYSTEM_CONFIG |

#### 4.3.1 GET /api/capability-models

**响应**:
```typescript
interface CapabilityModelListResponse {
  data: CapabilityModel[];
}

interface CapabilityModel {
  id: string;
  name: string;
  description: string | null;
  dimensions: Dimension[];
  created_at: string;
  updated_at: string;
}

interface Dimension {
  id: string;
  name: string;
  weight: number; // 0-100
}
```

#### 4.3.2 POST /api/capability-models

**请求**:
```typescript
interface CreateCapabilityModelRequest {
  name: string;
  description?: string;
  dimensions: DimensionInput[];
}

interface DimensionInput {
  name: string;
  weight: number;
}
```

**验证规则**:
- name: 必填，最大50字符
- dimensions: 必填，1-10个维度
- 权重和必须等于100

### 4.4 成员能力评定API

**来源**: API_SPECIFICATION L211-214

| 方法 | 端点 | 说明 | 权限 |
|------|------|------|------|
| GET | /api/members/:id/capabilities | 获取成员能力列表 | MEMBER_VIEW |
| POST | /api/members/:id/capabilities | 添加成员能力评定 | MEMBER_EDIT |
| PUT | /api/members/:id/capabilities/:capId | 更新成员能力评定 | MEMBER_EDIT |
| DELETE | /api/members/:id/capabilities/:capId | 删除成员能力评定 | MEMBER_EDIT |

#### 4.4.1 GET /api/members/:id/capabilities

**响应**:
```typescript
interface MemberCapabilitiesResponse {
  data: MemberCapability[];
}

interface MemberCapability {
  id: string;
  model_id: string;
  model_name: string;
  association_label: string | null;
  dimension_scores: DimensionScore[];
  overall_score: number;
  evaluated_at: string;
  evaluated_by: number;
  evaluator_name: string;
}

interface DimensionScore {
  dimension_id: string;
  dimension_name: string;
  weight: number;
  score: number; // 0-100
}
```

#### 4.4.2 POST /api/members/:id/capabilities

**请求**:
```typescript
interface CreateMemberCapabilityRequest {
  model_id: string;
  association_label?: string;
  dimension_scores: DimensionScoreInput[];
  notes?: string;
}

interface DimensionScoreInput {
  dimension_id: string;
  score: number; // 0-100
}
```

**业务逻辑**:
1. 验证model_id存在
2. 验证维度ID与模型匹配
3. 自动计算overall_score（加权平均）
4. 创建评定记录

### 4.5 智能推荐API

**来源**: API_SPECIFICATION L215

| 方法 | 端点 | 说明 | 权限 |
|------|------|------|------|
| POST | /api/tasks/recommend-assignee | 获取任务负责人推荐 | TASK_ASSIGN |

**请求**:
```typescript
interface RecommendAssigneeRequest {
  task_type: string;  // 任务类型
  project_id?: string; // 项目ID（用于筛选项目成员）
}
```

**响应**:
```typescript
interface RecommendAssigneeResponse {
  data: AssigneeRecommendation[];
}

interface AssigneeRecommendation {
  user_id: number;
  user_name: string;
  department_name: string;
  model_name: string;
  overall_score: number;
  match_level: 'high' | 'medium' | 'low'; // >80=high, 60-80=medium, <60=low
}
```

**推荐逻辑**:
```
1. 根据任务类型查询映射表，获取关联的能力模型列表（按优先级排序）
2. 遍历模型列表，查找有该模型能力评定的成员
3. 如果成员有多个同一模型的评定，取综合分数最高的那个
4. 按综合分数降序排列返回推荐列表
```

---

## 5. 组件设计

### 5.1 前端组件结构

```
src/components/organization/
├── DepartmentTree.tsx           # 部门树组件
├── DepartmentDialog.tsx         # 部门编辑对话框
├── MemberTable.tsx              # 成员列表表格
├── MemberFormDialog.tsx         # 成员表单对话框
├── CapabilityModelTab.tsx       # 能力模型配置Tab
├── CapabilityModelDialog.tsx    # 能力模型编辑对话框
├── MemberCapabilityTab.tsx      # 成员能力评定Tab
├── CapabilityAssessDialog.tsx   # 能力评定对话框
├── RadarChart.tsx               # 能力雷达图组件
└── hooks/
    ├── useDepartmentTree.ts     # 部门树Hook
    ├── useMembers.ts            # 成员管理Hook
    └── useCapabilityModels.ts   # 能力模型Hook
```

### 5.2 组织管理Tab

**来源**: UI_Requirement 5.3

```tsx
// OrganizationTab.tsx
const OrganizationTab: React.FC = () => {
  const [selectedDept, setSelectedDept] = useState<DepartmentNode | null>(null);

  return (
    <div className="flex h-full">
      {/* 左侧部门树 */}
      <div className="w-64 border-r p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">组织架构</h3>
          <Button size="sm" onClick={handleAddDepartment}>
            <PlusIcon className="h-4 w-4" />
          </Button>
        </div>
        <DepartmentTree
          selectedId={selectedDept?.id}
          onSelect={setSelectedDept}
        />
      </div>

      {/* 右侧成员列表 */}
      <div className="flex-1 p-4">
        <MemberTable departmentId={selectedDept?.id} />
      </div>
    </div>
  );
};
```

### 5.3 部门树组件

```tsx
// DepartmentTree.tsx
interface DepartmentTreeProps {
  selectedId?: number;
  onSelect: (dept: DepartmentNode) => void;
}

const DepartmentTree: React.FC<DepartmentTreeProps> = ({
  selectedId,
  onSelect
}) => {
  const { data: departments, isLoading } = useDepartmentTree();

  const renderTree = (nodes: DepartmentNode[], level = 0) => {
    return nodes.map(node => (
      <div key={node.id}>
        <div
          className={cn(
            "flex items-center py-2 px-3 cursor-pointer rounded-md",
            "hover:bg-accent",
            selectedId === node.id && "bg-accent"
          )}
          style={{ paddingLeft: `${level * 16 + 12}px` }}
          onClick={() => onSelect(node)}
        >
          {node.children?.length > 0 ? (
            <ChevronRightIcon className="h-4 w-4 mr-2" />
          ) : (
            <span className="w-6" />
          )}
          <span>{node.name}</span>
          <Badge variant="outline" className="ml-auto">
            {node.member_count}
          </Badge>
        </div>
        {node.children?.length > 0 && renderTree(node.children, level + 1)}
      </div>
    ));
  };

  if (isLoading) return <Spinner />;

  return <div className="space-y-1">{renderTree(departments)}</div>;
};
```

### 5.4 能力评定对话框

```tsx
// CapabilityAssessDialog.tsx
interface CapabilityAssessDialogProps {
  open: boolean;
  onClose: () => void;
  memberId: number;
  existingCapability?: MemberCapability;
}

const CapabilityAssessDialog: React.FC<CapabilityAssessDialogProps> = ({
  open,
  onClose,
  memberId,
  existingCapability
}) => {
  const [selectedModel, setSelectedModel] = useState<CapabilityModel | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [associationLabel, setAssociationLabel] = useState('');

  // 计算综合分
  const overallScore = useMemo(() => {
    if (!selectedModel) return 0;
    let total = 0;
    let weightSum = 0;
    selectedModel.dimensions.forEach(dim => {
      total += (scores[dim.id] || 0) * dim.weight;
      weightSum += dim.weight;
    });
    return Math.round(total / weightSum);
  }, [selectedModel, scores]);

  const handleSubmit = async () => {
    await api.createMemberCapability(memberId, {
      model_id: selectedModel.id,
      association_label: associationLabel || null,
      dimension_scores: selectedModel.dimensions.map(dim => ({
        dimension_id: dim.id,
        score: scores[dim.id] || 0
      }))
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>能力评定</DialogTitle>
      <DialogContent className="space-y-4">
        {/* 选择能力模型 */}
        <div>
          <Label>能力模型 *</Label>
          <Select value={selectedModel?.id} onValueChange={handleModelChange}>
            <SelectTrigger>
              <SelectValue placeholder="请选择能力模型" />
            </SelectTrigger>
            <SelectContent>
              {models.map(model => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 关联说明 */}
        <div>
          <Label>关联说明（可选）</Label>
          <Input
            value={associationLabel}
            onChange={(e) => setAssociationLabel(e.target.value)}
            placeholder="如：固件方向、驱动方向"
          />
        </div>

        {/* 维度打分 */}
        {selectedModel && (
          <div className="space-y-3">
            <Label>维度评分</Label>
            {selectedModel.dimensions.map(dim => (
              <div key={dim.id} className="flex items-center gap-4">
                <span className="w-24">{dim.name}</span>
                <span className="text-sm text-muted-foreground">
                  (权重 {dim.weight}%)
                </span>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={scores[dim.id] || 0}
                  onChange={(e) => setScores({
                    ...scores,
                    [dim.id]: parseInt(e.target.value) || 0
                  })}
                  className="w-20"
                />
                <span className="text-sm">分</span>
              </div>
            ))}

            {/* 综合分显示 */}
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <span className="font-semibold">综合评分</span>
              <span className="text-2xl font-bold text-primary">
                {overallScore}
              </span>
              <span className="text-sm text-muted-foreground">
                / 100
              </span>
            </div>
          </div>
        )}
      </DialogContent>
      <DialogActions>
        <Button variant="outline" onClick={onClose}>取消</Button>
        <Button onClick={handleSubmit} disabled={!selectedModel}>
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
};
```

### 5.5 智能推荐面板

```tsx
// RecommendPanel.tsx
interface RecommendPanelProps {
  taskType: string;
  projectId?: string;
  onSelect: (userId: number) => void;
}

const RecommendPanel: React.FC<RecommendPanelProps> = ({
  taskType,
  projectId,
  onSelect
}) => {
  const { data: recommendations, isLoading } = useRecommendAssignee(
    taskType,
    projectId
  );

  const getMatchBadge = (level: string) => {
    switch (level) {
      case 'high':
        return <Badge className="bg-green-500">高匹配</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500">中匹配</Badge>;
      case 'low':
        return <Badge className="bg-gray-500">低匹配</Badge>;
    }
  };

  return (
    <div className="border rounded-lg p-4 mt-2">
      <div className="flex items-center gap-2 mb-3">
        <SparklesIcon className="h-4 w-4 text-primary" />
        <span className="font-medium">智能推荐</span>
      </div>

      {isLoading ? (
        <Spinner size="sm" />
      ) : recommendations?.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          暂无匹配的成员推荐
        </p>
      ) : (
        <div className="space-y-2">
          {recommendations?.slice(0, 5).map((rec) => (
            <div
              key={rec.user_id}
              className="flex items-center justify-between p-2 hover:bg-accent rounded cursor-pointer"
              onClick={() => onSelect(rec.user_id)}
            >
              <div className="flex items-center gap-3">
                <Avatar size="sm" name={rec.user_name} />
                <div>
                  <div className="font-medium">{rec.user_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {rec.department_name}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">{rec.overall_score}分</span>
                {getMatchBadge(rec.match_level)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

---

## 6. 开发检查清单

### 6.1 数据库迁移

- [ ] 创建 `006-create-departments-table.ts`
- [ ] 创建 `007-create-capability-models-table.ts`
- [ ] 创建 `008-create-member-capabilities-table.ts`
- [ ] 创建 `009-create-task-type-mapping-table.ts`
- [ ] 创建 `010-seed-capability-models.ts`（默认能力模型）
- [ ] 创建 `011-seed-task-type-mapping.ts`（任务类型映射）

### 6.2 后端API实现

- [ ] `GET /api/departments` - 获取部门树
- [ ] `POST /api/departments` - 创建部门
- [ ] `PUT /api/departments/:id` - 更新部门
- [ ] `DELETE /api/departments/:id` - 删除部门
- [ ] `GET /api/members` - 成员列表
- [ ] `POST /api/members` - 创建成员
- [ ] `PUT /api/members/:id` - 更新成员
- [ ] `DELETE /api/members/:id` - 删除成员
- [ ] `GET /api/capability-models` - 能力模型列表
- [ ] `POST /api/capability-models` - 创建能力模型
- [ ] `PUT /api/capability-models/:id` - 更新能力模型
- [ ] `DELETE /api/capability-models/:id` - 删除能力模型
- [ ] `GET /api/members/:id/capabilities` - 成员能力列表
- [ ] `POST /api/members/:id/capabilities` - 添加能力评定
- [ ] `PUT /api/members/:id/capabilities/:capId` - 更新能力评定
- [ ] `DELETE /api/members/:id/capabilities/:capId` - 删除能力评定
- [ ] `POST /api/tasks/recommend-assignee` - 智能推荐

### 6.3 前端组件

- [ ] `DepartmentTree.tsx` - 部门树组件
- [ ] `DepartmentDialog.tsx` - 部门编辑对话框
- [ ] `OrganizationTab.tsx` - 组织管理Tab
- [ ] `MemberTable.tsx` - 成员列表表格
- [ ] `MemberFormDialog.tsx` - 成员表单对话框
- [ ] `CapabilityModelTab.tsx` - 能力模型配置Tab
- [ ] `CapabilityModelDialog.tsx` - 能力模型编辑对话框
- [ ] `MemberCapabilityTab.tsx` - 成员能力评定Tab
- [ ] `CapabilityAssessDialog.tsx` - 能力评定对话框
- [ ] `RecommendPanel.tsx` - 智能推荐面板
- [ ] `RadarChart.tsx` - 能力雷达图

### 6.4 测试用例

- [ ] 部门树CRUD测试
- [ ] 成员管理CRUD测试
- [ ] 工号唯一性验证测试
- [ ] 能力模型权重验证测试
- [ ] 成员能力评定计算测试
- [ ] 智能推荐排序测试

---

## 7. 完整性验证

### 7.1 FINAL_REQUIREMENTS 对照

| 需求项 | 原文位置 | 覆盖状态 |
|--------|---------|:--------:|
| 部门树结构 | L914-921 | ✅ |
| 部门CRUD | L984-999 | ✅ |
| 成员CRUD | L1000-1017 | ✅ |
| 工号管理 | L2207-2214 | ✅ |
| 成员状态管理 | L1000-1017 | ✅ |
| 能力模型两级结构 | L1822-1840 | ✅ |
| 成员能力关联 | L1841-1862 | ✅ |
| 智能推荐机制 | L1863-1881 | ✅ |
| 任务类型-模型映射 | L1863-1881 | ✅ |
| 默认数据种子 | L1908-1934 | ✅ |
| 实现优先级 | L1935-1945 | ✅ |

### 7.2 UI_Requirement 对照

| UI需求项 | 原文位置 | 覆盖状态 |
|----------|---------|:--------:|
| 组织管理Tab | 5.3 | ✅ |
| 部门筛选下拉 | 5.3 | ✅ |
| 部门树形选择 | 5.3 | ✅ |
| 成员列表表格 | 5.3 | ✅ |
| 能力模型配置Tab | 5.3 | ✅ |

### 7.3 数据模型一致性

| 检查项 | 状态 |
|--------|:----:|
| departments表与DATA_MODEL.md一致 | ✅ |
| capability_models表与DATA_MODEL.md一致 | ✅ |
| member_capabilities表与DATA_MODEL.md一致 | ✅ |
| task_type_model_mapping表与DATA_MODEL.md一致 | ✅ |

### 7.4 API一致性

| 检查项 | 状态 |
|--------|:----:|
| 部门API与API_SPECIFICATION.md一致 | ✅ |
| 成员API与API_SPECIFICATION.md一致 | ✅ |
| 能力模型API与API_SPECIFICATION.md一致 | ✅ |
| 智能推荐API与API_SPECIFICATION.md一致 | ✅ |

---

## 8. 依赖关系

### 8.1 上游依赖

| 模块 | 依赖内容 |
|------|---------|
| 01-auth-permission | users表、权限检查 |

### 8.2 下游依赖

| 模块 | 依赖内容 |
|------|---------|
| 03-project | 项目成员关联 |
| 04-task | 任务负责人分配 |
| 05-workflow | 审批人关联 |
| 07-analytics | 成员分析报表 |

---

## 相关文档

- [模块需求文档](../../../requirements/modules/REQ_02_organization.md)
- [系统架构总览](../SYSTEM_OVERVIEW.md)
- [数据模型设计](../DATA_MODEL.md)
- [API规范设计](../API_SPECIFICATION.md)

---

## 变更历史

| 日期 | 版本 | 变更内容 |
|------|------|----------|
| 2026-03-17 | 1.0 | 初始版本 |
