/**
 * API 客户端
 */
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 类型定义
export interface EvaluationDataset {
  id: string
  knowledge_base_id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
}

export interface EvaluationDataItem {
  id: string
  dataset_id: string
  question: string
  ground_truth?: string
  context_doc_ids?: string[]
  created_at: string
}

export interface EvaluationRun {
  id: string
  knowledge_base_id: string
  dataset_id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  metrics?: {
    [key: string]: {
      mean: number
      min: number
      max: number
      count: number
    }
  }
  total_items: number
  completed_items: number
  error_message?: string
  created_at: string
  updated_at: string
  completed_at?: string
}

export interface EvaluationResult {
  id: string
  run_id: string
  data_item_id: string
  question: string
  answer?: string
  context?: string[]
  metrics?: {
    [key: string]: number
  }
  created_at: string
}

// API 方法
export const evaluationApi = {
  // 数据集管理
  async createDataset(data: {
    knowledge_base_id: string
    name: string
    description?: string
  }): Promise<EvaluationDataset> {
    const response = await api.post('/api/evaluation/datasets', data)
    return response.data
  },

  async listDatasets(knowledge_base_id?: string): Promise<EvaluationDataset[]> {
    const params = knowledge_base_id ? { knowledge_base_id } : {}
    const response = await api.get('/api/evaluation/datasets', { params })
    return response.data
  },

  async getDataset(dataset_id: string): Promise<EvaluationDataset> {
    const response = await api.get(`/api/evaluation/datasets/${dataset_id}`)
    return response.data
  },

  async updateDataset(
    dataset_id: string,
    data: { name?: string; description?: string }
  ): Promise<EvaluationDataset> {
    const response = await api.put(`/api/evaluation/datasets/${dataset_id}`, data)
    return response.data
  },

  async deleteDataset(dataset_id: string): Promise<void> {
    await api.delete(`/api/evaluation/datasets/${dataset_id}`)
  },

  // 数据项管理
  async createDataItem(
    dataset_id: string,
    data: {
      question: string
      ground_truth?: string
      context_doc_ids?: string[]
    }
  ): Promise<EvaluationDataItem> {
    const response = await api.post(
      `/api/evaluation/datasets/${dataset_id}/items`,
      data
    )
    return response.data
  },

  async listDataItems(dataset_id: string): Promise<EvaluationDataItem[]> {
    const response = await api.get(
      `/api/evaluation/datasets/${dataset_id}/items`
    )
    return response.data
  },

  async updateDataItem(
    dataset_id: string,
    item_id: string,
    data: {
      question?: string
      ground_truth?: string
      context_doc_ids?: string[]
    }
  ): Promise<EvaluationDataItem> {
    const response = await api.put(
      `/api/evaluation/datasets/${dataset_id}/items/${item_id}`,
      data
    )
    return response.data
  },

  async deleteDataItem(dataset_id: string, item_id: string): Promise<void> {
    await api.delete(
      `/api/evaluation/datasets/${dataset_id}/items/${item_id}`
    )
  },

  // 评估运行
  async createRun(data: {
    knowledge_base_id: string
    dataset_id: string
  }): Promise<EvaluationRun> {
    const response = await api.post('/api/evaluation/runs', data)
    return response.data
  },

  async listRuns(knowledge_base_id?: string): Promise<EvaluationRun[]> {
    const params = knowledge_base_id ? { knowledge_base_id } : {}
    const response = await api.get('/api/evaluation/runs', { params })
    return response.data
  },

  async getRun(run_id: string): Promise<EvaluationRun> {
    const response = await api.get(`/api/evaluation/runs/${run_id}`)
    return response.data
  },

  async getRunResults(run_id: string): Promise<EvaluationResult[]> {
    const response = await api.get(`/api/evaluation/runs/${run_id}/results`)
    return response.data
  },

  // 快速评估
  async quickEvaluate(data: {
    questions: string[]
    ground_truths?: string[]
    knowledge_base_id?: string
  }): Promise<{
    success: boolean
    metrics_summary?: {
      [key: string]: {
        mean: number
        min: number
        max: number
        count: number
      }
    }
    detailed_results?: any
    total_items: number
    error?: string
  }> {
    const response = await api.post('/api/evaluation/quick', data)
    return response.data
  },
}

export default api

