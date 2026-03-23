// Script to add missing columns to wbs_tasks table
import { createPool, closePool } from '../src/core/db';

async function migrate() {
  const pool = createPool();

  // First, check and modify id column type if needed
  try {
    const [idCol] = await pool.execute(
      `SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = 'task_manager' AND TABLE_NAME = 'wbs_tasks' AND COLUMN_NAME = 'id'`
    );
    const idType = (idCol as any[])[0]?.DATA_TYPE;
    console.log('Current id column type:', idType);

    if (idType !== 'varchar') {
      console.log('Modifying id column to VARCHAR(36)...');

      // Step 1: Get all foreign keys referencing wbs_tasks
      const [fkRows] = await pool.execute(
        `SELECT TABLE_NAME, CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
         WHERE REFERENCED_TABLE_SCHEMA = 'task_manager' AND REFERENCED_TABLE_NAME = 'wbs_tasks'`
      );
      const foreignKeys = fkRows as any[];
      console.log('Found foreign keys:', foreignKeys.map(f => `${f.TABLE_NAME}.${f.CONSTRAINT_NAME}`).join(', '));

      // Step 2: Drop all foreign keys
      for (const fk of foreignKeys) {
        try {
          await pool.execute(`ALTER TABLE ${fk.TABLE_NAME} DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`);
          console.log(`Dropped FK: ${fk.TABLE_NAME}.${fk.CONSTRAINT_NAME}`);
        } catch (e) {
          console.log(`Could not drop FK ${fk.TABLE_NAME}.${fk.CONSTRAINT_NAME}: ${e}`);
        }
      }

      // Also drop self-referencing FK from wbs_tasks
      try {
        await pool.execute('ALTER TABLE wbs_tasks DROP FOREIGN KEY wbs_tasks_ibfk_2');
        console.log('Dropped self-referencing FK');
      } catch (e) {
        console.log('No self-referencing FK to drop');
      }

      // Step 3: Clear existing data
      await pool.execute('DELETE FROM wbs_tasks');
      console.log('Cleared existing task data');

      // Step 4: Modify id column
      await pool.execute('ALTER TABLE wbs_tasks MODIFY COLUMN id VARCHAR(36) NOT NULL');
      console.log('id column modified to VARCHAR(36)');

      // Step 5: Modify parent_id column to match
      await pool.execute('ALTER TABLE wbs_tasks MODIFY COLUMN parent_id VARCHAR(36) NULL');
      console.log('parent_id column modified to VARCHAR(36)');

      // Step 6: Modify task_id in related tables
      const relatedTables = ['progress_records', 'task_changes'];
      for (const table of relatedTables) {
        try {
          await pool.execute(`ALTER TABLE ${table} MODIFY COLUMN task_id VARCHAR(36) NOT NULL`);
          console.log(`${table}.task_id modified to VARCHAR(36)`);
        } catch (e) {
          console.log(`Could not modify ${table}.task_id: ${e}`);
        }
      }

      console.log('id column modification completed');
    }
  } catch (error) {
    console.error('Error modifying id column:', error);
    // Continue with other migrations
  }

  // Fix status ENUM to include all required values
  try {
    console.log('Updating status ENUM...');
    await pool.execute(
      `ALTER TABLE wbs_tasks MODIFY COLUMN status ENUM(
        'pending_approval', 'rejected', 'not_started', 'in_progress',
        'early_completed', 'on_time_completed', 'delay_warning',
        'delayed', 'overdue_completed'
      ) DEFAULT 'not_started'`
    );
    console.log('Status ENUM updated');
  } catch (error) {
    console.error('Error updating status ENUM:', error);
  }

  const columnsToAdd = [
    { name: 'wbs_level', sql: 'ADD COLUMN wbs_level INT DEFAULT 1 AFTER wbs_code' },
    { name: 'start_date', sql: 'ADD COLUMN start_date DATE NULL AFTER assignee_id' },
    { name: 'end_date', sql: 'ADD COLUMN end_date DATE NULL AFTER start_date' },
    { name: 'duration', sql: 'ADD COLUMN duration INT NULL AFTER end_date' },
    { name: 'is_six_day_week', sql: 'ADD COLUMN is_six_day_week BOOLEAN DEFAULT FALSE AFTER duration' },
    { name: 'planned_duration', sql: 'ADD COLUMN planned_duration INT NULL AFTER is_six_day_week' },
    { name: 'warning_days', sql: 'ADD COLUMN warning_days INT DEFAULT 3 AFTER planned_duration' },
    { name: 'actual_start_date', sql: 'ADD COLUMN actual_start_date DATE NULL AFTER warning_days' },
    { name: 'actual_end_date', sql: 'ADD COLUMN actual_end_date DATE NULL AFTER actual_start_date' },
    { name: 'actual_duration', sql: 'ADD COLUMN actual_duration INT NULL AFTER actual_end_date' },
    { name: 'full_time_ratio', sql: 'ADD COLUMN full_time_ratio INT DEFAULT 100 AFTER actual_duration' },
    { name: 'actual_cycle', sql: 'ADD COLUMN actual_cycle INT NULL AFTER full_time_ratio' },
    { name: 'predecessor_id', sql: 'ADD COLUMN predecessor_id VARCHAR(36) NULL AFTER actual_cycle' },
    { name: 'lag_days', sql: 'ADD COLUMN lag_days INT NULL AFTER predecessor_id' },
    { name: 'redmine_link', sql: 'ADD COLUMN redmine_link VARCHAR(500) NULL AFTER lag_days' },
    { name: 'delay_count', sql: 'ADD COLUMN delay_count INT DEFAULT 0 AFTER redmine_link' },
    { name: 'plan_change_count', sql: 'ADD COLUMN plan_change_count INT DEFAULT 0 AFTER delay_count' },
    { name: 'progress_record_count', sql: 'ADD COLUMN progress_record_count INT DEFAULT 0 AFTER plan_change_count' },
    { name: 'tags', sql: 'ADD COLUMN tags TEXT NULL AFTER progress_record_count' },
    { name: 'version', sql: 'ADD COLUMN version INT DEFAULT 1 AFTER tags' },
  ];

  try {
    // Get existing columns
    const [existingCols] = await pool.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = 'task_manager' AND TABLE_NAME = 'wbs_tasks'`
    );
    const existing = new Set((existingCols as any[]).map(c => c.COLUMN_NAME));
    console.log('Existing columns:', [...existing].join(', '));

    for (const col of columnsToAdd) {
      if (!existing.has(col.name)) {
        console.log(`Adding column: ${col.name}`);
        await pool.execute(`ALTER TABLE wbs_tasks ${col.sql}`);
        console.log(`Column ${col.name} added successfully`);
      } else {
        console.log(`Column ${col.name} already exists, skipping`);
      }
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await closePool();
  }
}

migrate();
