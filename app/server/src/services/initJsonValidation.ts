/**
 * JSON 字段验证约束初始化
 * 为 JSON 类型字段添加触发器验证，确保数据格式正确
 */

import { databaseService } from './DatabaseService.js';

/**
 * 创建 JSON 格式验证触发器
 */
async function createJsonValidationTrigger(
  tableName: string,
  columnName: string,
  validatorName: string,
  validationFn: string
): Promise<void> {
  const connection = await databaseService.getConnection();

  try {
    // 删除旧的触发器（如果存在）
    await connection.query(`DROP TRIGGER IF EXISTS ${validatorName}_before_insert`);
    await connection.query(`DROP TRIGGER IF EXISTS ${validatorName}_before_update`);

    // 创建 INSERT 触发器
    await connection.query(`
      CREATE TRIGGER ${validatorName}_before_insert
      BEFORE INSERT ON ${tableName}
      FOR EACH ROW
      BEGIN
        IF NEW.${columnName} IS NOT NULL AND JSON_VALID(NEW.${columnName}) = 0 THEN
          SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = '${tableName}.${columnName} 必须是有效的 JSON 格式';
        END IF;
      END
    `);

    // 创建 UPDATE 触发器
    await connection.query(`
      CREATE TRIGGER ${validatorName}_before_update
      BEFORE UPDATE ON ${tableName}
      FOR EACH ROW
      BEGIN
        IF NEW.${columnName} IS NOT NULL AND JSON_VALID(NEW.${columnName}) = 0 THEN
          SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = '${tableName}.${columnName} 必须是有效的 JSON 格式';
        END IF;
      END
    `);

    console.log(`[JsonValidation] ${tableName}.${columnName} JSON 验证触发器已创建`);
  } catch (error) {
    console.error(`[JsonValidation] ${tableName}.${columnName} 触发器创建失败:`, error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 创建 JSON 数组格式验证触发器（确保是数组）
 */
async function createJsonArrayValidationTrigger(
  tableName: string,
  columnName: string,
  validatorName: string
): Promise<void> {
  const connection = await databaseService.getConnection();

  try {
    // 删除旧的触发器
    await connection.query(`DROP TRIGGER IF EXISTS ${validatorName}_before_insert`);
    await connection.query(`DROP TRIGGER IF EXISTS ${validatorName}_before_update`);

    // 创建 INSERT 触发器
    await connection.query(`
      CREATE TRIGGER ${validatorName}_before_insert
      BEFORE INSERT ON ${tableName}
      FOR EACH ROW
      BEGIN
        IF NEW.${columnName} IS NOT NULL AND JSON_VALID(NEW.${columnName}) = 0 THEN
          SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = '${tableName}.${columnName} 必须是有效的 JSON 格式';
        END IF;
        IF NEW.${columnName} IS NOT NULL AND JSON_TYPE(NEW.${columnName}) != 'ARRAY' THEN
          SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = '${tableName}.${columnName} 必须是 JSON 数组格式';
        END IF;
      END
    `);

    // 创建 UPDATE 触发器
    await connection.query(`
      CREATE TRIGGER ${validatorName}_before_update
      BEFORE UPDATE ON ${tableName}
      FOR EACH ROW
      BEGIN
        IF NEW.${columnName} IS NOT NULL AND JSON_VALID(NEW.${columnName}) = 0 THEN
          SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = '${tableName}.${columnName} 必须是有效的 JSON 格式';
        END IF;
        IF NEW.${columnName} IS NOT NULL AND JSON_TYPE(NEW.${columnName}) != 'ARRAY' THEN
          SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = '${tableName}.${columnName} 必须是 JSON 数组格式';
        END IF;
      END
    `);

    console.log(`[JsonValidation] ${tableName}.${columnName} JSON 数组验证触发器已创建`);
  } catch (error) {
    console.error(`[JsonValidation] ${tableName}.${columnName} 触发器创建失败:`, error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 创建 JSON 任意格式验证触发器（允许对象或数组）
 */
async function createJsonAnyValidationTrigger(
  tableName: string,
  columnName: string,
  validatorName: string
): Promise<void> {
  const connection = await databaseService.getConnection();

  try {
    // 删除旧的触发器
    await connection.query(`DROP TRIGGER IF EXISTS ${validatorName}_before_insert`);
    await connection.query(`DROP TRIGGER IF EXISTS ${validatorName}_before_update`);

    // 创建 INSERT 触发器
    await connection.query(`
      CREATE TRIGGER ${validatorName}_before_insert
      BEFORE INSERT ON ${tableName}
      FOR EACH ROW
      BEGIN
        IF NEW.${columnName} IS NOT NULL AND JSON_VALID(NEW.${columnName}) = 0 THEN
          SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = '${tableName}.${columnName} 必须是有效的 JSON 格式';
        END IF;
      END
    `);

    // 创建 UPDATE 触发器
    await connection.query(`
      CREATE TRIGGER ${validatorName}_before_update
      BEFORE UPDATE ON ${tableName}
      FOR EACH ROW
      BEGIN
        IF NEW.${columnName} IS NOT NULL AND JSON_VALID(NEW.${columnName}) = 0 THEN
          SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = '${tableName}.${columnName} 必须是有效的 JSON 格式';
        END IF;
      END
    `);

    console.log(`[JsonValidation] ${tableName}.${columnName} JSON 任意格式验证触发器已创建`);
  } catch (error) {
    console.error(`[JsonValidation] ${tableName}.${columnName} 触发器创建失败:`, error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 创建 JSON 对象格式验证触发器（确保是对象）
 */
async function createJsonObjectValidationTrigger(
  tableName: string,
  columnName: string,
  validatorName: string
): Promise<void> {
  const connection = await databaseService.getConnection();

  try {
    // 删除旧的触发器
    await connection.query(`DROP TRIGGER IF EXISTS ${validatorName}_before_insert`);
    await connection.query(`DROP TRIGGER IF EXISTS ${validatorName}_before_update`);

    // 创建 INSERT 触发器
    await connection.query(`
      CREATE TRIGGER ${validatorName}_before_insert
      BEFORE INSERT ON ${tableName}
      FOR EACH ROW
      BEGIN
        IF NEW.${columnName} IS NOT NULL AND JSON_VALID(NEW.${columnName}) = 0 THEN
          SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = '${tableName}.${columnName} 必须是有效的 JSON 格式';
        END IF;
        IF NEW.${columnName} IS NOT NULL AND JSON_TYPE(NEW.${columnName}) != 'OBJECT' THEN
          SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = '${tableName}.${columnName} 必须是 JSON 对象格式';
        END IF;
      END
    `);

    // 创建 UPDATE 触发器
    await connection.query(`
      CREATE TRIGGER ${validatorName}_before_update
      BEFORE UPDATE ON ${tableName}
      FOR EACH ROW
      BEGIN
        IF NEW.${columnName} IS NOT NULL AND JSON_VALID(NEW.${columnName}) = 0 THEN
          SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = '${tableName}.${columnName} 必须是有效的 JSON 格式';
        END IF;
        IF NEW.${columnName} IS NOT NULL AND JSON_TYPE(NEW.${columnName}) != 'OBJECT' THEN
          SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = '${tableName}.${columnName} 必须是 JSON 对象格式';
        END IF;
      END
    `);

    console.log(`[JsonValidation] ${tableName}.${columnName} JSON 对象验证触发器已创建`);
  } catch (error) {
    console.error(`[JsonValidation] ${tableName}.${columnName} 触发器创建失败:`, error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 初始化 JSON 字段验证
 */
export async function initJsonValidation(): Promise<void> {
  try {
    console.log('[JsonValidation] 开始初始化 JSON 字段验证...');

    // members 表 JSON 验证
    await createJsonArrayValidationTrigger('members', 'skills', 'val_members_skills');
    await createJsonObjectValidationTrigger('members', 'capabilities', 'val_members_capabilities');

    // wbs_tasks 表 JSON 验证
    await createJsonArrayValidationTrigger('wbs_tasks', 'dependencies', 'val_wbs_dependencies');
    await createJsonArrayValidationTrigger('wbs_tasks', 'tags', 'val_wbs_tags');
    await createJsonArrayValidationTrigger('wbs_tasks', 'attachments', 'val_wbs_attachments');

    // global_data 表 JSON 验证（允许对象或数组）
    await createJsonAnyValidationTrigger('global_data', 'data_json', 'val_global_data_json');

    // data_change_log 表 JSON 验证（允许对象或数组，因为保存的是 global_data 的副本）
    await createJsonAnyValidationTrigger('data_change_log', 'old_value', 'val_change_log_old');
    await createJsonAnyValidationTrigger('data_change_log', 'new_value', 'val_change_log_new');

    // data_versions 表 JSON 验证（允许对象或数组，因为保存的是 global_data 的副本）
    await createJsonAnyValidationTrigger('data_versions', 'change_data', 'val_versions_change_data');

    console.log('[JsonValidation] ✅ JSON 字段验证初始化成功');
  } catch (error) {
    console.error('[JsonValidation] ❌ 初始化失败:', error);
    throw error;
  }
}
