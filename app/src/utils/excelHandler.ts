/**
 * Excel 导入导出处理器
 *
 * 职责：
 * 1. 将组织架构数据导出为 xlsx 文件
 * 2. 从 xlsx 文件导入组织架构数据
 * 3. 数据验证和错误处理
 *
 * ✅ 优化：使用动态导入 XLSX 库，减少初始 bundle 大小
 */

import type {
  OrganizationStructure,
  Department,
  TechGroup,
  Member,
  MemberCapabilities,
  OrgTreeNode
} from '@/types/organization';
import { getCapabilityDimensions } from '@/utils/capabilityDimensionManager';
import { getDefaultCapabilityValues } from '@/types/organization';
import { findNodeById } from '@/utils/organizationManager';

// ================================================================
// 动态导入 XLSX 库（减少初始 bundle 大小）
// ================================================================

/**
 * 动态导入 XLSX 库
 * 只在需要时加载，减少约 300KB 的初始 bundle 大小
 */
async function getXLSX() {
  const XLSX = await import('xlsx');
  return XLSX;
}

// ================================================================
// 导出功能
// ================================================================

/**
 * 导出组织架构为 Excel 文件（人员列表格式）
 */
export async function exportOrganizationToExcel(org: OrganizationStructure): Promise<Blob> {
  const XLSX = await getXLSX();
  const wb = XLSX.utils.book_new();

  // 生成人员列表格式数据
  const data = flattenMemberList(org);
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, '组织架构');

  // 生成 Excel 文件
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

/**
 * 下载 Excel 文件
 */
