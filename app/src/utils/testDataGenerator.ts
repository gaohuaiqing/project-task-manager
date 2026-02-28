import type { DelayRecord, PlanAdjustmentRecord } from '@/types/wbs';

export function generateTestDelayRecords(taskIds: string[]): DelayRecord[] {
  const records: DelayRecord[] = [];
  
  taskIds.forEach((taskId, index) => {
    if (index % 3 === 0) {
      records.push({
        id: `delay-${taskId}-1`,
        taskId,
        delayDate: '2026-02-10',
        originalEndDate: '2026-02-08',
        newEndDate: '2026-02-15',
        delayDays: 7,
        reason: '需求变更，需要额外时间进行开发',
        createdAt: new Date().toISOString()
      });
    }
    
    if (index % 5 === 0) {
      records.push({
        id: `delay-${taskId}-2`,
        taskId,
        delayDate: '2026-02-20',
        originalEndDate: '2026-02-18',
        newEndDate: '2026-02-25',
        delayDays: 7,
        reason: '技术难题，需要深入研究解决方案',
        createdAt: new Date().toISOString()
      });
    }
  });
  
  return records;
}

export function generateTestPlanAdjustmentRecords(taskIds: string[]): PlanAdjustmentRecord[] {
  const records: PlanAdjustmentRecord[] = [];
  
  taskIds.forEach((taskId, index) => {
    if (index % 4 === 0) {
      records.push({
        id: `adjust-${taskId}-1`,
        taskId,
        adjustmentDate: '2026-02-05',
        adjustmentType: 'duration',
        before: {
          startDate: '2026-02-01',
          endDate: '2026-02-10',
          days: 10
        },
        after: {
          startDate: '2026-02-01',
          endDate: '2026-02-15',
          days: 15
        },
        reason: '项目优先级提升，需要增加工期',
        createdAt: new Date().toISOString()
      });
    }
    
    if (index % 6 === 0) {
      records.push({
        id: `adjust-${taskId}-2`,
        taskId,
        adjustmentDate: '2026-02-12',
        adjustmentType: 'all',
        before: {
          startDate: '2026-02-15',
          endDate: '2026-02-25',
          days: 10
        },
        after: {
          startDate: '2026-02-18',
          endDate: '2026-03-01',
          days: 12
        },
        reason: '资源调配，调整计划时间',
        createdAt: new Date().toISOString()
      });
    }
  });
  
  return records;
}

export function initializeTestRecords(taskIds: string[]) {
  const delayRecords = generateTestDelayRecords(taskIds);
  const adjustmentRecords = generateTestPlanAdjustmentRecords(taskIds);
  
  localStorage.setItem('delayRecords', JSON.stringify(delayRecords));
  localStorage.setItem('planAdjustmentRecords', JSON.stringify(adjustmentRecords));
  
  console.log('测试数据已初始化');
  console.log('延期记录:', delayRecords);
  console.log('计划调整记录:', adjustmentRecords);
}