/**
 * 组织架构导入导出服务
 */
import * as XLSX from 'xlsx';
import { OrgRepository } from './repository';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import type { User } from '../../core/types';

export class ImportExportService {
  private repo = new OrgRepository();

  /**
   * 生成组织架构导入模板
   */
  generateTemplate(): Buffer {
    const workbook = XLSX.utils.book_new();

    // 部门模板
    const deptData = [
      ['部门名称', '上级部门名称', '部门负责人工号'],
      ['研发中心', '', ''],
      ['研发一部', '研发中心', ''],
      ['技术组A', '研发一部', ''],
    ];
    const deptSheet = XLSX.utils.aoa_to_sheet(deptData);
    // 设置列宽
    deptSheet['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(workbook, deptSheet, '组织架构');

    // 人员模板
    const memberData = [
      ['工号', '员工姓名', '性别', '电话', '邮箱', '角色', '部门', '技术组', '直属主管'],
      ['EMP001', '张三', '男', '13800138000', 'zhangsan@example.com', '技术经理', '研发一部', '技术组A', ''],
      ['EMP002', '李四', '女', '13900139000', 'lisi@example.com', '工程师', '研发一部', '技术组A', ''],
    ];
    const memberSheet = XLSX.utils.aoa_to_sheet(memberData);
    // 设置列宽
    memberSheet['!cols'] = [
      { wch: 10 }, { wch: 12 }, { wch: 6 }, { wch: 15 },
      { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }
    ];
    XLSX.utils.book_append_sheet(workbook, memberSheet, '人员名单');

    // 确保返回正确的 Node.js Buffer
    const output = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return Buffer.isBuffer(output) ? output : Buffer.from(output as ArrayBuffer);
  }

  /**
   * 导出组织架构数据
   */
  async exportOrganization(): Promise<Buffer> {
    const departments = await this.repo.getAllDepartments();
    const { items: members } = await this.repo.getMembers({ pageSize: 10000 });

    const workbook = XLSX.utils.book_new();

    // 构建部门映射
    const deptMap = new Map(departments.map(d => [d.id, d]));

    // 获取父部门名称
    const getParentName = (parentId: number | null): string => {
      if (!parentId) return '';
      const parent = deptMap.get(parentId);
      return parent ? parent.name : '';
    };

    // 扁平化部门数据
    const flattenDepts = (depts: typeof departments, parentId: number | null = null): any[] => {
      const result: any[] = [];
      const children = depts.filter(d => d.parent_id === parentId);
      for (const dept of children) {
        result.push({
          '部门ID': dept.id,
          '部门名称': dept.name,
          '上级部门': getParentName(dept.parent_id),
          '成员数量': 0, // 稍后计算
        });
        result.push(...flattenDepts(depts, dept.id));
      }
      return result;
    };

    const deptRows = flattenDepts(departments);
    const deptSheet = XLSX.utils.json_to_sheet(deptRows);
    deptSheet['!cols'] = [{ wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(workbook, deptSheet, '组织架构');

    // 导出人员
    const memberRows = members.map(m => ({
      '工号': m.username,
      '姓名': m.real_name,
      '性别': m.gender === 'male' ? '男' : m.gender === 'female' ? '女' : m.gender === 'other' ? '其他' : '',
      '电话': m.phone || '',
      '邮箱': m.email || '',
      '部门': m.department_name || '',
      '角色': this.translateRole(m.role),
      '状态': m.is_active ? '激活' : '停用',
      '创建时间': new Date(m.created_at).toLocaleDateString(),
    }));
    const memberSheet = XLSX.utils.json_to_sheet(memberRows);
    memberSheet['!cols'] = [
      { wch: 10 }, { wch: 12 }, { wch: 6 }, { wch: 15 },
      { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 8 }, { wch: 12 }
    ];
    XLSX.utils.book_append_sheet(workbook, memberSheet, '人员名单');

    // 确保返回正确的 Node.js Buffer
    const output = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return Buffer.isBuffer(output) ? output : Buffer.from(output as ArrayBuffer);
  }

  /**
   * 导入组织架构数据
   */
  async importOrganization(
    buffer: Buffer,
    currentUser: User
  ): Promise<{ departments: number; members: number; updatedMembers: number; errors: string[] }> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const errors: string[] = [];
    let deptCount = 0;
    let memberCount = 0;
    let updatedMemberCount = 0;

    // 获取现有部门
    const existingDepts = await this.repo.getAllDepartments();
    const deptNameMap = new Map(existingDepts.map(d => [d.name.toLowerCase(), d]));

    // 获取现有成员（包含 ID，用于更新）
    const { items: existingMembers } = await this.repo.getMembers({ pageSize: 10000 });
    const usernameMap = new Map(existingMembers.map(m => [m.username.toLowerCase(), m]));

    // 处理部门导入（支持多种 Sheet 名称）
    const deptSheet = workbook.Sheets['组织架构'] || workbook.Sheets['部门'] || workbook.Sheets[workbook.SheetNames[0]];
    if (deptSheet) {
      const deptRows = XLSX.utils.sheet_to_json(deptSheet) as any[];
      const newDepts: Map<string, number> = new Map(); // name -> id

      for (const row of deptRows) {
        const name = row['部门名称'] || row['name'];
        if (!name || typeof name !== 'string') continue;

        const normalizedName = name.toLowerCase().trim();

        // 检查是否已存在
        if (deptNameMap.has(normalizedName) || newDepts.has(normalizedName)) {
          continue;
        }

        // 查找父部门
        let parentId: number | null = null;
        const parentName = row['上级部门名称'] || row['parent_name'];
        if (parentName && typeof parentName === 'string') {
          const normalizedParentName = parentName.toLowerCase().trim();
          const existingParent = deptNameMap.get(normalizedParentName);
          if (existingParent) {
            parentId = existingParent.id;
          } else if (newDepts.has(normalizedParentName)) {
            parentId = newDepts.get(normalizedParentName)!;
          }
        }

        try {
          const id = await this.repo.createDepartment({
            name: name.trim(),
            parent_id: parentId || undefined,
          });
          newDepts.set(normalizedName, id);
          deptCount++;
        } catch (e: any) {
          errors.push(`部门 "${name}" 创建失败: ${e.message}`);
        }
      }

      // 更新部门映射
      for (const [name, id] of newDepts) {
        deptNameMap.set(name, { id, name, parent_id: null, manager_id: null, created_at: new Date(), updated_at: new Date() } as any);
      }
    }

    // 处理人员导入（支持多种 Sheet 名称）
    const memberSheet = workbook.Sheets['人员名单'] || workbook.Sheets['人员'] || workbook.Sheets[workbook.SheetNames[1]];
    if (memberSheet) {
      const memberRows = XLSX.utils.sheet_to_json(memberSheet) as any[];

      for (const row of memberRows) {
        const username = row['工号'] || row['username'];
        const realName = row['员工姓名'] || row['姓名'] || row['real_name'];

        if (!username || !realName) {
          errors.push(`跳过无效行: 缺少工号或姓名`);
          continue;
        }

        const normalizedUsername = String(username).toLowerCase().trim();

        // 查找部门（优先使用技术组，因为更具体）
        let departmentId: number | null = null;
        const techGroupName = row['技术组'] || row['tech_group'];
        const deptName = row['部门'] || row['department'];

        // 优先匹配技术组
        if (techGroupName && typeof techGroupName === 'string') {
          const normalizedTechGroup = techGroupName.toLowerCase().trim();
          const techGroup = deptNameMap.get(normalizedTechGroup);
          if (techGroup) {
            departmentId = techGroup.id;
          }
        }

        // 如果没有找到技术组，尝试匹配部门
        if (departmentId === null && deptName && typeof deptName === 'string') {
          const normalizedDeptName = deptName.toLowerCase().trim();
          const dept = deptNameMap.get(normalizedDeptName);
          if (dept) {
            departmentId = dept.id;
          }
        }

        // 检查用户是否已存在
        const existingMember = usernameMap.get(normalizedUsername);
        if (existingMember) {
          // 用户已存在，更新部门关联
          try {
            await this.repo.updateMember(existingMember.id, {
              department_id: departmentId,
            });
            updatedMemberCount++;
          } catch (e: any) {
            errors.push(`成员 "${username}" 更新失败: ${e.message}`);
          }
        } else {
          // 用户不存在，创建新用户
          // 解析性别
          let gender: string | undefined = undefined;
          const genderValue = row['性别'] || row['gender'];
          if (genderValue === '男') gender = 'male';
          else if (genderValue === '女') gender = 'female';
          else if (genderValue === '其他') gender = 'other';

          // 解析角色
          let role = 'engineer';
          const roleValue = row['角色'] || row['role'];
          if (roleValue) {
            const roleStr = String(roleValue).toLowerCase();
            if (roleStr.includes('管理员') || roleStr === 'admin') role = 'admin';
            else if (roleStr.includes('技术经理') || roleStr === 'tech_manager') role = 'tech_manager';
            else if (roleStr.includes('部门经理') || roleStr === 'dept_manager' || roleStr === 'department_manager') role = 'dept_manager';
          }

          // 生成初始密码
          const initialPassword = this.generateRandomPassword();
          const hashedPassword = await bcrypt.hash(initialPassword, 10);

          try {
            const newId = await this.repo.createMember({
              username: String(username).trim(),
              password: hashedPassword,
              real_name: String(realName).trim(),
              role,
              gender,
              department_id: departmentId,
              email: row['邮箱'] || row['email'] ? String(row['邮箱'] || row['email']).trim() : undefined,
              phone: row['电话'] || row['phone'] ? String(row['电话'] || row['phone']).trim() : undefined,
              is_builtin: false,
            });
            usernameMap.set(normalizedUsername, { id: newId, username: String(username).trim() } as any);
            memberCount++;
          } catch (e: any) {
            errors.push(`成员 "${username}" 创建失败: ${e.message}`);
          }
        }
      }
    }

    return { departments: deptCount, members: memberCount, updatedMembers: updatedMemberCount, errors };
  }

  private translateRole(role: string): string {
    const roleMap: Record<string, string> = {
      admin: '系统管理员',
      tech_manager: '技术经理',
      dept_manager: '部门经理',
      engineer: '工程师',
    };
    return roleMap[role] || role;
  }

  private generateRandomPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}