export async function downloadOrganizationExcel(org: OrganizationStructure): Promise<void> {
  console.log('[downloadOrganizationExcel] 开始导出，组织数据:', org);

  try {
    const blob = await exportOrganizationToExcel(org);
    console.log('[downloadOrganizationExcel] Blob 创建成功，大小:', blob.size);

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `组织架构_${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);

    console.log('[downloadOrganizationExcel] 导出完成');
  } catch (error) {
    console.error('[downloadOrganizationExcel] 导出失败:', error);
    alert('导出失败：' + (error instanceof Error ? error.message : '未知错误'));
  }
}

/**
 * 扁平化人员列表（用户视角 - 参照公司格式）
 */
function flattenMemberList(org: OrganizationStructure): any[] {
  const data: any[] = [];

  // 获取动态能力维度
  const capabilityDimensions = getCapabilityDimensions();

  // 角色名称映射
  const roleNames: Record<string, string> = {
    'dept_manager': '部门经理',
    'tech_manager': '技术经理',
    'engineer': '工程师'
  };

  console.log('[flattenMemberList] 开始处理，部门数量:', org.departments?.length);

  // 动态计算直属主管
  function getDirectSupervisorName(member: Member, org: OrganizationStructure): string {
    if (member.role === 'dept_manager') return '-';

    // 使用 parentId 查找父节点，然后找直属主管
    if (!member.parentId) return '-';

    const parentNode = findNodeById(member.parentId, org);
    if (!parentNode) return '-';

    if (member.role === 'engineer' && parentNode.level === 'tech_group') {
      // 工程师 → 技术经理
      const group = parentNode as TechGroup;
      const techManager = group.children?.find(m => (m as Member).role === 'tech_manager');
      return techManager ? techManager.name : '-';
    } else if (member.role === 'tech_manager' && parentNode.level === 'tech_group') {
      // 技术经理 → 部门经理（技术组的 parentId 指向部门）
      // 需要找到所属部门的部门经理
      for (const dept of org.departments) {
        const deptManager = dept.children?.find(m => m.level === 'member' && (m as Member).role === 'dept_manager');
        if (deptManager) {
          return (deptManager as Member).name;
        }
        // 递归查找子部门
        const result = findDeptManagerInSubDepts(dept);
        if (result) return result;
      }
    }
    return '-';
  }

  function findDeptManagerInSubDepts(dept: Department): string | null {
    // 检查当前部门的部门经理
    const deptManager = dept.children?.find(m => m.level === 'member' && (m as Member).role === 'dept_manager');
    if (deptManager) return (deptManager as Member).name;

    // 递归查找子部门
    for (const child of dept.children || []) {
      if (child.level === 'department') {
        const result = findDeptManagerInSubDepts(child as Department);
        if (result) return result;
      }
    }
    return null;
  }

  function traverseOrg(nodes: OrgTreeNode[], currentDeptName: string = '') {
    nodes.forEach(node => {
      if (node.level === 'department') {
        const dept = node as Department;
        // 构建部门完整路径名称
        const deptPathName = currentDeptName ? `${currentDeptName}-${dept.name}` : dept.name;
        console.log('[flattenMemberList] 处理部门:', dept.name, '完整路径:', deptPathName, '子节点数:', dept.children?.length || 0);

        // 先处理部门经理（作为部门的直接子成员）
        const deptManagers = dept.children?.filter(m => m.level === 'member' && (m as Member).role === 'dept_manager') || [];
        deptManagers.forEach(managerNode => {
          const manager = managerNode as Member;
          // 确保成员有默认能力评分
          const memberCapabilities = manager.capabilities || getDefaultCapabilityValues();
          const capabilities: any = {};
          capabilityDimensions.forEach(dim => {
            capabilities[dim.name] = memberCapabilities[dim.key] || 0;
          });

          data.push({
            '工号': manager.employeeId,
            '员工姓名': manager.name,
            '角色': roleNames[manager.role] || manager.role,
            '部门': deptPathName,
            '技术组': '-',
            '直属主管': '-',
            '描述': '-',
            ...capabilities
          });
          console.log('[flattenMemberList]   添加部门经理:', manager.name);
        });

        // 再处理技术组
        const techGroups = dept.children?.filter(c => c.level === 'tech_group') || [];
        techGroups.forEach(groupNode => {
          const group = groupNode as TechGroup;
          console.log('[flattenMemberList]   处理技术组:', group.name, '成员数:', group.children?.length || 0);

          if (group.children && Array.isArray(group.children)) {
            group.children.forEach(member => {
              const m = member as Member;
              // 确保成员有默认能力评分
              const memberCapabilities = m.capabilities || getDefaultCapabilityValues();
              const capabilities: any = {};
              capabilityDimensions.forEach(dim => {
                capabilities[dim.name] = memberCapabilities[dim.key] || 0;
              });

              data.push({
                '工号': m.employeeId,
                '员工姓名': m.name,
                '角色': roleNames[m.role] || m.role,
                '部门': deptPathName,
                '技术组': group.name,
                '直属主管': getDirectSupervisorName(m, org),
                '描述': '-',
                ...capabilities
              });
              console.log('[flattenMemberList]     添加成员:', m.name, m.role, '直属主管:', getDirectSupervisorName(m, org));
            });
          }
        });

        // 递归处理子部门
        const subDepts = dept.children?.filter(c => c.level === 'department') || [];
        subDepts.forEach(subDeptNode => {
          traverseOrg([subDeptNode], deptPathName);
        });
      }
    });
  }

  traverseOrg(org.departments);
  console.log('[flattenMemberList] 完成，生成数据行数:', data.length);
  return data;
}

/**
 * 扁平化组织架构数据（用户视角）
 */
function flattenOrgStructure(org: OrganizationStructure): any[] {
  const data: any[] = [];

  // 获取部门的完整路径名称
  function getDeptPath(dept: Department, path: string[] = []): string {
    path.unshift(dept.name);
    if (dept.parentId) {
      const parent = findDeptById(dept.parentId, org.departments);
      if (parent) {
        return getDeptPath(parent, path);
      }
    }
    return path.join(' / ');
  }

  function findDeptById(id: string, depts: Department[]): Department | null {
    for (const dept of depts) {
      if (dept.id === id) return dept;
      if (dept.children) {
        const found = findDeptById(id, dept.children.filter(c => c.level === 'department') as Department[]);
        if (found) return found;
      }
    }
    return null;
  }

  function traverseDepartments(depts: Department[], parentPath: string = '') {
    depts.forEach(dept => {
      const deptPath = parentPath ? `${parentPath} / ${dept.name}` : dept.name;
      const deptManager = dept.children?.find(c => c.level === 'member' && (c as Member).role === 'dept_manager');

      data.push({
        '组织名称': dept.name,
        '组织类型': '部门',
        '上级组织': parentPath || '-',
        '负责人': deptManager ? (deptManager as Member).name : '-',
        '描述': dept.description || '-'
      });

      // 遍历子节点
      dept.children.forEach(child => {
        if (child.level === 'department') {
          traverseDepartments([child as Department], deptPath);
        } else if (child.level === 'tech_group') {
          const group = child as TechGroup;
          const techManager = group.children?.find(m => (m as Member).role === 'tech_manager');

          data.push({
            '组织名称': group.name,
            '组织类型': '技术组',
            '上级组织': deptPath,
            '负责人': techManager ? techManager.name : '-',
            '描述': group.description || '-'
          });
        }
      });
    });
  }

  traverseDepartments(org.departments);
  return data;
}

/**
 * 扁平化成员数据（用户视角）
 */
function flattenMembers(org: OrganizationStructure): any[] {
  const data: any[] = [];

  // 角色名称映射
  const roleNames: Record<string, string> = {
    'dept_manager': '部门经理',
    'tech_manager': '技术经理',
    'engineer': '工程师'
  };

  function extractMembers(nodes: OrgTreeNode[], deptPath: string = '', techGroupName: string = '') {
    nodes.forEach(node => {
      if (node.level === 'member') {
        const member = node as Member;

        // 获取直属主管名称
        let supervisorName = member.directSupervisorName || '-';

        data.push({
          '工号': member.employeeId,
          '姓名': member.name,
          '角色': roleNames[member.role] || member.role,
          '所属部门': deptPath || '-',
          '所属技术组': techGroupName || '-',
          '直属主管': supervisorName
        });
      } else if (node.children) {
        node.children.forEach(child => {
          if (child.level === 'tech_group') {
            const group = child as TechGroup;
            const newTechGroupName = group.name;
            if (group.children && Array.isArray(group.children)) {
              group.children.forEach((member: any) => {
                data.push({
                  '工号': member.employeeId,
                  '姓名': member.name,
                  '角色': roleNames[member.role] || member.role,
                  '所属部门': deptPath || '-',
                  '所属技术组': newTechGroupName,
                  '直属主管': member.directSupervisorName || '-'
                });
              });
            }
          } else if (child.level === 'department') {
            const subDept = child as Department;
            const newDeptPath = deptPath ? `${deptPath} / ${subDept.name}` : subDept.name;
            extractMembers([subDept], newDeptPath, '');
          }
        });
      }
    });
  }

  extractMembers(org.departments);
  return data;
}

/**
 * 扁平化能力数据（用户视角）
 */
function flattenCapabilities(org: OrganizationStructure): any[] {
  const data: any[] = [];

  // 获取动态能力维度
  const capabilityDimensions = getCapabilityDimensions();
  const dimensionMap = new Map(capabilityDimensions.map(d => [d.key, d.name]));

  function extractMembers(nodes: OrgTreeNode[]) {
    nodes.forEach(node => {
      if (node.level === 'member') {
        const member = node as Member;
        if (member.capabilities) {
          const row: any = {
            '工号': member.employeeId,
            '姓名': member.name
          };
          // 动态添加能力维度
          capabilityDimensions.forEach(dim => {
            row[dim.name] = member.capabilities![dim.key] || 0;
          });
          data.push(row);
        }
      } else if (node.children) {
        extractMembers(node.children);
      }
    });
  }

  extractMembers(org.departments);
  return data;
}

// ================================================================
// 导入功能
// ================================================================

/**
 * 从 Excel 文件导入组织架构
 */
export async function importOrganizationFromExcel(file: File): Promise<{
  success: boolean;
  message: string;
  org?: OrganizationStructure;
  errors?: string[];
}> {
  const XLSX = await getXLSX();
  const errors: string[] = [];

  try {
    // 读取文件
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    // 验证工作表
    const requiredSheets = ['组织架构', '成员列表'];
    const missingSheets = requiredSheets.filter(sheet => !workbook.SheetNames.includes(sheet));
    if (missingSheets.length > 0) {
      return {
        success: false,
        message: `缺少必需的工作表: ${missingSheets.join(', ')}`,
        errors: [`缺少工作表: ${missingSheets.join(', ')}`]
      };
    }

    // 解析组织架构
    const orgSheet = workbook.Sheets['组织架构'];
    const orgData = XLSX.utils.sheet_to_json<any>(orgSheet);
    const { departments, techGroups, errors: orgErrors } = parseOrgData(orgData);
    errors.push(...orgErrors);

    // 解析成员列表
    const membersSheet = workbook.Sheets['成员列表'];
    const membersData = XLSX.utils.sheet_to_json<any>(membersSheet);
    const { members, errors: memberErrors } = parseMembersData(membersData);
    errors.push(...memberErrors);

    // 解析能力模型（可选）
    let capabilitiesMap: Record<string, MemberCapabilities> = {};
    if (workbook.SheetNames.includes('能力模型')) {
      const capabilitiesSheet = workbook.Sheets['能力模型'];
      const capabilitiesData = XLSX.utils.sheet_to_json<any>(capabilitiesSheet);
      const result = parseCapabilitiesData(capabilitiesData);
      capabilitiesMap = result.capabilities;
      errors.push(...result.errors);
    }

    // 将成员添加到技术组
    attachMembersToTechGroups(members, techGroups, departments, capabilitiesMap);

    // 构建组织架构
    const org: OrganizationStructure = {
      version: 1,
      lastUpdated: Date.now(),
      lastUpdatedBy: 'import',
      departments
    };

    // 验证数据
    const validationErrors = validateImportedData(org);
    errors.push(...validationErrors);

    if (errors.length > 0) {
      return {
        success: false,
        message: `导入时发现 ${errors.length} 个错误`,
        errors
      };
    }

    return {
      success: true,
      message: '导入成功',
      org
    };
  } catch (error) {
    return {
      success: false,
      message: `导入失败: ${error instanceof Error ? error.message : '未知错误'}`,
      errors: [error instanceof Error ? error.message : '未知错误']
    };
  }
}

/**
 * 解析组织架构数据
 */
function parseOrgData(data: any[]): {
  departments: Department[];
  techGroups: TechGroup[];
  errors: string[];
} {
  const departments: Department[] = [];
  const techGroups: TechGroup[] = [];
  const errors: string[] = [];
  const deptMap = new Map<string, Department>();

  // 第一遍：创建所有部门
  data.forEach((row, index) => {
    if (row['层级'] === 'department') {
      const dept: Department = {
        id: row['ID'] || `dept_${Date.now()}_${index}`,
        name: row['名称'],
        level: 'department',
        parentId: row['父节点ID'] || null,
        managerName: row['负责人ID'] || row['负责人名称'] || undefined,
        description: row['描述'] || undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        children: []
      };
      departments.push(dept);
      deptMap.set(dept.id, dept);
    }
  });

  // 第二遍：创建技术组并建立父子关系
  data.forEach((row, index) => {
    if (row['层级'] === 'tech_group') {
      const group: TechGroup = {
        id: row['ID'] || `group_${Date.now()}_${index}`,
        name: row['名称'],
        level: 'tech_group',
        parentId: row['父节点ID'] || null,
        leaderId: row['负责人ID'] || undefined,
        description: row['描述'] || undefined,
        memberIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        children: []
      };
      techGroups.push(group);

      // 将技术组添加到父部门
      const parentDept = deptMap.get(group.parentId || '');
      if (parentDept) {
        parentDept.children.push(group);
      } else {
        errors.push(`技术组 "${group.name}" 的父部门不存在`);
      }
    }
  });

  return { departments, techGroups, errors };
}

/**
 * 解析成员数据
 */
function parseMembersData(data: any[]): {
  members: Member[];
  errors: string[];
} {
  const members: Member[] = [];
  const errors: string[] = [];

  data.forEach((row, index) => {
    // 验证必填字段
    if (!row['工号']) {
      errors.push(`第 ${index + 2} 行：工号不能为空`);
      return;
    }
    if (!row['姓名']) {
      errors.push(`第 ${index + 2} 行：姓名不能为空`);
      return;
    }
    if (!row['角色']) {
      errors.push(`第 ${index + 2} 行：角色不能为空`);
      return;
    }

    // 验证角色
    const validRoles = ['dept_manager', 'tech_manager', 'engineer'];
    if (!validRoles.includes(row['角色'])) {
      errors.push(`第 ${index + 2} 行：角色 "${row['角色']}" 无效`);
      return;
    }

    const member: Member = {
      id: row['ID'] || `member_${Date.now()}_${index}`,
      employeeId: row['工号'],
      name: row['姓名'],
      level: 'member',
      parentId: row['所属技术组ID'] || null,
      role: row['角色'],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    members.push(member);
  });

  return { members, errors };
}

/**
 * 解析能力数据
 */
function parseCapabilitiesData(data: any[]): {
  capabilities: Record<string, MemberCapabilities>;
  errors: string[];
} {
  const capabilities: Record<string, MemberCapabilities> = {};
  const errors: string[] = [];

  data.forEach((row, index) => {
    const memberId = row['成员ID'];
    if (!memberId) {
      errors.push(`第 ${index + 2} 行：成员ID不能为空`);
      return;
    }

    const capability: MemberCapabilities = {
      boardDev: parseInt(row['板卡开发']) || 0,
      firmwareDev: parseInt(row['固件开发']) || 0,
      componentImport: parseInt(row['外购部件导入']) || 0,
      systemDesign: parseInt(row['系统设计']) || 0,
      driverInterface: parseInt(row['驱动接口']) || 0
    };

    // 验证能力值范围
    Object.entries(capability).forEach(([key, value]) => {
      if (value < 0 || value > 10) {
        errors.push(`第 ${index + 2} 行：${key} 能力值超出范围 (0-10)`);
      }
    });

    capabilities[memberId] = capability;
  });

  return { capabilities, errors };
}

/**
 * 将成员分配到技术组
 */
function attachMembersToTechGroups(
  members: Member[],
  techGroups: TechGroup[],
  departments: Department[],
  capabilitiesMap: Record<string, MemberCapabilities>
): void {
  const groupMap = new Map<string, TechGroup>();

  // 构建技术组映射
  function collectTechGroups(nodes: OrgTreeNode[]) {
    nodes.forEach(node => {
      if (node.level === 'tech_group') {
        groupMap.set(node.id, node as TechGroup);
      }
      if (node.children) {
        collectTechGroups(node.children);
      }
    });
  }

  departments.forEach(dept => collectTechGroups([dept]));

  // 分配成员到技术组
  members.forEach(member => {
    const group = groupMap.get(member.parentId || '');
    if (group) {
      // 添加能力模型
      if (capabilitiesMap[member.id]) {
        member.capabilities = capabilitiesMap[member.id];
      }
      group.children.push(member);
      group.memberIds.push(member.id);
    }
  });
}

/**
 * 验证导入的数据
 */
function validateImportedData(org: OrganizationStructure): string[] {
  const errors: string[] = [];

  // 验证部门经理隶属于部门
  // 验证技术经理隶属于技术组
  // 验证普通成员隶属于技术组
  // ... 更多验证逻辑

  return errors;
}
