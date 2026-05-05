/**
 * 并发控制工具
 * 限制同时执行的异步任务数量，防止请求风暴
 *
 * @module shared/utils/concurrent
 */

/**
 * 以限制并发数的方式批量执行异步任务
 *
 * @param items 待处理的数据数组
 * @param fn 对每个元素执行的异步函数
 * @param concurrency 最大并发数（默认 5）
 * @returns 所有结果的数组（保持原始顺序）
 */
export async function concurrentMap<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency = 5,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const idx = nextIndex++;
      results[idx] = await fn(items[idx], idx);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );

  await Promise.all(workers);
  return results;
}
