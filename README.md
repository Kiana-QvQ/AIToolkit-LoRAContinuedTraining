# AI Toolkit（LoRA 续训扩展）

本仓库基于 [ostris/ai-toolkit](https://github.com/ostris/ai-toolkit) 扩展，遵循原项目 [MIT](./LICENSE) 许可（Copyright Ostris, LLC）。安装、训练与完整功能说明请参考[上游仓库](https://github.com/ostris/ai-toolkit)。

## 本仓库新增

- **`network.base_loras`**：在固定 Base LoRA 上继续训练新 LoRA（训练效果为 `底模 + base_loras + 可训 LoRA`；保存的仍是新 LoRA 增量）
- **AI Toolkit UI**：`Base LoRAs` 配置（路径、强度）、`.safetensors` 选择器、训练日志中的加载反馈

```yaml
network:
  type: lora
  linear: 32
  linear_alpha: 32
  base_loras:
    - path: "output/lora1/lora1.safetensors"
      strength: 1.0
    - path: "output/style1/style1.safetensors"
      strength: 0.35
```
