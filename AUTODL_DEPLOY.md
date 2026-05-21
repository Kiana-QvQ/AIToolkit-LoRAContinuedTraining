# AutoDL 部署（ai-toolkit-gl）

与官方镜像里的 **stock `~/ai-toolkit`** 并存：官方 WebUI 一般用 **6006**，本扩展用 **6008**。

## 原环境（`ai-toolkit-reference` / 官方镜像）

| 项目 | 说明 |
|------|------|
| 代码目录 | `~/ai-toolkit` |
| WebUI 端口 | **6006**（reference 里 `next start --port ${PORT:-6006}`） |
| Python | **`conda activate ai-toolkit`** → `/root/miniconda3/envs/ai-toolkit` |
| 训练依赖 | 该 conda 环境里已有 `torch`、`diffusers` 等 |
| `base` conda | 仅系统默认，**不要**用来跑训练 |

你当前机器上 **没有** `~/ai-toolkit/venv` 时，应使用 **conda `ai-toolkit`**，不要用 `base`。

## 本扩展（ai-toolkit-gl）

| 项目 | 说明 |
|------|------|
| 代码目录 | `~/ai-toolkit-gl` |
| WebUI 端口 | **6008** |
| Python | 软链 `~/ai-toolkit-gl/venv/bin/python` → conda `ai-toolkit` 的 python |
| 数据集（Jupyter/秋叶） | `/root/autodl-tmp/train`（优先）或 `datasets` |
| LoRA 扫描 | `/root/autodl-tmp/loras` |
| 训练输出 | `/root/autodl-tmp/training` |
| 底模目录（秋叶 sd-models） | `/root/autodl-tmp/models/Stable-diffusion/*.safetensors` |
| HF 缓存（推荐 SD1.5） | `/root/autodl-tmp/huggingface_cache` → 快照或 `runwayml/stable-diffusion-v1-5` |

**注意：** `Name or Path` 不能填 `/root/autodl-tmp/models`（只是文件夹）。应填下面之一：

- `runwayml/stable-diffusion-v1-5`（在线，需 `HF_ENDPOINT=https://hf-mirror.com`）
- HF 快照目录，例如：`/root/autodl-tmp/huggingface_cache/hub/models--runwayml--stable-diffusion-v1-5/snapshots/<hash>/`
- 单个底模文件，例如：`/root/autodl-tmp/models/Stable-diffusion/v1-5-pruned.safetensors`

下载 SD1.5：

```bash
source ~/ai-toolkit-gl/autodl-gl.env
python ~/ai-toolkit-gl/scripts/download_sd15.py --mirror
```

## 一键部署（上传 zip 后）

在 AutoDL 终端：

```bash
# 1. 上传 ai-toolkit-gl.zip 到 /root 后
unzip -o ~/ai-toolkit-gl.zip -d ~

# 2. 若报错 set: pipefail（Windows 换行），先执行：
sed -i 's/\r$//' ~/ai-toolkit-gl/scripts/*.sh
chmod +x ~/ai-toolkit-gl/scripts/*.sh

# 3. 一键部署（必须用 bash，不要用 sh）
bash ~/ai-toolkit-gl/scripts/autodl-deploy.sh
```

或只有 zip、尚未解压时：

```bash
unzip -p ~/ai-toolkit-gl.zip ai-toolkit-gl/scripts/bootstrap-autodl-gl.sh | bash
```

## 验证

```bash
source ~/ai-toolkit-gl/autodl-gl.env
~/ai-toolkit-gl/venv/bin/python -c "import torch, diffusers; print('OK')"
curl -s -w "\nHTTP %{http_code}\n" http://127.0.0.1:6008/api/datasets/list
curl -s -w "\nHTTP %{http_code}\n" http://127.0.0.1:6008/api/settings
```

`datasets/list` 必须是 **200**（可为 `[]`），否则新建任务页会一直灰色。

## AutoDL 控制台

在 **自定义服务** 里添加：

- 端口：**6008**
- 地址：`http://127.0.0.1:6008`

开机自启由 `autodl-install-autostart.sh` 写入 **crontab @reboot**（延迟 60 秒等待环境就绪）。

## 常用命令

```bash
source ~/ai-toolkit-gl/autodl-gl.env
bash ~/ai-toolkit-gl/scripts/autodl-start-gl-ui.sh      # 手动启动
bash ~/ai-toolkit-gl/scripts/autodl-install-autostart.sh # 仅重装开机自启
tail -f ~/ai-toolkit-gl/ui/ui-gl.log
```

## 重新上传新 zip

```bash
export FORCE_EXTRACT=1
bash ~/ai-toolkit-gl/scripts/autodl-deploy.sh
```

## Windows 打包

```powershell
.\scripts\pack_autodl_zip.ps1
```

上传生成的 `ai-toolkit-gl.zip` 到 `~/`。
