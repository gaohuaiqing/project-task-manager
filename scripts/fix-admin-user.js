/**
 * 修复 admin 用户脚本
 *
 * 问题：admin 用户登录失败
 * 可能原因：
 * 1. 数据库中没有 admin 用户
 * 2. admin 用户密码不正确
 * 3. users 表不存在
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  database: process.env.DB_NAME || 'task_manager',
  password: process.env.DB_PASSWORD || '',
};

async function checkAndFixAdminUser() {
  let connection;

  try {
    console.log('========================================');
    console.log('Admin 用户检查和修复工具');
    console.log('========================================\n');

    // 1. 连接数据库
    console.log('1. 连接数据库...');
    connection = await mysql.createConnection(dbConfig);
    console.log('   ✓ 数据库连接成功\n');

    // 2. 检查 users 表是否存在
    console.log('2. 检查 users 表...');
    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'users'"
    );

    if (tables.length === 0) {
      console.log('   ✗ users 表不存在，正在创建...\n');

      // 创建 users 表
      await connection.execute(`
        CREATE TABLE users (
          id INT PRIMARY KEY AUTO_INCREMENT,
          username VARCHAR(50) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role ENUM('admin', 'tech_manager', 'dept_manager', 'engineer') NOT NULL,
          name VARCHAR(100) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      console.log('   ✓ users 表创建成功\n');
    } else {
      console.log('   ✓ users 表已存在\n');
    }

    // 3. 检查 admin 用户是否存在
    console.log('3. 检查 admin 用户...');
    const [users] = await connection.query(
      "SELECT id, username, role, name FROM users WHERE username = 'admin'"
    );

    if (users.length === 0) {
      console.log('   ✗ admin 用户不存在，正在创建...\n');

      // 生成密码哈希
      const defaultPassword = 'admin123';
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      // 插入 admin 用户
      await connection.execute(
        `INSERT INTO users (username, password, role, name)
         VALUES ('admin', ?, 'admin', '系统管理员')`,
        [hashedPassword]
      );

      console.log('   ✓ admin 用户创建成功');
      console.log(`   用户名: admin`);
      console.log(`   密码: ${defaultPassword}`);
      console.log(`   角色: admin\n`);

    } else {
      console.log('   ✓ admin 用户已存在');
      const user = users[0];
      console.log(`   用户名: ${user.username}`);
      console.log(`   角色: ${user.role}`);
      console.log(`   姓名: ${user.name}\n`);

      // 4. 检查密码是否正确
      console.log('4. 验证密码...');
      const [userWithPassword] = await connection.query(
        "SELECT password FROM users WHERE username = 'admin'"
      );

      if (userWithPassword.length > 0) {
        const isValid = await bcrypt.compare('admin123', userWithPassword[0].password);

        if (isValid) {
          console.log('   ✓ 密码验证通过 (admin123)\n');
        } else {
          console.log('   ✗ 密码不匹配，正在重置密码...\n');

          // 重置密码
          const newHashedPassword = await bcrypt.hash('admin123', 10);
          await connection.execute(
            "UPDATE users SET password = ? WHERE username = 'admin'",
            [newHashedPassword]
          );

          console.log('   ✓ 密码已重置为: admin123\n');
        }
      }
    }

    // 5. 列出所有用户
    console.log('5. 当前所有用户:');
    const [allUsers] = await connection.query(
      "SELECT id, username, role, name FROM users ORDER BY id"
    );

    if (allUsers.length === 0) {
      console.log('   (没有用户)\n');
    } else {
      allUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.username} (${user.name}) - ${user.role}`);
      });
      console.log('');
    }

    console.log('========================================');
    console.log('✓ 检查和修复完成！');
    console.log('========================================\n');
    console.log('您现在可以使用以下凭据登录:');
    console.log('  用户名: admin');
    console.log('  密码: admin123\n');

  } catch (error) {
    console.error('\n✗ 发生错误:', error.message);
    console.error('\n请检查:');
    console.error('  1. MySQL 服务是否启动');
    console.error('  2. 数据库配置是否正确 (.env 文件)');
    console.error('  3. 数据库连接权限是否足够\n');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 运行检查和修复
checkAndFixAdminUser();
