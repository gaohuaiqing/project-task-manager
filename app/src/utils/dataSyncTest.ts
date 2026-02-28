/**
 * 数据同步测试工具
 * 在浏览器控制台运行此脚本来测试数据同步
 *
 * 使用方法:
 * 1. 打开浏览器控制台（F12）
 * 2. 复制此脚本内容到控制台
 * 3. 运行 test() 开始测试
 */

interface TestData {
  dataType: string;
  dataId: string;
  data: any;
}

class DataSyncTest {
  private apiBase = 'http://localhost:3001/api';
  private testResults: { name: string; status: 'pass' | 'fail'; message: string }[] = [];

  /**
   * 测试 1: 验证后端连接
   */
  async testBackendConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBase}/../health`);
      const result = await response.json();
      const success = result.status === 'ok';

      this.testResults.push({
        name: '后端连接',
        status: success ? 'pass' : 'fail',
        message: success ? '后端服务正常' : '后端服务异常'
      });

      return success;
    } catch (error) {
      this.testResults.push({
        name: '后端连接',
        status: 'fail',
        message: `连接失败: ${error}`
      });
      return false;
    }
  }

  /**
   * 测试 2: 验证 global-data API
   */
  async testGlobalDataAPI(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBase}/global-data/get?dataType=projects&limit=1`);
      const result = await response.json();
      const success = result.success && result.data && result.data.length > 0;

      this.testResults.push({
        name: 'global-data API',
        status: success ? 'pass' : 'fail',
        message: success ? `成功获取项目数据 (示例: ${result.data[0].data_json.name})` : '获取数据失败'
      });

      return success;
    } catch (error) {
      this.testResults.push({
        name: 'global-data API',
        status: 'fail',
        message: `API 调用失败: ${error}`
      });
      return false;
    }
  }

  /**
   * 测试 3: 验证数据格式
   */
  async testDataFormat(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBase}/global-data/get?dataType=projects&limit=1`);
      const result = await response.json();

      if (!result.success || !result.data || result.data.length === 0) {
        this.testResults.push({
          name: '数据格式',
          status: 'fail',
          message: '没有数据可验证'
        });
        return false;
      }

      const item = result.data[0];
      const hasRequiredFields =
        item.data_type &&
        item.data_id &&
        item.data_json &&
        item.version !== undefined;

      this.testResults.push({
        name: '数据格式',
        status: hasRequiredFields ? 'pass' : 'fail',
        message: hasRequiredFields ? '数据格式正确' : '数据缺少必要字段'
      });

      return hasRequiredFields;
    } catch (error) {
      this.testResults.push({
        name: '数据格式',
        status: 'fail',
        message: `验证失败: ${error}`
      });
      return false;
    }
  }

  /**
   * 测试 4: 创建测试数据
   */
  async testCreateData(): Promise<boolean> {
    try {
      const testData = {
        dataType: 'projects',
        dataId: `test_project_${Date.now()}`,
        data: {
          id: Date.now(),
          name: `同步测试项目 ${new Date().toLocaleTimeString()}`,
          description: '用于测试数据同步功能',
          status: 'planning',
          progress: 0,
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        changeReason: '数据同步测试'
      };

      const response = await fetch(`${this.apiBase}/global-data/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      });

      const result = await response.json();
      const success = result.success;

      this.testResults.push({
        name: '创建数据',
        status: success ? 'pass' : 'fail',
        message: success
          ? `成功创建测试项目: ${testData.data.name} (ID: ${testData.dataId})`
          : `创建失败: ${result.message}`
      });

      // 保存 dataId 用于后续清理
      if (success) {
        (window as any).__testDataId = testData.dataId;
      }

      return success;
    } catch (error) {
      this.testResults.push({
        name: '创建数据',
        status: 'fail',
        message: `创建失败: ${error}`
      });
      return false;
    }
  }

  /**
   * 测试 5: 验证数据持久化
   */
  async testDataPersistence(): Promise<boolean> {
    try {
      const testDataId = (window as any).__testDataId;
      if (!testDataId) {
        this.testResults.push({
          name: '数据持久化',
          status: 'fail',
          message: '没有测试数据 ID，请先运行创建数据测试'
        });
        return false;
      }

      // 等待 1 秒后查询
      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = await fetch(`${this.apiBase}/global-data/get?dataType=projects&dataId=${testDataId}`);
      const result = await response.json();

      const success = result.success && result.data && result.data.length > 0;

      this.testResults.push({
        name: '数据持久化',
        status: success ? 'pass' : 'fail',
        message: success ? '数据已成功持久化到数据库' : '数据持久化失败'
      });

      return success;
    } catch (error) {
      this.testResults.push({
        name: '数据持久化',
        status: 'fail',
        message: `验证失败: ${error}`
      });
      return false;
    }
  }

  /**
   * 测试 6: 清理测试数据
   */
  async cleanupTestData(): Promise<boolean> {
    try {
      const testDataId = (window as any).__testDataId;
      if (!testDataId) {
        console.log('没有测试数据需要清理');
        return true;
      }

      const response = await fetch(`${this.apiBase}/global-data/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataType: 'projects',
          dataId: testDataId,
          changeReason: '清理测试数据'
        })
      });

      const result = await response.json();
      const success = result.success;

      console.log(success ? '✅ 测试数据已清理' : `⚠️ 清理失败: ${result.message}`);

      if (success) {
        delete (window as any).__testDataId;
      }

      return success;
    } catch (error) {
      console.error('清理测试数据失败:', error);
      return false;
    }
  }

  /**
   * 显示测试结果
   */
  showResults() {
    console.clear();
    console.log('='.repeat(60));
    console.log('数据同步测试结果');
    console.log('='.repeat(60));

    let passCount = 0;
    let failCount = 0;

    this.testResults.forEach((result, index) => {
      const icon = result.status === 'pass' ? '✅' : '❌';
      console.log(`${icon} 测试 ${index + 1}: ${result.name}`);
      console.log(`   ${result.message}`);

      if (result.status === 'pass') passCount++;
      else failCount++;
    });

    console.log('\n' + '='.repeat(60));
    console.log(`总计: ${passCount} 通过, ${failCount} 失败`);

    if (failCount === 0) {
      console.log('\n🎉 所有测试通过！数据同步功能正常。');
    } else {
      console.log('\n⚠️ 部分测试失败，请检查上述错误。');
    }

    console.log('='.repeat(60));
  }

  /**
   * 运行所有测试
   */
  async runAll() {
    console.log('开始运行数据同步测试...\n');

    await this.testBackendConnection();
    await this.testGlobalDataAPI();
    await this.testDataFormat();
    await this.testCreateData();
    await this.testDataPersistence();

    this.showResults();

    // 提示清理
    const testDataId = (window as any).__testDataId;
    if (testDataId) {
      console.log('\n💡 提示: 运行 cleanup() 清理测试数据');
    }
  }
}

// ============================================
// 快捷命令
// ============================================

const testSync = new DataSyncTest();

// 运行所有测试
(window as any).test = () => testSync.runAll();

// 清理测试数据
(window as any).cleanup = () => testSync.cleanupTestData();

// 查看测试数据 ID
(window as any).getTestId = () => (window as any).__testDataId;

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    数据同步测试工具                            ║
╠═══════════════════════════════════════════════════════════════╣
║  运行测试:   test()                                           ║
║  清理数据:  cleanup()                                         ║
║  查看ID:    getTestId()                                       ║
╚═══════════════════════════════════════════════════════════════╝
`);

export default DataSyncTest;
