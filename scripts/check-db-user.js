/**
 * 快速检查数据库中的 admin 用户
 */
const mysql = require('mysql2/promise');

async function checkAdminUser() {
  let connection;
  try {
    console.log('========================================');
    console.log('检查数据库中的 admin 用户');
    console.log('========================================\n');

    // 连接数据库
    console.log('1. 连接数据库...');
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'task_manager'
    });
    console.log('   ✓ 数据库连接成功\n');

    // 检查 users 表是否存在
    console.log('2. 检查 users 表...');
    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'users'"
    );

    if (tables.length === 0) {
      console.log('   ✗ users 表不存在！\n');
      console.log('正在创建 users 表...');

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

    // 检查 admin 用户
    console.log('3. 检查 admin 用户...');
    const [users] = await connection.query(
      "SELECT id, username, role, name, LEFT(password, 20) as password_prefix FROM users WHERE username = 'admin'"
    );

    if (users.length === 0) {
      console.log('   ✗ admin 用户不存在！\n');
      console.log('正在创建 admin 用户...');

      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('admin123', 10);

      await connection.execute(
        'INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)',
        ['admin', hashedPassword, 'admin', '系统管理员']
      );

      console.log('   ✓ admin 用户创建成功');
      console.log('   用户名: admin');
      console.log('   密码: admin123\n');
    } else {
      const user = users[0];
      console.log('   ✓ admin 用户已存在');
      console.log(`   ID: ${user.id}`);
      console.log(`   用户名: ${user.username}`);
      console.log(`   角色: ${user.role}`);
      console.log(`   姓名: ${user.name}`);
      console.log(`   密码前缀: ${user.password_prefix}...\n`);

      // 验证密码
      console.log('4. 验证密码...');
      const bcrypt = require('bcrypt');
      const [userWithFullPassword] = await connection.query(
        "SELECT password FROM users WHERE username = 'admin'"
      );

      if (userWithFullPassword.length > 0) {
        const isValid = await bcrypt.compare('admin123', userWithFullPassword[0].password);
        if (isValid) {
          console.log('   ✓ 密码验证通过 (admin123)\n');
        } else {
          console.log('   ✗ 密码不匹配！正在重置...\n');

          const newHashedPassword = await bcrypt.hash('admin123', 10);
          await connection.execute(
            "UPDATE users SET password = ? WHERE username = 'admin'",
            [newHashedPassword]
          );

          console.log('   ✓ 密码已重置为: admin123\n');
        }
      }
    }

    // 显示所有用户
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
    console.error('\n可能的原因:');
    console.error('  1. MySQL 服务未启动');
    console.error('  2. 数据库连接配置不正确');
    console.error('  3. 数据库 task_manager 不存在\n');

    // 尝试创建数据库
    console.log('尝试创建数据库...');
    try {
      const createConnection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: ''
      });

      await createConnection.query(
        'CREATE DATABASE IF NOT EXISTS task_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
      );

      console.log('✓ 数据库创建成功，请重新运行此脚本！\n');
      await createConnection.end();
    } catch (createError) {
      console.error('✗ 创建数据库失败:', createError.message);
      console.error('\n请检查:');
      console.error('  1. MySQL 服务是否已启动');
      console.error('  2. MySQL root 用户密码是否为空');
      console.error('  3. 是否有足够的权限创建数据库\n');
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkAdminUser();
