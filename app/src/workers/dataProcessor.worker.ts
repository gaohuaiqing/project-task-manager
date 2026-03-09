/**
 * Web Worker - 数据处理专用
 *
 * 功能：
 * 1. 在独立线程处理大数据计算
 * 2. 不阻塞主线程 UI
 * 3. 支持数据过滤、排序、聚合
 *
 * @module workers/dataProcessor
 */

// ==================== 类型定义 ====================

interface FilterRequest {
  type: 'filter';
  data: any[];
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'contains' | 'startsWith';
  value: any;
}

interface SortRequest {
  type: 'sort';
  data: any[];
  field: string;
  order: 'asc' | 'desc';
}

interface AggregateRequest {
  type: 'aggregate';
  data: any[];
  groupBy?: string;
  operations: Array<{
    field: string;
    op: 'sum' | 'avg' | 'count' | 'min' | 'max';
    alias: string;
  }>;
}

type WorkerRequest = FilterRequest | SortRequest | AggregateRequest;

interface WorkerResponse {
  type: string;
  data: any;
  error?: string;
  processingTime: number;
}

// ==================== 数据处理函数 ====================

/**
 * 过滤数据
 */
function filterData(data: any[], field: string, operator: string, value: any): any[] {
  return data.filter(item => {
    const itemValue = item[field];

    switch (operator) {
      case 'eq':
        return itemValue === value;
      case 'ne':
        return itemValue !== value;
      case 'gt':
        return itemValue > value;
      case 'lt':
        return itemValue < value;
      case 'contains':
        return String(itemValue).toLowerCase().includes(String(value).toLowerCase());
      case 'startsWith':
        return String(itemValue).toLowerCase().startsWith(String(value).toLowerCase());
      default:
        return true;
    }
  });
}

/**
 * 排序数据
 */
function sortData(data: any[], field: string, order: 'asc' | 'desc'): any[] {
  return [...data].sort((a, b) => {
    const aVal = a[field];
    const bVal = b[field];

    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * 聚合数据
 */
function aggregateData(
  data: any[],
  groupBy: string | undefined,
  operations: Array<{ field: string; op: string; alias: string }>
): any {
  if (groupBy) {
    // 分组聚合
    const groups = new Map<string, any[]>();

    data.forEach(item => {
      const key = String(item[groupBy]);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    });

    const result = Array.from(groups.entries()).map(([key, items]) => {
      const aggregated: any = { [groupBy]: key };

      operations.forEach(op => {
        switch (op.op) {
          case 'sum':
            aggregated[op.alias] = items.reduce((sum, item) => sum + (Number(item[op.field]) || 0), 0);
            break;
          case 'avg':
            aggregated[op.alias] = items.reduce((sum, item) => sum + (Number(item[op.field]) || 0), 0) / items.length;
            break;
          case 'count':
            aggregated[op.alias] = items.length;
            break;
          case 'min':
            aggregated[op.alias] = Math.min(...items.map(item => Number(item[op.field]) || 0));
            break;
          case 'max':
            aggregated[op.alias] = Math.max(...items.map(item => Number(item[op.field]) || 0));
            break;
        }
      });

      return aggregated;
    });

    return result;
  } else {
    // 全局聚合
    const result: any = {};

    operations.forEach(op => {
      switch (op.op) {
        case 'sum':
          result[op.alias] = data.reduce((sum, item) => sum + (Number(item[op.field]) || 0), 0);
          break;
        case 'avg':
          result[op.alias] = data.reduce((sum, item) => sum + (Number(item[op.field]) || 0), 0) / data.length;
          break;
        case 'count':
          result[op.alias] = data.length;
          break;
        case 'min':
          result[op.alias] = Math.min(...data.map(item => Number(item[op.field]) || 0));
          break;
        case 'max':
          result[op.alias] = Math.max(...data.map(item => Number(item[op.field]) || 0));
          break;
      }
    });

    return result;
  }
}

// ==================== Worker 消息处理 ====================

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const startTime = performance.now();
  const { type } = event.data;

  try {
    let result: any;

    switch (type) {
      case 'filter': {
        const { data, field, operator, value } = event.data;
        result = filterData(data, field, operator, value);
        break;
      }

      case 'sort': {
        const { data, field, order } = event.data;
        result = sortData(data, field, order);
        break;
      }

      case 'aggregate': {
        const { data, groupBy, operations } = event.data;
        result = aggregateData(data, groupBy, operations);
        break;
      }

      default:
        throw new Error(`Unknown operation type: ${type}`);
    }

    const processingTime = performance.now() - startTime;

    const response: WorkerResponse = {
      type,
      data: result,
      processingTime
    };

    self.postMessage(response);
  } catch (error) {
    const processingTime = performance.now() - startTime;

    const response: WorkerResponse = {
      type,
      data: null,
      error: error instanceof Error ? error.message : String(error),
      processingTime
    };

    self.postMessage(response);
  }
};

// 导出类型供外部使用
export type { WorkerRequest, WorkerResponse };
